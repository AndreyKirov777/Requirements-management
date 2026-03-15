---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - PRD-Requirements-Management-Traceability.md
  - ux-design-specification.md
workflowType: 'architecture'
project_name: 'Requirements-management'
user_name: 'Andreisadakov'
date: '2026-03-15'
lastStep: 8
status: 'complete'
completedAt: '2026-03-15'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The PRD defines 37 functional requirements across six major areas: requirement authoring and management, traceability, versioning and audit trail, search and navigation, import and export, and repository ingestion with graph construction.

Architecturally, these requirements imply three major capability groups:

1. Interactive product workflows for authors, reviewers, QA, compliance users, and DevOps operators, including requirement editing, traceability review, baseline comparison, search, exports, and conflict resolution.
2. Repository-native synchronization workflows, including webhook ingestion, markdown parsing, validation, graph updates, PR/MR generation for UI-authored changes, manual reindexing, and reconciliation.
3. Derived traceability and reporting workflows, including matrix generation, graph traversal, orphan detection, audit history, compliance exports, and coverage visibility.

The requirements are not centered on a single user role. They span five personas and require the architecture to support both human-driven UI workflows and machine-driven Git/CI workflows without duplicating source-of-truth responsibilities.

**Non-Functional Requirements:**
The NFR set strongly shapes the architecture:

- Performance targets for large requirement sets, traceability matrix generation, and API responsiveness require indexed queries, careful pagination, and efficient derived read models.
- Availability and reliability targets require resilient webhook ingestion, retries, dead-letter handling, and operational visibility.
- Security requirements still require strong authentication, RBAC, and clear system boundaries in a single-tenant deployment model.
- Auditability and compliance requirements require append-only audit storage, baseline immutability, long retention, and exportable evidence trails.
- Ingestion freshness and consistency requirements require asynchronous processing with bounded lag, idempotency, and explicit sync-state modeling per requirement.
- Deployment requirements imply architecture portable across single-tenant cloud and private/on-prem regulated environments.

**Scale & Complexity:**
This is a high-complexity full-stack web platform with heavy backend and integration concerns.

- Primary domain: Git-backed requirements management and traceability platform
- Complexity level: High
- Estimated architectural components: 8-10 core components/modules

The complexity is driven less by pure UI breadth and more by synchronization correctness, traceability modeling, audit constraints, integration boundaries, and operator-visible consistency states.

### Technical Constraints & Dependencies

Known constraints and dependencies from the PRD and UX specification:

- Git is the single source of truth for requirement content.
- The application database stores derived graph, coverage, audit, and synchronization state.
- UI-originated requirement changes must be written back via pull/merge requests only.
- GitHub and GitLab are the only repository platforms in v1.
- The system must support CI/CD-consumable validation and status outputs for AI SDLC workflows.
- Core authenticated experiences target desktop and tablet web; mobile authoring is out of scope for v1.
- The UX depends on trustworthy near-real-time sync visibility and fast drill-down from dashboard to detail.
- Integrations include Jira, GitHub Issues, GitLab Issues, Linear, Slack, and generic outbound webhooks.
- The product targets a single-tenant deployment model per environment.

Open questions with architectural significance remain around conflict policy for concurrent agent changes, file granularity in the repository model, baseline-to-Git mapping, invalid markdown remediation after merge, and CI/CD gating thresholds.

### Cross-Cutting Concerns Identified

The following concerns will affect multiple architectural components:

- RBAC across all interactive and integration-facing surfaces
- End-to-end auditability for human and agent actions
- Idempotent event handling for webhook and publish flows
- Sync-state transparency (`in_sync`, `pending`, `conflict`, `failed`) across UI and APIs
- High-performance search, filtering, and traceability traversal at large scale
- Background job orchestration for ingestion, reconciliation, export generation, and PR/MR publishing
- Observability for ingestion freshness, retries, failures, drift detection, and operator intervention
- Schema validation and machine-readable feedback for AI agents and CI pipelines
- Export and reporting pipelines for compliance, baselines, and release-readiness evidence
- Portability across cloud and regulated private deployments

## Starter Template Evaluation

### Primary Technology Domain

Full-stack TypeScript web platform based on project requirements analysis.

