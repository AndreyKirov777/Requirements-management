# Story 1.2: Configure Requirement Sync Rules for a Project

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an administrator,
I want to define the requirements folder, branch policy, and markdown-schema rules for a connected repository,
so that the system knows exactly which files are authoritative and how they should be validated before synchronization.

## Acceptance Criteria

1. Given a project has a valid connected repository, when I open the repository sync configuration for that project, then I can define the requirements root folder, allowed file naming convention, and default branch or merge policy used for requirement synchronization, and the system saves those rules as project-level sync settings.
2. Given I am configuring markdown requirements for a project, when I specify required frontmatter fields and supported body sections from the documented schema, then the system stores the schema version and project validation rules, and those rules become the basis for later ingestion and validation behavior.
3. Given I enter an invalid folder path, unsupported naming convention, or incomplete schema configuration, when I try to save the sync rules, then the system blocks the save, and it highlights the exact configuration errors with remediation guidance.
4. Given a project already has sync rules configured, when I return to the sync settings screen, then I can view the current repository folder, branch policy, naming convention, and schema settings, and I can tell whether the project is ready for webhook-based ingestion.
5. Given sync rules are created or changed, when the configuration is saved successfully, then the system records an audit event showing what sync rules changed and who changed them, and later ingestion jobs use the latest saved configuration rather than hard-coded defaults.

## Tasks / Subtasks

- [x] Extend project persistence for repository sync configuration (AC: 1, 2, 4, 5)
  - [x] Add a `RepositorySyncConfig` model in `packages/db/prisma/schema.prisma` with a one-to-one relationship to `Project`.
  - [x] Persist at minimum `requirements_root_path`, `naming_convention`, `branch_policy`, `schema_version`, `required_frontmatter_fields`, `required_body_sections`, readiness timestamps, and audit provenance fields.
  - [x] Keep repository connection data from Story 1.1 separate from sync-rule configuration so provider connectivity and sync readiness can evolve independently.
- [x] Implement the administrator sync-settings flow in the web app (AC: 1, 4)
  - [x] Build a settings screen under `apps/web/src/app/(app)/settings/repository` for editing root folder, naming convention, branch policy, and schema rules.
  - [x] Show the saved current configuration on reload together with a clear readiness state for webhook-based ingestion.
  - [x] Reuse the onboarding path from Story 1.1 rather than creating a separate standalone configuration experience.
- [x] Validate repository scope and markdown schema before save (AC: 1, 2, 3)
  - [x] Add a domain service that uses the provider integration boundary to inspect the configured repository path and confirm it exists on the target branch.
  - [x] Validate naming convention input and schema completeness through shared Zod contracts rather than ad hoc UI-only rules.
  - [x] Return precise remediation messages for invalid folder paths, unsupported naming rules, and incomplete schema definitions.
- [x] Publish a reusable markdown-schema contract for later worker and CI reuse (AC: 2, 3, 5)
  - [x] Define the canonical schema version and project override model in `packages/contracts` and `packages/validation`.
  - [x] Represent required frontmatter fields and allowed body sections in a way the ingestion worker, API layer, and future CLI validator can all consume unchanged.
  - [x] Prevent project settings from drifting away from the shared schema contract by validating persisted config through the same shared types.
- [x] Record audit and observability events for sync-rule changes (AC: 5)
  - [x] Append audit entries that capture what changed, who changed it, and when.
  - [x] Emit structured logs and metrics for validation attempts and successful configuration saves.
  - [x] Exclude secret material and provider tokens from both logs and audit payloads.
- [x] Add automated coverage for configuration behavior (AC: 1, 2, 3, 4, 5)
  - [x] Unit tests for naming convention validation, schema completeness checks, and readiness-state computation.
  - [x] Integration tests for saving and reloading sync settings, including invalid folder path and invalid schema scenarios.
  - [x] UI or end-to-end coverage for readiness display, inline validation feedback, and persisted settings rehydration.

## Dev Notes

### Story Intent and Cross-Story Dependencies

- Story 1.1 established the provider-neutral repository connection boundary and the settings location for repository setup. This story extends that setup into sync-specific configuration instead of redefining repository identity. [Source: _bmad-output/implementation-artifacts/1-1-connect-a-github-repository-to-a-project.md]
- Story 1.3 depends on this story to provide the authoritative requirements root path, branch policy, and markdown-schema rules used for webhook ingestion and markdown validation. [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3: Ingest Merged Requirement File Changes into Derived Requirement Records]
- Story 1.7 must reuse the same sync configuration model for GitLab-backed projects, so avoid GitHub-specific field names in persisted sync-rule records. [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7: Add GitLab Repository Ingestion Using the Same Sync Model]

### Technical Requirements

