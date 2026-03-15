import { describe, expect, it } from "vitest";
import {
  GitHubConnectionService,
  RepositorySyncService
} from "@repo/domain";
import {
  InMemoryAuditEntryRepository,
  InMemoryProjectRepository,
  InMemoryRepositoryConnectionRepository,
  InMemoryRepositorySyncConfigRepository
} from "@repo/db";

const actor = {
  id: "admin-1",
  email: "admin@example.com",
  role: "administrator" as const
};

describe("repository routes behavior", () => {
  it("does not save invalid verification attempts", async () => {
    const service = new GitHubConnectionService();
    const project = await service.createProject(actor, { name: "Gamma" });

    await expect(
      service.verify(actor, {
        provider: "github",
        repositoryOwner: "octo",
        repositoryName: "missing",
        installationId: "inst-2",
        correlationId: "corr-missing"
      })
    ).rejects.toMatchObject({ code: "GITHUB_REPOSITORY_NOT_FOUND" });

    const view = await service.getProjectView(project.id);
    expect(view?.repositoryConnection).toBeNull();
    expect(view?.project.repositoryStatus).toBe("not_connected");
  });

  it("rejects non-admin actors", async () => {
    const service = new GitHubConnectionService();

    await expect(
      service.createProject(
        { id: "viewer-1", email: "viewer@example.com", role: "viewer" },
        { name: "Delta" }
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("hydrates saved sync settings for a connected project", async () => {
    const projects = new InMemoryProjectRepository();
    const connections = new InMemoryRepositoryConnectionRepository();
    const syncConfigs = new InMemoryRepositorySyncConfigRepository();
    const audits = new InMemoryAuditEntryRepository();
    const connectionService = new GitHubConnectionService(projects, connections, audits);
    const syncService = new RepositorySyncService(
      projects,
      connections,
      syncConfigs,
      audits
    );
    const project = await connectionService.createProject(actor, { name: "Epsilon" });
    const verification = await connectionService.verify(actor, {
      provider: "github",
      repositoryOwner: "octo",
      repositoryName: "docs",
      installationId: "inst-sync",
      correlationId: "corr-hydrate"
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
      correlationId: "corr-hydrate"
    });

    await syncService.saveSettings(actor, project.id, {
      requirementsRootPath: "requirements",
      namingConventionKind: "kebab-case",
      namingConventionPattern: null,
      branchPolicy: "merged_to_default_branch",
      schema: {
        schemaVersion: "requirements-markdown/v1",
        requiredFrontmatterFields: ["id", "title"],
        requiredBodySections: ["Summary", "Requirements"]
      },
      correlationId: "corr-hydrate"
    });

    const view = await syncService.getSettings(project.id);
    expect(view?.readyForWebhookIngestion).toBe(true);
    expect(view?.syncConfig?.namingConventionKind).toBe("kebab-case");
  });
});