The product needs:

- a dense desktop-first React frontend
- authenticated server-rendered or hybrid-rendered application surfaces
- API endpoints for UI and integrations
- background workers for ingestion, reconciliation, export generation, and PR/MR publishing
- shared schema and validation packages usable by both application code and CI/CD tooling

### Starter Options Considered

**Option 1: shadcn monorepo with Next.js**

- Establishes a monorepo with Turborepo
- Creates a Next.js application as the primary web app
- Supports shadcn/ui component installation in a monorepo structure
- Fits the UX direction already documented: Tailwind CSS, Radix-based components, dense application UI
- Leaves clean room for later `apps/worker`, `packages/domain`, `packages/db`, `packages/validation`, and `packages/ui`

**Option 2: create-next-app**

- Official, low-friction starting point
- Excellent if the system stays as a single application for longer
- Less suitable as an initial foundation for separate ingestion workers, validator CLI tooling, and shared internal packages

**Option 3: TanStack Start**

- Interesting full-stack React framework with strong routing and server capabilities
- Official docs currently describe it as release candidate
- Not selected because this project benefits from a more mature and operationally conservative default

### Selected Starter: shadcn monorepo with Next.js

**Rationale for Selection:**
This option best matches the documented frontend architecture and gives the project the right repository shape early.

It supports:

- Next.js for the main authenticated web application
- Turborepo for shared packages and future multi-app expansion
- shadcn/ui monorepo support for the design system and dense desktop workflows
- a clean path to add worker, API, schema, and validation packages without a repo restructure

It also avoids prematurely committing to a backend framework before later architecture decisions cover ingestion, job execution, and service boundaries in detail.

**Initialization Command:**

