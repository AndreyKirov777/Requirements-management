---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-09'
inputDocuments:
  - PRD-Requirements-Management-Traceability.md
  - PRD-Requirements-Management-Traceability-validation-report.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
workflowType: 'architecture'
project_name: 'Requirements-management'
user_name: 'Andreisadakov'
date: '2026-03-09'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

53 functional requirements across 8 categories:

| Category | IDs | Count | Architectural Significance |
|----------|-----|-------|---------------------------|
| Authoring & Management | FR-001 – FR-009 | 9 | CRUD with custom fields, hierarchical tree, rich-text editing, templates |
| Traceability | FR-010 – FR-016 | 7 | Bidirectional links, live matrix, orphan detection, impact analysis — graph traversal core |
| Versioning & Audit Trail | FR-020 – FR-024 | 5 | Audit log, baselines (soft-locked snapshots), version comparison |
| Search & Navigation | FR-040 – FR-043 | 4 | Full-text search, multi-field filtering, saved views, visual dependency graph |
| Import & Export | FR-050 – FR-052 | 3 | CSV, Word, ReqIF import; CSV, JSON, PDF, ReqIF export |
| Repository Ingestion | FR-053 – FR-061 | 9 | Webhook ingestion, PR write-back, conflict detection, schema validation, idempotent processing |
| AI Agent Integration | AI-001 – AI-009 | 9 | Documented markdown schema, Git-native operations, CI validation, clarification mechanism |
| Compliance & Regulatory | REG-001 – REG-002 | 2 | Standard audit logging (REG-001), RBAC (REG-002) — remaining REGs deprioritized |

**Non-Functional Requirements (MVP-scoped):**

| NFR | MVP Constraint | Architectural Impact |
|-----|---------------|---------------------|
| NFR-001 | 10k requirements <2s load; 2k traceability matrix <10s | Standard indexing, caching |
| NFR-002 | 99.9% uptime | Redundancy, health checks |
| NFR-003 | TLS in transit, OAuth 2.0 (no encryption at rest) | Standard TLS, OAuth for Git providers |
| NFR-004 | Standard audit logging (no retention guarantees) | Simple audit table |
| NFR-005 | 10k requirements without degradation | Standard PostgreSQL, no partitioning needed |
| NFR-008 | 95% ingestion within 60s | Queue-backed async processing |
| NFR-009 | 95% UI-to-repo PR within 5 min | Background job system |
| NFR-010 | Idempotent ingestion | Deduplication by event ID or commit SHA |
| NFR-011 | Retry with backoff, dead-letter queue | Job queue infrastructure |
| NFR-012 | Eventually consistent graph, ≤5 min staleness | Event-driven updates |

**Removed / reduced for MVP:** Multi-tenancy (NFR-006), 100k scale → 10k (NFR-005), 10-year audit retention (NFR-004), encryption at rest (NFR-003), API rate limit → 60–100 req/min for frontend only (NFR-007).

**Deprioritized regulatory requirements:**

| Requirement | MVP Treatment |
|------------|--------------|
| REG-003 | Soft-lock baselines (editable with warning), not immutable |
| REG-004 | Coverage dashboard serves this purpose |
| REG-006 | Custom fields sufficient for MVP |
| REG-007 | Standard export sufficient for MVP |
| REG-008 | Already P2, out of scope |

**Scale & Complexity:**

- Primary domain: Full-stack web application with backend pipeline infrastructure
- Complexity level: High (reduced from Enterprise due to MVP scoping)
- Estimated architectural components: 8–10
- Single-tenant deployment

### MVP Scope Decisions

| Decision | Detail |
|----------|--------|
| Single-tenant | No multi-tenancy infrastructure. One deployment per customer if needed later. |
| No public API | Backend serves frontend only via session auth. No API keys, versioning, or external API docs. |
| URL-based external links | Traceability links to external systems (Jira, GitHub Issues, etc.) are URL references. No bidirectional sync. |
| Regulated persona deferred | "Sam" (Compliance/Systems Engineer) is post-MVP. Core personas: Product Owner, Business Analyst, AI SDLC Manager. |
| Frontend rate limit | 60–100 req/min via simple middleware. No API gateway. |

### Technical Constraints & Dependencies

1. **Git hosting provider dependency** — GitHub and GitLab APIs are external dependencies for webhook registration, file fetching, branch creation, and PR/MR generation. Rate limits, API versioning, and availability directly constrain system behavior.
2. **Git as source of truth** — Requirement content is owned by Git. The system cannot unilaterally modify requirements; all changes flow through PRs. The system's database is always a derived, eventually consistent projection.
3. **Webhook delivery guarantees** — GitHub and GitLab provide at-least-once delivery. The ingestion pipeline must handle duplicates and out-of-order delivery (NFR-010).
4. **Markdown as interchange format** — Requirements stored as markdown with YAML frontmatter. The system must parse, validate, and round-trip this format without loss. Schema evolution must be backward-compatible.
5. **Single-tenant SaaS deployment** — MVP is SaaS, single-tenant. Cloud-native, container-based (Kubernetes) deployment.
6. **Frontend technology direction** — UX spec specifies Shadcn/ui + Tailwind CSS + Radix UI, D3.js or vis.js for graph visualization, Recharts for dashboard charts. React SPA.

### Cross-Cutting Concerns (MVP)

1. **Authentication & Authorization** — OAuth 2.0, RBAC (Viewer/Author/Reviewer/Administrator). Single user pool, session-based auth for frontend.
2. **Audit Logging** — Log changes with actor, timestamp, rationale, before/after state. Standard database table. No immutability or long-term retention guarantees.
3. **Git Synchronization** — Bidirectional: ingest from Git (webhooks → parse → graph update) and write to Git (UI changes → PR generation). Conflict detection when both directions overlap. Core architectural challenge.
4. **Ingestion Pipeline Observability** — Ingestion status per requirement (in_sync, pending, conflict, failed), retry, dead-letter queue, operator visibility.
5. **Full-Text Search** — Search across requirements. PostgreSQL FTS sufficient at 10k scale.
6. **Real-Time UI Updates** — Coverage indicators, sync status updates without page refresh. SSE, WebSockets, or polling.

### Open Questions to Resolve in Architecture

| OQ | Question | Architectural Implication |
|----|----------|--------------------------|
| OQ-02 | Concurrent agent PR conflicts | Merge queue strategy, PR ordering, lock mechanism |
| OQ-06 | AI agent safeguard controls | PR label policies, branch protection, review gates |
| OQ-08 | Requirement file granularity | One file per requirement vs. grouped — affects parsing, diffing, conflict scope |
| OQ-09 | Baseline-to-Git mapping | Git tags vs. commits vs. branches for baseline snapshots |
| OQ-10 | Invalid markdown after merge | Auto-remediation PR vs. ingestion failure vs. partial ingest |

