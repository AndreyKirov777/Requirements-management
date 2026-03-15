import { describe, expect, it } from "vitest";
import { GitHubConnectionService } from "./github-connection-service";

const actor = {
  id: "actor-1",
  email: "admin@example.com",
  role: "administrator" as const
};

describe("GitHubConnectionService", () => {
  it("classifies authentication failures", async () => {
    const service = new GitHubConnectionService();

    await expect(
      service.verify(actor, {
        provider: "github",
        repositoryOwner: "octo",
        repositoryName: "docs",
        installationId: "bad-auth-1",
        correlationId: "corr-auth"
      })
    ).rejects.toMatchObject({ code: "GITHUB_AUTHENTICATION_FAILED" });
  });

  it("creates a project and saves a verified connection", async () => {
    const service = new GitHubConnectionService();
    const project = await service.createProject(actor, { name: "Alpha" });
    const verification = await service.verify(actor, {
      provider: "github",
      repositoryOwner: "octo",
      repositoryName: "docs",
      installationId: "inst-1",
      correlationId: "corr-save"
    });

    const result = await service.saveConnection(actor, project.id, {
      provider: verification.provider,
      repositoryOwner: verification.repositoryOwner,
      repositoryName: verification.repositoryName,
      repositoryId: verification.repositoryId,
      defaultBranch: verification.defaultBranch,
      credentialReference: verification.credentialReference,
      connectedAt: verification.connectionTimestamp,
      lastVerifiedAt: verification.connectionTimestamp,
      correlationId: "corr-save"
    });

    expect(result.project.repositoryStatus).toBe("connected");
    expect(result.repositoryConnection?.defaultBranch).toBe("main");
    expect(result.readyForNextSetupStep).toBe(true);
  });
});
