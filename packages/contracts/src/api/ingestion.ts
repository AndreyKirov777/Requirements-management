import { z } from "zod";
import { RepositoryProviderSchema } from "../enums/repository-provider";

export const RequirementSyncStateSchema = z.enum([
  "pending",
  "in_sync",
  "conflict",
  "failed"
]);
export type RequirementSyncState = z.infer<typeof RequirementSyncStateSchema>;

export const IngestionEventStatusSchema = z.enum([
  "queued",
  "processing",
  "completed",
  "failed",
  "dead_lettered",
  "ignored"
]);
export type IngestionEventStatus = z.infer<typeof IngestionEventStatusSchema>;

export const IngestionFileOutcomeStatusSchema = z.enum([
  "synced",
  "skipped",
  "failed"
]);
export type IngestionFileOutcomeStatus = z.infer<
  typeof IngestionFileOutcomeStatusSchema
>;

export const RequirementRecordSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  requirementKey: z.string(),
  title: z.string(),
  status: z.string(),
  bodyMarkdown: z.string(),
  parsedContent: z.record(z.string(), z.unknown()),
  sourcePath: z.string(),
  lastSyncedCommitSha: z.string(),
  syncState: RequirementSyncStateSchema,
  lastSyncedAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});
export type RequirementRecord = z.infer<typeof RequirementRecordSchema>;

export const RequirementRevisionRecordSchema = z.object({
  id: z.string(),
  requirementId: z.string(),
  ingestionEventId: z.string(),
  commitSha: z.string(),
  sourcePath: z.string(),
  bodyMarkdown: z.string(),
  createdAt: z.iso.datetime()
});
export type RequirementRevisionRecord = z.infer<
  typeof RequirementRevisionRecordSchema
>;

export const IngestionFileOutcomeSchema = z.object({
  path: z.string(),
  status: IngestionFileOutcomeStatusSchema,
  reason: z.string().nullable(),
  requirementKey: z.string().nullable()
});
export type IngestionFileOutcome = z.infer<typeof IngestionFileOutcomeSchema>;

export const IngestionEventRecordSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  provider: RepositoryProviderSchema,
  providerEventId: z.string(),
  deliveryId: z.string(),
  idempotencyKey: z.string(),
  eventType: z.string(),
  commitSha: z.string(),
  status: IngestionEventStatusSchema,
  affectedFilePaths: z.array(z.string()),
  payloadSummary: z.record(z.string(), z.unknown()),
  fileOutcomes: z.array(IngestionFileOutcomeSchema),
  lastError: z.string().nullable(),
  retryCount: z.number().int().nonnegative(),
  receivedAt: z.iso.datetime(),
  processedAt: z.iso.datetime().nullable()
});
export type IngestionEventRecord = z.infer<typeof IngestionEventRecordSchema>;

export const GitHubPushCommitSchema = z.object({
  id: z.string().min(1),
  added: z.array(z.string()).default([]),
  modified: z.array(z.string()).default([]),
  removed: z.array(z.string()).default([])
});

export const GitHubPushWebhookSchema = z.object({
  ref: z.string().min(1),
  after: z.string().min(1),
  head_commit: z
    .object({
      id: z.string().min(1)
    })
    .nullable()
    .default(null),
  repository: z.object({
    name: z.string().min(1),
    full_name: z.string().min(1),
    default_branch: z.string().min(1),
    owner: z.object({
      login: z.string().min(1)
    })
  }),
  commits: z.array(GitHubPushCommitSchema).default([])
});
export type GitHubPushWebhook = z.infer<typeof GitHubPushWebhookSchema>;

export const NormalizedWebhookEventSchema = z.object({
  provider: z.literal("github"),
  providerEventId: z.string(),
  deliveryId: z.string(),
  eventType: z.literal("push"),
  repositoryOwner: z.string(),
  repositoryName: z.string(),
  defaultBranch: z.string(),
  commitSha: z.string(),
  affectedFilePaths: z.array(z.string()).min(1),
  payloadSummary: z.record(z.string(), z.unknown())
});
export type NormalizedWebhookEvent = z.infer<typeof NormalizedWebhookEventSchema>;

export const WebhookReceiptResultSchema = z.object({
  accepted: z.boolean(),
  duplicate: z.boolean(),
  ignored: z.boolean(),
  eventId: z.string().nullable(),
  reason: z.string().nullable()
});
export type WebhookReceiptResult = z.infer<typeof WebhookReceiptResultSchema>;

export const WebhookReceivedJobPayloadSchema = z.object({
  eventId: z.string(),
  idempotencyKey: z.string()
});
export type WebhookReceivedJobPayload = z.infer<
  typeof WebhookReceivedJobPayloadSchema
>;

export const RequirementSyncJobPayloadSchema = z.object({
  eventId: z.string()
});
export type RequirementSyncJobPayload = z.infer<
  typeof RequirementSyncJobPayloadSchema
>;

export const ParsedRequirementDocumentSchema = z.object({
  requirementKey: z.string(),
  title: z.string(),
  status: z.string(),
  frontmatter: z.record(z.string(), z.string()),
  sections: z.record(z.string(), z.string()),
  bodyMarkdown: z.string()
});
export type ParsedRequirementDocument = z.infer<
  typeof ParsedRequirementDocumentSchema
>;
