---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
inputDocuments:
  - /Users/andreisadakov/Documents/Cursor/Requirements-management/_bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md
  - /Users/andreisadakov/Documents/Cursor/Requirements-management/_bmad-output/planning-artifacts/architecture.md
  - /Users/andreisadakov/Documents/Cursor/Requirements-management/_bmad-output/planning-artifacts/ux-design-specification.md
---

# Requirements-management - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Requirements-management, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-001: Users can create a requirement with a unique generated ID, title, markdown or rich-text description, requirement type, lifecycle status, and priority.
FR-002: Administrators can configure up to 25 project-specific metadata fields per project, including field type, allowed values, and required or optional status.
FR-003: Users can organize requirements in a hierarchy of project -> module -> requirement -> sub-requirement and reorder sibling items within the same parent by drag and drop.
FR-004: Users can rely on every requirement keeping a unique stable human-readable ID such as `SYS-REQ-0042` even when the requirement is moved or renamed.
FR-005: Users can tag a requirement with up to 20 project-defined cross-cutting tags such as `security`, `performance`, or `GDPR`.
FR-006: Users can attach reference files up to 25 MB per file to a requirement and preview or download those files from the requirement record.
FR-007: Users can add threaded comments to a requirement and mention other users in a comment.
FR-008: Administrators can define reusable requirement templates that pre-populate default fields and required body sections for at least 10 requirement types per project.
FR-009: Users can request AI-assisted requirement review that flags ambiguous language, missing acceptance criteria, and missing traceability links with at least 90% precision on benchmark review sets curated by product owners.
FR-010: Users can create bidirectional traceability links between requirements, other requirements, implementation items, test cases, test results, and release artifacts using defined link types such as `derives-from`, `refines`, `verified-by`, and `conflicts-with`.
FR-011: Users can view a live traceability matrix for a selected project showing each requirement's implementation and test coverage status.
FR-012: Users can identify orphaned requirements with no upstream source or downstream verification within 60 seconds of opening the project dashboard.
FR-013: Users can export the traceability matrix for a selected project in PDF and CSV formats.
FR-014: Reviewers can select a changed requirement and view all linked downstream implementation and test items that may be affected.
FR-015: Users can see broken or stale external links within 60 seconds of the related synchronization or refresh event.
FR-016: Users can view multi-level traceability chains across stakeholder needs, system requirements, software requirements, test evidence, and release records.
FR-020: Users and reviewers can view an audit entry for every requirement change, including timestamp, actor identity, change summary, and before and after values.
FR-021: Users can view the full revision history of any requirement and restore a previous version through a controlled restore action.
FR-022: Reviewers can create a named locked baseline for a project's requirements at a point in time and preserve it as a comparison target.
FR-023: Users can compare two baselines, or a baseline against the current state, using a diff view that highlights changed fields, links, and statuses.
FR-024: Users can see deleted or deprecated requirement IDs preserved as permanently retired identifiers that cannot be reused.
FR-040: Users can run full-text search across all requirements within a project or across all projects they can access.
FR-041: Users can filter requirements by status, type, priority, tag, assignee, custom field value, and coverage status.
FR-042: Users can save and share named views that preserve filters, sort order, and visible columns.
FR-043: Reviewers can open a visual dependency graph for a selected requirement or module and inspect upstream and downstream links up to three hops deep.
FR-050: Users can import requirements from CSV or Excel with a field-mapping interface, from ReqIF packages, and from Word documents that use supported headings or tables.
FR-051: Users can export requirements and requirement-linked reports in CSV, JSON, PDF, and ReqIF formats.
FR-052: Administrators can configure at least five saved export templates per project with custom field selection, ordering, labels, and formatting rules.
FR-053: Administrators can configure a dedicated repository folder, naming convention, and branch policy for requirement markdown files on a per-project basis.
FR-054: Users and AI agents can rely on each markdown requirement file mapping to a stable requirement record in the synchronized graph using a unique requirement ID stored in frontmatter.
FR-055: Repository maintainers can connect GitHub or GitLab webhooks so merged requirement-file changes are ingested and reflected in graph records and traceability links within the ingestion SLA.
FR-056: Users can create or edit requirements through the web UI, and the system publishes those changes as system-generated pull or merge requests; direct writes to the default branch are not permitted.
FR-057: Users, AI agents, and AI SDLC DevOps operators can rely on the Git repository as the single source of truth for requirement content while the application database stores derived graph, coverage, audit, and synchronization data.
FR-058: Reviewers can inspect ingestion conflicts, compare repository and graph versions, preserve both versions, and complete an explicit reconciliation decision before the graph is updated.
FR-059: Operators can trigger manual re-index, full re-ingestion, or single-requirement reconciliation actions from the UI.
FR-060: Repository authors and AI agents can validate requirement markdown against the documented schema and receive actionable errors that include file path, requirement ID, violated rule, and remediation guidance.
FR-061: Users can move or rename requirement files without losing requirement identity, history, or traceability links when the requirement ID in frontmatter remains unchanged.

