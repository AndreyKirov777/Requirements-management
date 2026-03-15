# Story 1.4: Browse Synced Requirements with Search, Filters, and Sync-State Visibility

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a reviewer,
I want to browse synchronized requirements in the application with search, filters, and visible sync status,
so that I can quickly confirm what the system has ingested from Git and identify anything needing attention.

## Acceptance Criteria

1. Given a project has synchronized requirement records in the database, when I open the project workspace, then I see a requirement list view showing requirement ID, title, type, status, source path, last synced commit, and current sync state, and the list loads within the performance target for normal project sizes.
2. Given I am viewing synced requirements, when I search by requirement ID, title, or body text, then the system returns matching results from the synchronized requirement set, and the results reflect the latest successfully ingested state.
3. Given I am reviewing the requirement list, when I filter by sync state, requirement type, lifecycle status, or tag, then the system narrows the visible results without losing the current project context, and active filters remain visible so I can understand why a subset is shown.
4. Given one or more requirements have `pending`, `conflict`, or `failed` sync states, when I view the workspace, then those states are visually distinct in the list and in the persistent sync-status indicator, and I can identify which requirements need follow-up without inspecting raw logs.
5. Given a project has no synchronized requirements yet, when I open the workspace, then the system shows an informative empty state explaining that no requirement content has been ingested yet, and it points me to repository sync or ingestion setup rather than showing a blank table.
6. Given I switch between search and filtered views during a review session, when I refine or clear the query and filters, then the system preserves stable list behavior and project context, and it does not require a full workspace reset to continue browsing.

## Tasks / Subtasks

- [ ] Build the synced-requirements query layer (AC: 1, 2, 3, 4, 5, 6)
  - [ ] Add query methods in `packages/db/src/queries` for paginated requirement listing scoped by project.
  - [ ] Support exact or prefix matching for requirement ID plus full-text or indexed search across title and body content.
  - [ ] Support filters for sync state, requirement type, lifecycle status, and tag without losing project context.
- [ ] Implement the Table view for synchronized requirements (AC: 1, 2, 3, 5, 6)
  - [ ] Add the requirements table page under `apps/web/src/app/(app)/requirements/page.tsx`.
  - [ ] Show the required columns: ID, title, type, status, source path, last synced commit, and sync state.
  - [ ] Keep sorting, filter chips, and search controls visible and stable during navigation and data refresh.
- [ ] Add visible sync-state affordances in the shared shell (AC: 4, 5)
  - [ ] Implement a persistent sync-status indicator in the app shell or sidebar footer using the canonical sync states.
  - [ ] Make `pending`, `conflict`, and `failed` visually distinct in both the table and the shared sync-health element.
  - [ ] Ensure healthy sync stays calm and unobtrusive while degraded states remain obvious.
- [ ] Implement empty-state and context-preservation behavior (AC: 5, 6)
  - [ ] Show an empty state that explains no requirement content has been ingested yet and points back to setup rather than showing a blank table.
  - [ ] Persist active filters and search state per session for the current view.
  - [ ] Preserve project context when filters change or are cleared.
- [ ] Wire routes and contracts for list/search/filter access (AC: 1, 2, 3, 4, 6)
  - [ ] Add a list endpoint such as `GET /api/v1/requirements` backed by shared query parameter contracts.
  - [ ] Add a lightweight sync-health endpoint if the UI shell needs separate summary data.
  - [ ] Use shared contracts for filter inputs and response payloads; do not invent client-only shapes.
- [ ] Add automated tests for browse behavior (AC: 1, 2, 3, 4, 5, 6)
  - [ ] Query-layer tests for search, filters, and sync-state sorting or visibility rules.
  - [ ] Integration tests for list endpoint behavior and project scoping.
  - [ ] UI or end-to-end tests for active filter chips, empty state, degraded sync indicators, and context preservation.

## Dev Notes

### Story Intent and Cross-Story Dependencies

- This story is the first user-facing read surface for Epic 1's synchronized records. It depends directly on Story 1.3 producing reliable derived requirement records and sync states. [Source: _bmad-output/implementation-artifacts/1-3-ingest-merged-requirement-file-changes-into-derived-requirement-records.md]
- Story 1.5 extends the same list and sync-status surfaces with richer failure details, so keep the browse layer compatible with operator-visible error drill-down rather than treating failed sync states as decorative badges only. [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5: Surface Markdown Validation Failures and Ingestion Errors with Actionable Guidance]
- This view becomes the daily workhorse for later epics, so use the architecture's query-layer and shared-table direction instead of a one-off page implementation. [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]

### Technical Requirements

