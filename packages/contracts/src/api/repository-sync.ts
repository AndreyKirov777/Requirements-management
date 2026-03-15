import { z } from "zod";
import { RepositoryProviderSchema } from "../enums/repository-provider";

export const SyncBranchPolicySchema = z.enum(["merged_to_default_branch"]);
export type SyncBranchPolicy = z.infer<typeof SyncBranchPolicySchema>;

export const RepositoryNamingConventionKindSchema = z.enum([
  "kebab-case",
  "numeric-prefix-kebab-case",
  "custom-regex"
]);
export type RepositoryNamingConventionKind = z.infer<
  typeof RepositoryNamingConventionKindSchema
>;

export const SupportedFrontmatterFieldSchema = z.enum([
  "id",
  "title",
  "status",
  "owner",
  "lastReviewedAt"
]);
export type SupportedFrontmatterField = z.infer<
  typeof SupportedFrontmatterFieldSchema
>;

export const SupportedBodySectionSchema = z.enum([
  "Summary",
  "Background",
  "Requirements",
  "Acceptance Criteria",
  "Traceability"
]);
export type SupportedBodySection = z.infer<typeof SupportedBodySectionSchema>;

export const MarkdownSchemaVersionSchema = z.literal("requirements-markdown/v1");
export type MarkdownSchemaVersion = z.infer<typeof MarkdownSchemaVersionSchema>;

const uniqueStrings = <T extends z.ZodType<string>>(schema: T) =>
  z
    .array(schema)
    .min(1)
    .refine((value) => new Set(value).size === value.length, {
      message: "Values must be unique."
    });

export const RepositorySyncSchemaRulesSchema = z.object({
  schemaVersion: MarkdownSchemaVersionSchema,
  requiredFrontmatterFields: uniqueStrings(SupportedFrontmatterFieldSchema),
  requiredBodySections: uniqueStrings(SupportedBodySectionSchema)
});

export const RepositorySyncSettingsInputSchema = z
  .object({
    requirementsRootPath: z
      .string()
      .trim()
      .min(1, "Enter the requirements root folder.")
      .regex(/^(?!\/)(?!.*\/\/)(?!.*\.\.)(?!.*\/$)[A-Za-z0-9._/-]+$/, {
        message:
          "Use a repository-relative folder path without leading slash, trailing slash, or '..'."
      }),
    namingConventionKind: RepositoryNamingConventionKindSchema,
    namingConventionPattern: z.string().trim().nullable(),
    branchPolicy: SyncBranchPolicySchema,
    schema: RepositorySyncSchemaRulesSchema,
    correlationId: z.string().trim().min(8)
  })
  .superRefine((value, context) => {
    if (value.namingConventionKind === "custom-regex" && !value.namingConventionPattern) {
      context.addIssue({
        code: "custom",
        path: ["namingConventionPattern"],
        message: "Provide a regex pattern for the custom naming convention."
      });
    }

    if (value.namingConventionKind !== "custom-regex" && value.namingConventionPattern) {
      context.addIssue({
        code: "custom",
        path: ["namingConventionPattern"],
        message: "Only custom regex naming uses a pattern."
      });
    }
  });

export const RepositorySyncPreviewInputSchema = z.object({
  projectId: z.string().trim().min(1),
  provider: RepositoryProviderSchema,
  repositoryOwner: z.string().trim().min(1),
  repositoryName: z.string().trim().min(1),
  defaultBranch: z.string().trim().min(1),
  requirementsRootPath: RepositorySyncSettingsInputSchema.shape.requirementsRootPath,
  branchPolicy: SyncBranchPolicySchema,
  correlationId: z.string().trim().min(8)
});

export const SyncReadinessStateSchema = z.enum([
  "not_ready",
  "ready_for_ingestion"
]);
export type SyncReadinessState = z.infer<typeof SyncReadinessStateSchema>;

export const RepositorySyncValidationIssueSchema = z.object({
  field: z.string(),
  message: z.string()
});
export type RepositorySyncValidationIssue = z.infer<
  typeof RepositorySyncValidationIssueSchema
>;

export const RepositorySyncPreviewResultSchema = z.object({
  pathExists: z.boolean(),
  branch: z.string(),
  sampleFiles: z.array(z.string()),
  issues: z.array(RepositorySyncValidationIssueSchema)
});
export type RepositorySyncPreviewResult = z.infer<
  typeof RepositorySyncPreviewResultSchema
>;

export const RepositorySyncConfigRecordSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  requirementsRootPath: z.string(),
  namingConventionKind: RepositoryNamingConventionKindSchema,
  namingConventionPattern: z.string().nullable(),
  branchPolicy: SyncBranchPolicySchema,
  schemaVersion: MarkdownSchemaVersionSchema,
  requiredFrontmatterFields: z.array(SupportedFrontmatterFieldSchema),
  requiredBodySections: z.array(SupportedBodySectionSchema),
  readinessState: SyncReadinessStateSchema,
  validatedAt: z.iso.datetime().nullable(),
  readyForIngestionAt: z.iso.datetime().nullable(),
  createdBy: z.string(),
  createdAt: z.iso.datetime(),
  updatedBy: z.string(),
  updatedAt: z.iso.datetime()
});
export type RepositorySyncConfigRecord = z.infer<
  typeof RepositorySyncConfigRecordSchema
>;

export const RepositorySyncSettingsViewSchema = z.object({
  projectId: z.string(),
  repositoryConnection: z
    .object({
      provider: RepositoryProviderSchema,
      repositoryOwner: z.string(),
      repositoryName: z.string(),
      defaultBranch: z.string()
    })
    .nullable(),
  syncConfig: RepositorySyncConfigRecordSchema.nullable(),
  readinessState: SyncReadinessStateSchema,
  readinessLabel: z.string(),
  readyForWebhookIngestion: z.boolean(),
  preview: RepositorySyncPreviewResultSchema.nullable()
});
export type RepositorySyncSettingsView = z.infer<
  typeof RepositorySyncSettingsViewSchema
>;

export type RepositorySyncSettingsInput = z.infer<
  typeof RepositorySyncSettingsInputSchema
>;
export type RepositorySyncPreviewInput = z.infer<
  typeof RepositorySyncPreviewInputSchema
>;