### NonFunctional Requirements

NFR-001: Requirement list views with up to 10,000 requirements shall load in under 2 seconds for the 95th percentile, and traceability matrix generation for a project of 2,000 requirements shall complete in under 10 seconds for the 95th percentile, as measured by synthetic browser tests on supported desktop browsers.
NFR-002: The authenticated web application and public webhook ingestion endpoints shall maintain 99.9% monthly availability excluding scheduled maintenance, as measured by 1-minute interval uptime probes and incident records.
NFR-003: All persisted system data shall be encrypted at rest with AES-256 or equivalent and all network traffic shall use TLS 1.3 or higher; 100% of interactive web UI and integration API requests shall require an authenticated principal except explicitly documented webhook verification endpoints, as verified by quarterly configuration audits and annual penetration testing.
NFR-004: Audit logs shall be append-only, tamper-evident, and retained for a minimum of 10 years or a stricter organization-specific policy, as verified by quarterly control audits and annual restore tests.
NFR-005: The system shall support projects with up to 100,000 requirements while keeping response time and throughput within 10% of baseline under normal load, as measured by quarterly load-testing runs.
NFR-007: The integration API shall sustain at least 1,000 requests per minute per authenticated client with 95th percentile response time under 500 ms under documented normal load, as measured by load tests.
NFR-008: 95% of merged changes to requirement files shall be reflected in the system graph within 60 seconds, measured from webhook receipt to successful graph update completion.
NFR-009: 95% of UI-originated requirement changes shall produce a repository pull or merge request within 5 minutes of submission, as measured by background job telemetry.
NFR-010: Replaying the same webhook event or UI publish job with the same idempotency key shall not create more than one revision, audit entry, or pull request, as verified by automated replay tests in CI.
NFR-011: Failed ingestion jobs shall retry automatically up to 5 times within 15 minutes using exponential backoff, move to a dead-letter queue after retry exhaustion, and appear in the operator dashboard within 60 seconds of dead-letter placement.
NFR-012: The system shall expose an ingestion status for every requirement (`in_sync`, `pending`, `conflict`, `failed`) and keep synchronized graph state no older than 5 minutes under normal operating conditions, as measured by hourly synthetic drift checks that compare repository commit state with graph state.

### Additional Requirements

