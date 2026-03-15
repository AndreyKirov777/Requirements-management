import { describe, expect, it } from "vitest";
import { GitHubConnectionService } from "@repo/domain";

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
});
