# Story 1.5: Surface Markdown Validation Failures and Ingestion Errors with Actionable Guidance

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator,
I want validation and ingestion failures to be surfaced clearly in the application,
so that I can understand why synchronization failed and what needs to be corrected without investigating infrastructure logs first.

## Acceptance Criteria

1. Given an ingested requirement file violates the configured markdown schema, when the ingestion job evaluates the file, then the system marks the affected requirement or file as failed, and it stores actionable validation details including file path, requirement ID if available, violated rule, and remediation guidance.
2. Given a webhook or ingestion job fails for a non-schema reason, when the system records the failure, then the failure is classified by type, such as verification failure, repository fetch failure, parse failure, persistence failure, or retry exhaustion, and the classification is visible to operators in the application.
3. Given I open the workspace or operator-facing sync view, when failures exist for the current project, then I can see a summary count of failed items and open the failure details for each affected file or requirement, and the details include the latest known commit SHA, event timestamp, and current retry or dead-letter status when applicable.
4. Given a file was skipped because it is outside configured sync scope, when I inspect ingestion outcomes, then the system distinguishes skipped files from failed files, and skipped files do not raise false-positive failure indicators.
5. Given a requirement later succeeds after a prior validation or ingestion failure, when a corrected file is ingested successfully, then the system updates the sync state to reflect the successful outcome, and it preserves enough failure history for audit and troubleshooting purposes.
6. Given failure details are shown in the application, when a user reads them, then they are expressed in operator-usable language rather than raw stack traces by default, and deeper technical detail remains available for troubleshooting when needed.

## Tasks / Subtasks

- [ ] Persist structured ingestion and validation failure records (AC: 1, 2, 3, 4, 5)
  - [ ] Extend the ingestion pipeline to write durable failure outcomes for schema violations, verification failures, fetch failures, parse failures, persistence failures, and retry exhaustion.
  - [ ] Record skipped files as a distinct outcome class so they can be reported without polluting failure counts.
  - [ ] Preserve enough history to show both the latest active failure state and prior resolved failures for audit and troubleshooting.
- [ ] Add reusable validation and error-formatting contracts (AC: 1, 2, 6)
  - [ ] Define shared failure payload schemas in `packages/contracts` and error formatting helpers in `packages/validation/src/error-formatting`.
  - [ ] Normalize schema failures into actionable findings with path, rule, requirement ID if available, and remediation guidance.
  - [ ] Normalize non-schema failures into operator-facing categories with optional deep diagnostic details kept separate from default UI text.
- [ ] Build operator-facing failure summary and detail surfaces (AC: 2, 3, 4, 6)
  - [ ] Add a project-scoped sync or validation view that lists active failed items and skipped items separately.
  - [ ] Show summary counts, latest known commit SHA, event timestamp, and retry or dead-letter state where applicable.
  - [ ] Make failure drill-down available from the workspace or shared sync-status area rather than hiding it behind infrastructure-only tooling.
- [ ] Update sync-state behavior for recovery and historical visibility (AC: 1, 3, 5)
  - [ ] Ensure a later successful ingestion transitions the requirement back to `in_sync` while preserving prior failure records.
  - [ ] Ensure active failure counts drop only when the latest state is healthy, not when historical failures merely exist.
  - [ ] Keep skipped items out of failure-state rollups and alerting surfaces.
- [ ] Add observability and audit hooks for failure surfacing (AC: 2, 3, 5, 6)
  - [ ] Emit structured logs and metrics using the same failure categories shown in the UI.
  - [ ] Avoid exposing raw stack traces, tokens, or private payload fragments in default operator views.
  - [ ] Preserve correlation identifiers so deeper troubleshooting remains possible.
- [ ] Add automated coverage for failure rendering and classification (AC: 1, 2, 3, 4, 5, 6)
  - [ ] Unit tests for validation finding formatting, failure classification, and skipped-versus-failed behavior.
  - [ ] Integration tests for failure persistence, recovery after a later successful sync, and operator query endpoints.
  - [ ] UI or end-to-end tests for summary counts, detail drill-down, and user-friendly error text.

## Dev Notes

### Story Intent and Cross-Story Dependencies

- Story 1.3 created the ingestion pipeline, queueing behavior, and sync states. This story makes those failure paths usable inside the product instead of only in logs and queue dashboards. [Source: _bmad-output/implementation-artifacts/1-3-ingest-merged-requirement-file-changes-into-derived-requirement-records.md]
- Story 1.4 created the browse surfaces and sync-status affordances. Reuse those surfaces for failure visibility and drill-down instead of creating a separate hidden admin-only UI. [Source: _bmad-output/implementation-artifacts/1-4-browse-synced-requirements-with-search-filters-and-sync-state-visibility.md]
- Story 1.6 depends on explicit failure and operator-review pathways for ambiguous move or rename cases, so keep failure models flexible enough to represent review-needed states cleanly.

### Technical Requirements

