# Story 1.7: Add GitLab Repository Ingestion Using the Same Sync Model

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an administrator,
I want to connect a GitLab repository and ingest merged requirement-file changes through the same synchronization model used for GitHub,
so that teams using GitLab can adopt the product without a separate operational workflow.

## Acceptance Criteria

1. Given I am creating or editing a project repository connection, when I choose GitLab as the repository provider, then I can save GitLab-specific repository access details and project identity, and the system treats the project as eligible for the same sync configuration flow used by GitHub-backed projects.
2. Given a GitLab-backed project has valid repository and sync settings, when a merged merge request changes requirement files inside the configured requirements scope, then the system verifies the GitLab webhook, fetches the changed files, and enqueues an ingestion job using the same derived-record model as GitHub, and the resulting requirement records expose the same source, commit, and sync-state fields as GitHub-ingested records.
3. Given the same logical ingestion event is delivered multiple times by GitLab, when the webhook processor and ingestion worker handle the event, then the system applies idempotency rules consistently, and it does not create duplicate requirement revisions, audit entries, or synchronization records.
4. Given I browse a GitLab-backed project in the application, when requirements have been synchronized successfully, then I can search, filter, and inspect those requirements using the same UI and sync-state model used for GitHub-backed projects, and provider differences do not create a separate browsing experience.
5. Given a GitLab webhook, fetch, or parse failure occurs, when the synchronization attempt cannot complete, then the system records provider-specific failure details, and it surfaces them through the same operator-facing failure workflow defined for Epic 1.

## Tasks / Subtasks

- [ ] Extend repository connection and sync configuration to support GitLab (AC: 1)
  - [ ] Reuse the provider-neutral repository connection model from Story 1.1 and add GitLab-specific fields only behind the integration boundary.
  - [ ] Ensure Story 1.2 sync settings work unchanged for GitLab-backed projects.
  - [ ] Keep credential or installation references secure and separate from relational business tables.
- [ ] Implement the GitLab provider adapter (AC: 1, 2)
  - [ ] Add repository verification, tree lookup, and changed-file fetch logic for GitLab in `packages/domain/integrations`.
  - [ ] Normalize provider responses into the same internal repository and file-change contracts already used by GitHub ingestion.
  - [ ] Ensure repository identity and default branch metadata load cleanly into the existing project and sync setup flow.
- [ ] Add GitLab webhook intake and queue handoff (AC: 2, 3, 5)
  - [ ] Add `apps/web/src/app/api/v1/webhooks/gitlab/route.ts` that verifies GitLab requests, normalizes supported merged merge-request events, and enqueues the same ingestion workflow used for GitHub.
  - [ ] Capture GitLab delivery identifiers and idempotency metadata in the shared ingestion-event model.
  - [ ] Keep unsupported GitLab event types and actions out of the ingestion path.
- [ ] Reuse the shared ingestion, browse, and failure flows without provider forks (AC: 2, 3, 4, 5)
  - [ ] Ensure derived requirement records, sync states, browse queries, and failure categories remain provider-agnostic at the core data-model level.
  - [ ] Surface provider-specific details only where troubleshooting needs them.
  - [ ] Verify that Stories 1.3, 1.4, 1.5, and 1.6 can all operate unchanged for GitLab-backed projects apart from the provider adapter.
- [ ] Add automated coverage for GitLab parity and idempotency (AC: 1, 2, 3, 4, 5)
  - [ ] Unit tests for GitLab payload normalization, verification handling, and provider boundary behavior.
  - [ ] Integration tests for webhook-to-ingestion flow, duplicate delivery handling, and browse parity.
  - [ ] UI or end-to-end tests for GitLab project setup and shared browse experience.

## Dev Notes

### Story Intent and Cross-Story Dependencies

