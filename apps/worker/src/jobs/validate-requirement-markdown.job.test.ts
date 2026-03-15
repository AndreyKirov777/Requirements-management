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
import { GitHubConnectionService, RequirementIngestionService, RepositorySyncService } from "@repo/domain";
import { InMemoryIngestionQueuePublisher } from "@repo/domain";
import { MockRequirementRepositoryProvider } from "@repo/domain";
import { WebhookIntakeService } from "@repo/domain";
import { validateRequirementMarkdownJob } from "./validate-requirement-markdown.job";

const actor = {
  id: "admin-1",
  email: "admin@example.com",
  role: "administrator" as const
};

async function createFixture(fileMap: Record<string, string>) {
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
  const provider = new MockRequirementRepositoryProvider(fileMap);
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
  const service = new RequirementIngestionService(
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

  const project = await connectionService.createProject(actor, { name: "Worker" });
  const verification = await connectionService.verify(actor, {
    provider: "github",
    repositoryOwner: "octo",
    repositoryName: "docs",
    installationId: "inst-worker",
    correlationId: "corr-worker"
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
    correlationId: "corr-worker"
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
    correlationId: "corr-worker"
  });

  const receipt = await intake.receive({
    provider: "github",
    providerEventId: "delivery-worker",
    deliveryId: "delivery-worker",
    eventType: "push",
    repositoryOwner: "octo",
    repositoryName: "docs",
    defaultBranch: "main",
    commitSha: "sha-worker",
    affectedFilePaths: Object.keys(fileMap),
    payloadSummary: { ref: "refs/heads/main" }
  });

  return { receipt, service, ingestionEvents };
}

describe("validateRequirementMarkdownJob", () => {
  it("throws retryable failures before retry exhaustion and dead-letters after exhaustion", async () => {
    const fixture = await createFixture({
      "requirements/999-transient.md": [
        "---",
        "id: REQ-999",
        "title: Retry me",
        "status: proposed",
        "---",
        "## Summary",
        "Retry",
        "",
        "## Requirements",
        "Retry",
        "",
        "## Acceptance Criteria",
        "Retry"
      ].join("\n")
    });

    await expect(
      validateRequirementMarkdownJob({
        payload: { eventId: fixture.receipt.eventId! },
        attempt: 1,
        maxAttempts: 3,
        service: fixture.service
      })
    ).rejects.toMatchObject({ code: "GITHUB_CONTENT_FETCH_FAILED" });

    await expect(
      validateRequirementMarkdownJob({
        payload: { eventId: fixture.receipt.eventId! },
        attempt: 3,
        maxAttempts: 3,
        service: fixture.service
      })
    ).resolves.toEqual({
      eventId: fixture.receipt.eventId,
      status: "dead_lettered"
    });
  });

  it("dead-letters unrecoverable validation failures without retrying forever", async () => {
    const fixture = await createFixture({
      "requirements/101-invalid.md": [
        "---",
        "id: REQ-101",
        "---",
        "## Summary",
        "Invalid"
      ].join("\n")
    });

    await expect(
      validateRequirementMarkdownJob({
        payload: { eventId: fixture.receipt.eventId! },
        attempt: 1,
        maxAttempts: 3,
        service: fixture.service
      })
    ).resolves.toEqual({
      eventId: fixture.receipt.eventId,
      status: "dead_lettered"
    });
  });
});
