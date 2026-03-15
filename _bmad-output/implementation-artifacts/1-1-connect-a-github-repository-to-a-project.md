# Story 1.1: Connect a GitHub Repository to a Project

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an administrator,
I want to create a new project and connect its GitHub repository,
so that the application knows which repository will supply requirement content for synchronization.

## Acceptance Criteria

1. Given I am an authenticated administrator with no project configured, when I create a new project and select GitHub as the repository provider, then the system creates the project record and stores the repository connection metadata without yet ingesting requirement content, and the project shows a connected or not-connected repository status in the workspace UI.
2. Given I am configuring a project repository connection, when I provide valid GitHub repository identification and authorization details, then the system verifies it can access the repository before saving the connection, and it records the provider, repository owner, repository name, default branch, and connection timestamp.
3. Given the GitHub credentials or repository details are invalid, when I attempt to save the connection, then the system rejects the configuration, and it shows an actionable error message explaining whether the failure was authentication, authorization, or repository lookup related.
4. Given a project already has a saved GitHub repository connection, when I open the project workspace, then I can see the repository provider and repository identity in the project settings, and I can tell that requirement sync setup is ready for the next configuration step.
5. Given repository connection attempts are made, when they succeed or fail, then the system records structured audit and operational events for the attempt, and those events include enough metadata for later troubleshooting without exposing secrets.

## Tasks / Subtasks

- [x] Bootstrap the monorepo foundation required for all follow-on work (AC: 1, 4, 5)
  - [x] Initialize the workspace with the current shadcn Next.js monorepo scaffold and align it to the architecture target shape at minimum for `apps/web`, root workspace config, and `packages/ui`.
  - [x] Add the missing first-pass workspace placeholders required by the architecture so later stories do not need a repo restructure: `apps/worker`, `packages/domain`, `packages/db`, `packages/contracts`, `packages/validation`, `packages/config`, `packages/observability`, and `packages/testing`.
  - [x] Document any intentional deviations between generated starter output and the architecture document inside the repo docs or ADRs created during implementation.
- [x] Define the first project and repository-connection persistence layer (AC: 1, 2, 4, 5)
  - [x] Add a `Project` model and a one-to-one `RepositoryConnection` model in `packages/db/prisma/schema.prisma`.
  - [x] Persist non-secret repository metadata needed now and by Stories 1.2 and 1.3: provider, repository owner, repository name, repository ID if available, default branch, connection timestamp, last verification timestamp, and a credential or installation reference.
  - [x] Enforce that raw access tokens are not stored directly in the primary relational tables.
- [x] Implement the authenticated admin flow to create a project and connect GitHub (AC: 1, 2, 3, 4)
  - [x] Build a project creation and repository setup screen under the workspace settings and onboarding flow.
  - [x] Support GitHub as the only provider in this story, but keep provider-specific logic behind an integration boundary that can later accommodate GitLab.
  - [x] Show clear connected or not-connected status in the workspace UI after save and on reload.
- [x] Verify GitHub repository access before persistence (AC: 2, 3)
  - [x] Add a verification step that checks repository reachability and authorized access before the final save.
  - [x] Read the repository default branch from GitHub instead of asking the user to type it if the API already returns it.
  - [x] Map failures into stable product error codes and user-facing messages for authentication, authorization, and repository lookup failures.
- [x] Record auditability and operational telemetry for each connection attempt (AC: 5)
  - [x] Append audit entries for successful connection creation or updates.
  - [x] Emit structured logs and metrics for both successful and failed verification attempts with correlation IDs and actor context.
  - [x] Exclude tokens, secrets, webhook secrets, and private key material from logs, errors, and audit payloads.
- [x] Add automated tests that lock the behavior down before Story 1.2 extends it (AC: 1, 2, 3, 4, 5)
  - [x] Unit tests for connection validation, error mapping, and provider boundary behavior.
  - [x] Integration tests for API route handlers plus persistence behavior, including "do not save invalid connection" scenarios.
  - [x] UI or end-to-end coverage for the connected and not-connected states plus actionable error rendering.

## Dev Notes

### Story Intent and Cross-Story Dependencies

- This is the first executable implementation story and the repository currently has no application scaffold. The architecture explicitly says the first implementation priority is monorepo initialization, so bootstrap work is in scope for this story, not a separate prerequisite.
- Story 1.2 depends on this story to persist a project-level repository connection that can later be extended with requirements root folder, branch policy, and markdown schema rules.
- Story 1.3 depends on this story to provide durable provider identity, repository identity, verification state, and secure credential or installation references for webhook-driven ingestion.
- Story 1.7 reuses the same model for GitLab, so provider-specific logic must be isolated now instead of hard-coding GitHub assumptions deep in route handlers.

### Technical Requirements

