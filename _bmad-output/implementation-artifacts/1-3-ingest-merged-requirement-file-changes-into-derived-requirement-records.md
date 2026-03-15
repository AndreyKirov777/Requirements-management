# Story 1.3: Ingest Merged Requirement File Changes into Derived Requirement Records

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator,
I want merged requirement-file changes from the configured repository to be ingested into the application automatically,
so that the database stays synchronized with Git-authored requirement content without manual re-entry.

## Acceptance Criteria

1. Given a project has a valid repository connection and sync configuration, when a merged change modifies one or more requirement markdown files inside the configured requirements folder, then the system verifies the webhook, fetches the changed files, and queues an ingestion job for processing, and the ingestion job records the triggering provider event, commit SHA, project, and affected file paths.
2. Given an ingestion job processes a valid changed requirement file, when the file contains a known or new requirement ID in frontmatter and valid schema content, then the system creates or updates the corresponding derived requirement record in the database, and it stores the source repository path, last synced commit SHA, parsed content, and current sync state.
3. Given multiple deliveries of the same webhook event or ingestion job occur, when they reference the same idempotency key or provider event identity, then the system applies the change at most once, and it does not create duplicate requirement revisions, audit entries, or sync records.
4. Given a changed file falls outside the configured requirement scope, when the ingestion job evaluates it, then the system ignores the file without failing the entire job, and it records that the file was skipped because it did not match sync rules.
5. Given a valid ingestion job completes, when the requirement records are updated successfully, then the affected requirements become queryable in the application within the ingestion SLA, and each affected record exposes a sync state of `in_sync`, `pending`, `conflict`, or `failed` as appropriate.
6. Given ingestion processing fails for a transient reason, when the job cannot complete on the first attempt, then the system retries the job using the configured backoff policy, and after retry exhaustion it moves the job to a dead-letter state with operator-visible failure details.

## Tasks / Subtasks

- [ ] Implement the webhook intake boundary for merged requirement changes (AC: 1, 3)
  - [ ] Add `apps/web/src/app/api/v1/webhooks/github/route.ts` that verifies the provider request, normalizes relevant merged-change events, and hands off work to BullMQ.
  - [ ] Capture provider event identifiers, commit SHA, project identity, and affected file paths in a normalized ingestion event payload.
  - [ ] Ignore unsupported event types and actions early without invoking long-running work in the request path.
- [ ] Build the asynchronous ingestion worker pipeline (AC: 1, 2, 4, 5, 6)
  - [ ] Add queue definitions and worker jobs under `apps/worker/src/queues` and `apps/worker/src/jobs` for webhook processing and requirement synchronization.
  - [ ] Fetch changed files from the configured repository using the connection and sync settings from Stories 1.1 and 1.2.
  - [ ] Validate and parse markdown through the shared schema contract before persisting derived requirement records.
- [ ] Persist derived requirement state and ingestion lineage (AC: 2, 5)
  - [ ] Create the minimum requirement persistence models needed for Epic 1 browsing: requirement identity, source path, parsed body, last synced commit SHA, sync state, and timestamps.
  - [ ] Persist enough revision or event history to support future auditability and operator troubleshooting without requiring raw provider logs.
  - [ ] Update query-facing storage so successfully ingested requirements become available to Story 1.4 immediately.
- [ ] Enforce idempotency and skip handling (AC: 3, 4)
  - [ ] Store provider delivery identifiers and/or idempotency keys in a durable deduplication table or equivalent durable state.
  - [ ] Ensure duplicate webhook deliveries and duplicate jobs do not create duplicate revisions, audit entries, or records.
  - [ ] Record out-of-scope files as skipped outcomes rather than failures.
- [ ] Implement retry, failure, and dead-letter behavior (AC: 6)
  - [ ] Configure BullMQ retry attempts and backoff for transient failures such as repository fetch or temporary persistence issues.
  - [ ] Move unrecoverable validation or malformed-event cases directly to failed/dead-letter handling without infinite retries.
  - [ ] Emit structured logs, metrics, and queue state needed for later operator-facing failure views.
- [ ] Add automated coverage around ingestion correctness (AC: 1, 2, 3, 4, 5, 6)
  - [ ] Unit tests for webhook normalization, scope filtering, idempotency, and sync-state transitions.
  - [ ] Integration tests for webhook-to-queue-to-database flow, including duplicate delivery handling and skipped file behavior.
  - [ ] Worker tests for retry/backoff versus unrecoverable failure behavior.

## Dev Notes

### Story Intent and Cross-Story Dependencies

- This is the first story that turns repository setup into derived application data. It consumes the repository connection from Story 1.1 and the sync rules from Story 1.2. [Source: _bmad-output/implementation-artifacts/1-1-connect-a-github-repository-to-a-project.md] [Source: _bmad-output/implementation-artifacts/1-2-configure-requirement-sync-rules-for-a-project.md]
- Story 1.4 depends on the records created here to power browsing, search, filters, and sync-state visibility.
- Stories 1.5 and 1.6 extend this ingestion pipeline with richer failure surfacing and stable-identity handling. Keep ingestion events, sync-state transitions, and source metadata explicit now so those follow-on stories do not require a redesign. [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5: Surface Markdown Validation Failures and Ingestion Errors with Actionable Guidance] [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6: Preserve Stable Requirement Identity Across File Moves and Renames]

