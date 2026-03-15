# Story 1.6: Preserve Stable Requirement Identity Across File Moves and Renames

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator,
I want requirement identity to remain stable when a requirement file is moved or renamed in the repository,
so that synchronization does not create duplicate records or break downstream references when the frontmatter ID remains unchanged.

## Acceptance Criteria

1. Given an already synchronized requirement file is moved to a new path within the configured requirements scope, when the moved file is ingested and its frontmatter requirement ID is unchanged, then the system updates the source path on the existing requirement record rather than creating a new record, and the requirement keeps its prior identity, audit history, and sync lineage.
2. Given an already synchronized requirement file is renamed within the configured requirements scope, when the renamed file is ingested and its frontmatter requirement ID is unchanged, then the system treats the file as the same requirement, and the synchronized record keeps its existing requirement identity and links.
3. Given a file move or rename results in both old-path and new-path events being observed, when ingestion processes those events, then the system resolves them idempotently to a single requirement record, and it does not create duplicate active requirement entries for the same requirement ID.
4. Given a moved or renamed file changes path but not identity, when I view the requirement in the application, then I can see the latest source path and last synced commit, and the requirement remains searchable by its stable requirement ID.
5. Given a moved or renamed file introduces an ID mismatch or ambiguity, when the ingestion pipeline cannot safely determine whether the record should be updated or treated as new, then the system marks the requirement for operator review or failure rather than guessing, and it records enough context for explicit resolution.

## Tasks / Subtasks

- [ ] Make stable requirement ID the primary ingestion identity key (AC: 1, 2, 3, 4, 5)
  - [ ] Update ingestion matching logic to treat frontmatter requirement ID as the durable identity and file path as mutable source metadata.
  - [ ] Ensure upsert logic updates existing records by stable requirement ID within the project scope rather than creating path-based duplicates.
  - [ ] Preserve current behavior for truly new requirement IDs.
- [ ] Persist source path lineage and latest location (AC: 1, 2, 4)
  - [ ] Store the latest source path on the requirement record for browse use.
  - [ ] Preserve prior path history in revisions or a dedicated path-lineage table so moves and renames remain auditable.
  - [ ] Update last synced commit and related source metadata whenever a path change is accepted.
- [ ] Handle duplicate old-path and new-path event combinations idempotently (AC: 3)
  - [ ] Normalize move and rename processing so duplicate deliveries or event ordering differences do not create multiple active records.
  - [ ] Treat old-path deletions and new-path creations as a single logical identity update when the stable requirement ID matches.
  - [ ] Reuse the idempotency patterns from Story 1.3 instead of adding a second duplicate-prevention model.
- [ ] Surface ambiguous identity cases for review (AC: 5)
  - [ ] Detect cases where path change and frontmatter ID changes do not reconcile safely.
  - [ ] Mark those cases as failure or review-needed outcomes rather than guessing which record should win.
  - [ ] Persist enough detail for the operator-facing failure flow from Story 1.5 to explain the ambiguity.
- [ ] Keep read surfaces aligned with latest location and stable ID (AC: 4)
  - [ ] Ensure search by stable requirement ID still returns the requirement after a move or rename.
  - [ ] Ensure table and detail views show the latest source path and commit SHA.
  - [ ] Ensure downstream links and audit history continue to reference the same logical requirement.
- [ ] Add automated coverage for move and rename behavior (AC: 1, 2, 3, 4, 5)
  - [ ] Unit tests for identity matching, path updates, and ambiguity detection.
  - [ ] Integration tests for move events, rename events, duplicate delivery ordering, and mixed old-path/new-path payloads.
  - [ ] Query and UI tests to confirm stable ID search and latest path display after path changes.

## Dev Notes

### Story Intent and Cross-Story Dependencies

- Story 1.3 introduced path, commit, and sync-state tracking on synchronized requirement records. This story corrects the identity model so path changes do not become false requirement creations. [Source: _bmad-output/implementation-artifacts/1-3-ingest-merged-requirement-file-changes-into-derived-requirement-records.md]
- Story 1.5 already expects ambiguous or unsafe ingestion cases to become explicit operator-visible failures. Reuse that workflow for mismatch cases rather than silently choosing a winner. [Source: _bmad-output/implementation-artifacts/1-5-surface-markdown-validation-failures-and-ingestion-errors-with-actionable-guidance.md]
- Later epics depend on stable requirement identity for links, audit history, baselines, and exports. A path-based identity model here would create regressions across the product.

### Technical Requirements

