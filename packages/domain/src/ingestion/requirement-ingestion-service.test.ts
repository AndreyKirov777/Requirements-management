import { describe, expect, it } from "vitest";
import {
  InMemoryAuditEntryRepository,
  InMemoryIngestionEventRepository,
  InMemoryProjectRepository,
  InMemoryRepositoryConnectionRepository,
  InMemoryRepositorySyncConfigRepository,
  InMemoryRequirementRepository,
  InMemoryRequirementRevisionRepository
} from "@repo/db";
import { GitHubConnectionService } from "../integrations/github-connection-service";
import { RepositorySyncService } from "./repository-sync-service";
import { InMemoryIngestionQueuePublisher } from "./ingestion-queue";
import { MockRequirementRepositoryProvider } from "./requirement-repository-provider";
import { RequirementIngestionService } from "./requirement-ingestion-service";
import { WebhookIntakeService } from "./webhook-intake-service";

const actor = {
  id: "admin-1",
  email: "admin@example.com",
  role: "administrator" as const
};

async function createFixture() {
  const projects = new InMemoryProjectRepository();
  const connections = new InMemoryRepositoryConnectionRepository();
  const syncConfigs = new InMemoryRepositorySyncConfigRepository();
  const ingestionEvents = new InMemoryIngestionEventRepository();
  const requirements = new InMemoryRequirementRepository();
  const revisions = new InMemoryRequirementRevisionRepository();
  const audits = new InMemoryAuditEntryRepository();
  const queue = new InMemoryIngestionQueuePublisher();
  projects.clear();
  connections.clear();
  syncConfigs.clear();
  ingestionEvents.clear();
  requirements.clear();
  revisions.clear();
  audits.clear();
  queue.clear();
  const provider = new MockRequirementRepositoryProvider({
    "requirements/101-login-flow.md": [
      "---",
      "id: REQ-101",
      "title: Login flow",
      "status: approved",
      "---",
      "## Summary",
      "Users can log in.",
      "",
      "## Requirements",
      "Support SSO.",
      "",
      "## Acceptance Criteria",
      "Authentication succeeds."
    ].join("\n")
  });

  const connectionService = new GitHubConnectionService(projects, connections, audits);
  const syncService = new RepositorySyncService(
    projects,
    connections,
    syncConfigs,
    audits
  );
  const intake = new WebhookIntakeService(
    projects,
    connections,
    syncConfigs,
    ingestionEvents,
    audits,
    queue
  );
  const ingestion = new RequirementIngestionService(
    projects,
    connections,
    syncConfigs,
    ingestionEvents,
    requirements,
    revisions,
    audits,
    provider,
    queue
  );
  const project = await connectionService.createProject(actor, { name: "Domain" });
  const verification = await connectionService.verify(actor, {
    provider: "github",
    repositoryOwner: "octo",
    repositoryName: "docs",
    installationId: "inst-domain",
    correlationId: "corr-domain"
  });

  await connectionService.saveConnection(actor, project.id, {
    provider: verification.provider,
    repositoryOwner: verification.repositoryOwner,
    repositoryName: verification.repositoryName,
    repositoryId: verification.repositoryId,
    defaultBranch: verification.defaultBranch,
    credentialReference: verification.credentialReference,
    connectedAt: verification.connectionTimestamp,
    lastVerifiedAt: verification.connectionTimestamp,
    correlationId: "corr-domain"
  });

  await syncService.saveSettings(actor, project.id, {
    requirementsRootPath: "requirements",
    namingConventionKind: "numeric-prefix-kebab-case",
    namingConventionPattern: null,
    branchPolicy: "merged_to_default_branch",
    schema: {
      schemaVersion: "requirements-markdown/v1",
      requiredFrontmatterFields: ["id", "title", "status"],
      requiredBodySections: ["Summary", "Requirements", "Acceptance Criteria"]
    },
    correlationId: "corr-domain"
  });

  return {
    intake,
    ingestion,
    queue,
    requirements,
    revisions,
    audits,
    ingestionEvents
  };
}

describe("RequirementIngestionService", () => {
  it("ingests valid requirement files and records skipped outcomes", async () => {
    const fixture = await createFixture();
    const receipt = await fixture.intake.receive({
      provider: "github",
      providerEventId: "delivery-1",
      deliveryId: "delivery-1",
      eventType: "push",
      repositoryOwner: "octo",
      repositoryName: "docs",
      defaultBranch: "main",
      commitSha: "sha-101",
      affectedFilePaths: [
        "requirements/101-login-flow.md",
        "notes/out-of-scope.md"
      ],
      payloadSummary: { ref: "refs/heads/main" }
    });

    await fixture.ingestion.enqueueRequirementSync({ eventId: receipt.eventId! });
    const event = await fixture.ingestion.syncEvent({
      eventId: receipt.eventId!,
      attempt: 1,
      maxAttempts: 3
    });

    await expect(fixture.requirements.listByProjectId(event.projectId)).resolves.toMatchObject([
      {
        requirementKey: "REQ-101",
        sourcePath: "requirements/101-login-flow.md",
        syncState: "in_sync",
        lastSyncedCommitSha: "sha-101"
      }
    ]);
    await expect(fixture.revisions.list()).resolves.toHaveLength(1);
    expect(event.fileOutcomes).toEqual(
      expect.arrayContaining([
        {
          path: "requirements/101-login-flow.md",
          status: "synced",
          reason: null,
          requirementKey: "REQ-101"
        },
        {
          path: "notes/out-of-scope.md",
          status: "skipped",
          reason: "out_of_scope",
          requirementKey: null
        }
      ])
    );
  });

  it("deduplicates repeated deliveries and completed jobs", async () => {
    const fixture = await createFixture();
    const normalized = {
      provider: "github" as const,
      providerEventId: "delivery-2",
      deliveryId: "delivery-2",
      eventType: "push" as const,
      repositoryOwner: "octo",
      repositoryName: "docs",
      defaultBranch: "main",
      commitSha: "sha-102",
      affectedFilePaths: ["requirements/101-login-flow.md"],
      payloadSummary: { ref: "refs/heads/main" }
    };

    const first = await fixture.intake.receive(normalized);
    const second = await fixture.intake.receive(normalized);

    expect(second.duplicate).toBe(true);
    expect(second.eventId).toBe(first.eventId);

    await fixture.ingestion.syncEvent({
      eventId: first.eventId!,
      attempt: 1,
      maxAttempts: 3
    });
    await fixture.ingestion.syncEvent({
      eventId: first.eventId!,
      attempt: 1,
      maxAttempts: 3
    });

    await expect(fixture.revisions.list()).resolves.toHaveLength(1);
    await expect(fixture.ingestionEvents.list()).resolves.toHaveLength(1);
  });
});