- Search and navigation are explicit product requirements. Users must be able to search synchronized requirements by ID, title, and body text, and filter by sync state and domain fields without losing context. [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#7.4 Search & Navigation] [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4: Browse Synced Requirements with Search, Filters, and Sync-State Visibility]
- The architecture selected PostgreSQL full-text search for v1, so implement search on the query layer using PostgreSQL rather than adding a secondary search engine or client-only filtering approach. [Source: _bmad-output/planning-artifacts/architecture.md#Decision Priority Analysis] [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- Sync state must remain a first-class field in data and UI. The architecture names the canonical enum values and the UX expects them to drive persistent sync-health affordances. [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns]

### Recommended Domain and API Shape

- Suggested route handlers:
  - `GET /api/v1/requirements?projectId=...&q=...&syncState=...&type=...&status=...&tag=...`
  - `GET /api/v1/projects/{projectId}/sync-health`
- Suggested ownership:
  - `packages/db/src/queries` owns list/search/filter SQL
  - `packages/contracts/src/api` owns query param and response schemas
  - `apps/web/src/app/(app)/requirements` owns the page and route-level data loading
  - `packages/ui/src/components/data-table` owns reusable table primitives
- Suggested response fields:
  - `requirementId`
  - `title`
  - `type`
  - `status`
  - `sourcePath`
  - `lastSyncedCommitSha`
  - `syncState`
  - tags and any lightweight counts needed for display

### Architecture Compliance

- Read-heavy browse queries belong in `packages/db/src/queries`, not inside React components or ad hoc server actions. [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping] [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- Use the shared UI/data-table direction already defined in the architecture. Do not build an isolated table implementation that later diverges from other views. [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- Keep business filtering semantics server-driven so large datasets and project scoping remain correct under the product's scale and performance requirements. [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#8. Non-Functional Requirements]

### File Structure Requirements

- Requirements page: `apps/web/src/app/(app)/requirements/page.tsx`
- Requirement loading state: `apps/web/src/app/(app)/requirements/loading.tsx`
- Page-specific components: `apps/web/src/components/requirements`
- Shared table primitives: `packages/ui/src/components/data-table`
- Sync status indicator: `packages/ui/src/components/sync-status` or `apps/web/src/components/app-shell` depending on reuse needs
- Query layer: `packages/db/src/queries`

### Data Model Notes

- This story reads from the `requirements` model produced in Story 1.3 and expects searchable fields for:
  - stable requirement ID
  - title
  - body or normalized text content
  - type
  - lifecycle status
  - tags
  - source path
  - last synced commit SHA
  - sync state
- Prefer database indexes or generated tsvector support aligned to the architecture's PostgreSQL full-text search decision.
- If tags are not fully modeled yet, leave the filter contract ready and backfill the data model in the same story only if needed to satisfy the acceptance criteria cleanly.

### UX Requirements

- The chosen UX direction makes Dashboard, Table, and Graph peer views with a shared sidebar, sync status indicator, and topbar. This story implements the Table workhorse for Epic 1 browsing. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Chosen Direction]
- The UX explicitly requires:
  - dense table with visible filter chips
  - search always available
  - active filters always visible
  - persistent sync-health indicator
  - clear empty state for no ingested requirements
  - context preservation when switching filters or views
  [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Search and Filtering Patterns] [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Empty States] [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Navigation Patterns]
- Loading behavior should show page structure immediately and progressively fill data rather than blocking the entire page. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Loading States]

### Previous Story Intelligence

- Story 1.3 established the canonical sync states and the expectation that synchronized records become queryable quickly after ingestion. Keep the browse layer read-only over that derived state and do not recalculate sync semantics in the UI. [Source: _bmad-output/implementation-artifacts/1-3-ingest-merged-requirement-file-changes-into-derived-requirement-records.md]
- Story 1.2 defined project-level sync readiness. The empty state here should point users back to repository sync setup when nothing has been ingested yet, not imply that the system lacks data for unknown reasons. [Source: _bmad-output/implementation-artifacts/1-2-configure-requirement-sync-rules-for-a-project.md]

### Git Intelligence Summary

- There are still no code-level table or query implementations in git history, so the architecture and UX docs are the source of truth for browse patterns.
- Avoid baking browse logic directly into page components because later stories and epics will need the same query layer for dashboard and graph drill-down.

### Latest Technical Information

- No additional fast-changing provider API details are central to this story beyond the framework and persistence guidance already captured in Stories 1.1 through 1.3.
- Stay on the architecture's selected stack: Next.js App Router, PostgreSQL full-text search, shared contracts, and reusable data-table primitives.

### Risks and Watchouts

- Do not implement client-only filtering over a large preloaded dataset. That would break project scoping, performance targets, and later pagination needs.
- Avoid hiding active filters inside a collapsed panel. The UX explicitly says users should always understand why they are seeing a subset.
- Do not treat `failed` and `conflict` as the same visual state; later operator actions depend on those distinctions.

### Project Structure Notes

- No `project-context.md` file was found in the workspace.
- The requirements table should be implemented as a reusable product view, not as a temporary Epic 1-only admin screen.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4: Browse Synced Requirements with Search, Filters, and Sync-State Visibility]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5: Surface Markdown Validation Failures and Ingestion Errors with Actionable Guidance]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#7.4 Search & Navigation]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#8. Non-Functional Requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision Priority Analysis]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Chosen Direction]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Navigation Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Empty States]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Loading States]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Search and Filtering Patterns]
- [Source: _bmad-output/implementation-artifacts/1-2-configure-requirement-sync-rules-for-a-project.md]
- [Source: _bmad-output/implementation-artifacts/1-3-ingest-merged-requirement-file-changes-into-derived-requirement-records.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story created via BMAD create-story workflow on 2026-03-15.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story context assumes Story 1.3 supplies synchronized records and canonical sync states.
- No `project-context.md` file was present in the workspace.

### File List

- _bmad-output/implementation-artifacts/1-4-browse-synced-requirements-with-search-filters-and-sync-state-visibility.md