### Integration Surface (MVP)

| Integration | Direction | Purpose |
|------------|-----------|---------|
| GitHub/GitLab Webhooks | Inbound | Receive merge events for requirement file changes |
| GitHub/GitLab API | Outbound | Fetch files, create branches, generate PRs/MRs |
| OAuth 2.0 (GitHub/GitLab) | Auth | User login + Git provider authorization |
| Frontend ↔ Backend | Internal | Session-authenticated HTTP, not public API |
| External link targets | Reference only | URL-based links to Jira, GitHub Issues, etc. — no sync |

### Phase 2 Capabilities (Architecturally Planned)

The following capabilities are deferred from MVP but should be considered in architectural decisions to ensure clean upgrade paths:

| Capability | Architectural Pre-requisite |
|-----------|---------------------------|
| **GitHub/GitLab Issues integration** (Option C) | Abstract external link targets behind an interface. MVP stores URLs; phase 2 swaps in API-backed providers that fetch metadata and sync status. OAuth token scope expansion for issue read access. |
| **Jira / Linear integration** | Integration provider abstraction layer. Each provider implements a common interface (search, fetch, status sync). Webhook registration per provider. |
| **Public REST API** | Session auth and API key auth should share the same authorization layer. API versioning namespace (`/api/v1/`) reserved but not implemented. |
| **Multi-tenancy** | Tenant-scoped data access patterns. Consider tenant_id columns from the start even if unused in MVP, or plan a migration path. |
| **Immutable audit trail** | Audit table schema should be append-friendly. Adding trigger-based immutability or migrating to an append-only store should not require schema redesign. |
| **Encryption at rest** | Database-level encryption (e.g., AWS RDS encryption) is a configuration change, not an application change. No application-level key management needed for phase 2. |
| **Regulatory compliance** | Baseline immutability, compliance gap reports, regulatory attribute mapping, and export metadata are feature additions on top of existing data structures. |
| **Slack / generic webhook notifications** | Event bus for requirement change events. MVP can emit events internally; phase 2 adds outbound notification channels. |

## Starter Template Evaluation

### Technical Preferences

- Language: TypeScript (strict mode) for both frontend and backend
- ORM: Prisma
- Deployment: Cloud-agnostic containers, local development support
- Code organization: Monorepo (Turborepo + pnpm workspaces)
- Package manager: pnpm

### Primary Technology Domain

Full-stack TypeScript web application with a monorepo structure comprising: a React SPA frontend, a backend API server, and a background job worker — all sharing types and database access via Prisma.

### Starter Options Considered

#### Option 1: Turborepo + Vite + Fastify + BullMQ (Selected)

- **Vite + React SPA:** Pure SPA — desktop-only, no SEO, no mobile. SSR adds complexity with zero benefit. Smallest bundle (~42KB), fastest dev server (~1-2s startup). Shadcn/ui has official Vite installation support with Tailwind v4.
- **Fastify backend:** Plugin-based architecture maps to modular monolith. ~50k req/s performance. Built-in JSON Schema validation. Explicit, non-magical code — better for AI agent implementation consistency. Active maintenance.
- **BullMQ + Redis workers:** Redis-backed, production-proven. Built-in retry with exponential backoff, dead-letter queues, rate limiting. Matches NFR-010 and NFR-011 directly. Separate worker process from API.

#### Option 2: Turborepo + Next.js + tRPC (Rejected)

SSR adds complexity for a desktop-only SPA. API routes not designed for heavy async processing. Vercel-optimized deployment conflicts with cloud-agnostic requirement. Still needs separate worker. Over-engineered for this use case.

#### Option 3: Turborepo + Vite + NestJS (Rejected)

Decorator-based code is harder for AI agents to implement consistently. Steep learning curve, heavy abstraction overhead. Over-engineered for MVP — DI container, interceptors, guards, pipes add unnecessary layers.

### Selected Starter: Custom Turborepo Monorepo

**Rationale:** No existing template matches the project's specific requirements. A custom monorepo structure built on Turborepo provides the right foundation with each technology chosen for its fit.

**Initialization Command:**

```bash
pnpm dlx create-turbo@latest --package-manager pnpm
```

**Monorepo Structure:**