```bash
pnpm dlx shadcn@latest init -t next --monorepo
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**

- TypeScript-first JavaScript platform
- React-based web application through Next.js
- Node.js-based development/runtime toolchain

**Styling Solution:**

- Tailwind CSS-based styling foundation
- shadcn/ui-compatible component structure
- Radix-friendly component model for accessible interaction patterns

**Build Tooling:**

- Turborepo workspace build orchestration
- Next.js application build pipeline for the main web app

**Testing Framework:**

- No opinionated end-to-end domain testing architecture chosen yet
- Leaves room to add unit, integration, and Playwright-style UI testing as explicit later decisions

**Code Organization:**

- Monorepo structure suitable for `apps/` and `packages/`
- Shared UI package ready for design system growth
- Clean future separation between web app, worker processes, domain packages, and validation tooling

**Development Experience:**

- Fast local iteration through Next.js
- Shared-package workflow through Turborepo
- Direct compatibility with the documented component strategy built around shadcn/ui

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- Use a modular monolith architecture with a separate worker process, all inside a TypeScript monorepo.
- Use PostgreSQL as the system of record for derived application state.
- Model traceability in PostgreSQL using relational tables plus recursive queries, not a separate graph database in v1.
- Use Redis-backed BullMQ queues for ingestion, reconciliation, export, and PR/MR publish jobs.
- Use versioned REST endpoints under `/api/v1` and webhook endpoints for inbound integrations.
- Use enterprise authentication via OIDC-compatible identity providers with application-level RBAC.
- Deploy as containerized services with separate `web` and `worker` deploy units.

**Important Decisions (Shape Architecture):**

- Use Prisma ORM v7 for schema, migrations, and typed data access.
- Use Zod 4 for shared schema validation at API, worker, and CLI boundaries.
- Use PostgreSQL full-text search for v1 instead of Elasticsearch.
- Use Next.js as a backend-for-frontend for UI-facing APIs, but keep worker and domain logic outside UI route handlers.
- Use URL-driven state plus server-fetched data for main table/filter flows; reserve client-side state stores for ephemeral UI state only.
- Use OpenTelemetry for tracing and metrics across web, worker, and ingestion flows.

**Deferred Decisions (Post-MVP):**

- Separate graph database adoption if PostgreSQL traversal becomes a bottleneck.
- Elasticsearch or OpenSearch if PostgreSQL full-text search becomes insufficient.
- GraphQL API for power users.
- Multi-region or data-residency architecture.
- Mobile-specific experience optimization.

### Data Architecture

- **Primary database:** PostgreSQL 18.3
- **ORM and migrations:** Prisma ORM v7 with Prisma Migrate
- **Validation layer:** Zod 4 shared across API contracts, worker payloads, markdown-schema validation, and CI tooling
- **Traceability model:** Relational core with adjacency-style link tables, recursive CTE traversal, and precomputed read-model tables for dashboard and matrix queries
- **Search:** PostgreSQL full-text search in v1
- **Caching and queues:** Redis plus BullMQ
- **File and export storage:** S3-compatible object storage for attachments and generated exports

**Rationale:**
A separate graph database would add operational and consistency complexity too early. Because Git is the source of truth and the application database is already a derived system, v1 should avoid introducing another derived persistence layer unless query pressure proves it necessary.

**Data modeling decisions:**

- `requirements`, `traceability_links`, `audit_entries`, `baselines`, `ingestion_events`, `ingestion_conflicts`, `external_links`, `exports`
- explicit sync-state fields on requirements and ingestion artifacts
- append-only audit records
- immutable baseline snapshots
- idempotency keys stored for webhook and publish flows

### Authentication & Security

- **Authentication pattern:** Enterprise SSO through OIDC-compatible providers; provider choice remains deploy-environment specific
- **Authorization model:** RBAC with `viewer`, `author`, `reviewer`, `administrator`
- **Session model:** Database-backed sessions for authenticated users
- **Webhook security:** HMAC signature verification plus replay protection
- **Secrets management:** Environment-backed secret references with managed secret store support in deployed environments
- **Transport and storage:** TLS 1.3+ in transit, encrypted storage at rest

**Rationale:**
This product is internal/team-facing, compliance-sensitive, and expected to run in private environments. That makes standards-based enterprise auth a better fit than consumer-oriented auth flows or vendor-locked hosted identity assumptions.

**Inference from user guidance:**
Auth and authorization do not need tenant scoping, tenant claims, tenant-aware row partitioning, or tenant admin concepts in v1.

### API & Communication Patterns

- **Primary API style:** REST JSON under `/api/v1`
- **Frontend communication:** Next.js backend-for-frontend pattern for UI-facing endpoints
- **Inbound integration pattern:** Public webhook endpoints with verification, normalization, deduplication, and queue handoff
- **Internal async communication:** Queue-driven jobs and domain events, not synchronous service-to-service RPC by default
- **Error contract:** Structured machine-readable errors with stable codes, human-readable messages, and remediation hints
- **Rate limiting:** Endpoint-class-based rate limits, stricter on webhook and export-triggering endpoints
- **API documentation:** OpenAPI generated from route contracts and shared schemas

**Rationale:**
The UI needs tightly coupled application-specific APIs, while ingestion and export flows are fundamentally asynchronous. A REST+BFF+queue model fits that shape better than GraphQL or a microservice mesh in v1.

### Frontend Architecture

- **App framework:** Next.js 16 App Router
- **Rendering model:** Server Components for initial data-heavy pages, Client Components for graph, editor, command palette, and interactive overlays
- **UI system:** shadcn/ui + Tailwind CSS + Radix primitives
- **Form strategy:** React Hook Form with Zod-backed validation
- **State strategy:**
  - URL/search params for filters, selected views, and shareable navigation state
  - server-fetched data as source of truth
  - lightweight client store only for ephemeral UI state like open panels, graph interaction state, and local draft buffers
- **Data table and dense UI:** TanStack Table-style tabular patterns
- **Graph experience:** dedicated client-side graph module with progressive loading, clustering, and focused traversal modes

**Rationale:**
This product is data-dense and trust-sensitive. The frontend should minimize duplicated client-side data state and lean on server-fetched truth, while isolating high-interaction components to client islands.

### Infrastructure & Deployment

- **Deployable units:** `web`, `worker`, `db`, `redis`, object storage, observability stack
- **Container strategy:** Docker images with Kubernetes-targeted deployment manifests
- **Runtime topology:** single-tenant deployment per environment
- **Observability:** OpenTelemetry instrumentation plus structured logs and queue/job metrics
- **CI/CD:** monorepo pipeline with typecheck, lint, unit tests, integration tests, Playwright end-to-end tests, Prisma migration checks, and markdown-schema validation CLI runs
- **Operational controls:** dead-letter queues, retry policies, job dashboards, ingestion drift checks, and explicit reconciliation tools
- **Scalability approach:** scale `web` and `worker` independently; keep PostgreSQL central; introduce specialized infrastructure only after measured bottlenecks

**Rationale:**
The main operational risk is not page rendering. It is ingestion correctness, freshness, and recoverability. Infrastructure choices should optimize for observable asynchronous workflows rather than premature service fragmentation.

### Decision Impact Analysis

**Implementation Sequence:**

1. Initialize monorepo and web app foundation
2. Stand up PostgreSQL, Prisma schema, and migrations
3. Add Redis and BullMQ worker infrastructure
4. Implement authentication and RBAC
5. Implement requirement, link, audit, and ingestion domain models
6. Build webhook ingestion and markdown validation pipeline
7. Build dashboard, table, and detail overlay read models
8. Add export generation, conflict resolution, and CI validation tooling
9. Add external integrations and operator tooling

**Cross-Component Dependencies:**

- PostgreSQL schema design drives API shape, worker payloads, and frontend read models
- Queue architecture drives ingestion freshness, retries, and operational visibility
- Auth/RBAC affects every mutation path, export path, and operator control
- Read-model strategy affects dashboard latency, graph usability, and matrix generation performance
- Shared validation contracts reduce drift across UI, worker, API, and CI tooling

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
12 areas where different implementers could otherwise make incompatible choices: database naming, API route shape, schema placement, domain-module boundaries, queue job naming, event payloads, response/error formats, date handling, state ownership, test placement, logging structure, and retry/idempotency behavior.

### Naming Patterns

**Database Naming Conventions:**

- Table names use plural `snake_case`: `requirements`, `traceability_links`, `audit_entries`
- Column names use `snake_case`: `requirement_id`, `created_at`, `last_synced_commit_sha`
- Primary keys use `id`
- Foreign keys use `{referenced_entity}_id`
- Join tables use pluralized domain naming, not generic names
- Index names use `idx_{table}_{column_list}`
- Unique constraints use `uq_{table}_{column_list}`

**API Naming Conventions:**

- REST resources use plural nouns: `/api/v1/requirements`, `/api/v1/baselines`, `/api/v1/exports`
- Path params use bracketed resource IDs in implementation and `{resourceId}` in documentation
- Query params use `camelCase`: `projectId`, `coverageStatus`, `pageSize`
- Webhook routes use explicit provider/resource naming: `/api/v1/webhooks/github`, `/api/v1/webhooks/gitlab`
- Operator actions use verb subroutes only when not naturally resource-oriented: `/api/v1/ingestion/reindex`, `/api/v1/conflicts/{conflictId}/resolve`

**Code Naming Conventions:**

- React component names use `PascalCase`
- TypeScript files use `kebab-case` except React component entry files when colocated with framework expectations
- Functions and variables use `camelCase`
- Type names, interfaces, and Zod schemas use `PascalCase`
- Constants use `SCREAMING_SNAKE_CASE`
- Queue names and event names use `dot.case`: `ingestion.webhook.received`, `export.traceability.requested`

### Structure Patterns

**Project Organization:**

- Organize by bounded domain first, shared technical layer second
- Domain logic must not live directly inside Next.js route handlers or React components
- Shared contracts, schema definitions, and validation logic live in workspace packages
- Worker-specific job orchestration lives outside the web app
- Database access is centralized behind domain repositories/services, not called ad hoc from UI code

**Monorepo Shape:**

- `apps/web` for the Next.js application
- `apps/worker` for BullMQ processors and scheduled jobs
- `packages/domain` for domain models, services, and business rules
- `packages/db` for Prisma schema, migrations, and database access
- `packages/contracts` for API schemas, DTOs, event payload schemas, and shared enums
- `packages/validation` for markdown-schema and CI validation logic
- `packages/ui` for shared UI primitives and higher-level reusable components
- `packages/config` for shared TypeScript, lint, test, and build config

**Test Placement:**

- Unit tests colocated with source as `*.test.ts` or `*.test.tsx`
- Integration tests grouped near the owning package or app under `tests/integration`
- End-to-end tests under a dedicated top-level or app-level `tests/e2e`
- Queue/job contract tests live with worker or contract packages, not scattered in feature folders

### Format Patterns

**API Response Formats:**

- Success responses return direct resource-shaped JSON for reads unless pagination/metadata is required
- Collection endpoints use:
  ```json
  {
    "items": [],
    "page": 1,
    "pageSize": 50,
    "totalItems": 0
  }
  ```
- Mutation responses include the changed resource plus machine-readable operation metadata when needed
- Error responses use a standard envelope:
  ```json
  {
    "error": {
      "code": "INGESTION_CONFLICT",
      "message": "Human-readable summary",
      "details": {},
      "retryable": false
    }
  }
  ```

**Data Exchange Formats:**

- External JSON exposed by the application uses `camelCase`
- Database and Prisma mappings remain `snake_case` at storage level
- Date/time values are always ISO 8601 UTC strings at API boundaries
- IDs are strings at API boundaries even if internally backed by UUID columns
- Null is preferred over omitted fields when a field is known but absent; omit only for truly optional fields
- Sync status uses the canonical enum set: `in_sync`, `pending`, `conflict`, `failed`

### Communication Patterns

**Event System Patterns:**

- Events use `dot.case` naming by domain and action: `requirement.created`, `ingestion.conflict.detected`, `export.completed`
- Event payloads include:
  - `eventId`
  - `eventType`
  - `occurredAt`
  - `schemaVersion`
  - `actor`
  - `resource`
  - `context`
- Event payload schemas are defined in shared contracts and validated before publish/consume
- Events are integration and workflow signals, not a substitute for direct transactional domain logic

**Queue and Job Patterns:**

- Queue names are stable and capability-based: `ingestion`, `exports`, `publish`, `notifications`
- Jobs use verb-oriented names: `processWebhookEvent`, `rebuildProjectReadModel`, `publishRequirementPullRequest`
- Every job payload carries an idempotency key when replay risk exists
- Retry policy is configured centrally per job class, not ad hoc in handlers
- Dead-letter handling is mandatory for externally triggered critical jobs

**State Management Patterns:**

- Server state comes from server fetches and database-backed APIs
- URL state owns filters, sorting, selected project/module, and deep-linkable UI context
- Client state stores are limited to ephemeral interaction state such as overlay visibility, graph focus, and unsaved draft UI buffers
- Do not duplicate server resources into multiple unsynchronized client stores

### Process Patterns

**Error Handling Patterns:**

- Domain errors are explicit typed errors with stable codes
- Route handlers translate domain errors into standard API error envelopes
- User-facing UI messages are concise and actionable; logs contain diagnostic detail
- Validation failures must include remediation hints where possible
- Conflict and ingestion failures are surfaced as product states, not hidden implementation exceptions

**Loading and Async Patterns:**

- Background operations over 300 ms show local progress or pending state
- Queue-backed workflows expose durable statuses the UI can poll or subscribe to
- No blocking full-screen loaders for local edits or drill-down interactions
- Sync and publish flows must always expose intermediate states: pending, applied, failed, conflict

**Validation Patterns:**

- Zod schemas define external contracts
- Domain invariants are enforced in domain services, not only in route handlers
- Markdown requirement validation is implemented once in shared validation code and reused by worker, API, and CI tooling
- Prisma schema constraints backstop, but do not replace, application-level validation

**Logging and Observability Patterns:**

- Structured JSON logs only
- Every request/job includes correlation IDs and actor context
- Web, worker, and queue logs share a common field vocabulary
- Ingestion, publish, and export flows emit metrics and traces by default

### Consistency Rules for AI Implementers

- Do not put business rules in React components or route handlers
- Do not access Prisma directly from UI-layer code
- Do not invent new response or error formats outside shared contracts
- Do not create new queue payload shapes without shared schema definitions
- Do not bypass idempotency handling for webhook or publish flows
- Do not create alternative sync-state labels beyond the canonical enum
- Do not introduce tenant concepts unless architecture is explicitly revised

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
requirements-management/
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── biome.json
├── .gitignore
├── .editorconfig
├── .env.example
├── docker-compose.yml
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── operations/
│   └── adr/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── validate-requirements.yml
│       └── deploy.yml
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── middleware.ts
│   │   ├── public/
│   │   │   └── icons/
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/
│   │       │   │   ├── sign-in/page.tsx
│   │       │   │   └── error/page.tsx
│   │       │   ├── (app)/
│   │       │   │   ├── layout.tsx
│   │       │   │   ├── dashboard/page.tsx
│   │       │   │   ├── requirements/
│   │       │   │   │   ├── page.tsx
│   │       │   │   │   ├── [requirementId]/page.tsx
│   │       │   │   │   └── loading.tsx
│   │       │   │   ├── graph/page.tsx
│   │       │   │   ├── baselines/
│   │       │   │   │   ├── page.tsx
│   │       │   │   │   └── [baselineId]/page.tsx
│   │       │   │   ├── conflicts/page.tsx
│   │       │   │   ├── exports/page.tsx
│   │       │   │   ├── activity/page.tsx
│   │       │   │   ├── settings/
│   │       │   │   │   ├── repository/page.tsx
│   │       │   │   │   ├── roles/page.tsx
│   │       │   │   │   ├── integrations/page.tsx
│   │       │   │   │   └── validation/page.tsx
│   │       │   │   └── api/
│   │       │   │       └── v1/
│   │       │   │           ├── requirements/
│   │       │   │           ├── traceability/
│   │       │   │           ├── baselines/
│   │       │   │           ├── conflicts/
│   │       │   │           ├── exports/
│   │       │   │           ├── integrations/
│   │       │   │           ├── ingestion/
│   │       │   │           ├── webhooks/
│   │       │   │           │   ├── github/route.ts
│   │       │   │           │   └── gitlab/route.ts
│   │       │   │           └── auth/
│   │       │   ├── components/
│   │       │   │   ├── app-shell/
│   │       │   │   ├── dashboard/
│   │       │   │   ├── requirements/
│   │       │   │   ├── graph/
│   │       │   │   ├── baselines/
│   │       │   │   ├── conflicts/
│   │       │   │   ├── exports/
│   │       │   │   └── activity/
│   │       │   ├── hooks/
│   │       │   ├── lib/
│   │       │   │   ├── server/
│   │       │   │   ├── client/
│   │       │   │   └── auth/
│   │       │   └── styles/
│   │       └── tests/
│   │           ├── integration/
│   │           └── e2e/
│   └── worker/
│       ├── package.json
│       └── src/
│           ├── main.ts
│           ├── queues/
│           │   ├── ingestion.queue.ts
│           │   ├── publish.queue.ts
│           │   ├── exports.queue.ts
│           │   └── notifications.queue.ts
│           ├── jobs/
│           │   ├── process-webhook-event.job.ts
│           │   ├── validate-requirement-markdown.job.ts
│           │   ├── update-traceability-read-model.job.ts
│           │   ├── publish-requirement-pr.job.ts
│           │   ├── generate-traceability-export.job.ts
│           │   └── reconcile-conflict.job.ts
│           ├── schedulers/
│           │   └── drift-check.scheduler.ts
│           └── tests/
│               ├── integration/
│               └── contract/
├── packages/
│   ├── config/
│   │   ├── typescript/
│   │   ├── eslint/
│   │   ├── biome/
│   │   └── vitest/
│   ├── db/
│   │   ├── package.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   └── src/
│   │       ├── client.ts
│   │       ├── repositories/
│   │       └── queries/
│   ├── contracts/
│   │   ├── package.json
│   │   └── src/
│   │       ├── api/
│   │       ├── events/
│   │       ├── enums/
│   │       ├── errors/
│   │       └── pagination/
│   ├── domain/
│   │   ├── package.json
│   │   └── src/
│   │       ├── requirements/
│   │       ├── traceability/
│   │       ├── baselines/
│   │       ├── ingestion/
│   │       ├── conflicts/
│   │       ├── exports/
│   │       ├── audit/
│   │       ├── integrations/
│   │       ├── auth/
│   │       └── shared/
│   ├── validation/
│   │   ├── package.json
│   │   └── src/
│   │       ├── markdown-schema/
│   │       ├── ci-rules/
│   │       ├── api-schemas/
│   │       └── error-formatting/
│   ├── ui/
│   │   ├── package.json
│   │   └── src/
│   │       ├── components/
│   │       │   ├── ui/
│   │       │   ├── data-table/
│   │       │   ├── graph-canvas/
│   │       │   ├── detail-overlay/
│   │       │   └── sync-status/
│   │       └── styles/
│   ├── observability/
│   │   ├── package.json
│   │   └── src/
│   │       ├── logging/
│   │       ├── tracing/
│   │       └── metrics/
│   └── testing/
│       ├── package.json
│       └── src/
│           ├── fixtures/
│           ├── factories/
│           ├── integration/
│           └── e2e/
└── scripts/
    ├── bootstrap.ts
    ├── validate-requirements.ts
    ├── seed-dev.ts
    └── backfill-read-models.ts
```