- Architecture starter template: Epic 1 Story 1 should initialize the project as a `shadcn` monorepo with Next.js using `pnpm dlx shadcn@latest init -t next --monorepo`.
- Architecture stack direction: implement as a TypeScript modular monolith with separate `web` and `worker` runtime units in one monorepo.
- Architecture persistence direction: use PostgreSQL as the derived application store and model traceability in relational tables plus recursive queries; do not introduce a separate graph database in v1.
- Architecture async direction: use Redis-backed BullMQ queues for ingestion, reconciliation, export generation, and PR or MR publish jobs.
- Architecture API direction: expose REST JSON endpoints under `/api/v1` plus verified inbound webhook endpoints.
- Architecture auth direction: use OIDC-compatible enterprise authentication with application RBAC roles `viewer`, `author`, `reviewer`, and `administrator`.
- Architecture implementation rule: keep domain and worker logic outside UI route handlers; use Next.js as the backend-for-frontend for UI-facing APIs only.
- Architecture shared-contract rule: use Prisma ORM v7 for schema and migrations and Zod 4 for shared contracts and validation at API, worker, and CLI boundaries.
- Architecture observability rule: instrument web, worker, and ingestion flows with OpenTelemetry, structured logs, queue metrics, and drift checks.
- Architecture operational rule: support dead-letter queues, retry policies, manual reconciliation tools, and job dashboard visibility for ingestion failures.
- Architecture storage rule: use S3-compatible object storage for attachments and generated exports.
- Architecture deployment rule: deploy as containerized services with separate `web` and `worker` deployables in a single-tenant environment per deployment.
- Architecture follow-on design inputs: resolve file granularity, conflict resolution policy, baseline-to-Git semantics, and invalid-markdown-after-merge handling during implementation planning.
- Architecture follow-on artifact: add a first-pass schema draft before readiness review or sprint planning if possible.
- PRD AI requirements to carry into story design: publish a documented markdown schema, preserve agent attribution in audit trails, support CI-compatible validation outputs, support structured clarification requests, notify CI or agents about requirement changes or conflicts, and optionally expose a lightweight read-only computed query surface.
- PRD compliance requirements to carry into story design: preserve immutable audit history, support locked baselines, surface compliance gaps, support regulatory attribute mapping, and include export metadata required for regulated reporting.
- User planning constraint: deliver in thin vertical slices rather than by waterfall phase completion.
- User planning constraint: the first implementation slice should establish reliable text synchronization from the Git repository into the derived application database before broader reporting, graph, or dashboard scope.

### UX Design Requirements

UX-DR-001: Implement a dashboard home screen with four primary KPI surfaces for coverage percentage, orphan count, sync health, and agent activity, and make each KPI open the relevant filtered work view in one click.
UX-DR-002: Implement a shared collapsible sidebar with project and module hierarchy, coverage badges, a view switcher, and a persistent sync-health footer.
UX-DR-003: Implement a dense table view for requirements with sorting, multi-field filtering, grouping, visible filter chips, and per-session filter persistence.
UX-DR-004: Implement a focused traceability graph that opens centered on a selected requirement, shows immediate neighbors first, and supports zoom, pan, progressive expansion, and path highlighting.
UX-DR-005: Implement graph filters for node type, link type, and coverage state that apply immediately without a submit action.
UX-DR-006: Implement a reusable requirement detail overlay that can open from the dashboard, table, graph, and activity feed without changing the underlying interaction model.
UX-DR-007: Implement inline requirement editing with field-level validation feedback shown before PR generation or save completion.
UX-DR-008: Implement a global command palette triggered by `Cmd+K` for requirement search, navigation between views, and execution of common actions.
UX-DR-009: Implement keyboard shortcuts for primary views, with `Cmd+1` for Dashboard, `Cmd+2` for Table, and `Cmd+3` for Graph.
UX-DR-010: Implement a unified activity feed that mixes human and agent changes in the same timeline, aggregates multiple file changes per PR or MR into one item, and exposes commit, PR or MR, and validation status details.
UX-DR-011: Implement a persistent sync-status indicator that surfaces healthy, degraded, failed, and conflict states clearly while keeping successful sync largely silent.
UX-DR-012: Implement an ingestion progress panel for onboarding and long-running sync work that shows processed file counts, validation summaries, warnings, errors, and completion state.
UX-DR-013: Implement consistent coverage-state badges or indicators across dashboard cards, sidebar nodes, table rows, graph nodes, and detail views using shared semantic status colors.
UX-DR-014: Implement desktop-first responsive layouts with full workflows at widths of 1024px and above and usable dashboard and review flows at widths from 768px to 1023px; phone-sized authoring workflows are out of scope for v1.
UX-DR-015: Implement keyboard-accessible interaction patterns across all interactive UI, including focus management, graph node labels, command surfaces, and visible validation errors.
UX-DR-016: Implement loading states that show page structure immediately and progressively fill data, avoiding full-screen blocking loaders for normal operations.
UX-DR-017: Implement explicit empty states for no projects, no matching requirements, no traceability links, and no activity so the interface stays informative when data is sparse.
UX-DR-018: Implement context-preserving transitions so switching between dashboard, table, graph, and detail views retains the selected requirement or active filter whenever possible.
UX-DR-019: Implement a conflict-resolution flow that starts from a visible dashboard or KPI signal, opens the affected requirement set, and supports side-by-side comparison and explicit resolution.
UX-DR-020: Implement shared design tokens for spacing, typography, border radius, coverage colors, and actor colors, with both light and dark theme support.