- The repository remains the source of truth; this story defines what subset of repository content is authoritative for requirements and how it is validated before synchronization. [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#3.2 In Scope - Version 1.0] [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#7.6 Repository Ingestion & Graph Construction]
- The project must store a documented markdown schema and make it reusable by ingestion workers and CI-compatible validation flows later in the roadmap. [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#9. AI Agent Integration Requirements] [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2: Configure Requirement Sync Rules for a Project]
- Validation settings are project-level configuration, not hard-coded application defaults. Later ingestion behavior must load the latest saved rules at runtime. [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2: Configure Requirement Sync Rules for a Project]

### Recommended Domain and API Shape

- Suggested route handlers:
  - `GET /api/v1/projects/{projectId}/sync-settings`
  - `PUT /api/v1/projects/{projectId}/sync-settings`
  - `POST /api/v1/projects/{projectId}/sync-settings/previews` for repository-path validation and sample file detection before save
- Suggested domain ownership:
  - `packages/domain/ingestion` owns sync-rule orchestration and readiness computation
  - `packages/domain/integrations` owns provider-specific repository tree and file discovery
  - `packages/contracts` owns sync-setting request and response schemas plus validation error envelopes
  - `packages/validation` owns markdown schema definitions and reusable validation helpers
- Suggested enums and contracts:
  - `RepositoryProvider`: `github`, later `gitlab`
  - `SyncReadinessState`: `not_ready`, `ready_for_ingestion`
  - `SyncBranchPolicy`: start with a narrow policy such as `merged_to_default_branch` and only add complexity if a concrete requirement forces it

### Architecture Compliance

- Keep HTTP parsing and response translation in Next.js route handlers only. Sync-configuration logic belongs in domain services. [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- Persist configuration through `packages/db`; do not allow React components or route handlers to talk to Prisma directly. [Source: _bmad-output/planning-artifacts/architecture.md#Consistency Rules for AI Implementers] [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- Define shared Zod schemas once and reuse them across API, worker, and future CLI boundaries. [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns] [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- Do not start webhook processing or queue ingestion in this story. This story ends with saved configuration and readiness, not synchronized records. [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3: Ingest Merged Requirement File Changes into Derived Requirement Records]

### File Structure Requirements

- Put settings UI under `apps/web/src/app/(app)/settings/repository` and supporting components under `apps/web/src/components/settings/repository`.
- Place sync-rule orchestration and readiness logic under `packages/domain/ingestion`.
- Place provider repository-tree adapters under `packages/domain/integrations`.
- Place schema definitions and validation helpers under `packages/contracts/src` and `packages/validation/src/markdown-schema`.
- Reuse the monorepo boundaries established by the architecture rather than introducing feature-local validation or persistence utilities inside `apps/web`. [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure] [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]

### Data Model Notes

- Minimum entities touched in this story:
  - `projects`
  - `repository_connections`
  - `repository_sync_configs`
  - `audit_entries`
- Recommended `repository_sync_configs` fields:
  - `id`
  - `project_id`
  - `requirements_root_path`
  - `naming_convention_kind`
  - `naming_convention_pattern` nullable
  - `branch_policy`
  - `schema_version`
  - `required_frontmatter_fields` as JSON or normalized child rows
  - `required_body_sections` as JSON or normalized child rows
  - `is_ready_for_ingestion`
  - `validated_at`
  - `created_by`, `created_at`, `updated_by`, `updated_at`
- Use canonical storage naming from the architecture: plural `snake_case` tables and `snake_case` columns. [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns]

### UX Requirements

- Repository onboarding in the UX spec expects repository connection, folder selection, validation, preview, and clear readiness before ingestion begins. This story should cover the configuration and validation portion of that flow, but not the actual ingestion progress experience. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 4: Repository Onboarding]
- Repository and folder selection should feel provider-backed and trustworthy, not like free-form infrastructure configuration. Prefer guided selection and previews where the provider APIs allow it. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 4: Repository Onboarding]
- Use inline validation, persistent warning or error messaging, and progressive loading patterns from the UX spec:
  - no blocking full-page loader for configuration saves
  - inline feedback for validation problems
  - visible saved readiness state after reload
  [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns] [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Loading States]

### Previous Story Intelligence

- Story 1.1 already chose a provider-neutral `RepositoryConnection` boundary and explicitly kept sync configuration out of the connection record. Preserve that separation instead of overloading the connection model with folder, naming, and schema fields. [Source: _bmad-output/implementation-artifacts/1-1-connect-a-github-repository-to-a-project.md]
- Story 1.1 also anchored repository setup under workspace settings and onboarding. Reuse that location so the admin flow stays sequential: connect repo, configure sync rules, then ingest. [Source: _bmad-output/implementation-artifacts/1-1-connect-a-github-repository-to-a-project.md]

### Git Intelligence Summary

- Recent git history only contains planning-artifact commits, not implementation commits, so there are no established code-level patterns to inherit yet.
- Treat the monorepo/package boundaries from the architecture and Story 1.1 as the only current implementation guardrails.

### Latest Technical Information

- GitHub's current Git Trees API can be used to validate repository folders recursively, but responses can be truncated when the recursive tree exceeds the provider limit. Do not assume a single recursive tree call is always sufficient for very large repositories. [External: https://docs.github.com/rest/git/trees#get-a-tree]
- GitLab's repository tree endpoint now returns `404 Not Found` for a missing path instead of an empty `200` response. Handle missing requirements folders explicitly when validating sync scope. [External: https://docs.gitlab.com/ee/api/repositories.html#list-repository-tree]
- GitLab's repository files API uses `HEAD` or branch refs for file inspection and has rate-limit considerations for larger blobs, so repository preview logic should prefer tree listing plus selective file sampling rather than downloading every file body during config save. [External: https://docs.gitlab.com/api/repository_files/]

### Risks and Watchouts

- Do not let schema configuration drift into a free-form JSON textarea with no shared validation contract. That would undermine the CI and ingestion reuse required later.
- Avoid hard-coding GitHub-specific path validation logic into domain types that Story 1.7 must reuse for GitLab.
- Do not trigger real ingestion automatically on save in this story. Readiness and preview are in scope; synchronized database updates belong to Story 1.3.

### Project Structure Notes

- No `project-context.md` file was found in the workspace.
- The repository still has BMAD planning artifacts but no application scaffold, so create clean package boundaries now instead of shortcutting config logic inside the web app.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2: Configure Requirement Sync Rules for a Project]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3: Ingest Merged Requirement File Changes into Derived Requirement Records]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7: Add GitLab Repository Ingestion Using the Same Sync Model]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#3.2 In Scope - Version 1.0]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#7.6 Repository Ingestion & Graph Construction]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#9. AI Agent Integration Requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 4: Repository Onboarding]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Loading States]
- [Source: _bmad-output/implementation-artifacts/1-1-connect-a-github-repository-to-a-project.md]
- [External: https://docs.github.com/rest/git/trees#get-a-tree]
- [External: https://docs.gitlab.com/ee/api/repositories.html#list-repository-tree]
- [External: https://docs.gitlab.com/api/repository_files/]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story created via BMAD create-story workflow on 2026-03-15.
- Implemented repository sync contracts, in-memory persistence, domain services, Next.js routes, and repository settings UI on 2026-03-15.
- Verified with `npm test`, targeted `npx vitest run packages/domain/src/ingestion/repository-sync-service.test.ts packages/validation/src/markdown-schema.test.ts`, and targeted `npx tsc -p apps/web/tsconfig.json --noEmit --skipLibCheck`.

### Completion Notes List

- Added shared repository sync contracts and markdown-schema validation helpers so API, UI, and later ingestion/CI flows can consume the same rules.
- Added repository sync persistence, audit tracking, readiness computation, preview validation, and observability coverage without overloading Story 1.1 connection records.
- Extended the repository settings UI to reuse onboarding, preview repository scope, surface inline remediation, persist rules, and rehydrate saved configuration from local storage plus the sync-settings API.
- Added unit, domain integration, and UI render coverage for naming validation, readiness-state behavior, invalid path blocking, and persisted sync settings hydration.
- Workspace-wide `npm run typecheck` is currently blocked by duplicate generated `LayoutProps` declarations in `apps/web/.next` route types; targeted TypeScript verification of the changed app code passed with `npx tsc -p apps/web/tsconfig.json --noEmit --skipLibCheck`.

### File List

- _bmad-output/implementation-artifacts/1-2-configure-requirement-sync-rules-for-a-project.md
- apps/web/package.json
- apps/web/src/app/api/v1/projects/[projectId]/sync-settings/previews/route.ts
- apps/web/src/app/api/v1/projects/[projectId]/sync-settings/route.ts
- apps/web/src/components/settings/repository/repository-onboarding.tsx
- apps/web/src/lib/server/http.ts
- apps/web/src/lib/server/service.ts
- apps/web/tests/e2e/repository-onboarding.spec.tsx
- apps/web/tests/integration/repository-routes.test.ts
- packages/contracts/src/api/repository-sync.ts
- packages/contracts/src/index.ts
- packages/db/prisma/schema.prisma
- packages/db/src/index.ts
- packages/db/src/repositories/repository-sync-config-repository.ts
- packages/domain/package.json
- packages/domain/src/index.ts
- packages/domain/src/ingestion/repository-sync-service.test.ts
- packages/domain/src/ingestion/repository-sync-service.ts
- packages/domain/src/integrations/repository-scope-provider.ts
- packages/observability/src/metrics/connection-metrics.ts
- packages/validation/package.json
- packages/validation/src/index.ts
- packages/validation/src/markdown-schema.test.ts
- packages/validation/src/markdown-schema.ts

### Change Log

- 2026-03-15: Implemented Story 1.2 repository sync configuration contracts, services, API routes, UI flow, and automated test coverage; moved story to review.