### Architectural Boundaries

**API Boundaries:**

- `apps/web/src/app/api/v1/*` exposes only HTTP concerns: auth, parsing, response shaping, error translation.
- Route handlers call domain services from `packages/domain`, never Prisma directly.
- Webhook endpoints only verify, normalize, and enqueue work.
- Long-running operations never execute inline in request handlers.

**Component Boundaries:**

- `apps/web/src/components/*` owns presentation and interaction only.
- Shared primitives live in `packages/ui`; product-specific composed views stay in `apps/web`.
- Graph rendering, overlays, and command palette can hold client interaction state, but business rules remain in domain services.

**Service Boundaries:**

- `packages/domain/requirements` owns authoring, versioning, and restore flows.
- `packages/domain/traceability` owns links, traversal rules, matrix logic, and read-model coordination.
- `packages/domain/ingestion` owns webhook normalization, markdown parsing orchestration, idempotency, and sync-state transitions.
- `packages/domain/conflicts` owns reconciliation policy and conflict lifecycle.
- `packages/domain/exports` owns export jobs and compliance/report packaging.
- `packages/domain/auth` owns RBAC policy evaluation and identity mapping.

**Data Boundaries:**

- `packages/db` is the only package that talks to Prisma.
- Read-model queries for dashboard, tables, and graph summaries live in `packages/db/src/queries`.
- Domain services can depend on repository/query interfaces, not app-local database calls.
- Attachments and generated exports are stored outside PostgreSQL in object storage, with metadata tracked in the database.

