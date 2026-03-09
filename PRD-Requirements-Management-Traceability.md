---
workflowType: 'prd'
workflow: 'edit'
classification:
  domain: 'requirements-management'
  projectType: 'web-application'
  complexity: 'high'
inputDocuments: []
stepsCompleted: ['step-e-01-discovery', 'step-e-02-review', 'step-e-03-edit']
lastEdited: '2026-03-09'
editHistory:
  - date: '2026-03-09'
    changes: 'Removed Workflow & Approval functionality and Accessibility NFR. Added GitLab support as v1 integration alongside GitHub. Reframed PRD around Git-as-source-of-truth model: requirements always live in Git, system acts as traceability graph engine that indexes from Git. Removed API-centric AI agent interface. Adopted Option B (UI authoring writes back to Git via PRs).'
  - date: '2026-03-08'
    changes: 'Added hybrid repo/database sync requirements, GitHub webhook ingestion, and PR-based reverse sync model.'
---

# Product Requirements Document
## Requirements Management & Traceability Application

**Document Version:** 0.3 (Draft)
**Status:** Early Concept
**Last Updated:** 2026-03-09
**Author:** Andreisadakov
**Stakeholders:** Product Teams, Compliance/Regulatory Teams, AI Development Agents

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Target Users & Personas](#4-target-users--personas)
5. [Scope](#5-scope)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [AI Agent Integration Requirements](#8-ai-agent-integration-requirements)
9. [Compliance & Regulatory Requirements](#9-compliance--regulatory-requirements)
10. [System Architecture Considerations](#10-system-architecture-considerations)
11. [Data Model Overview](#11-data-model-overview)
12. [Integrations](#12-integrations)
13. [User Experience Principles](#13-user-experience-principles)
14. [Open Questions](#14-open-questions)
15. [Out of Scope (v1)](#15-out-of-scope-v1)
16. [Appendix: Glossary](#16-appendix-glossary)

---

## 1. Executive Summary

This document defines the product requirements for a **Requirements Management & Traceability (RMT) application**: a platform that ingests requirements stored as version-controlled markdown files in a Git repository, builds an internal traceability graph linking all artifacts, and provides teams with coverage analysis, compliance reporting, and audit-ready documentation. Because requirements live in Git, they flow through standard branching and pull-request review workflows. The system also provides a web UI for authoring and editing requirements; all UI-originated changes are written back to the Git repository via system-generated pull requests, ensuring Git always remains the single source of truth. The platform is **first-class AI-agent friendly**: AI agents interact with requirements directly through the Git repository using a documented markdown schema, requiring no proprietary API.

The core value proposition is fourfold:

- **For product teams:** A single source of truth that links user stories, product requirements, and test cases, eliminating traceability gaps and reducing rework.
- **For regulated industries (medical devices, aerospace, defense):** Audit-ready traceability matrices, version-controlled artifacts, and compliance reporting (e.g., IEC 62304, DO-178C, ISO 26262).
- **For engineering teams working in Git:** Requirements live as markdown files inside the repository and flow through standard branch and pull-request review workflows — no context-switching to external tools for authoring.
- **For AI development agents:** A documented, machine-readable markdown schema in the repository that agents can read, create, and update using standard Git operations, enabling AI-driven workflows where agents derive implementation tasks directly from approved requirements.

---

## 2. Problem Statement

### 2.1 Current Pain Points

**Product and software teams** struggle with:

- Requirements scattered across Confluence, Google Docs, Jira, Notion, and spreadsheets with no single source of truth.
- Lack of bidirectional traceability between requirements, implementation, and test cases — making impact analysis for changes slow and error-prone.
- Difficulty answering "Is this requirement tested?" or "What breaks if I change this?" without manual, time-consuming audits.
- No structured mechanism for AI coding agents to discover what they should be building, leading to hallucination and context loss.
- Teams that store requirements as markdown in Git have no system that can index those files and build a traceability graph on top of them.
- Requirement changes merged through pull requests are invisible to traceability and compliance tooling unless a system continuously ingests and indexes them.

**Regulated industry teams** struggle with:

- Creating and maintaining traceability matrices for audits manually in spreadsheets — a fragile and expensive process.
- Version controlling requirements alongside code with rigorous change control, including rationale and timestamps.
- Demonstrating requirement coverage to regulatory bodies (FAA, EASA, etc.) without bespoke tooling that costs hundreds of thousands of dollars per year (e.g., IBM DOORS, Jama Connect).
- Gaps in audit trails when requirements change informally.

**AI development agents** struggle with:

- No standardized, machine-readable markdown schema for requirements — agents must parse ad-hoc documents, leading to misalignment.
- Inability to verify that their output satisfies the stated requirement without a structured, deterministic specification.
- No standard way for agents to propose new requirements, flag ambiguities, or request clarification within the repository.
- File-based requirements in Git provide no built-in traceability: agents cannot determine coverage gaps or downstream impacts from flat files alone.
- Without a system that continuously indexes repository content, there is no way to ensure that traceability metadata stays consistent as requirements evolve.

### 2.2 Hypothesis

If we provide a traceability platform that continuously indexes requirements stored in a Git repository, builds a graph of all artifact relationships, and exposes traceability and compliance data through its UI, we can reduce rework, eliminate traceability debt, keep requirements within the Git workflows teams already use, accelerate compliance audits, and enable AI agents to work with requirements using standard Git operations.

---

## 3. Goals & Success Metrics

### 3.1 Product Goals

| Goal | Description |
|------|-------------|
| G-01 | Provide a unified repository for all requirements, user stories, and acceptance criteria |
| G-02 | Enable full bidirectional traceability from stakeholder needs → requirements → implementation → tests |
| G-03 | Generate audit-ready traceability matrices and compliance reports with one click |
| G-04 | Provide a first-class, repository-native requirements interface that AI agents can read and update directly through the Git repository |
| G-05 | Treat the Git repository as the single source of truth for requirement content, with the system's database serving as a derived traceability graph and index |

### 3.2 Success Metrics (v1 Launch)

| Metric | Target |
|--------|--------|
| Time to generate a traceability matrix | < 30 seconds (vs. hours manually) |
| Requirement coverage visibility | 100% of requirements show linked tests and implementation items |
| AI agent repository workflow adoption | ≥ 3 AI agent integrations (e.g., Claude, Cursor, Copilot) using the repository-native requirements workflow within 90 days of launch |
| Audit pass rate improvement | Users report ≥ 40% reduction in audit preparation time |
| User NPS | ≥ 40 among early adopters |
| Requirements "dark" (unlinked, untested) | Reduced to < 5% in active projects |
| Repo-to-graph ingestion latency | 95% of merged requirement changes reflected in the system's graph within 60 seconds |
| UI-to-repo write-back latency | 95% of UI-originated requirement changes reflected in a system-generated pull request within 5 minutes |
| Ingestion correctness | ≥ 99.5% of ingestion operations complete without manual reconciliation |
| Conflict visibility | 100% of ingestion conflicts are detected, logged, and surfaced to users for resolution |

---

## 4. Target Users & Personas

### 4.1 Persona 1 — Product Manager / Business Analyst ("Parker")

- **Context:** Works at a B2B SaaS company; manages a product roadmap in a combination of Jira and Confluence.
- **Goal:** Ensure features shipped match what stakeholders asked for; understand the blast radius of scope changes.
- **Pain today:** Manually cross-references Jira tickets with a Google Sheet to keep track of what's been built and tested.
- **Key needs:** Easy requirement authoring, link requirements to Jira stories, see coverage at a glance.

### 4.2 Persona 2 — Systems/Compliance Engineer ("Sam")

- **Context:** Works at a medical device or aerospace company; responsible for design history file (DHF) or safety case documentation.
- **Goal:** Maintain a complete, auditable trail from system requirements through detailed requirements to test results.
- **Pain today:** Uses IBM DOORS (expensive, complex) or a bespoke spreadsheet system; audit prep takes weeks.
- **Key needs:** Version-controlled requirements with change rationale, audit trail, export to IEC/ISO-compliant formats.

### 4.3 Persona 3 — AI Development Agent ("AGENT-01")

- **Context:** An autonomous AI coding agent (e.g., Claude Code, GitHub Copilot Workspace) operating within a CI/CD pipeline or IDE.
- **Goal:** Read assigned requirements directly from the repository, implement them, update their status via commits, and flag ambiguous or conflicting requirements through pull requests.
- **Pain today:** Has no standardized markdown schema for requirements; must parse unstructured or inconsistent documents, leading to misalignment and hallucination.
- **Key needs:** A documented markdown schema with stable frontmatter fields, a defined folder and file structure in the repository, the ability to declare traceability links within markdown, and CI-level schema validation feedback on pull requests.

### 4.4 Persona 4 — QA / Test Engineer ("Quinn")

- **Context:** Writes and executes test cases; needs to verify all requirements are covered.
- **Goal:** Ensure every requirement has at least one passing test; quickly identify untested requirements.
- **Key needs:** Link test cases to requirements, import test results, view coverage dashboards, get notified when requirements they've tested change.

---

## 5. Scope

### 5.1 In Scope — Version 1.0

- Requirement authoring (rich text, structured attributes, custom fields)
- Repository-native requirement authoring via markdown files stored in a dedicated folder within a Git repository
- Hierarchical requirement organization (projects → modules → requirements → sub-requirements)
- Bidirectional traceability links between requirements and: other requirements, implementation items (e.g., Jira tickets, GitHub/GitLab issues), test cases, and test results
- Traceability matrix generation and export (CSV, PDF)
- Version history and change audit trail for all requirements
- REST API for the web UI and external integrations (Jira, GitHub Issues, GitLab Issues, Linear); not the primary interface for AI agents
- Webhook support for requirement change events
- GitHub and GitLab webhook ingestion for merged changes to requirement markdown files
- UI-originated requirement changes written back to the Git repository through system-generated pull requests (Git remains the source of truth)
- Manual reconciliation and full re-index tools for repository/graph divergence
- Role-based access control (RBAC)
- Basic compliance report generation (coverage, gaps)
- Import from CSV, Word, and ReqIF formats
- Integration with GitHub repositories, GitLab repositories, GitHub Issues, GitLab Issues, Jira, and Linear (v1)

### 5.2 Out of Scope — Version 1.0

See [Section 15](#15-out-of-scope-v1).

---

## 6. Functional Requirements

Requirements are numbered with the prefix `FR-` and grouped by functional area. Priority is rated **P0** (must-have for v1), **P1** (important, ship if possible), **P2** (future).

---

### 6.1 Requirement Authoring & Management

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-001 | P0 | Users shall be able to create requirements with: a unique auto-generated ID, a title, a rich-text description, a type (e.g., Functional, Non-Functional, Constraint, User Need), a status (Draft, Active, Deprecated), and a priority level. |
| FR-002 | P0 | Requirements shall support custom metadata fields configurable per project (e.g., safety level, regulatory standard, component, stakeholder). |
| FR-003 | P0 | Requirements shall be organized in a hierarchical tree (projects > modules > requirements > sub-requirements) with drag-and-drop reordering. |
| FR-004 | P0 | Each requirement shall have a unique, stable, human-readable ID (e.g., `SYS-REQ-0042`) that never changes even if the requirement is moved. |
| FR-005 | P0 | Requirements shall support tagging for cross-cutting concerns (e.g., `security`, `performance`, `GDPR`). |
| FR-006 | P1 | Users shall be able to attach files (diagrams, reference documents) to requirements. |
| FR-007 | P1 | Users shall be able to add comments and threaded discussions on individual requirements. |
| FR-008 | P1 | The system shall support requirement templates that pre-populate fields with defaults for common requirement types. |
| FR-009 | P2 | AI-assisted requirement authoring: the system shall be able to suggest improvements, identify ambiguous language (e.g., "shall be fast"), and flag missing acceptance criteria. |

---

### 6.2 Traceability

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-010 | P0 | Users shall be able to create bidirectional traceability links between: requirements and other requirements (derives-from, refines, conflicts-with), requirements and external implementation items (e.g., Jira ticket, GitHub/GitLab PR), requirements and test cases, and requirements and test results. |
| FR-011 | P0 | The system shall display a live traceability matrix showing requirement coverage by test status (Passed, Failed, Not Run, No Test). |
| FR-012 | P0 | The system shall detect and alert on orphaned requirements (requirements with no upstream source or downstream link). |
| FR-013 | P0 | Users shall be able to generate and export a traceability matrix in PDF and CSV formats. |
| FR-014 | P1 | The system shall perform impact analysis: given a requirement change, display all downstream items (implementation, tests) that may be affected. |
| FR-015 | P1 | The system shall highlight broken links (e.g., a linked Jira ticket that has been deleted or closed). |
| FR-016 | P2 | The system shall support multi-level traceability (e.g., Stakeholder Need → System Requirement → Software Requirement → Unit Test). |

---

### 6.3 Versioning & Audit Trail

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-020 | P0 | Every change to a requirement (field edit, status change, link added/removed) shall be logged with: timestamp, actor (user or AI agent ID), change description, and previous/new values. |
| FR-021 | P0 | Users shall be able to view the full revision history of any requirement and restore a previous version. |
| FR-022 | P0 | The system shall support requirement baselines: a named, locked snapshot of a project's requirements at a point in time (e.g., "Release 2.0 Baseline"). |
| FR-023 | P1 | Users shall be able to compare two baselines or a baseline against the current state, with a diff view. |
| FR-024 | P1 | Requirement IDs shall be permanently retired (never reused) when a requirement is deleted or deprecated. |

---

### 6.4 Search & Navigation

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-040 | P0 | Users shall be able to full-text search across all requirements within a project or across all projects. |
| FR-041 | P0 | Users shall be able to filter requirements by: status, type, priority, tag, assignee, custom field values, and coverage status. |
| FR-042 | P1 | The system shall support saved views (named filter/sort configurations) shareable across teams. |
| FR-043 | P1 | Users shall be able to navigate requirements via a visual dependency graph showing traceability links. |

---

### 6.5 Import & Export

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-050 | P0 | The system shall support importing requirements from: CSV/Excel (with field mapping UI), ReqIF (standard interchange format), and Word documents (via structured headings or tables). |
| FR-051 | P0 | The system shall support exporting requirements in: CSV, JSON, PDF (formatted report), and ReqIF formats. |
| FR-052 | P1 | Export templates shall be configurable (field selection, ordering, formatting) to match regulatory document formats. |

---

### 6.6 Repository Ingestion & Graph Construction

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-053 | P0 | The system shall support a dedicated repository folder for requirements markdown files, with a documented folder and file naming convention configurable per project. |
| FR-054 | P0 | Each markdown requirement file shall map to a stable requirement record in the system's graph using a unique requirement ID stored in frontmatter. |
| FR-055 | P0 | The system shall ingest merged changes from supported Git hosting providers (GitHub, GitLab) to requirement markdown files through webhook-driven ingestion and update the corresponding graph records and traceability links within the configured ingestion SLA. |
| FR-056 | P0 | When requirements are created or edited through the system's web UI, the system shall write those changes to the Git repository by creating system-generated pull requests; direct writes to the default branch shall not be permitted. The Git repository remains the source of truth once the PR is merged. |
| FR-057 | P0 | The Git repository shall be the single source of truth for requirement content (title, description, metadata). The system's database shall hold derived data: the traceability graph, computed coverage, and audit metadata. |
| FR-058 | P0 | The system shall detect ingestion conflicts (e.g., a requirement file that was modified in Git while a UI-originated PR for the same requirement is pending), preserve both versions, and require explicit reconciliation before updating the graph. |
| FR-059 | P1 | Users shall be able to trigger manual re-index, full re-ingestion, or single-requirement reconciliation operations from the UI. |
| FR-060 | P1 | The system shall validate markdown files against a documented schema and return actionable validation errors when required metadata, structure, or identifiers are missing or invalid. |
| FR-061 | P1 | Requirement renames or file moves within the repository shall preserve stable requirement identity, history, and traceability links when the requirement ID in frontmatter remains unchanged. |

---

## 7. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-001 | Performance | Requirement list views with up to 10,000 requirements shall load in < 2 seconds. Traceability matrix generation for a project of 2,000 requirements shall complete in < 10 seconds. |
| NFR-002 | Availability | The application shall maintain ≥ 99.9% uptime SLA. |
| NFR-003 | Security | All data shall be encrypted at rest (AES-256) and in transit (TLS 1.3+). Web UI and integration API access shall require authentication via OAuth 2.0 or API key. |
| NFR-004 | Auditability | All audit logs shall be immutable and retained for a minimum of 10 years (configurable per project for regulated use cases). |
| NFR-005 | Scalability | The system shall support projects with up to 100,000 requirements without degraded performance (response time and throughput within 10% of baseline under normal load, as measured by standard performance tests). |
| NFR-006 | Multi-tenancy | The application shall be multi-tenant with strict data isolation between organizations. |
| NFR-007 | API Rate Limits | The integration API shall support a minimum of 1,000 requests/minute per authenticated client. Burst limits shall be clearly documented and configurable for enterprise plans. |
| NFR-008 | Ingestion Freshness | 95% of merged changes to requirement files shall be reflected in the system's graph within 60 seconds, measured from webhook receipt to successful graph update. |
| NFR-009 | UI-to-Repo Freshness | 95% of UI-originated requirement changes shall produce a repository pull request within 5 minutes of submission, measured by background job telemetry. |
| NFR-010 | Idempotency | Repository ingestion event processing shall be idempotent so duplicate webhook deliveries do not create duplicate revisions, audit entries, or pull requests. |
| NFR-011 | Reliability | Failed ingestion jobs shall be retried automatically with exponential backoff, persisted in a dead-letter queue after retry exhaustion, and surfaced in an operator-visible error dashboard. |
| NFR-012 | Consistency | The system shall expose an ingestion status for every requirement (`in_sync`, `pending`, `conflict`, `failed`) and maintain an eventually consistent graph state no older than 5 minutes under normal operating conditions. |

---

## 8. AI Agent Integration Requirements

This section defines requirements specific to enabling AI development agents to work with requirements through the Git repository. AI agents interact with requirements using standard Git operations (read files, create branches, commit changes, submit pull requests) and do not require a proprietary API to access requirement content.

| ID | Priority | Requirement |
|----|----------|-------------|
| AI-001 | P0 | The system shall publish a documented markdown schema for requirements, including required frontmatter fields (ID, title, type, status, priority, tags), supported body sections, folder structure, and file naming conventions that AI agents can follow when creating or editing requirement files. |
| AI-002 | P0 | AI agents shall interact with requirements exclusively through the Git repository: reading requirement files directly, creating or editing files on feature branches, and submitting changes via pull requests. No proprietary API shall be required for accessing or modifying requirement content. |
| AI-003 | P0 | All agent-authored requirement changes shall be attributable through Git commit metadata (author, committer). The system shall ingest these commits and preserve the agent's identity in the audit trail. |
| AI-004 | P0 | The markdown schema shall include a stable, machine-readable mechanism for expressing traceability links between requirements and between requirements and external artifacts (e.g., implementation tickets, test cases, PRs), so agents can declare links that the system ingests into its traceability graph. |
| AI-005 | P0 | The system shall provide a CI-compatible validation tool or webhook-driven validation that checks requirement markdown files against the documented schema and returns actionable errors (file path, requirement ID, violated rule, remediation guidance) as pull request status checks or comments. |
| AI-006 | P1 | The system shall support an agent-facing "clarification request" mechanism: an agent can add a structured frontmatter flag or dedicated section to a requirement file, which the system surfaces to the requirement owner for human resolution. |
| AI-007 | P1 | The system shall be able to generate and commit read-only traceability summary files (e.g., coverage matrix, orphan report) into the repository so that agents can access traceability data computed by the system without requiring an API call. |
| AI-008 | P1 | The system shall support webhook or CI-based notifications to inform agents (via PR comments, issue comments, or commit status checks) when requirements they are implementing have been modified by other actors. |
| AI-009 | P2 | The system shall provide an optional lightweight read-only query interface (CLI or API) that agents can use to retrieve traceability graph data, coverage status, and validation results that are computed by the system and not present in raw Git files. |

---

## 9. Compliance & Regulatory Requirements

These requirements apply specifically to use cases in regulated industries (medical devices, aerospace, defense, automotive safety).

| ID | Priority | Requirement |
|----|----------|-------------|
| REG-001 | P0 | The system shall maintain a tamper-evident, immutable audit trail for all requirement modifications, including actor, timestamp, change rationale, and previous value. |
| REG-002 | P0 | The system shall support role-based access control (RBAC) with at minimum the following roles: Viewer, Author, Reviewer, and Administrator. |
| REG-003 | P0 | The system shall support requirement baselines that, once locked by an Administrator, are immutable. Any subsequent changes shall be tracked against the baseline. |
| REG-004 | P1 | The system shall generate compliance gap reports that identify: requirements in Draft status, requirements without test coverage, requirements with failing tests, and requirements that have changed since the last locked baseline. |
| REG-006 | P1 | The system shall support configurable requirement attributes that map to specific regulatory standards (e.g., ISO 14971 risk level, DO-178C software level, IEC 62304 safety class). |
| REG-007 | P1 | Exported traceability matrices shall include metadata required by common regulatory submissions (project name, baseline, export timestamp, exporting user). |
| REG-008 | P2 | The system shall support multi-site / multi-jurisdictional data residency configurations (e.g., EU data stays in EU) for organizations with geographic compliance requirements. |

---

## 10. System Architecture Considerations

> _Note: This section captures architectural direction, not final decisions. Architecture shall be finalized during the technical design phase._

**Frontend:** Web application (React or similar SPA). Mobile responsiveness is P2. Desktop-app packaging (Electron) is out of scope for v1.

**Backend:** Microservice-oriented or modular monolith. Core services: Requirements Service, Traceability Graph Service, Audit Service, Notification Service, and a Repository Ingestion Service responsible for parsing markdown, processing webhook events from supported Git hosting providers (GitHub, GitLab), updating the traceability graph, reconciling conflicts, and generating pull requests for UI-originated changes.

**Database:** Relational database (PostgreSQL) for the derived requirement index, traceability graph, ingestion state, and audit logs. Graph database consideration (e.g., Neo4j, or PostgreSQL with recursive CTEs) for traceability link traversal. Full-text search via Elasticsearch or PostgreSQL full-text search.

**API Layer:** REST API (versioned under `/api/v1/`) serving the web UI and external integrations (Jira, GitHub Issues, GitLab Issues, Linear). Optional GraphQL API for complex relational queries by power users. AI agents do not use these APIs to access requirements — they work directly with the Git repository. All endpoints authenticated via OAuth 2.0 / API key.

**Repository Integration:** GitHub and GitLab are first-class integrations. The system shall receive webhook events for merged pull/merge requests and file changes in the requirements folder, fetch changed markdown files, validate them, and update the internal traceability graph. UI-originated requirement changes shall be written to the repository by generating pull/merge requests only.

**Git-as-Source-of-Truth Model:** The Git repository is the single source of truth for requirement content (title, description, metadata, traceability link declarations). The system's database holds derived data: the traceability graph, computed coverage, audit metadata, and ingestion status. When requirements are authored through the system's UI, changes are written to Git via system-generated pull/merge requests. The ingestion pipeline must clearly enforce this ownership split.

**Ingestion Pipeline:** The architecture should include webhook ingestion, queue-backed event processing, markdown parsing and validation, requirement diffing, graph update, conflict detection, reconciliation workflows, and PR generation for UI-originated changes. Ingestion processing must be idempotent and observable.

**Audit Storage:** Append-only audit log store. Consider immutable logging service (e.g., AWS QLDB, or custom append-only Postgres with trigger-based controls).

**Deployment:** Cloud-native, container-based (Kubernetes). Must support SaaS multi-tenant deployment and private cloud / on-premises deployment for regulated customers with data sovereignty requirements.

---

## 11. Data Model Overview

### Core Entities

**Requirement**
- `id` (UUID, internal)
- `display_id` (string, stable, human-readable, e.g., `SYS-REQ-0042`)
- `title` (string)
- `description` (rich text / markdown)
- `type` (enum: Stakeholder Need, System Requirement, Software Requirement, Hardware Requirement, Constraint, Interface Requirement)
- `status` (enum: Draft, Active, Deprecated)
- `priority` (enum: Critical, High, Medium, Low)
- `version` (integer, incremented on each change)
- `project_id` (FK)
- `parent_id` (FK, nullable — for sub-requirements)
- `tags` (string[])
- `custom_fields` (JSONB)
- `source_type` (enum: UI, Repository, Imported)
- `source_repository` (string, nullable)
- `source_path` (string, nullable)
- `source_branch` (string, nullable)
- `content_hash` (string)
- `last_synced_commit_sha` (string, nullable)
- `ingestion_status` (enum: InSync, Pending, Conflict, Failed)
- `ingestion_error` (string, nullable)
- `created_by`, `created_at`, `updated_by`, `updated_at`

**TraceabilityLink**
- `id` (UUID)
- `source_requirement_id` (FK)
- `target_type` (enum: Requirement, ExternalItem, TestCase, TestResult)
- `target_id` (string — requirement UUID or external item URI)
- `link_type` (enum: DerivesFrom, Refines, Satisfies, VerifiedBy, ConflictsWith, RelatesTo)
- `created_by`, `created_at`

**AuditEntry** _(append-only)_
- `id` (UUID)
- `entity_type` (string)
- `entity_id` (UUID)
- `actor_type` (enum: User, Agent)
- `actor_id` (string)
- `action` (string)
- `before_state` (JSONB)
- `after_state` (JSONB)
- `timestamp` (timestamptz)
- `change_rationale` (string, nullable)

**Baseline**
- `id` (UUID)
- `project_id` (FK)
- `name` (string)
- `description` (string)
- `locked_at` (timestamptz)
- `locked_by` (FK User)
- `snapshot` (JSONB — full snapshot of requirement states at lock time)

**IngestionEvent**
- `id` (UUID)
- `requirement_id` (FK, nullable)
- `source` (enum: RepositoryWebhook, ManualReindex, UIPublish)
- `event_type` (enum: Upsert, Delete, Move, Conflict, PublishPR)
- `source_ref` (string — commit SHA, PR number, or job ID)
- `status` (enum: Pending, Applied, Failed, RequiresReview)
- `details` (JSONB)
- `created_at`, `processed_at`

**IngestionConflict**
- `id` (UUID)
- `requirement_id` (FK)
- `repository_version` (JSONB)
- `graph_version` (JSONB)
- `detected_at` (timestamptz)
- `resolved_at` (timestamptz, nullable)
- `resolution` (enum: RepositoryWins, DatabaseWins, Merged, Cancelled)

---

## 12. Integrations

### 12.1 Version 1.0 Integrations

| Integration | Direction | Description |
|-------------|-----------|-------------|
| GitHub Repository / Webhooks | Ingest + Write-back | Ingest merged markdown requirement changes from a dedicated repository folder through webhook-driven ingestion; write UI-originated requirement changes back to the repository through system-generated pull requests |
| GitLab Repository / Webhooks | Ingest + Write-back | Ingest merged markdown requirement changes from a dedicated repository folder through webhook-driven ingestion; write UI-originated requirement changes back to the repository through system-generated merge requests |
| Jira | Bi-directional | Link requirements to Jira issues; sync issue status back to traceability view; push requirement changes as Jira comments |
| GitHub Issues | Bi-directional | Link requirements to GitHub Issues and PRs; display PR status in traceability view |
| GitLab Issues | Bi-directional | Link requirements to GitLab Issues and MRs; display MR status in traceability view |
| Linear | Bi-directional | Link requirements to Linear issues |
| Slack | Outbound | Send notifications when requirements change status or become orphaned |
| Webhooks (generic) | Outbound | Configurable webhook events for any external system or AI agent |

### 12.2 Future Integrations (v2+)

- Azure DevOps / TFS
- TestRail / Xray (test case/result sync)
- Confluence (embed requirement views)
- JAMA Connect / IBM DOORS (migration import)

---

## 13. User Experience Principles

**1. Requirements first, process second.** The UI should make authoring and navigating requirements fast and intuitive.

**2. Traceability should be visible, not hidden.** Coverage gaps and broken links should be surfaced proactively in the default view, not buried in reports.

**3. Repository parity.** The system must faithfully reflect what is in the Git repository. Every requirement visible in the UI must correspond to a markdown file in the repository. UI-originated changes must flow through Git via system-generated pull requests, ensuring that the repository is always the complete and current representation of all requirements.

**4. Progressive disclosure for compliance.** Compliance-specific features (change rationale, audit trail, baseline management) should be powerful when needed but invisible when not configured.

**5. Undo is safe; deletion is not.** Requirements should support soft-deletion and restoration. Audit trails should be immutable.

---

## 14. Open Questions

| # | Question | Owner | Target Resolution |
|---|----------|-------|-------------------|
| OQ-01 | What is the primary pricing model? Per-seat, per-project, or per-repository? | Product / Business | Design phase |
| OQ-02 | How do we handle conflict resolution when multiple AI agents submit concurrent pull requests modifying the same requirement? | Engineering | Architecture phase |
| OQ-03 | What is the minimum viable compliance support for v1? Audit trail + export, or additional regulatory features? | Product / Compliance | Before spec freeze |
| OQ-04 | Should the application support offline / local-first usage for air-gapped regulated environments? | Product | Discovery phase |
| OQ-05 | What is the data retention and deletion policy for audit logs when a customer churns? | Legal / Product | Before launch |
| OQ-06 | How do we prevent AI agents from making high-stakes changes (e.g., approving a requirement) — is pull request review sufficient as a human-in-the-loop gate, or do we need additional controls? | Product / AI Safety | Architecture phase |
| OQ-07 | Should AI agents be required to submit all changes via pull request (never direct commit to the default branch), and should these PRs have a distinct label or approval policy? | Product | Design phase |
| OQ-08 | What is the required granularity of repository-backed requirement files: one file per requirement, one file per feature, or a hybrid sharded structure? | Product / Engineering | Architecture phase |
| OQ-09 | How should baselines map to Git concepts such as commits, tags, release branches, or pull request merges? | Product / Engineering | Architecture phase |
| OQ-10 | How should invalid repository markdown changes be handled after merge: mark ingestion failed only, auto-open remediation PR, or block downstream workflows until fixed? | Engineering / Product | Design phase |

---

## 15. Out of Scope (v1)

The following are explicitly out of scope for v1 and should not be built:

- Risk management / FMEA features (may be v2)
- Native test case authoring and test execution (integration only in v1; native test module is v2+)
- Requirement modeling (UML, SysML diagram generation)
- Mobile application
- AI-generated requirement drafts (AI clarification flagging is in scope; auto-generation is not)
- Multi-language UI localization
- On-premises / self-hosted deployment (SaaS-only for v1)
- Formal approval workflows, electronic signatures, and change control board (CCB) processes
- Customer-facing (external stakeholder) portals
- Direct writes by the system to protected default branches; all system-originated repository changes shall use pull requests only

---

## 16. Appendix: Glossary

| Term | Definition |
|------|------------|
| Requirement | A documented statement of what a system must do or what constraint it must satisfy. |
| Traceability | The ability to track a requirement from its origin through design, implementation, and testing. |
| Traceability Matrix | A table or report that maps requirements to their linked test cases, implementation items, and coverage status. |
| Baseline | A named, locked snapshot of a project's requirements at a specific point in time. |
| Orphaned Requirement | A requirement with no downstream links (e.g., no test case or implementation item linked). |
| ReqIF | Requirements Interchange Format — an OMG standard for exchanging requirements data between tools. |
| AI Agent | An autonomous software agent (e.g., Claude Code, GitHub Copilot Workspace) that reads and modifies requirements directly in the Git repository using standard Git operations. |
| Git-as-Source-of-Truth Model | A model where the Git repository is the single source of truth for requirement content, while the system's database holds derived data: the traceability graph, computed coverage, and audit metadata. |
| IEC 62304 | International standard for medical device software lifecycle processes. |
| DO-178C | Software Considerations in Airborne Systems and Equipment Certification (aviation standard). |
| ISO 26262 | Functional safety standard for road vehicles. |
| RBAC | Role-Based Access Control — a method of restricting system access based on a user's assigned role. |