- Validation feedback must be machine-readable and actionable for both humans and AI-enabled workflows. The PRD explicitly calls for file path, requirement ID, violated rule, and remediation guidance in validation outputs. [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#7.6 Repository Ingestion & Graph Construction] [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#9. AI Agent Integration Requirements]
- Sync-state visibility and operator-visible failures are architectural requirements, not optional UX polish. Failed ingestion jobs must retry automatically, dead-letter after exhaustion, and appear in operator views quickly. [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns Identified] [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#8. Non-Functional Requirements]
- Healthy sync should stay quiet while failures stay obvious. That UX principle should drive the summary counts, sync indicators, and wording of error states. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Experience Principles] [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns]

### Recommended Domain and API Shape

- Suggested route handlers:
  - `GET /api/v1/projects/{projectId}/ingestion-failures`
  - `GET /api/v1/projects/{projectId}/sync-health`
  - optional `GET /api/v1/projects/{projectId}/ingestion-outcomes` if skipped items should be modeled separately from failures
- Suggested domain ownership:
  - `packages/domain/ingestion` owns failure classification and state transitions
  - `packages/contracts` owns failure DTOs, enums, and operator-facing payloads
  - `packages/validation` owns schema-finding formatting
  - `packages/db/src/queries` owns project-level failure summary queries
- Suggested failure categories:
  - `verification_failure`
  - `repository_fetch_failure`
  - `parse_failure`
  - `schema_validation_failure`
  - `persistence_failure`
  - `retry_exhausted`
  - `skipped_out_of_scope`

### Architecture Compliance

- Continue to keep background processing, classification, and persistence in worker and domain layers. UI routes should query already-structured failure data instead of parsing log text. [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- Reuse shared contracts and error-formatting helpers across worker, API, and future CLI boundaries. Do not create separate UI-only failure text generators. [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns] [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- Observability fields and UI-visible failure categories should use the same vocabulary so operator workflows stay consistent across logs, metrics, and the app. [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]

### File Structure Requirements

- Failure and sync views: `apps/web/src/app/(app)/settings/validation` or a dedicated sync surface under the existing app shell
- Shared sync indicators and related UI: `packages/ui/src/components/sync-status`
- Query layer: `packages/db/src/queries`
- Domain logic: `packages/domain/src/ingestion`
- Error-formatting helpers: `packages/validation/src/error-formatting`

### Data Model Notes

- Recommended failure-related storage:
  - `ingestion_events`
  - `ingestion_failures` or `ingestion_event_failures`
  - `validation_findings`
  - optional `ingestion_skips` or a status field on event items
- Minimum failure detail fields:
  - `project_id`
  - `provider`
  - `provider_event_id`
  - `commit_sha`
  - `source_path`
  - `requirement_id` nullable
  - `failure_category`
  - `user_message`
  - `technical_details` nullable
  - `retry_status`
  - `dead_lettered_at` nullable
  - `occurred_at`
  - `resolved_at` nullable
- Keep historical failure records append-only or otherwise auditable even after a requirement returns to `in_sync`.

### UX Requirements

- The UX spec expects conflicts and ingestion failures to be impossible to miss, but successful sync to stay largely silent. Use persistent warning or error patterns only when user action may be required. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns]
- Failure details must default to operator-usable language, not stack traces. Technical details can live behind an expandable detail affordance for deeper troubleshooting. [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5: Surface Markdown Validation Failures and Ingestion Errors with Actionable Guidance]
- Failure summaries should be accessible from the workspace or sync indicator so users can move from health overview to specific failed item in one step. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey Patterns]

### Previous Story Intelligence

- Story 1.3 already separated skipped out-of-scope files from real processing failures in the ingestion acceptance criteria. Preserve that distinction in data and UI rather than trying to infer it later. [Source: _bmad-output/implementation-artifacts/1-3-ingest-merged-requirement-file-changes-into-derived-requirement-records.md]
- Story 1.4 established the browse layer and sync-health indicator. Extend those surfaces with failure visibility instead of introducing an unrelated operator console. [Source: _bmad-output/implementation-artifacts/1-4-browse-synced-requirements-with-search-filters-and-sync-state-visibility.md]

### Git Intelligence Summary

- There are still no code-level implementation commits to inherit, so failure vocabulary and data shape should be driven directly from the architecture, PRD, and Epic 1 acceptance criteria.
- Keep summary queries and UI contracts stable because later operator-recovery stories will build on them rather than replace them.

### Latest Technical Information

- No additional fast-moving external API guidance is central to this story beyond the provider and queue behaviors already captured in Story 1.3.
- Focus on durable internal contracts: stable failure categories, safe default messaging, and append-only troubleshooting history.

### Risks and Watchouts

- Do not collapse all failures into a generic "sync failed" message. Operators need specific classification and remediation guidance.
- Avoid using raw exception strings as the primary UI content. They will leak implementation detail, fluctuate across refactors, and often omit actionable next steps.
- Do not count skipped files as failures in the shared sync-health indicator. That would create false-positive alarm states.

### Project Structure Notes

- No `project-context.md` file was found in the workspace.
- This story should extend Epic 1's existing browse and sync surfaces, not branch off into a standalone observability application.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5: Surface Markdown Validation Failures and Ingestion Errors with Actionable Guidance]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#7.6 Repository Ingestion & Graph Construction]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#8. Non-Functional Requirements]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#9. AI Agent Integration Requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns Identified]
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Experience Principles]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns]
- [Source: _bmad-output/implementation-artifacts/1-3-ingest-merged-requirement-file-changes-into-derived-requirement-records.md]
- [Source: _bmad-output/implementation-artifacts/1-4-browse-synced-requirements-with-search-filters-and-sync-state-visibility.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story created via BMAD create-story workflow on 2026-03-15.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story context assumes Story 1.3 and Story 1.4 already define ingestion outcomes and browse surfaces.
- No `project-context.md` file was present in the workspace.

### File List

- _bmad-output/implementation-artifacts/1-5-surface-markdown-validation-failures-and-ingestion-errors-with-actionable-guidance.md