### Requirements to Structure Mapping

**FR Category Mapping:**

- Requirement Authoring & Management (`FR-001` to `FR-009`) -> `packages/domain/requirements`, `apps/web/src/app/(app)/requirements`, `apps/web/src/components/requirements`
- Traceability (`FR-010` to `FR-016`) -> `packages/domain/traceability`, `apps/web/src/app/(app)/graph`, `apps/web/src/components/graph`
- Versioning & Audit Trail (`FR-020` to `FR-024`) -> `packages/domain/audit`, `packages/domain/baselines`, `apps/web/src/app/(app)/baselines`, `apps/web/src/app/(app)/activity`
- Search & Navigation (`FR-040` to `FR-043`) -> `packages/db/src/queries`, `apps/web/src/app/(app)/requirements`, `packages/ui/src/components/data-table`
- Import & Export (`FR-050` to `FR-052`) -> `packages/domain/exports`, `apps/worker/src/jobs/generate-traceability-export.job.ts`, `apps/web/src/app/(app)/exports`
- Repository Ingestion & Graph Construction (`FR-053` to `FR-061`) -> `packages/domain/ingestion`, `packages/validation`, `apps/worker/src/jobs/*`, `apps/web/src/app/api/v1/webhooks/*`, `apps/web/src/app/(app)/conflicts`

