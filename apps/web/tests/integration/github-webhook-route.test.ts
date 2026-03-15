import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { POST } from "../../src/app/api/v1/webhooks/github/route";
import {
  getRepositoryConnectionService,
  getRepositorySyncService,
  getServerIngestionQueuePublisher,
  resetServerServices
} from "../../src/lib/server/service";

const actor = {
  id: "admin-1",
  email: "admin@example.com",
  role: "administrator" as const
};

function signPayload(payload: string, secret: string) {
  return `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
}

describe("GitHub webhook route", () => {
  afterEach(() => {
    resetServerServices();
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  it("verifies, normalizes, and enqueues supported push deliveries", async () => {
    process.env.GITHUB_WEBHOOK_SECRET = "test-secret";
    const connectionService = getRepositoryConnectionService();
    const syncService = getRepositorySyncService();
    const project = await connectionService.createProject(actor, { name: "Webhook" });
    const verification = await connectionService.verify(actor, {
      provider: "github",
      repositoryOwner: "octo",
      repositoryName: "docs",
      installationId: "inst-webhook",
      correlationId: "corr-webhook"
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
      correlationId: "corr-webhook"
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
      correlationId: "corr-webhook"
    });

    const payload = JSON.stringify({
      ref: "refs/heads/main",
      after: "sha-123",
      head_commit: { id: "sha-123" },
      repository: {
        name: "docs",
        full_name: "octo/docs",
        default_branch: "main",
        owner: { login: "octo" }
      },
      commits: [
        {
          id: "commit-1",
          added: [],
          modified: ["requirements/101-login-flow.md"],
          removed: []
        }
      ]
    });

    const response = await POST(
      new Request("http://localhost/api/v1/webhooks/github", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "push",
          "x-github-delivery": "delivery-1",
          "x-hub-signature-256": signPayload(payload, process.env.GITHUB_WEBHOOK_SECRET)
        },
        body: payload
      })
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      accepted: true,
      duplicate: false,
      ignored: false
    });
    await expect(getServerIngestionQueuePublisher().list()).resolves.toHaveLength(1);
  });
});
