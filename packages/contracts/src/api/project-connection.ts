import { z } from "zod";
import {
  RepositoryConnectionStatusSchema,
  RepositoryProviderSchema
} from "../enums/repository-provider";

export const ActorSchema = z.object({
  id: z.string(),
  email: z.email(),
  role: z.enum(["administrator", "viewer"])
});

export const CreateProjectInputSchema = z.object({
  name: z.string().trim().min(2).max(80)
});

export const GitHubVerificationInputSchema = z.object({
  provider: z.literal("github"),
  repositoryOwner: z.string().trim().min(1),
  repositoryName: z.string().trim().min(1),
  installationId: z.string().trim().min(1),
  correlationId: z.string().trim().min(8)
});

export const SaveRepositoryConnectionInputSchema = z.object({
  provider: RepositoryProviderSchema,
  repositoryOwner: z.string().trim().min(1),
  repositoryName: z.string().trim().min(1),
  repositoryId: z.string().trim().min(1).nullable(),
  defaultBranch: z.string().trim().min(1),
  credentialReference: z.string().trim().min(1),
  connectedAt: z.iso.datetime(),
  lastVerifiedAt: z.iso.datetime(),
  correlationId: z.string().trim().min(8)
});

export const RepositoryVerificationResultSchema = z.object({
  provider: z.literal("github"),
  repositoryOwner: z.string(),
  repositoryName: z.string(),
  repositoryId: z.string().nullable(),
  defaultBranch: z.string(),
  connectionTimestamp: z.iso.datetime(),
  status: RepositoryConnectionStatusSchema,
  readyForNextSetupStep: z.boolean(),
  credentialReference: z.string()
});

export const ProjectRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  repositoryStatus: RepositoryConnectionStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const RepositoryConnectionRecordSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  provider: RepositoryProviderSchema,
  repositoryOwner: z.string(),
  repositoryName: z.string(),
  repositoryId: z.string().nullable(),
  defaultBranch: z.string(),
  credentialReference: z.string(),
  connectedAt: z.iso.datetime(),
  lastVerifiedAt: z.iso.datetime(),
  createdBy: z.string(),
  updatedBy: z.string()
});

export const RepositoryConnectionViewSchema = z.object({
  project: ProjectRecordSchema,
  repositoryConnection: RepositoryConnectionRecordSchema.nullable(),
  readyForNextSetupStep: z.boolean()
});

export type Actor = z.infer<typeof ActorSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
export type GitHubVerificationInput = z.infer<typeof GitHubVerificationInputSchema>;
export type SaveRepositoryConnectionInput = z.infer<typeof SaveRepositoryConnectionInputSchema>;
export type ProjectRecord = z.infer<typeof ProjectRecordSchema>;
export type RepositoryConnectionRecord = z.infer<typeof RepositoryConnectionRecordSchema>;
export type RepositoryConnectionView = z.infer<typeof RepositoryConnectionViewSchema>;
export type RepositoryVerificationResult = z.infer<typeof RepositoryVerificationResultSchema>;