**Cross-Cutting Concerns:**

- RBAC -> `packages/domain/auth`, `apps/web/src/lib/auth`, `apps/web/middleware.ts`
- Validation contracts -> `packages/contracts`, `packages/validation`
- Observability -> `packages/observability`
- Shared UI system -> `packages/ui`
- Test fixtures and helpers -> `packages/testing`

### Integration Points

**Internal Communication:**

- `web` calls domain services synchronously for interactive flows.
- `webhook` and operator-triggered endpoints enqueue worker jobs through BullMQ.
- Worker jobs call domain services and repository/query layers, then emit events/logs/metrics.

**External Integrations:**

- GitHub/GitLab inbound webhooks enter via `apps/web/src/app/api/v1/webhooks/*`
- Jira, GitHub Issues, GitLab Issues, Linear, Slack, and generic outbound webhooks are coordinated from `packages/domain/integrations`
- CI validation entry points live in `packages/validation` and `scripts/validate-requirements.ts`

**Data Flow:**

1. Git event or UI action enters through `web`
2. request is authorized and normalized
3. domain service executes sync-safe rules or enqueues async work
4. worker processes durable jobs
5. database read models update
6. UI reads from query-oriented views
7. exports/notifications/integration callbacks are triggered from worker flows

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:**
The selected stack is internally coherent. Next.js, TypeScript, Prisma, PostgreSQL, Redis, BullMQ, Zod, and OpenTelemetry fit the chosen modular monolith plus worker architecture without introducing conflicting runtime or ownership models. The decision to use PostgreSQL for both relational storage and traceability traversal remains consistent with the v1 scope and avoids unnecessary operational fragmentation.