- Git remains the source of truth for requirement content; this story only saves project and repository connection metadata. Do not ingest requirement files in Story 1.1. [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#3.2 In Scope - Version 1.0] [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#7.6 Repository Ingestion & Graph Construction]
- Repository connection records must provide enough durable context for later sync flows: provider, owner, repo name, default branch, connection timestamp, and a secure reference to auth material or installation metadata. [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1: Connect a GitHub Repository to a Project]
- Audit logging is not optional. Connection attempts must be traceable without exposing secrets. [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1: Connect a GitHub Repository to a Project] [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#8. Non-Functional Requirements]
- Keep provider modeling extensible. GitHub is implemented now, GitLab is added later using the same connection model. [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7: Add GitLab Repository Ingestion Using the Same Sync Model]

### Recommended Domain and API Shape

- Suggested route handlers:
  - `POST /api/v1/projects` for project creation
  - `POST /api/v1/integrations/github/repository-verifications` for pre-save verification
  - `POST /api/v1/projects/{projectId}/repository-connections` for persisting the verified connection
- Suggested domain ownership:
  - `packages/domain/integrations` owns GitHub provider interaction and connection orchestration
  - `packages/domain/auth` owns RBAC checks for administrator-only actions
  - `packages/db` owns Prisma models and repositories
  - `packages/contracts` owns request, response, event, and error schemas
- Suggested stable error codes:
  - `GITHUB_AUTHENTICATION_FAILED`
  - `GITHUB_AUTHORIZATION_FAILED`
  - `GITHUB_REPOSITORY_NOT_FOUND`
  - `GITHUB_CONNECTION_VERIFICATION_FAILED`
- Inference from architecture plus Epic 1: use a provider-neutral `RepositoryConnection` boundary rather than baking GitHub fields directly into `Project`. This reduces rework for Story 1.7. [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries] [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7: Add GitLab Repository Ingestion Using the Same Sync Model]

### Architecture Compliance

- Use the Next.js backend-for-frontend pattern and App Router structure defined in the architecture. Keep HTTP parsing and response shaping in route handlers only. Business logic belongs in domain services. [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- Do not access Prisma from React components or route handlers. `packages/db` is the only package that talks to Prisma directly. [Source: _bmad-output/planning-artifacts/architecture.md#Consistency Rules for AI Implementers] [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries]
- Use shared Zod schemas for request and response contracts; do not invent ad hoc payload shapes. [Source: _bmad-output/planning-artifacts/architecture.md#Validation Patterns] [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns]
- Keep queue and webhook implementation out of this story except for preparing the connection model. Story 1.3 owns webhook verification, queue handoff, idempotency, and ingestion jobs. [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3: Ingest Merged Requirement File Changes into Derived Requirement Records]

### File Structure Requirements

- Align implementation to the documented monorepo shape even if the generated starter is smaller. At minimum, create the ownership boundaries now so later stories extend the correct package locations. [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- Place app-specific onboarding and settings UI in `apps/web/src/app/(app)/settings/repository` and `apps/web/src/components/settings/repository`.
- Place GitHub provider orchestration and service logic under `packages/domain/integrations`.
- Place Prisma schema, migrations, and repositories under `packages/db`.
- Place API request and response contracts plus shared error envelopes under `packages/contracts`.
- Place structured logging helpers in `packages/observability`.

### Data Model Notes

- Minimum entities needed in this story:
  - `projects`
  - `repository_connections`
  - `audit_entries`
- Minimum `repository_connections` fields to support future stories cleanly:
  - `id`
  - `project_id`
  - `provider`
  - `repository_owner`
  - `repository_name`
  - `repository_id` nullable
  - `default_branch`
  - `credential_reference` or `installation_id` reference, depending on auth strategy
  - `connected_at`
  - `last_verified_at`
  - `created_by`, `created_at`, `updated_by`, `updated_at`
- Prefer canonical database naming from the architecture: plural `snake_case` table names and `snake_case` columns. [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns]

### UX Requirements

- Repository onboarding starts from new project setup or settings, and the user should reach a trustworthy connected state without seeing ingestion yet. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 4: Repository Onboarding]
- Prefer provider-mediated auth flow over raw token entry where practical. The UX direction explicitly favors OAuth simplicity and provider-populated repository selection over manual URL entry. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 4: Repository Onboarding]
- Even though Journey 4 later includes folder selection and ingestion preview, Story 1.1 must stop after repository connection and clearly indicate "ready for the next setup step" rather than pretending sync is complete. This is an inference from Story 1.1 plus Story 1.2 sequencing.
- Errors must clearly distinguish authentication, authorization, and repository lookup problems and provide remediation guidance. [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1: Connect a GitHub Repository to a Project] [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns]
- Use loading and feedback patterns from the UX spec:
  - no blocking full-page loader for local form actions
  - inline or local pending indicators for operations over 300 ms
  - persistent warning or error messages when user action is required
  - visible connected or not-connected repository status in settings and workspace shell
  [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Loading States] [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns]

### Security and Operational Guardrails

- Do not store or log raw personal access tokens, OAuth access tokens, webhook secrets, or GitHub App private keys in application tables or logs. Persist only encrypted secret references or installation metadata plus secret-store handles. This is an implementation guardrail inferred from the PRD security requirements and GitHub App security guidance. [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#8. Non-Functional Requirements]
- Use typed structured logs with correlation IDs and actor context so failed connection attempts are diagnosable later. [Source: _bmad-output/planning-artifacts/architecture.md#Logging and Observability Patterns]
- Keep retry and idempotency concerns for webhook or publish flows out of this story, but do make connection verification idempotent from the user's perspective so repeated "Verify" clicks do not create duplicate records.

### Testing Requirements

- Unit test domain logic for:
  - valid versus invalid provider configuration
  - error classification and mapping
  - secret redaction in logs or error serialization
- Integration test route handlers for:
  - authenticated admin can create project and save verified GitHub connection
  - invalid auth fails without persisting the connection
  - unauthorized admin role access is rejected
  - repository metadata includes provider, owner, repo, default branch, and timestamps
- UI or end-to-end test for:
  - connected state visible after successful save
  - not-connected state visible before configuration
  - actionable error text for each failure category
- Do not make live GitHub calls in automated tests. Mock provider responses at the integration boundary.

### Latest Technical Information

- Next.js 16 is current in the architecture direction. Current docs say the minimum Node.js version is 20.9, Turbopack is the default bundler, and `next build` no longer runs lint automatically. Wire explicit lint scripts into the monorepo from the start. [External: https://nextjs.org/docs/app/getting-started/installation]
- Next.js 16 renamed `middleware.ts` to `proxy.ts` and treats the middleware filename as deprecated. The architecture tree still shows `middleware.ts`; if request-boundary logic is needed during scaffold, prefer `proxy.ts` or omit it until actually needed. [External: https://nextjs.org/docs/messages/middleware-to-proxy] [External: https://nextjs.org/blog/next-16]
- Prisma ORM 7 requires ESM-friendly setup, explicit client output, `prisma.config.ts`, explicit environment loading, and a database driver adapter for direct database access. Do not scaffold Prisma as if v6 defaults still apply. [External: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7]
- Current shadcn monorepo docs use `pnpm dlx shadcn@latest init -t next --monorepo` and require `components.json` in each workspace. The generated scaffold creates `apps/web` and `packages/ui`; extend it deliberately to the architecture target rather than fighting the CLI. [External: https://ui.shadcn.com/docs/installation/next] [External: https://ui.shadcn.com/docs/monorepo]
- GitHub's current guidance favors GitHub Apps over broad OAuth or personal access token usage for repository integrations. Installation access tokens expire after one hour, so treat them as transient credentials and persist installation or secret references, not tokens. This recommendation is an inference from GitHub docs plus the product's future webhook and multi-repository needs. [External: https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app] [External: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app]
- GitHub exposes installation repository listing and repository lookup APIs that can be used to verify access and read repository metadata such as the default branch before persisting the connection. [External: https://docs.github.com/en/enterprise-cloud%40latest/rest/apps/installations] [External: https://docs.github.com/en/rest/repos]

### Risks and Watchouts

- The repository is currently greenfield from an app-code perspective. Avoid building Story 1.1 as a one-off prototype in `apps/web` that later has to be extracted into packages.
- Do not implement GitHub-only assumptions in public contracts if the same contract is expected to support GitLab in Story 1.7.
- Do not accidentally pull folder selection, schema configuration, or ingestion logic into this story. Those are Story 1.2 and Story 1.3 concerns.
- Avoid a fake "connected" state based only on submitted form values. Connection status must reflect successful provider verification.

### Project Structure Notes

- No `project-context.md` file was found in the workspace, so this story relies on the PRD, epics, architecture, UX spec, and latest official framework or provider docs.
- The current workspace has BMAD artifacts but no application scaffold yet. Treat that as intentional greenfield status, not as permission to improvise a different repository layout.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1: Connect a Repository and See Requirements Sync Live]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1: Connect a GitHub Repository to a Project]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2: Configure Requirement Sync Rules for a Project]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3: Ingest Merged Requirement File Changes into Derived Requirement Records]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7: Add GitLab Repository Ingestion Using the Same Sync Model]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#3.2 In Scope - Version 1.0]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#7.6 Repository Ingestion & Graph Construction]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#8. Non-Functional Requirements]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#11. System Architecture Considerations]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#12. Data Model Overview]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#14. User Experience Principles]
- [Source: _bmad-output/planning-artifacts/architecture.md#Selected Starter: shadcn monorepo with Next.js]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 4: Repository Onboarding]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Loading States]
- [External: https://nextjs.org/docs/app/getting-started/installation]
- [External: https://nextjs.org/docs/messages/middleware-to-proxy]
- [External: https://nextjs.org/blog/next-16]
- [External: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7]
- [External: https://ui.shadcn.com/docs/installation/next]
- [External: https://ui.shadcn.com/docs/monorepo]
- [External: https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app]
- [External: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app]
- [External: https://docs.github.com/en/enterprise-cloud%40latest/rest/apps/installations]
- [External: https://docs.github.com/en/rest/repos]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story created via BMAD create-story workflow on 2026-03-15.
- Implemented monorepo scaffold, API routes, domain services, Prisma models, and UI flow on 2026-03-15.
- Validation run completed with `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` on 2026-03-15.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- No previous story file existed, so there were no prior implementation learnings to inherit.
- No `project-context.md` file was present in the workspace.
- Added a Next.js 16 monorepo starter with the architecture-aligned package boundaries and placeholder worker/config/testing packages.
- Implemented project creation, GitHub repository verification, repository connection save flow, shared contracts, structured error handling, audit logging, and redacted operational telemetry.
- Added ADR documentation for bootstrap deviations, Prisma 7 config, and automated coverage for unit, integration, UI, and worker baseline checks.

### File List

- _bmad-output/implementation-artifacts/1-1-connect-a-github-repository-to-a-project.md
- .editorconfig
- .env.example
- .github/workflows/ci.yml
- .github/workflows/deploy.yml
- .github/workflows/validate-requirements.yml
- .gitignore
- README.md
- apps/web/next-env.d.ts
- apps/web/next.config.ts
- apps/web/package.json
- apps/web/src/app/(app)/dashboard/page.tsx
- apps/web/src/app/(app)/layout.tsx
- apps/web/src/app/(app)/settings/repository/page.tsx
- apps/web/src/app/api/v1/integrations/github/repository-verifications/route.ts
- apps/web/src/app/api/v1/projects/[projectId]/repository-connections/route.ts
- apps/web/src/app/api/v1/projects/route.ts
- apps/web/src/app/globals.css
- apps/web/src/app/layout.tsx
- apps/web/src/app/page.tsx
- apps/web/src/components/settings/repository/repository-onboarding.tsx
- apps/web/src/lib/auth/actor.ts
- apps/web/src/lib/server/http.ts
- apps/web/src/lib/server/service.ts
- apps/web/tests/e2e/repository-onboarding.spec.tsx
- apps/web/tests/integration/repository-routes.test.ts
- apps/web/tsconfig.json
- apps/worker/package.json
- apps/worker/src/main.test.ts
- apps/worker/src/main.ts
- apps/worker/tsconfig.json
- biome.json
- docker-compose.yml
- docs/adr/0001-story-1-1-bootstrap-deviations.md
- package-lock.json
- package.json
- packages/config/package.json
- packages/contracts/package.json
- packages/contracts/src/api/project-connection.ts
- packages/contracts/src/enums/repository-provider.ts
- packages/contracts/src/errors/api-error.ts
- packages/contracts/src/index.ts
- packages/db/package.json
- packages/db/prisma.config.ts
- packages/db/prisma/schema.prisma
- packages/db/src/index.ts
- packages/db/src/repositories/audit-entry-repository.ts
- packages/db/src/repositories/project-repository.ts
- packages/db/src/repositories/repository-connection-repository.ts
- packages/domain/package.json
- packages/domain/src/auth/require-admin.ts
- packages/domain/src/index.ts
- packages/domain/src/integrations/github-connection-service.test.ts
- packages/domain/src/integrations/github-connection-service.ts
- packages/domain/src/integrations/github-provider.ts
- packages/domain/src/shared/domain-error.ts
- packages/observability/package.json
- packages/observability/src/index.ts
- packages/observability/src/logging/logger.ts
- packages/observability/src/metrics/connection-metrics.ts
- packages/testing/package.json
- packages/testing/src/index.ts
- packages/ui/package.json
- packages/ui/src/components/ui/button.tsx
- packages/ui/src/components/ui/card.tsx
- packages/ui/src/components/ui/input.tsx
- packages/ui/src/index.ts
- packages/validation/package.json
- packages/validation/src/index.ts
- pnpm-workspace.yaml
- scripts/backfill-read-models.ts
- scripts/bootstrap.ts
- scripts/seed-dev.ts
- scripts/validate-requirements.ts
- tsconfig.base.json
- turbo.json

### Change Log

- 2026-03-15: Bootstrapped the monorepo foundation, implemented the Story 1.1 GitHub connection slice, added shared contracts and observability, and verified the repo with typecheck, lint, tests, and production build.