- This story validates whether the provider-neutral boundaries chosen in Stories 1.1 through 1.6 were implemented correctly. GitLab should slot into the same sync model, not force a parallel architecture. [Source: _bmad-output/implementation-artifacts/1-1-connect-a-github-repository-to-a-project.md] [Source: _bmad-output/implementation-artifacts/1-3-ingest-merged-requirement-file-changes-into-derived-requirement-records.md]
- Story 1.2's sync configuration, Story 1.4's browse UI, Story 1.5's failure surfacing, and Story 1.6's stable-ID handling must all remain reusable for GitLab-backed projects. If provider differences leak into those layers, this story will become more expensive than it should be.
- GitLab is in-scope for v1, so this is not an optional provider experiment. [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#13.1 Version 1.0 Integrations]

### Technical Requirements

- The PRD explicitly includes GitHub and GitLab as the only repository platforms in v1. [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#3.2 In Scope - Version 1.0] [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#13.1 Version 1.0 Integrations]
- The architecture maps inbound GitHub and GitLab webhooks to sibling endpoints under `/api/v1/webhooks/*` and expects both to feed the same domain ingestion model. [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] [Source: _bmad-output/planning-artifacts/architecture.md#Integration Points]
- Git provider differences should remain at the integration edge. Derived requirement records, sync states, browse flows, and operator failure flows must stay provider-neutral. [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries] [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7: Add GitLab Repository Ingestion Using the Same Sync Model]

### Recommended Domain and API Shape

- Suggested route handlers:
  - `POST /api/v1/webhooks/gitlab`
  - reuse existing project connection and sync-settings routes from Stories 1.1 and 1.2
- Suggested domain ownership:
  - `packages/domain/integrations/gitlab` or equivalent provider-specific module
  - `packages/domain/ingestion` stays provider-neutral
  - `packages/contracts` owns provider-normalized webhook and repository contracts
- Suggested provider-neutral internal contracts:
  - `NormalizedRepositoryConnection`
  - `NormalizedWebhookEvent`
  - `ChangedRequirementFile`
  - `ProviderFailureContext`

### Architecture Compliance

- Do not duplicate the entire GitHub ingestion flow under GitLab-specific domain services. Only provider-specific verification, repository metadata retrieval, and payload normalization belong in the GitLab adapter.
- Continue to keep webhook route handlers thin and asynchronous. GitLab verification, normalization, and queue handoff should match the architecture already used for GitHub. [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- Keep browse and failure UIs provider-agnostic except for troubleshooting details such as provider name or raw event identifiers. [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]

### File Structure Requirements

- GitLab webhook route: `apps/web/src/app/api/v1/webhooks/gitlab/route.ts`
- Provider adapter: `packages/domain/src/integrations`
- Shared ingestion logic: `packages/domain/src/ingestion`
- Shared browse queries: `packages/db/src/queries`
- Shared failure flow: existing Story 1.5 sync or validation UI

### Data Model Notes

- Reuse existing data structures for:
  - `repository_connections`
  - `repository_sync_configs`
  - `ingestion_events`
  - `requirements`
  - `requirement_revisions`
  - `ingestion_failures`
- Add only the provider-specific metadata required for GitLab troubleshooting, such as event UUIDs or request identifiers, and keep them attached to normalized ingestion-event records rather than branching the core requirement model.

### UX Requirements

- Journey 4 in the UX spec explicitly includes both GitHub and GitLab as onboarding choices, with the same mental model and same outcome: requirements appear in the product without a separate operational workflow. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 4: Repository Onboarding]
- GitLab-backed projects must use the same browse, filter, and sync-health views as GitHub-backed projects so the product feels coherent and trustworthy. [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7: Add GitLab Repository Ingestion Using the Same Sync Model]
- Provider-specific failures should still surface through the shared operator-facing workflow rather than a hidden provider-specific status page. [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey Patterns]

### Previous Story Intelligence

- Story 1.1 explicitly warned against hard-coding GitHub assumptions deep in route handlers or persistence models. This story is where that decision is tested. [Source: _bmad-output/implementation-artifacts/1-1-connect-a-github-repository-to-a-project.md]
- Story 1.3 already separated provider event handling from core ingestion state. Reuse that boundary rather than cloning the worker pipeline. [Source: _bmad-output/implementation-artifacts/1-3-ingest-merged-requirement-file-changes-into-derived-requirement-records.md]
- Story 1.5 defined the shared operator-facing failure workflow. GitLab failures should plug into that flow with provider-specific context, not a separate UI. [Source: _bmad-output/implementation-artifacts/1-5-surface-markdown-validation-failures-and-ingestion-errors-with-actionable-guidance.md]

### Git Intelligence Summary

- Git history still contains planning-only commits, so there is no prior provider adapter implementation to inherit.
- Keep provider normalization strict now to avoid a second browsing or failure stack later.

### Latest Technical Information

- GitLab webhook requests include a secret token header (`X-Gitlab-Token`), an event UUID header (`X-Gitlab-Event-UUID`), and an `Idempotency-Key` header. Use them to verify requests and normalize delivery identity for idempotent ingestion. [External: https://docs.gitlab.com/user/project/integrations/webhook_events/] [External: https://docs.gitlab.com/administration/settings/webhooks/]
- GitLab merge request hooks expose merge-related activity through merge request events and action fields. Limit ingestion to the merged actions relevant to synchronized requirement changes rather than processing every merge request webhook indiscriminately. [External: https://docs.gitlab.com/user/project/integrations/webhook_events/#merge-request-events]
- Use the same repository-tree and repository-file APIs referenced in Story 1.2 for folder validation and changed-file retrieval. Keep provider specifics isolated in the GitLab adapter. [External: https://docs.gitlab.com/ee/api/repositories.html#list-repository-tree] [External: https://docs.gitlab.com/api/repository_files/]

### Risks and Watchouts

- Do not let GitLab support fork the internal requirement model or sync-state vocabulary.
- Avoid assuming GitHub-specific webhook semantics such as header names, event payload shapes, or delivery identifiers.
- Do not duplicate browse UI for GitLab projects. Provider choice should not create a separate reviewer experience.

### Project Structure Notes

- No `project-context.md` file was found in the workspace.
- This story should add a provider adapter and a sibling webhook route, not a second architecture.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7: Add GitLab Repository Ingestion Using the Same Sync Model]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#3.2 In Scope - Version 1.0]
- [Source: _bmad-output/planning-artifacts/PRD-Requirements-Management-Traceability.md#13.1 Version 1.0 Integrations]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: _bmad-output/planning-artifacts/architecture.md#Integration Points]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 4: Repository Onboarding]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey Patterns]
- [Source: _bmad-output/implementation-artifacts/1-1-connect-a-github-repository-to-a-project.md]
- [Source: _bmad-output/implementation-artifacts/1-3-ingest-merged-requirement-file-changes-into-derived-requirement-records.md]
- [Source: _bmad-output/implementation-artifacts/1-5-surface-markdown-validation-failures-and-ingestion-errors-with-actionable-guidance.md]
- [External: https://docs.gitlab.com/user/project/integrations/webhook_events/]
- [External: https://docs.gitlab.com/administration/settings/webhooks/]
- [External: https://docs.gitlab.com/user/project/integrations/webhook_events/#merge-request-events]
- [External: https://docs.gitlab.com/ee/api/repositories.html#list-repository-tree]
- [External: https://docs.gitlab.com/api/repository_files/]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story created via BMAD create-story workflow on 2026-03-15.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story context assumes Stories 1.1 through 1.6 already established provider-neutral models, shared ingestion, browse, and failure handling.
- No `project-context.md` file was present in the workspace.

### File List

- _bmad-output/implementation-artifacts/1-7-add-gitlab-repository-ingestion-using-the-same-sync-model.md