**Pattern Consistency:**
Implementation patterns support the architecture well. Naming rules, API contracts, queue/job conventions, validation boundaries, and state ownership rules all reinforce the selected stack and reduce ambiguity between future implementers. The patterns are specific enough to prevent drift across UI, route handlers, workers, and shared packages.

**Structure Alignment:**
The project structure reflects the architecture correctly. The separation between `apps/web`, `apps/worker`, `packages/domain`, `packages/db`, `packages/contracts`, `packages/validation`, and `packages/ui` matches the intended boundaries and supports the consistency rules already defined.

### Requirements Coverage Validation

**Feature Coverage:**
All major functional requirement groups are architecturally covered:

- requirement authoring and management
- traceability and graph exploration
- versioning, baselines, and audit history
- search and navigation
- imports, exports, and reporting
- repository ingestion, synchronization, and conflict resolution

**Functional Requirements Coverage:**
All FR categories have a mapped architectural home in the project structure and domain boundaries. Cross-cutting capabilities such as sync-state visibility, validation, auditability, and export generation are supported by explicit worker, domain, and query-layer decisions.

**Non-Functional Requirements Coverage:**
The architecture addresses performance, reliability, auditability, observability, security, and ingestion freshness requirements within the defined single-tenant product scope.

### Implementation Readiness Validation