### Technical Requirements

- The first thin vertical slice must establish reliable text synchronization from Git into the derived application database before broader graph and reporting scope. This story is the center of that slice. [Source: _bmad-output/planning-artifacts/epics.md#Additional Requirements]
- Webhook processing must be asynchronous, idempotent, and transparent about sync state. The architecture explicitly calls for Redis-backed BullMQ queues, operator-visible failures, and canonical sync states of `in_sync`, `pending`, `conflict`, and `failed`. [Source: _bmad-output/planning-artifacts/architecture.md#Decision Priority Analysis] [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns]
- Requirement content remains Git-authored. The database stores a derived synchronized model with source path, commit, parsed content, and synchronization metadata. [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#1.1 Product Thesis] [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#12. Data Model Overview]
- Ingestion freshness and correctness are measurable requirements: 95% of merged requirement changes reflected within 60 seconds and idempotent replay behavior for repeated events. [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#2.2 Success Metrics (v1 Launch)] [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#8. Non-Functional Requirements]

### Recommended Domain and API Shape

- Suggested route handlers:
  - `POST /api/v1/webhooks/github`
  - optional operator-only `POST /api/v1/ingestion/reindex` can remain deferred; do not pull it into this story unless needed for testability
- Suggested queue and job naming:
  - queue: `ingestion`
  - events/jobs: `ingestion.webhook.received`, `ingestion.requirement.sync`
- Suggested domain ownership:
  - `packages/domain/ingestion` owns webhook normalization, idempotency, scope filtering, sync-state transitions, and persistence orchestration
  - `packages/domain/integrations` owns GitHub file retrieval and provider payload translation
  - `packages/db` owns repositories and read-model updates
  - `packages/validation` owns markdown validation using the project schema config
- Suggested durable ingestion records:
  - `ingestion_events`
  - `requirements`
  - `requirement_revisions`
  - `audit_entries`
  - `ingestion_failures` or equivalent failure/event outcome table

### Architecture Compliance

- Webhook endpoints must only verify, normalize, and enqueue work. Long-running provider fetch, markdown parsing, and persistence do not belong in the request handler. [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- Use BullMQ with Redis for asynchronous ingestion. Do not invent a synchronous job runner or ad hoc retry loop. [Source: _bmad-output/planning-artifacts/architecture.md#Decision Priority Analysis] [Source: _bmad-output/planning-artifacts/architecture.md#Integration Points]
- Domain services orchestrate sync logic; Prisma access remains centralized in `packages/db`. [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] [Source: _bmad-output/planning-artifacts/architecture.md#Consistency Rules for AI Implementers]
- Reuse the shared markdown schema and contract definitions from Story 1.2. Do not fork separate validation logic inside the worker. [Source: _bmad-output/implementation-artifacts/1-2-configure-requirement-sync-rules-for-a-project.md]

### File Structure Requirements

- Webhook route: `apps/web/src/app/api/v1/webhooks/github/route.ts`
- Worker queues and jobs: `apps/worker/src/queues/ingestion.queue.ts`, `apps/worker/src/jobs/process-webhook-event.job.ts`, `apps/worker/src/jobs/validate-requirement-markdown.job.ts`
- Domain orchestration: `packages/domain/src/ingestion`
- Provider adapter: `packages/domain/src/integrations`
- Persistence repositories and queries: `packages/db/src/repositories`, `packages/db/src/queries`
- Validation code: `packages/validation/src/markdown-schema`, `packages/validation/src/error-formatting`

### Data Model Notes

- Minimum requirement-facing storage needed now:
  - `requirements`
  - `requirement_revisions`
  - `ingestion_events`
  - `audit_entries`
- Recommended `requirements` fields for Epic 1:
  - `id`
  - `project_id`
  - `requirement_key` or canonical stable requirement ID from frontmatter
  - `title`
  - `type`
  - `status`
  - `body_markdown`
  - `source_path`
  - `last_synced_commit_sha`
  - `sync_state`
  - `last_synced_at`
  - `created_at`, `updated_at`
- Recommended `ingestion_events` fields:
  - `id`
  - `project_id`
  - `provider`
  - `provider_event_id`
  - `idempotency_key`
  - `event_type`
  - `commit_sha`
  - `status`
  - `payload_summary`
  - `received_at`
  - `processed_at`
- Persist skipped outcomes explicitly so Story 1.5 can distinguish skipped from failed processing without inferring it from logs.

### UX Requirements

- The UX spec's core promise is silent healthy sync and loud visible failures. This story should build data and status plumbing to support that, even if the richer operator-facing UI lands in Stories 1.4 and 1.5. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Effortless Interactions] [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Critical Success Moments]
- Sync-state transitions must map cleanly to the UX's visible states: healthy, pending, failed, and conflict. Do not invent alternate labels at the data layer that the UI must translate awkwardly later. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns]
- Keep ingestion asynchronous and non-blocking so the product can show progress or background completion without freezing the UI. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Flow Optimization Principles]

### Previous Story Intelligence

- Story 1.1 isolated provider-specific repository connection logic behind a provider-neutral boundary and prohibited secret storage in relational tables. Preserve that model when the webhook pipeline needs credentials or installation context. [Source: _bmad-output/implementation-artifacts/1-1-connect-a-github-repository-to-a-project.md]
- Story 1.2 established project-level sync settings and shared schema contracts. Treat them as runtime inputs to ingestion, not as duplicated constants inside worker code. [Source: _bmad-output/implementation-artifacts/1-2-configure-requirement-sync-rules-for-a-project.md]

### Git Intelligence Summary

- Git history still reflects planning and story-artifact work only, not code-level ingestion patterns.
- Because there is no prior worker implementation to reuse, keep queue/job naming and package ownership strictly aligned with the architecture to avoid future extraction work.

### Latest Technical Information

- Current GitHub guidance says webhook receivers should verify deliveries with a webhook secret, inspect event type and action before processing, use `X-GitHub-Delivery` for uniqueness, and respond with `2xx` within 10 seconds while queueing background work asynchronously. [External: https://docs.github.com/enterprise-cloud@latest/webhooks/using-webhooks/best-practices-for-using-webhooks] [External: https://docs.github.com/webhooks/using-webhooks/handling-webhook-deliveries]
- GitHub does not automatically redeliver failed webhook deliveries, so operator-visible failure tracking and manual recovery paths are necessary later even when the initial queue handoff is robust. [External: https://docs.github.com/en/webhooks/using-webhooks/handling-failed-webhook-deliveries]
- BullMQ supports built-in retry/backoff strategies and deduplication primitives. Use durable provider event IDs plus queue-level deduplication or stable `jobId` values to prevent duplicate processing, but do not rely on Redis-only deduplication as the sole correctness mechanism. [External: https://docs.bullmq.io/guide/retrying-failing-jobs] [External: https://docs.bullmq.io/guide/jobs/deduplication] [External: https://docs.bullmq.io/guide/jobs/job-ids]
- BullMQ's own guidance is to design jobs to be idempotent and as atomic as possible. Keep file fetch, validation, and persistence steps structured so retries do not corrupt final state. [External: https://docs.bullmq.io/patterns/idempotent-jobs]

### Risks and Watchouts

- Do not process all webhook payloads blindly. Only the specific merged-change events and actions needed for synchronized requirement ingestion should enqueue work.
- Avoid mixing transient provider failures with unrecoverable schema failures. They need different retry behavior.
- Do not make path-based identity assumptions that will block Story 1.6's move-and-rename handling. Requirement identity comes from frontmatter ID, not file path alone.

### Project Structure Notes

- No `project-context.md` file was found in the workspace.
- There is still no existing application scaffold, so implement the worker boundary cleanly instead of temporarily placing ingestion code inside the web app.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3: Ingest Merged Requirement File Changes into Derived Requirement Records]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4: Browse Synced Requirements with Search, Filters, and Sync-State Visibility]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5: Surface Markdown Validation Failures and Ingestion Errors with Actionable Guidance]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6: Preserve Stable Requirement Identity Across File Moves and Renames]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#1.1 Product Thesis]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#2.2 Success Metrics (v1 Launch)]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#7.6 Repository Ingestion & Graph Construction]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#8. Non-Functional Requirements]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#12. Data Model Overview]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision Priority Analysis]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Integration Points]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Effortless Interactions]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Critical Success Moments]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Flow Optimization Principles]
- [Source: _bmad-output/implementation-artifacts/1-1-connect-a-github-repository-to-a-project.md]
- [Source: _bmad-output/implementation-artifacts/1-2-configure-requirement-sync-rules-for-a-project.md]
- [External: https://docs.github.com/enterprise-cloud@latest/webhooks/using-webhooks/best-practices-for-using-webhooks]
- [External: https://docs.github.com/webhooks/using-webhooks/handling-webhook-deliveries]
- [External: https://docs.github.com/en/webhooks/using-webhooks/handling-failed-webhook-deliveries]
- [External: https://docs.bullmq.io/guide/retrying-failing-jobs]
- [External: https://docs.bullmq.io/guide/jobs/deduplication]
- [External: https://docs.bullmq.io/guide/jobs/job-ids]
- [External: https://docs.bullmq.io/patterns/idempotent-jobs]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story created via BMAD create-story workflow on 2026-03-15.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story context assumes Story 1.1 and Story 1.2 are the immediate predecessors and source of repository identity plus sync-rule configuration.
- No `project-context.md` file was present in the workspace.

### File List

- _bmad-output/implementation-artifacts/1-3-ingest-merged-requirement-file-changes-into-derived-requirement-records.md