### FR Coverage Map

### FR Coverage Map

FR-001: Epic 2 - Manage Requirements Through a Git-Backed Workspace
FR-002: Epic 2 - Manage Requirements Through a Git-Backed Workspace
FR-003: Epic 2 - Manage Requirements Through a Git-Backed Workspace
FR-004: Epic 2 - Manage Requirements Through a Git-Backed Workspace
FR-005: Epic 2 - Manage Requirements Through a Git-Backed Workspace
FR-006: Epic 2 - Manage Requirements Through a Git-Backed Workspace
FR-007: Epic 2 - Manage Requirements Through a Git-Backed Workspace
FR-008: Epic 2 - Manage Requirements Through a Git-Backed Workspace
FR-009: Epic 5 - Run AI-First and Operator Recovery Workflows
FR-010: Epic 3 - Review Coverage, Dependencies, and Traceability Health
FR-011: Epic 3 - Review Coverage, Dependencies, and Traceability Health
FR-012: Epic 3 - Review Coverage, Dependencies, and Traceability Health
FR-013: Epic 3 - Review Coverage, Dependencies, and Traceability Health
FR-014: Epic 3 - Review Coverage, Dependencies, and Traceability Health
FR-015: Epic 3 - Review Coverage, Dependencies, and Traceability Health
FR-016: Epic 3 - Review Coverage, Dependencies, and Traceability Health
FR-020: Epic 2 - Manage Requirements Through a Git-Backed Workspace
FR-021: Epic 4 - Preserve History, Baselines, and Audit-Ready Evidence
FR-022: Epic 4 - Preserve History, Baselines, and Audit-Ready Evidence
FR-023: Epic 4 - Preserve History, Baselines, and Audit-Ready Evidence
FR-024: Epic 4 - Preserve History, Baselines, and Audit-Ready Evidence
FR-040: Epic 1 - Connect a Repository and See Requirements Sync Live
FR-041: Epic 1 - Connect a Repository and See Requirements Sync Live
FR-042: Epic 3 - Review Coverage, Dependencies, and Traceability Health
FR-043: Epic 3 - Review Coverage, Dependencies, and Traceability Health
FR-050: Epic 4 - Preserve History, Baselines, and Audit-Ready Evidence
FR-051: Epic 4 - Preserve History, Baselines, and Audit-Ready Evidence
FR-052: Epic 4 - Preserve History, Baselines, and Audit-Ready Evidence
FR-053: Epic 1 - Connect a Repository and See Requirements Sync Live
FR-054: Epic 1 - Connect a Repository and See Requirements Sync Live
FR-055: Epic 1 - Connect a Repository and See Requirements Sync Live
FR-056: Epic 2 - Manage Requirements Through a Git-Backed Workspace
FR-057: Epic 1 - Connect a Repository and See Requirements Sync Live
FR-058: Epic 5 - Run AI-First and Operator Recovery Workflows
FR-059: Epic 5 - Run AI-First and Operator Recovery Workflows
FR-060: Epic 1 - Connect a Repository and See Requirements Sync Live
FR-061: Epic 1 - Connect a Repository and See Requirements Sync Live

## Epic List

### Epic 1: Connect a Repository and See Requirements Sync Live
Administrators and operators can connect a GitHub or GitLab repository, define the requirements folder and schema rules, ingest merged markdown changes into the derived database, and immediately browse synced requirements with visible sync status and validation outcomes.
**FRs covered:** FR-040, FR-041, FR-053, FR-054, FR-055, FR-057, FR-060, FR-061

