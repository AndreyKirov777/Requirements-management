import { describe, expect, it } from "vitest";
import {
  InMemoryAuditEntryRepository,
  InMemoryProjectRepository,
  InMemoryRepositoryConnectionRepository,
  InMemoryRepositorySyncConfigRepository
} from "@repo/db";
import { connectionMetrics, logger } from "@repo/observability";
import { GitHubConnectionService } from "../integrations/github-connection-service";
import { RepositorySyncService } from "./repository-sync-service";

const actor = {
  id: "actor-1",
  email: "admin@example.com",
  role: "administrator" as const
};

function createServices() {
  const projects = new InMemoryProjectRepository();
  const connections = new InMemoryRepositoryConnectionRepository();
  const syncConfigs = new InMemoryRepositorySyncConfigRepository();
  const audits = new InMemoryAuditEntryRepository();

  return {
    connectionService: new GitHubConnectionService(projects, connections, audits),
    syncService: new RepositorySyncService(projects, connections, syncConfigs, audits),
    audits
  };
}

describe("RepositorySyncService", () => {
  it("saves and reloads valid sync settings with readiness", async () => {
    logger.clear();
    connectionMetrics.reset();
    const services = createServices();
    const project = await services.connectionService.createProject(actor, { name: "Alpha" });
    const verification = await services.connectionService.verify(actor, {
      provider: "github",
      repositoryOwner: "octo",
      repositoryName: "docs",
      installationId: "inst-1",
      correlationId: "corr-sync-save"
    });

    await services.connectionService.saveConnection(actor, project.id, {
      provider: verification.provider,
      repositoryOwner: verification.repositoryOwner,
      repositoryName: verification.repositoryName,
      repositoryId: verification.repositoryId,
      defaultBranch: verification.defaultBranch,
      credentialReference: verification.credentialReference,
      connectedAt: verification.connectionTimestamp,
      lastVerifiedAt: verification.connectionTimestamp,
      correlationId: "corr-sync-save"
    });

    const saved = await services.syncService.saveSettings(actor, project.id, {
      requirementsRootPath: "requirements",
      namingConventionKind: "numeric-prefix-kebab-case",
      namingConventionPattern: null,
      branchPolicy: "merged_to_default_branch",
      schema: {
        schemaVersion: "requirements-markdown/v1",
        requiredFrontmatterFields: ["id", "title", "status"],
        requiredBodySections: ["Summary", "Requirements", "Acceptance Criteria"]
      },
      correlationId: "corr-sync-save"
    });

    expect(saved.readyForWebhookIngestion).toBe(true);
    expect(saved.syncConfig?.readinessState).toBe("ready_for_ingestion");

    const reloaded = await services.syncService.getSettings(project.id);
    expect(reloaded?.syncConfig?.requirementsRootPath).toBe("requirements");
    expect(await services.audits.list()).toHaveLength(2);
    expect(connectionMetrics.snapshot().repositorySyncConfigurationSaved).toBe(1);
  });

  it("blocks save when the repository path is invalid", async () => {
    const services = createServices();
    const project = await services.connectionService.createProject(actor, { name: "Beta" });
    const verification = await services.connectionService.verify(actor, {
      provider: "github",
      repositoryOwner: "octo",
      repositoryName: "docs",
      installationId: "inst-2",
      correlationId: "corr-sync-invalid"
    });

    await services.connectionService.saveConnection(actor, project.id, {
      provider: verification.provider,
      repositoryOwner: verification.repositoryOwner,
      repositoryName: verification.repositoryName,
      repositoryId: verification.repositoryId,
      defaultBranch: verification.defaultBranch,
      credentialReference: verification.credentialReference,
      connectedAt: verification.connectionTimestamp,
      lastVerifiedAt: verification.connectionTimestamp,
      correlationId: "corr-sync-invalid"
    });

    await expect(
      services.syncService.saveSettings(actor, project.id, {
        requirementsRootPath: "missing/requirements",
        namingConventionKind: "kebab-case",
        namingConventionPattern: null,
        branchPolicy: "merged_to_default_branch",
        schema: {
          schemaVersion: "requirements-markdown/v1",
          requiredFrontmatterFields: ["id"],
          requiredBodySections: ["Summary"]
        },
        correlationId: "corr-sync-invalid"
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: {
        issues: [
          {
            field: "requirementsRootPath"
          }
        ]
      }
    });
  });
});