- The PRD explicitly requires stable requirement identity even when a file is moved or renamed, provided the frontmatter requirement ID remains unchanged. [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#7.6 Repository Ingestion & Graph Construction] [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6: Preserve Stable Requirement Identity Across File Moves and Renames]
- Git remains the source of truth for content, but the derived database must preserve identity, history, and downstream references independent of the current repository path. [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#1.1 Product Thesis] [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#12. Data Model Overview]
- Ambiguity must surface explicitly. The architecture and Epic 1 both favor visible conflict or failure states over silent overwrite behavior. [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns Identified] [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Critical Success Moments]

### Recommended Domain and API Shape

- No new public route is required if existing ingestion and failure surfaces can expose the behavior cleanly.
- Suggested domain ownership:
  - `packages/domain/ingestion` owns stable-ID matching and path-lineage updates
  - `packages/db` owns requirement identity repositories and path-history persistence
  - `packages/contracts` owns any review-needed failure payloads used by the UI
- Suggested internal concepts:
  - `RequirementIdentity` based on project plus stable frontmatter ID
  - `RequirementSourceLocation` for mutable path metadata
  - `RequirementPathChangeOutcome` for updated, ambiguous, or ignored outcomes

### Architecture Compliance

- Keep identity rules in domain services, not in route handlers or UI code. [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- Reuse the existing ingestion event and idempotency patterns rather than introducing a separate move-or-rename subsystem. [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- Continue to centralize persistence in `packages/db` and read surfaces in query layers. [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]

### File Structure Requirements

- Identity and path-lineage logic: `packages/domain/src/ingestion`
- Repositories and path history persistence: `packages/db/src/repositories`
- Read queries for latest path display: `packages/db/src/queries`
- Operator failure surfacing: existing Story 1.5 sync or validation views

### Data Model Notes

- Recommended additions or refinements:
  - `requirements.stable_requirement_id` or equivalent canonical field if not already explicit
  - `requirements.source_path` as the latest known active path
  - `requirement_revisions` entries that record path changes
  - optional `requirement_source_locations` table for auditable path lineage
- Required invariants:
  - one active requirement record per project plus stable requirement ID
  - path changes update metadata, not identity
  - ambiguous stable ID transitions create failure or review-needed outcomes

### UX Requirements

- When a path changes but identity does not, the browse layer should quietly show the new path and commit without looking like a new requirement appeared. This supports the product's trust-through-transparency goal. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Experience Principles]
- When identity is ambiguous, the system should surface the case clearly for operator review rather than hiding it behind stale data. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 6: Conflict Resolution]
- Stable ID search must keep working after a move or rename because the requirement's logical identity is unchanged. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Search and Filtering Patterns]

### Previous Story Intelligence

- Story 1.3 intentionally stored both source path and stable requirement content metadata. Evolve that model toward stable-ID ownership rather than throwing it away. [Source: _bmad-output/implementation-artifacts/1-3-ingest-merged-requirement-file-changes-into-derived-requirement-records.md]
- Story 1.5 already established a structured path for operator-visible failures and ambiguous outcomes. Route unsafe identity cases through that system. [Source: _bmad-output/implementation-artifacts/1-5-surface-markdown-validation-failures-and-ingestion-errors-with-actionable-guidance.md]

### Git Intelligence Summary

- There are still no code-level move or rename handling patterns in the repository, so the architecture and acceptance criteria are the sole guardrails.
- Keep the identity model simple and explicit now; retrofitting stable IDs after more epics land would be expensive.

### Latest Technical Information

- No additional fast-changing external provider guidance is central to this story beyond the existing webhook and ingestion rules already captured in Story 1.3.
- The main risk here is internal data-model drift, not external API volatility.

### Risks and Watchouts

- Do not use source path as the unique business identity for a requirement.
- Avoid silently merging records when both path and requirement ID change in ways that could represent separate requirements.
- Do not lose previous path lineage; later audit and compliance stories will need it.

### Project Structure Notes

- No `project-context.md` file was found in the workspace.
- This story should modify the ingestion domain model and persistence rules, not add a one-off post-processing script.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6: Preserve Stable Requirement Identity Across File Moves and Renames]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#1.1 Product Thesis]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#7.6 Repository Ingestion & Graph Construction]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#12. Data Model Overview]
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns Identified]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Critical Success Moments]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Experience Principles]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 6: Conflict Resolution]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Search and Filtering Patterns]
- [Source: _bmad-output/implementation-artifacts/1-3-ingest-merged-requirement-file-changes-into-derived-requirement-records.md]
- [Source: _bmad-output/implementation-artifacts/1-5-surface-markdown-validation-failures-and-ingestion-errors-with-actionable-guidance.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story created via BMAD create-story workflow on 2026-03-15.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story context assumes Story 1.3 defines the ingestion core and Story 1.5 defines operator-visible failure handling.
- No `project-context.md` file was present in the workspace.

### File List

- _bmad-output/implementation-artifacts/1-6-preserve-stable-requirement-identity-across-file-moves-and-renames.md