### Epic 2: Manage Requirements Through a Git-Backed Workspace
Authors and reviewers can create, edit, organize, comment on, and enrich requirements in the application, while all approved content changes flow back to Git through PRs or MRs rather than direct writes.
**FRs covered:** FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-020, FR-056

### Epic 3: Review Coverage, Dependencies, and Traceability Health
Product, QA, and compliance users can understand whether requirements are covered, what is missing, what changed, and what downstream artifacts are affected.
**FRs covered:** FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-042, FR-043

### Epic 4: Preserve History, Baselines, and Audit-Ready Evidence
Reviewers and compliance stakeholders can inspect revision history, restore prior versions, lock baselines, compare states over time, and export evidence-ready outputs.
**FRs covered:** FR-021, FR-022, FR-023, FR-024, FR-050, FR-051, FR-052

### Epic 5: Run AI-First and Operator Recovery Workflows
AI agents and platform operators can validate requirement files, recover from sync failures, reconcile conflicts, trigger operational repair actions, and add advanced AI-assisted review loops.
**FRs covered:** FR-009, FR-058, FR-059

## Epic 1: Connect a Repository and See Requirements Sync Live

Administrators and operators can connect a GitHub or GitLab repository, define the requirements folder and schema rules, ingest merged markdown changes into the derived database, and immediately browse synced requirements with visible sync status and validation outcomes.

### Story 1.1: Connect a GitHub Repository to a Project

As an administrator,
I want to create a project and connect its GitHub repository,
So that the application knows which repository will supply requirement content for synchronization.

**Acceptance Criteria:**

**Given** I am an authenticated administrator with no project configured
**When** I create a new project and select GitHub as the repository provider
**Then** the system creates the project record and stores the repository connection metadata without yet ingesting requirement content
**And** the project shows a connected or not-connected repository status in the workspace UI

**Given** I am configuring a project repository connection
**When** I provide valid GitHub repository identification and authorization details
**Then** the system verifies it can access the repository before saving the connection
**And** it records the provider, repository owner, repository name, default branch, and connection timestamp

**Given** the GitHub credentials or repository details are invalid
**When** I attempt to save the connection
**Then** the system rejects the configuration
**And** it shows an actionable error message explaining whether the failure was authentication, authorization, or repository lookup related

**Given** a project already has a saved GitHub repository connection
**When** I open the project workspace
**Then** I can see the repository provider and repository identity in the project settings
**And** I can tell that requirement sync setup is ready for the next configuration step

**Given** repository connection attempts are made
**When** they succeed or fail
**Then** the system records structured audit and operational events for the attempt
**And** those events include enough metadata for later troubleshooting without exposing secrets

### Story 1.2: Configure Requirement Sync Rules for a Project

As an administrator,
I want to define the requirements folder, branch policy, and markdown-schema rules for a connected repository,
So that the system knows exactly which files are authoritative and how they should be validated before synchronization.

**Acceptance Criteria:**

**Given** a project has a valid connected repository
**When** I open the repository sync configuration for that project
**Then** I can define the requirements root folder, allowed file naming convention, and default branch or merge policy used for requirement synchronization
**And** the system saves those rules as project-level sync settings

**Given** I am configuring markdown requirements for a project
**When** I specify required frontmatter fields and supported body sections from the documented schema
**Then** the system stores the schema version and project validation rules
**And** those rules become the basis for later ingestion and validation behavior

**Given** I enter an invalid folder path, unsupported naming convention, or incomplete schema configuration
**When** I try to save the sync rules
**Then** the system blocks the save
**And** it highlights the exact configuration errors with remediation guidance

**Given** a project already has sync rules configured
**When** I return to the sync settings screen
**Then** I can view the current repository folder, branch policy, naming convention, and schema settings
**And** I can tell whether the project is ready for webhook-based ingestion

**Given** sync rules are created or changed
**When** the configuration is saved successfully
**Then** the system records an audit event showing what sync rules changed and who changed them
**And** later ingestion jobs use the latest saved configuration rather than hard-coded defaults