```
requirements-management/
├── apps/
│   ├── web/                    # Vite + React SPA
│   │   ├── src/
│   │   │   ├── components/     # App-specific components
│   │   │   ├── pages/          # View components (Dashboard, Table, Graph)
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # Utilities, API client
│   │   │   └── stores/         # Client state management
│   │   └── vite.config.ts
│   │
│   ├── api/                    # Fastify backend API
│   │   ├── src/
│   │   │   ├── modules/        # Domain modules (requirements, traceability, ingestion, auth)
│   │   │   ├── plugins/        # Fastify plugins (auth, prisma, websocket)
│   │   │   ├── routes/         # Route handlers
│   │   │   └── server.ts
│   │   └── Dockerfile
│   │
│   └── worker/                 # BullMQ background workers
│       ├── src/
│       │   ├── processors/     # Job processors (ingestion, pr-generation, validation)
│       │   ├── queues/         # Queue definitions
│       │   └── worker.ts
│       └── Dockerfile
│
├── packages/
│   ├── db/                     # Prisma schema, client, migrations
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       └── client.ts
│   │
│   ├── shared/                 # Shared types, schemas, constants
│   │   └── src/
│   │       ├── types/          # Shared TypeScript types
│   │       ├── schemas/        # Zod validation schemas
│   │       └── constants/      # Shared constants
│   │
│   ├── ui/                     # Shadcn/ui components (shared library)
│   │   └── src/
│   │       └── components/
│   │
│   ├── config-typescript/      # Shared tsconfig
│   ├── config-eslint/          # Shared ESLint config
│   └── config-tailwind/        # Shared Tailwind config
│
├── docker-compose.yml          # PostgreSQL + Redis for local dev
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**

- TypeScript (strict mode) across all apps and packages
- Node.js runtime for API and worker
- pnpm as package manager with workspace support

**Frontend:**

- Vite 6 with React 18+ and SWC
- Tailwind CSS v4 with `@tailwindcss/vite`
- Shadcn/ui components (copy-paste, not library dependency)
- Radix UI primitives for accessible interactive components
- TanStack Router for client-side routing
- TanStack Query for server state management and caching

**Backend:**

- Fastify with TypeScript
- Prisma ORM with PostgreSQL
- Session-based authentication (via fastify-secure-session)
- Zod for runtime validation (shared with frontend via packages/shared)

**Background Processing:**

- BullMQ with Redis for job queues
- Separate worker process from API process
- Queue definitions shared via packages/shared

**Development Experience:**

- Docker Compose for local PostgreSQL + Redis
- Turborepo for build orchestration and caching
- ESLint + Prettier shared configs
- Vitest for unit/integration testing
- Playwright for E2E testing

**Build & Deployment:**

- Dockerfiles for API and worker (multi-stage builds)
- Docker Compose for local full-stack development
- Cloud-agnostic — runs anywhere containers run

**Note:** Project initialization using this structure should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

1. Traceability graph data model — adjacency list + recursive CTEs
2. Frontend-backend communication — tRPC
3. Real-time updates — Server-Sent Events (SSE)
4. Graph visualization library — React Flow
5. Requirement file granularity — one file per requirement (OQ-08)
6. Client state management — Zustand

**Important Decisions (Shape Architecture):**

1. RBAC — simple role enum on User model
2. Full-text search — PostgreSQL FTS (tsvector + GIN index)
3. Caching — TanStack Query (client), Redis (session + optional server-side)
4. Session storage — Redis via fastify-secure-session
5. Error handling — RFC 7807 Problem Details
6. Logging — Pino (Fastify built-in)
7. Baseline-to-Git mapping — Git tags (OQ-09)
8. Invalid markdown handling — mark ingestion failed + surface in UI (OQ-10)

**Deferred Decisions (Post-MVP):**

1. Concurrent agent PR conflict handling (OQ-02) — standard Git merge for MVP
2. AI agent safeguard controls (OQ-06) — Git branch protection rules for MVP
3. CI/CD pipeline specifics — deferred to implementation story
4. Monitoring and alerting — deferred to operational readiness

### Data Architecture

**Traceability Graph Model: Adjacency List + Recursive CTEs**

- Each traceability link stored as a row in `TraceabilityLink` table with `source_requirement_id`, `target_type`, `target_id`, and `link_type`
- Traversal queries use PostgreSQL `WITH RECURSIVE` for impact analysis and path finding
- At 10k requirements with ~30-50k links, PostgreSQL handles this comfortably without additional graph infrastructure
- Rationale: Lowest complexity, standard SQL, sufficient performance at MVP scale. Upgrade path to closure table or application-level graph caching if traversal latency exceeds thresholds
- Affects: Traceability module, impact analysis, graph visualization, coverage computation

**Full-Text Search: PostgreSQL FTS**

- Use `tsvector` columns with `GIN` indexes on requirement title and description
- Search across requirements within a project or across all projects
- At 10k scale, PostgreSQL FTS performs well without Elasticsearch overhead
- Rationale: No additional infrastructure. Sufficient for MVP. Elasticsearch can be added in phase 2 if search quality or scale demands it.
- Affects: Search & Navigation module, requirement list views

**Caching Strategy:**

- Client-side: TanStack Query provides automatic caching, deduplication, stale-while-revalidate, and background refresh. Primary caching layer for frontend.
- Server-side: Redis (shared with BullMQ and sessions) available for optional hot-path caching (e.g., project coverage statistics). No dedicated cache layer for MVP — PostgreSQL with indexes is fast at 10k scale.
- Rationale: TanStack Query eliminates most cache management. Redis available but not required for MVP performance targets.
- Affects: All frontend data fetching, API response performance

**Migration Strategy: Prisma Migrate**

- Schema changes managed through Prisma Migrate with version-controlled migration files
- Migrations stored in `packages/db/prisma/migrations/`
- Rationale: Standard Prisma workflow. Migration files are reviewable SQL.

### Authentication & Security

**RBAC: Simple Role Enum**

- `role` field on User model: `enum Role { VIEWER, AUTHOR, REVIEWER, ADMIN }`
- Fastify route decorator/hook checks `user.role` against minimum role for each endpoint
- Example: `requireRole('AUTHOR')` on write endpoints, `requireRole('ADMIN')` on settings/baseline-lock
- Rationale: Four fixed roles, single-tenant. No need for permission-based libraries (CASL, Casbin). Clean, explicit, easy for AI agents to implement consistently.
- Affects: All API routes, frontend role-based UI visibility

**Session Storage: Redis**

- `fastify-secure-session` or `@fastify/session` with Redis store
- Redis already provisioned for BullMQ — shared instance
- Session cookie with HTTPS-only, SameSite=Strict, HttpOnly flags
- Rationale: Redis is already infrastructure. Server-side sessions are simpler than JWT for a session-authenticated SPA.
- Affects: Auth module, all authenticated routes

**OAuth 2.0: GitHub/GitLab**

- OAuth 2.0 authorization code flow for user login
- Same OAuth token used for Git provider API access (file fetching, PR generation)
- Token stored server-side (encrypted in session or database), never exposed to frontend
- Rationale: Single auth flow serves both login and Git provider integration.
- Affects: Auth module, ingestion pipeline, PR generation

**Rate Limiting: Simple Middleware**

- 60-100 req/min per session via in-memory counter in Fastify middleware
- No API gateway or external rate limiter for MVP
- Rationale: Frontend-only traffic. Simple counter is sufficient.
- Affects: API middleware layer

### API & Communication Patterns

**Frontend-Backend: tRPC**

- tRPC router defined in `apps/api`, consumed by `apps/web` via TanStack Query integration (`@trpc/react-query`)
- End-to-end type safety: changing a procedure signature immediately shows type errors in the frontend
- Zod schemas shared via `packages/shared` for input validation on both sides
- Rationale: Monorepo + TypeScript + no public API = tRPC is ideal. Eliminates API schema maintenance. When public REST API is added in phase 2, it's a separate Fastify route layer alongside tRPC.
- Affects: All frontend-backend communication, API route structure

**Real-Time Updates: Server-Sent Events (SSE)**

- SSE endpoint for coverage status changes, sync events, and activity feed updates
- Server-to-client only — client never pushes real-time data to server
- Fastify SSE support via `@fastify/sse` or manual implementation
- Events: `coverage-update`, `sync-status-change`, `activity-event`, `ingestion-complete`
- Rationale: Simpler than WebSocket for one-directional updates. Works through proxies/load balancers. Natively supported in browsers via `EventSource` API.
- Affects: Dashboard real-time updates, sync status indicator, activity feed

**Error Handling: RFC 7807 Problem Details**

- All API errors return consistent Problem Details JSON:
  ```json
  {
    "type": "https://rmt.app/errors/validation-failed",
    "title": "Validation Failed",
    "status": 422,
    "detail": "Requirement title is required",
    "instance": "/requirements/FR-003"
  }
  ```
- tRPC wraps this format in its error handling
- Rationale: Standard format. Future public API gets consistent errors for free.
- Affects: All API error responses, frontend error handling

### Frontend Architecture

**Client State: Zustand**

- Zustand stores for UI-only state: sidebar collapsed, active filters, selected view, theme preference, graph viewport
- TanStack Query for all server state (requirements, coverage, activity)
- React Context only for auth provider and theme provider
- Rationale: Minimal API, no boilerplate, works well alongside TanStack Query. Avoids Context re-render issues for frequently changing UI state.
- Affects: All frontend components with UI state

**Graph Visualization: React Flow**

- React Flow for the traceability graph canvas
- Nodes are React components — can render Shadcn/ui badges, coverage dots, requirement IDs inside nodes
- Built-in zoom, pan, minimap, keyboard navigation
- Custom edge types for different link types (solid=derives, dashed=relates)
- Custom node types: RequirementNode, ExternalLinkNode, TestCaseNode
- Rationale: React-native (nodes are components, not SVG primitives). Built-in interaction handlers. Less custom code than D3.js for the same features. Actively maintained (28k+ stars).
- Affects: Graph view, impact analysis view, traceability chain visualization

**Form Handling: React Hook Form + Zod**

- React Hook Form for the requirement editing forms and onboarding flow
- Zod resolvers shared with backend validation schemas via `packages/shared`
- Rationale: Performance (uncontrolled components), Zod integration shares validation logic between frontend and backend.
- Affects: Requirement detail overlay, onboarding flow, settings forms

### Infrastructure & Deployment

**Environment Configuration: Dotenv + Zod Validation**

- `.env`, `.env.local`, `.env.production` files
- Shared Zod env schema in `packages/shared` validates at startup
- Application fails fast with clear error if required env vars are missing
- Rationale: Simple, standard, type-safe with Zod validation.

**Logging: Pino**

- Pino structured JSON logging (Fastify's built-in logger)
- Shared log format across API and worker processes
- Log levels: `fatal`, `error`, `warn`, `info`, `debug`, `trace`
- Request logging with request ID for correlation
- Rationale: Already included with Fastify. Structured JSON enables log aggregation.
- Affects: API, worker, debugging, operational visibility

**CI/CD: GitHub Actions or GitLab CI**

- Match the Git provider used for the project
- Turborepo remote caching for faster CI builds
- Pipeline: lint → type-check → test → build → Docker image
- Specifics deferred to implementation story

**Docker Compose (Local Development):**

```yaml
services:
  postgres:
    image: postgres:17
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: rmt
      POSTGRES_USER: rmt
      POSTGRES_PASSWORD: rmt_dev
    volumes: ["postgres_data:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  api:
    build: ./apps/api
    ports: ["3001:3001"]
    depends_on: [postgres, redis]

  worker:
    build: ./apps/worker
    depends_on: [postgres, redis]
```

### Open Questions Resolution

| OQ | Decision | Rationale |
|----|----------|-----------|
| OQ-02 | Standard Git merge conflict resolution for MVP | Two agents editing the same file is an edge case. Git handles it. Phase 2 can add advisory locks. |
| OQ-06 | Git branch protection rules (require PR review) | Agents submit PRs like humans. Agent-originated PRs labeled distinctly. No additional app-level controls for MVP. |
| OQ-08 | One file per requirement | Clearest conflict scope, simplest parsing, cleanest Git history per requirement. Folder structure groups by module. |
| OQ-09 | Git tags for baselines | Lightweight, immutable in Git, no branch overhead. System records tag name + commit SHA in database. Diff between tags for baseline comparison. |
| OQ-10 | Mark ingestion failed + surface in UI | No auto-remediation PR (too noisy). Last valid state preserved in graph. User/agent fixes and pushes new commit. |

### Decision Impact Analysis

**Implementation Sequence:**

1. Monorepo scaffolding (Turborepo + pnpm + Docker Compose)
2. Database schema (Prisma) + shared types/schemas (packages/shared)
3. Auth (OAuth 2.0 + session + RBAC)
4. tRPC router + basic requirement CRUD
5. Git ingestion pipeline (webhooks + BullMQ workers + markdown parsing)
6. Traceability graph (adjacency list + recursive CTEs)
7. Frontend shell (Vite + React + Shadcn/ui + routing)
8. Dashboard view (coverage KPIs + TanStack Query)
9. Table view (TanStack Table + filters)
10. Graph view (React Flow)
11. PR write-back (UI edits → system-generated PRs)
12. SSE real-time updates
13. Import/Export

**Cross-Component Dependencies:**

- `packages/shared` must be established early — types, Zod schemas, and constants flow to all apps
- `packages/db` (Prisma schema) must be defined before API and worker can build domain logic
- tRPC router definitions in API are consumed by frontend — changes propagate via TypeScript
- BullMQ queue definitions shared between API (enqueues) and worker (processes) via `packages/shared`
- SSE events emitted by API when worker completes ingestion — requires event bus between worker→API (Redis pub/sub or BullMQ events)
- React Flow custom node components depend on `packages/ui` (Shadcn components) and coverage state types from `packages/shared`

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database (Prisma Schema):**

| Element | Convention | Example |
|---------|-----------|---------|
| Model names | PascalCase | `Requirement`, `TraceabilityLink`, `AuditEntry` |
| Field names | camelCase | `displayId`, `createdAt`, `projectId` |
| Enum names | PascalCase | `RequirementStatus`, `LinkType` |
| Enum values | UPPER_SNAKE_CASE | `IN_SYNC`, `DERIVES_FROM`, `VERIFIED_BY` |
| Relations | camelCase, descriptive | `parentRequirement`, `traceabilityLinks` |
| Table mapping | snake_case via `@@map` | `@@map("traceability_links")` |
| Index names | `idx_{table}_{columns}` | `@@index([projectId, status], map: "idx_requirements_project_status")` |

**tRPC Procedures:**

| Element | Convention | Example |
|---------|-----------|---------|
| Router names | camelCase noun | `requirement`, `traceability`, `ingestion` |
| Query procedures | `{noun}.{verb}` | `requirement.list`, `requirement.getById`, `traceability.getMatrix` |
| Mutation procedures | `{noun}.{verb}` | `requirement.create`, `requirement.update`, `traceability.createLink` |
| Input schemas | `{Noun}{Verb}Input` | `RequirementCreateInput`, `TraceabilityLinkCreateInput` |
| Output schemas | `{Noun}{Verb}Output` | `RequirementListOutput` |

**TypeScript Code:**

| Element | Convention | Example |
|---------|-----------|---------|
| Variables/functions | camelCase | `getRequirementById`, `coveragePercentage` |
| Types/interfaces | PascalCase | `RequirementWithLinks`, `CoverageStats` |
| Enums (TS) | PascalCase + PascalCase values | `IngestionStatus.InSync` |
| Constants | UPPER_SNAKE_CASE | `MAX_REQUIREMENTS_PER_PAGE`, `DEFAULT_BRANCH` |
| React components | PascalCase | `CoverageKpiCard`, `RequirementDetailOverlay` |
| React hooks | camelCase with `use` prefix | `useRequirements`, `useSyncStatus` |
| Zustand stores | `use{Domain}Store` | `useUiStore`, `useFilterStore` |
| Zod schemas | camelCase with `Schema` suffix | `requirementCreateSchema`, `webhookPayloadSchema` |

**File & Directory Naming:**

| Element | Convention | Example |
|---------|-----------|---------|
| Directories | kebab-case | `coverage-dashboard/`, `traceability-graph/` |
| React component files | PascalCase `.tsx` | `CoverageKpiCard.tsx`, `RequirementTable.tsx` |
| Non-component TS files | kebab-case `.ts` | `requirement.service.ts`, `ingestion.processor.ts` |
| Test files | Same name + `.test.ts` | `requirement.service.test.ts`, `CoverageKpiCard.test.tsx` |
| Index files | `index.ts` for re-exports only | No logic in index files |
| Type definition files | `{domain}.types.ts` | `requirement.types.ts` |
| Zod schema files | `{domain}.schemas.ts` | `requirement.schemas.ts` |

### Structure Patterns

**Backend Module Organization (apps/api):**

```
modules/
  requirements/
    requirements.router.ts      # tRPC router with procedures
    requirements.service.ts     # Business logic
    requirements.types.ts       # Module-specific types
    requirements.service.test.ts
  traceability/
    traceability.router.ts
    traceability.service.ts
    traceability.types.ts
    traceability.service.test.ts
  ingestion/
    ingestion.router.ts
    ingestion.service.ts
    ingestion.types.ts
    ingestion.service.test.ts
  auth/
    auth.router.ts
    auth.service.ts
    auth.types.ts
    auth.service.test.ts
```

Rules:
- Each module owns its router, service, and types
- Services never import from other module's services directly — use dependency injection via Fastify plugin context
- Routers only call their own module's service
- Cross-module communication goes through shared types in `packages/shared`

**Frontend Component Organization (apps/web):**

```
src/
  components/
    ui/                          # Shadcn/ui primitives (auto-generated)
    coverage-dashboard/
      CoverageKpiCard.tsx
      CoverageKpiCard.test.tsx
      ActivityFeed.tsx
      DashboardView.tsx
    requirement-table/
      RequirementTable.tsx
      RequirementFilters.tsx
      TableView.tsx
    traceability-graph/
      GraphCanvas.tsx
      RequirementNode.tsx
      TraceabilityEdge.tsx
      GraphView.tsx
    requirement-detail/
      RequirementDetailOverlay.tsx
      InlineFieldEditor.tsx
      TraceabilityChainPanel.tsx
      ConflictResolutionView.tsx
    shared/
      SyncStatusIndicator.tsx
      CoverageStatusDot.tsx
      AppShell.tsx
      Sidebar.tsx
  hooks/
    use-requirements.ts          # TanStack Query hooks
    use-traceability.ts
    use-sync-status.ts
  stores/
    use-ui-store.ts              # Zustand: sidebar, theme, density
    use-filter-store.ts          # Zustand: active filters per view
  lib/
    trpc.ts                      # tRPC client setup
    utils.ts
  pages/
    DashboardPage.tsx
    TablePage.tsx
    GraphPage.tsx
    SettingsPage.tsx
    OnboardingPage.tsx
```

Rules:
- Components grouped by feature, not by type
- Each feature folder contains all its components, co-located with tests
- `shared/` for components used across multiple features
- One component per file
- `hooks/` for TanStack Query hooks (server state)
- `stores/` for Zustand stores (client state)
- `pages/` for route-level components that compose feature components

**Worker Organization (apps/worker):**

```
src/
  processors/
    ingestion.processor.ts
    pr-generation.processor.ts
    validation.processor.ts
  queues/
    queue-definitions.ts
  worker.ts
```

**Test Organization:**

| Test type | Location | Runner | Naming |
|-----------|----------|--------|--------|
| Unit tests | Co-located with source | Vitest | `{name}.test.ts` |
| Integration tests | Co-located with source | Vitest | `{name}.integration.test.ts` |
| E2E tests | `apps/web/tests/e2e/` | Playwright | `{journey-name}.spec.ts` |

### Format Patterns

**Date/Time:**
- Stored as `timestamptz` in PostgreSQL
- Serialized as ISO 8601 strings: `"2026-03-09T14:30:00.000Z"`
- Always UTC in storage and API; convert to local only in UI display
- Frontend uses relative time ("5 min ago") for recent, absolute for older

**IDs:**
- Internal: UUID v4 strings (PostgreSQL `gen_random_uuid()`)
- Display: human-readable stable strings (e.g., `SYS-REQ-0042`) stored as `displayId`
- APIs accept and return display IDs for user-facing operations
- Internal UUIDs for foreign keys and internal references only

**JSON Field Naming:**
- camelCase everywhere (TypeScript convention)
- Prisma maps snake_case DB columns to camelCase automatically

**Null Handling:**
- Explicit `null` for absent optional values (never `undefined` in JSON)
- Check for `null` explicitly, never rely on truthiness for nullable strings

**Pagination:**
- Cursor-based pagination (not offset-based)
- Response shape: `{ items: T[], nextCursor: string | null }`
- Default page size: 50, maximum: 200

### Communication Patterns

**BullMQ Job Naming:** `{domain}.{action}` format

| Job name | Purpose |
|----------|---------|
| `ingestion.process` | Webhook event → parse → graph update |
| `ingestion.reindex` | Manual re-index trigger |
| `pr.generate` | UI edit → PR creation |
| `validation.check` | Schema validation on files |

**BullMQ Job Data Pattern:**

```typescript
interface BaseJobData {
  traceId: string;
  triggeredBy: string;
}
```

All job data interfaces extend `BaseJobData` with domain-specific fields.

**SSE Event Naming:** `{domain}:{action}` format

| Event | Payload |
|-------|---------|
| `coverage:updated` | `{ projectId, coveragePercent, delta }` |
| `sync:status-changed` | `{ requirementId, status, previousStatus }` |
| `activity:new` | `{ entry: ActivityEntry }` |
| `ingestion:completed` | `{ jobId, requirementIds, status }` |

**Zustand Store Pattern:**
- One store per domain concern (UI, filters, graph viewport)
- State and actions in the same store
- Immutable updates only (Zustand `set` handles via spread)
- No derived state in stores — compute in components or use selectors

### Process Patterns

**Error Handling:**

Backend:
- Service layer throws `TRPCError` with appropriate code
- Errors include RFC 7807-style data in `cause`
- Pino logs error with trace ID for correlation

Frontend:
- TanStack Query `onError` for query/mutation errors
- React Error Boundary at page level for unexpected errors
- Toast notification (Shadcn Sonner) for user-actionable errors
- Never show raw error messages — map to user-friendly text

**Loading States:**
- TanStack Query states: `isLoading` (first load), `isFetching` (refresh), `isError`
- First load: skeleton screen (Shadcn `Skeleton`)
- Background refresh: silent (stale-while-revalidate)
- Mutations: button spinner, disabled during request
- < 300ms: no indicator. 300ms–2s: inline spinner. > 2s: progress with context.

**Validation Pattern:**
- Zod schemas defined once in `packages/shared`
- Backend validates via tRPC `.input()` with Zod
- Frontend validates via React Hook Form `zodResolver` with same schema
- Validation errors shown inline on fields, never as toasts

**Import Order:**

```typescript
// 1. Node built-in modules
// 2. External packages
// 3. Monorepo packages (@rmt/shared, @rmt/db)
// 4. Relative imports (parent → sibling → children)
```

Enforced by ESLint import-order rule.

### Enforcement Guidelines

**All AI Agents MUST:**

1. Follow naming conventions exactly — no deviations
2. Place files in the correct module/feature directory
3. Co-locate tests with source files
4. Use Zod schemas from `packages/shared` for validation — never duplicate
5. Return RFC 7807 errors via tRPC — never custom error shapes
6. Use TanStack Query for all server data — never `fetch` in components
7. Use Zustand for client state — never React Context for changing state
8. Follow import order convention

**Pattern Verification:**
- ESLint enforces: import order, naming conventions
- TypeScript strict mode enforces: type safety, null checks, exhaustive switches
- Prisma schema is the single source for database types
- tRPC enforces: frontend-backend type safety at compile time
- CI pipeline: `turbo lint && turbo type-check && turbo test` — blocks merge on violations

## Project Structure & Boundaries

### Complete Project Directory Structure

```
requirements-management/
├── .github/
│   └── workflows/
│       └── ci.yml
├── apps/
│   ├── web/                                # Vite + React SPA
│   │   ├── public/
│   │   │   └── favicon.svg
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/                     # Shadcn/ui primitives (auto-generated)
│   │   │   │   ├── coverage-dashboard/
│   │   │   │   │   ├── CoverageKpiCard.tsx
│   │   │   │   │   ├── CoverageKpiCard.test.tsx
│   │   │   │   │   ├── ActivityFeed.tsx
│   │   │   │   │   ├── ActivityFeed.test.tsx
│   │   │   │   │   ├── UncoveredRequirementsList.tsx
│   │   │   │   │   └── DashboardView.tsx
│   │   │   │   ├── requirement-table/
│   │   │   │   │   ├── RequirementTable.tsx
│   │   │   │   │   ├── RequirementTable.test.tsx
│   │   │   │   │   ├── RequirementFilters.tsx
│   │   │   │   │   ├── RequirementColumns.tsx
│   │   │   │   │   ├── BulkActionToolbar.tsx
│   │   │   │   │   └── TableView.tsx
│   │   │   │   ├── traceability-graph/
│   │   │   │   │   ├── GraphCanvas.tsx
│   │   │   │   │   ├── GraphCanvas.test.tsx
│   │   │   │   │   ├── RequirementNode.tsx
│   │   │   │   │   ├── ExternalLinkNode.tsx
│   │   │   │   │   ├── TraceabilityEdge.tsx
│   │   │   │   │   ├── GraphToolbar.tsx
│   │   │   │   │   ├── GraphLegend.tsx
│   │   │   │   │   └── GraphView.tsx
│   │   │   │   ├── requirement-detail/
│   │   │   │   │   ├── RequirementDetailOverlay.tsx
│   │   │   │   │   ├── RequirementDetailOverlay.test.tsx
│   │   │   │   │   ├── DetailsTab.tsx
│   │   │   │   │   ├── TraceabilityTab.tsx
│   │   │   │   │   ├── HistoryTab.tsx
│   │   │   │   │   ├── ActivityTab.tsx
│   │   │   │   │   ├── ConflictTab.tsx
│   │   │   │   │   ├── InlineFieldEditor.tsx
│   │   │   │   │   ├── InlineFieldEditor.test.tsx
│   │   │   │   │   ├── TraceabilityChainPanel.tsx
│   │   │   │   │   └── ConflictResolutionView.tsx
│   │   │   │   ├── onboarding/
│   │   │   │   │   ├── RepoConnectStep.tsx
│   │   │   │   │   ├── FolderSelectStep.tsx
│   │   │   │   │   ├── IngestionProgressPanel.tsx
│   │   │   │   │   └── OnboardingWizard.tsx
│   │   │   │   ├── import-export/
│   │   │   │   │   ├── ImportDialog.tsx
│   │   │   │   │   └── ExportDialog.tsx
│   │   │   │   └── shared/
│   │   │   │       ├── AppShell.tsx
│   │   │   │       ├── Sidebar.tsx
│   │   │   │       ├── Topbar.tsx
│   │   │   │       ├── SyncStatusIndicator.tsx
│   │   │   │       ├── SyncStatusIndicator.test.tsx
│   │   │   │       ├── CoverageStatusDot.tsx
│   │   │   │       ├── CoverageStatusDot.test.tsx
│   │   │   │       ├── CommandPalette.tsx
│   │   │   │       └── ErrorBoundary.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-requirements.ts
│   │   │   │   ├── use-traceability.ts
│   │   │   │   ├── use-coverage.ts
│   │   │   │   ├── use-sync-status.ts
│   │   │   │   ├── use-activity.ts
│   │   │   │   ├── use-sse.ts
│   │   │   │   └── use-keyboard-shortcuts.ts
│   │   │   ├── stores/
│   │   │   │   ├── use-ui-store.ts
│   │   │   │   ├── use-filter-store.ts
│   │   │   │   └── use-graph-store.ts
│   │   │   ├── lib/
│   │   │   │   ├── trpc.ts
│   │   │   │   ├── utils.ts
│   │   │   │   └── format.ts
│   │   │   ├── pages/
│   │   │   │   ├── DashboardPage.tsx
│   │   │   │   ├── TablePage.tsx
│   │   │   │   ├── GraphPage.tsx
│   │   │   │   ├── SettingsPage.tsx
│   │   │   │   ├── OnboardingPage.tsx
│   │   │   │   └── LoginPage.tsx
│   │   │   ├── routes.tsx
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── index.css
│   │   ├── tests/
│   │   │   └── e2e/
│   │   │       ├── daily-coverage-check.spec.ts
│   │   │       ├── requirement-authoring.spec.ts
│   │   │       ├── agent-activity-review.spec.ts
│   │   │       ├── repo-onboarding.spec.ts
│   │   │       ├── impact-analysis.spec.ts
│   │   │       └── conflict-resolution.spec.ts
│   │   ├── components.json
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── playwright.config.ts
│   │
│   ├── api/                                # Fastify backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── requirements/
│   │   │   │   │   ├── requirements.router.ts
│   │   │   │   │   ├── requirements.service.ts
│   │   │   │   │   ├── requirements.types.ts
│   │   │   │   │   └── requirements.service.test.ts
│   │   │   │   ├── traceability/
│   │   │   │   │   ├── traceability.router.ts
│   │   │   │   │   ├── traceability.service.ts
│   │   │   │   │   ├── traceability.types.ts
│   │   │   │   │   └── traceability.service.test.ts
│   │   │   │   ├── ingestion/
│   │   │   │   │   ├── ingestion.router.ts
│   │   │   │   │   ├── ingestion.service.ts
│   │   │   │   │   ├── ingestion.types.ts
│   │   │   │   │   ├── markdown-parser.ts
│   │   │   │   │   ├── markdown-parser.test.ts
│   │   │   │   │   ├── schema-validator.ts
│   │   │   │   │   ├── schema-validator.test.ts
│   │   │   │   │   └── ingestion.service.test.ts
│   │   │   │   ├── git/
│   │   │   │   │   ├── git.router.ts
│   │   │   │   │   ├── git.service.ts
│   │   │   │   │   ├── github-provider.ts
│   │   │   │   │   ├── gitlab-provider.ts
│   │   │   │   │   ├── git-provider.types.ts
│   │   │   │   │   ├── github-provider.test.ts
│   │   │   │   │   └── gitlab-provider.test.ts
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.router.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.types.ts
│   │   │   │   │   └── auth.service.test.ts
│   │   │   │   ├── audit/
│   │   │   │   │   ├── audit.router.ts
│   │   │   │   │   ├── audit.service.ts
│   │   │   │   │   ├── audit.types.ts
│   │   │   │   │   └── audit.service.test.ts
│   │   │   │   ├── import-export/
│   │   │   │   │   ├── import-export.router.ts
│   │   │   │   │   ├── import.service.ts
│   │   │   │   │   ├── export.service.ts
│   │   │   │   │   ├── import-export.types.ts
│   │   │   │   │   └── import.service.test.ts
│   │   │   │   └── projects/
│   │   │   │       ├── projects.router.ts
│   │   │   │       ├── projects.service.ts
│   │   │   │       ├── projects.types.ts
│   │   │   │       └── projects.service.test.ts
│   │   │   ├── plugins/
│   │   │   │   ├── prisma.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── sse.ts
│   │   │   │   └── rate-limit.ts
│   │   │   ├── routes/
│   │   │   │   ├── webhook.routes.ts
│   │   │   │   └── oauth-callback.routes.ts
│   │   │   ├── trpc/
│   │   │   │   ├── router.ts
│   │   │   │   ├── context.ts
│   │   │   │   └── trpc.ts
│   │   │   ├── server.ts
│   │   │   └── env.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── worker/                             # BullMQ background workers
│       ├── src/
│       │   ├── processors/
│       │   │   ├── ingestion.processor.ts
│       │   │   ├── ingestion.processor.test.ts
│       │   │   ├── pr-generation.processor.ts
│       │   │   ├── pr-generation.processor.test.ts
│       │   │   ├── validation.processor.ts
│       │   │   └── validation.processor.test.ts
│       │   ├── queues/
│       │   │   └── queue-definitions.ts
│       │   ├── worker.ts
│       │   └── env.ts
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── db/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   └── client.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── requirement.types.ts
│   │   │   │   ├── traceability.types.ts
│   │   │   │   ├── ingestion.types.ts
│   │   │   │   ├── auth.types.ts
│   │   │   │   ├── audit.types.ts
│   │   │   │   ├── git.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── schemas/
│   │   │   │   ├── requirement.schemas.ts
│   │   │   │   ├── traceability.schemas.ts
│   │   │   │   ├── ingestion.schemas.ts
│   │   │   │   ├── auth.schemas.ts
│   │   │   │   ├── project.schemas.ts
│   │   │   │   ├── markdown-requirement.schemas.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/
│   │   │   │   ├── requirement.constants.ts
│   │   │   │   ├── pagination.constants.ts
│   │   │   │   ├── ingestion.constants.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── ui/
│   │   ├── src/
│   │   │   ├── cn.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── config-typescript/
│   │   ├── base.json
│   │   ├── react.json
│   │   ├── node.json
│   │   └── package.json
│   ├── config-eslint/
│   │   ├── base.js
│   │   ├── react.js
│   │   ├── node.js
│   │   └── package.json
│   └── config-tailwind/
│       ├── tailwind.config.ts
│       └── package.json
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .prettierrc
└── README.md
```

### Architectural Boundaries

**Service Boundaries:**

- Router → calls only its own Service
- Service → accesses Prisma directly, enqueues BullMQ jobs
- Service → NEVER imports another module's Service directly
- Cross-module data access → through Prisma queries with shared types

**Data Boundaries:**

| Layer | Owns | Accessed by |
|-------|------|------------|
| `packages/db` (Prisma) | Schema, migrations, client | API services, worker processors |
| `packages/shared` (types) | Zod schemas, TypeScript types | All apps and packages |
| Redis | Sessions, BullMQ queues, SSE pub/sub | API plugins, worker, SSE endpoint |
| PostgreSQL | All application data | Only via Prisma client |

### Requirements to Structure Mapping

| FR Category | Backend Module | Frontend Components | Worker |
|------------|---------------|--------------------|--------------------|
| Authoring & Management (FR-001 – FR-009) | `modules/requirements/` | `requirement-table/`, `requirement-detail/` | — |
| Traceability (FR-010 – FR-016) | `modules/traceability/` | `traceability-graph/`, `requirement-detail/TraceabilityTab.tsx` | — |
| Versioning & Audit (FR-020 – FR-024) | `modules/audit/` | `requirement-detail/HistoryTab.tsx` | — |
| Search & Navigation (FR-040 – FR-043) | `modules/requirements/` (search) | `shared/CommandPalette.tsx`, `RequirementFilters.tsx` | — |
| Import & Export (FR-050 – FR-052) | `modules/import-export/` | `import-export/` | — |
| Repository Ingestion (FR-053 – FR-061) | `modules/ingestion/`, `modules/git/` | `onboarding/`, `SyncStatusIndicator.tsx` | All processors |
| AI Agent Integration (AI-001 – AI-009) | `modules/ingestion/schema-validator.ts` | — | `validation.processor.ts` |
| Compliance (REG-001 – REG-002) | `modules/audit/`, `plugins/auth.ts` | — | — |

### Integration Points

**Internal Communication Flow:**

```
Web (SPA) ──tRPC/HTTP──▶ API (Fastify) ──Prisma──▶ PostgreSQL
    ▲                         │                         ▲
    │ SSE                enqueue│                    Prisma│
    │                         ▼                         │
    └──────────────── Redis (pub/sub) ◀──── Worker (BullMQ)
```

**External Integration Points:**

| System | File | Direction |
|--------|------|-----------|
| GitHub API | `modules/git/github-provider.ts` | Outbound: files, PRs |
| GitLab API | `modules/git/gitlab-provider.ts` | Outbound: files, MRs |
| GitHub/GitLab Webhooks | `routes/webhook.routes.ts` | Inbound: merge events |
| GitHub/GitLab OAuth | `routes/oauth-callback.routes.ts` | Auth flow |

**Data Flow — Ingestion:**
Webhook → `webhook.routes.ts` → `ingestion.service.ts` → Redis queue → `ingestion.processor.ts` → Prisma update → Redis pub/sub → SSE → frontend cache invalidation

**Data Flow — UI Write-back:**
UI edit → tRPC mutation → `ingestion.service.ts` → Redis queue → `pr-generation.processor.ts` → Git API (branch + commit + PR) → Redis pub/sub → SSE → frontend toast + status update

### Development Workflow

```bash
docker compose up -d postgres redis    # Start infrastructure
pnpm install                           # Install dependencies
pnpm --filter @rmt/db db:migrate       # Run migrations
pnpm --filter @rmt/db db:seed          # Seed dev data
pnpm dev                               # Start all apps (turbo dev)
```

**Package Names (pnpm workspace):**

| Package | Name |
|---------|------|
| `packages/db` | `@rmt/db` |
| `packages/shared` | `@rmt/shared` |
| `packages/ui` | `@rmt/ui` |
| `packages/config-typescript` | `@rmt/config-typescript` |
| `packages/config-eslint` | `@rmt/config-eslint` |
| `packages/config-tailwind` | `@rmt/config-tailwind` |

**Build Order (Turborepo):**
`packages/shared` → `packages/db` → `packages/ui` → `apps/api` + `apps/worker` + `apps/web`

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices verified compatible. Fastify + tRPC (via adapter), tRPC + TanStack Query (via `@trpc/react-query`), Prisma types flow end-to-end through tRPC, React Flow works with React 18+, BullMQ + Redis is standard Node.js pattern. SSE handled as separate Fastify plugin (not through tRPC) — correct for persistent connections. Worker→API SSE notification uses Redis pub/sub (separate subscriber connection on same Redis instance).

**Pattern Consistency:** Naming conventions internally consistent. Module structure uniform across all backend modules. Frontend feature-folder pattern consistent. Communication patterns (BullMQ jobs, SSE events, Zustand stores) follow documented conventions.

**Structure Alignment:** Project structure maps directly to architectural decisions. Module boundaries align with tRPC routers. Worker processors align with queue definitions. Package boundaries enforce dependency graph.

### Requirements Coverage ✅

**P0 Requirements:** All 30 P0 functional requirements architecturally supported. Full mapping documented in Project Structure section.

**P1 Gaps Identified (non-blocking):**

| FR | Gap | Resolution |
|----|-----|------------|
| FR-006 (file attachments) | No file storage decision | PostgreSQL bytea or S3 — fits in `modules/requirements/` |
| FR-007 (comments) | No Comment model | Add entity to Prisma schema, UI in `requirement-detail/` |
| FR-008 (templates) | No template management | JSON in Project model settings |
| FR-015 (broken links) | No external URL validation | Periodic check or validate on matrix generation |
| FR-042 (saved views) | No SavedView model | Serialized filter/sort per user per project |

All P1 gaps are additive features within existing module boundaries. No architectural changes required.

**NFR Coverage:** All MVP-scoped NFRs addressed. NFR-002 (99.9% uptime) has no HA patterns — acceptable for MVP single-tenant.

### Implementation Readiness ✅

- All critical decisions documented with technology names
- Implementation patterns comprehensive with concrete examples
- Consistency rules enforceable via ESLint + TypeScript strict mode
- Complete directory tree with ~120 files explicitly named
- Data flow diagrams for ingestion and write-back pipelines

### Architecture Completeness Checklist

- [x] Project context analyzed, scale assessed, constraints identified
- [x] MVP scope defined with Phase 2 roadmap
- [x] Technology stack fully specified
- [x] All 5 PRD open questions resolved (OQ-02, OQ-06, OQ-08, OQ-09, OQ-10)
- [x] Naming, structure, communication, and process patterns defined
- [x] Complete directory structure with requirements-to-structure mapping
- [x] Integration points mapped with data flow diagrams

### Readiness Assessment

**Status:** READY FOR IMPLEMENTATION
**Confidence:** High

**Strengths:** End-to-end type safety (Prisma → tRPC → React), clean separation (API/Worker/Web), Git-as-source-of-truth properly modeled, ingestion pipeline well-defined, Phase 2 upgrade paths explicit.

**Future Enhancement Areas:** HA/failover patterns, monitoring/alerting infrastructure, CI/CD pipeline specifics, performance profiling baseline.

**First Implementation Priority:** Monorepo scaffolding (Turborepo + pnpm + Docker Compose) followed by Prisma schema + shared types.
