import crypto from "node:crypto";
import {
  GitHubPushWebhookSchema,
  type NormalizedWebhookEvent
} from "@repo/contracts";

export function verifyGithubWebhookSignature(input: {
  rawBody: string;
  signature: string | null;
  secret: string | null;
}) {
  if (!input.secret) {
    return false;
  }

  if (!input.signature?.startsWith("sha256=")) {
    return false;
  }

  const digest = crypto
    .createHmac("sha256", input.secret)
    .update(input.rawBody)
    .digest("hex");

  const expected = Buffer.from(`sha256=${digest}`);
  const provided = Buffer.from(input.signature);

  return (
    expected.length === provided.length &&
    crypto.timingSafeEqual(expected, provided)
  );
}

export function normalizeGithubPushWebhook(input: {
  event: string | null;
  deliveryId: string | null;
  payload: unknown;
}): NormalizedWebhookEvent | null {
  if (input.event !== "push" || !input.deliveryId) {
    return null;
  }

  const parsed = GitHubPushWebhookSchema.safeParse(input.payload);

  if (!parsed.success) {
    return null;
  }

  const payload = parsed.data;
  const defaultRef = `refs/heads/${payload.repository.default_branch}`;

  if (payload.ref !== defaultRef) {
    return null;
  }

  const affectedFilePaths = [
    ...new Set(
      payload.commits.flatMap((commit) => [
        ...commit.added,
        ...commit.modified,
        ...commit.removed
      ])
    )
  ];

  if (affectedFilePaths.length === 0) {
    return null;
  }

  return {
    provider: "github",
    providerEventId: input.deliveryId,
    deliveryId: input.deliveryId,
    eventType: "push",
    repositoryOwner: payload.repository.owner.login.toLowerCase(),
    repositoryName: payload.repository.name.toLowerCase(),
    defaultBranch: payload.repository.default_branch,
    commitSha: payload.after,
    affectedFilePaths,
    payloadSummary: {
      ref: payload.ref,
      commitCount: payload.commits.length,
      repositoryFullName: payload.repository.full_name
    }
  };
}