### Story 1.3: Ingest Merged Requirement File Changes into Derived Requirement Records

As an operator,
I want merged requirement-file changes from the configured repository to be ingested into the application automatically,
So that the database stays synchronized with Git-authored requirement content without manual re-entry.

**Acceptance Criteria:**

**Given** a project has a valid repository connection and sync configuration
**When** a merged change modifies one or more requirement markdown files inside the configured requirements folder
**Then** the system verifies the webhook, fetches the changed files, and queues an ingestion job for processing
**And** the ingestion job records the triggering provider event, commit SHA, project, and affected file paths

**Given** an ingestion job processes a valid changed requirement file
**When** the file contains a known or new requirement ID in frontmatter and valid schema content
**Then** the system creates or updates the corresponding derived requirement record in the database
**And** it stores the source repository path, last synced commit SHA, parsed content, and current sync state

**Given** multiple deliveries of the same webhook event or ingestion job occur
**When** they reference the same idempotency key or provider event identity
**Then** the system applies the change at most once
**And** it does not create duplicate requirement revisions, audit entries, or sync records

**Given** a changed file falls outside the configured requirement scope
**When** the ingestion job evaluates it
**Then** the system ignores the file without failing the entire job
**And** it records that the file was skipped because it did not match sync rules

**Given** a valid ingestion job completes
**When** the requirement records are updated successfully
**Then** the affected requirements become queryable in the application within the ingestion SLA
**And** each affected record exposes a sync state of `in_sync`, `pending`, `conflict`, or `failed` as appropriate

**Given** ingestion processing fails for a transient reason
**When** the job cannot complete on the first attempt
**Then** the system retries the job using the configured backoff policy
**And** after retry exhaustion it moves the job to a dead-letter state with operator-visible failure details

### Story 1.4: Browse Synced Requirements with Search, Filters, and Sync-State Visibility

As a reviewer,
I want to browse synchronized requirements in the application with search, filters, and visible sync status,
So that I can quickly confirm what the system has ingested from Git and identify anything needing attention.

**Acceptance Criteria:**

**Given** a project has synchronized requirement records in the database
**When** I open the project workspace
**Then** I see a requirement list view showing requirement ID, title, type, status, source path, last synced commit, and current sync state
**And** the list loads within the performance target for normal project sizes

**Given** I am viewing synced requirements
**When** I search by requirement ID, title, or body text
**Then** the system returns matching results from the synchronized requirement set
**And** the results reflect the latest successfully ingested state

**Given** I am reviewing the requirement list
**When** I filter by sync state, requirement type, lifecycle status, or tag
**Then** the system narrows the visible results without losing the current project context
**And** active filters remain visible so I can understand why a subset is shown

**Given** one or more requirements have `pending`, `conflict`, or `failed` sync states
**When** I view the workspace
**Then** those states are visually distinct in the list and in the persistent sync-status indicator
**And** I can identify which requirements need follow-up without inspecting raw logs

**Given** a project has no synchronized requirements yet
**When** I open the workspace
**Then** the system shows an informative empty state explaining that no requirement content has been ingested yet
**And** it points me to repository sync or ingestion setup rather than showing a blank table

**Given** I switch between search and filtered views during a review session
**When** I refine or clear the query and filters
**Then** the system preserves stable list behavior and project context
**And** it does not require a full workspace reset to continue browsing

### Story 1.5: Surface Markdown Validation Failures and Ingestion Errors with Actionable Guidance

As an operator,
I want validation and ingestion failures to be surfaced clearly in the application,
So that I can understand why synchronization failed and what needs to be corrected without investigating infrastructure logs first.

**Acceptance Criteria:**

**Given** an ingested requirement file violates the configured markdown schema
**When** the ingestion job evaluates the file
**Then** the system marks the affected requirement or file as failed
**And** it stores actionable validation details including file path, requirement ID if available, violated rule, and remediation guidance

**Given** a webhook or ingestion job fails for a non-schema reason
**When** the system records the failure
**Then** the failure is classified by type, such as verification failure, repository fetch failure, parse failure, persistence failure, or retry exhaustion
**And** the classification is visible to operators in the application