**Decision Completeness:**
Critical implementation-shaping decisions are documented with enough specificity for execution: stack, persistence model, API style, queueing model, auth direction, deployment topology, and observability strategy.

**Structure Completeness:**
The project tree is sufficiently concrete for implementation kickoff. It defines deployable units, package ownership, app boundaries, and likely file locations for each major capability area.

**Pattern Completeness:**
The implementation patterns cover the main areas where AI or human implementers would otherwise diverge: naming, API shapes, validation, queue payloads, state ownership, logging, and layering rules.

### Gap Analysis Results

**Critical Gaps:**

- None inside the architecture itself.

**Important Gaps:**

- Open questions still remain for conflict policy, file granularity in the repository model, baseline-to-Git mapping, and invalid-markdown remediation after merge.

**Nice-to-Have Gaps:**

- Add ADRs for repository file granularity, conflict resolution policy, and baseline semantics.
- Add example API contracts and queue payload examples in follow-on docs.
- Add a first-pass schema draft before epics/stories or sprint planning.

### Validation Issues Addressed

The architecture is aligned to the current product scope: single-tenant deployment per environment, Git-backed synchronization, and operator-visible async workflows.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**

- Clear source-of-truth model around Git plus derived database state
- Strong separation between interactive app logic and asynchronous worker flows
- Implementation patterns specific enough to constrain future contributors
- Project structure aligned with domain boundaries rather than framework convenience

**Areas for Future Enhancement:**

- PRD reconciliation
- ADR set for unresolved repository-model questions
- early schema draft and read-model definitions
- implementation-level examples for API and worker contracts

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions

**First Implementation Priority:**
Initialize the monorepo foundation with the selected starter:
`pnpm dlx shadcn@latest init -t next --monorepo`