**Given** I open the workspace or operator-facing sync view
**When** failures exist for the current project
**Then** I can see a summary count of failed items and open the failure details for each affected file or requirement
**And** the details include the latest known commit SHA, event timestamp, and current retry or dead-letter status when applicable

**Given** a file was skipped because it is outside configured sync scope
**When** I inspect ingestion outcomes
**Then** the system distinguishes skipped files from failed files
**And** skipped files do not raise false-positive failure indicators

**Given** a requirement later succeeds after a prior validation or ingestion failure
**When** a corrected file is ingested successfully
**Then** the system updates the sync state to reflect the successful outcome
**And** it preserves enough failure history for audit and troubleshooting purposes

**Given** failure details are shown in the application
**When** a user reads them
**Then** they are expressed in operator-usable language rather than raw stack traces by default
**And** deeper technical detail remains available for troubleshooting when needed

### Story 1.6: Preserve Stable Requirement Identity Across File Moves and Renames

As an operator,
I want requirement identity to remain stable when a requirement file is moved or renamed in the repository,
So that synchronization does not create duplicate records or break downstream references when the frontmatter ID remains unchanged.

**Acceptance Criteria:**

**Given** an already synchronized requirement file is moved to a new path within the configured requirements scope
**When** the moved file is ingested and its frontmatter requirement ID is unchanged
**Then** the system updates the source path on the existing requirement record rather than creating a new record
**And** the requirement keeps its prior identity, audit history, and sync lineage

**Given** an already synchronized requirement file is renamed within the configured requirements scope
**When** the renamed file is ingested and its frontmatter requirement ID is unchanged
**Then** the system treats the file as the same requirement
**And** the synchronized record keeps its existing requirement identity and links

**Given** a file move or rename results in both old-path and new-path events being observed
**When** ingestion processes those events
**Then** the system resolves them idempotently to a single requirement record
**And** it does not create duplicate active requirement entries for the same requirement ID

**Given** a moved or renamed file changes path but not identity
**When** I view the requirement in the application
**Then** I can see the latest source path and last synced commit
**And** the requirement remains searchable by its stable requirement ID

**Given** a moved or renamed file introduces an ID mismatch or ambiguity
**When** the ingestion pipeline cannot safely determine whether the record should be updated or treated as new
**Then** the system marks the requirement for operator review or failure rather than guessing
**And** it records enough context for explicit resolution

### Story 1.7: Add GitLab Repository Ingestion Using the Same Sync Model

As an administrator,
I want to connect a GitLab repository and ingest merged requirement-file changes through the same synchronization model used for GitHub,
So that teams using GitLab can adopt the product without a separate operational workflow.

**Acceptance Criteria:**

**Given** I am creating or editing a project repository connection
**When** I choose GitLab as the repository provider
**Then** I can save GitLab-specific repository access details and project identity
**And** the system treats the project as eligible for the same sync configuration flow used by GitHub-backed projects

**Given** a GitLab-backed project has valid repository and sync settings
**When** a merged merge request changes requirement files inside the configured requirements scope
**Then** the system verifies the GitLab webhook, fetches the changed files, and enqueues an ingestion job using the same derived-record model as GitHub
**And** the resulting requirement records expose the same source, commit, and sync-state fields as GitHub-ingested records

**Given** the same logical ingestion event is delivered multiple times by GitLab
**When** the webhook processor and ingestion worker handle the event
**Then** the system applies idempotency rules consistently
**And** it does not create duplicate requirement revisions, audit entries, or synchronization records

**Given** I browse a GitLab-backed project in the application
**When** requirements have been synchronized successfully
**Then** I can search, filter, and inspect those requirements using the same UI and sync-state model used for GitHub-backed projects
**And** provider differences do not create a separate browsing experience

**Given** a GitLab webhook, fetch, or parse failure occurs
**When** the synchronization attempt cannot complete
**Then** the system records provider-specific failure details
**And** it surfaces them through the same operator-facing failure workflow defined for Epic 1
