import type {
  Actor,
  CreateProjectInput,
  ProjectRecord,
  RepositoryConnectionView,
  SaveRepositoryConnectionInput,
  GitHubVerificationInput,
  RepositoryVerificationResult
} from "@repo/contracts";
import {
  InMemoryAuditEntryRepository,
  InMemoryProjectRepository,
  InMemoryRepositoryConnectionRepository
} from "@repo/db";
import { connectionMetrics, logger } from "@repo/observability";
import { requireAdministrator } from "../auth/require-admin";
import { DomainError } from "../shared/domain-error";
import {
  verifyGitHubRepositoryAccess,
  type GitHubRepositoryVerifier
} from "./github-provider";

export class GitHubConnectionService {
  constructor(
    private readonly projects = new InMemoryProjectRepository(),
    private readonly connections = new InMemoryRepositoryConnectionRepository(),
    private readonly audits = new InMemoryAuditEntryRepository(),
    private readonly verifier: GitHubRepositoryVerifier = verifyGitHubRepositoryAccess
  ) {}

  async createProject(actor: Actor, input: CreateProjectInput): Promise<ProjectRecord> {
    requireAdministrator(actor);
    return this.projects.create({ name: input.name });
  }

  async verify(actor: Actor, input: GitHubVerificationInput): Promise<RepositoryVerificationResult> {
    requireAdministrator(actor);

    try {
      const result = await this.verifier(input);
      connectionMetrics.trackSuccess();
      logger.info({
        message: "GitHub repository verification succeeded.",
        correlationId: input.correlationId,
        actorId: actor.id,
        context: {
          provider: input.provider,
          repositoryOwner: input.repositoryOwner,
          repositoryName: input.repositoryName,
          installationId: input.installationId
        }
      });
      return result;
    } catch (error) {
      connectionMetrics.trackFailure();
      const domainError =
        error instanceof DomainError
          ? error
          : new DomainError({
              code: "GITHUB_CONNECTION_VERIFICATION_FAILED",
              message: "GitHub verification failed unexpectedly.",
              details: { cause: error instanceof Error ? error.message : "unknown" },
              retryable: true,
              httpStatus: 502
            });

      logger.warn({
        message: "GitHub repository verification failed.",
        correlationId: input.correlationId,
        actorId: actor.id,
        context: {
          code: domainError.code,
          provider: input.provider,
          repositoryOwner: input.repositoryOwner,
          repositoryName: input.repositoryName,
          installationId: input.installationId
        }
      });
      throw domainError;
    }
  }

  async saveConnection(
    actor: Actor,
    projectId: string,
    input: SaveRepositoryConnectionInput
  ): Promise<RepositoryConnectionView> {
    requireAdministrator(actor);

    const project = await this.projects.findById(projectId);

    if (!project) {
      throw new DomainError({
        code: "VALIDATION_ERROR",
        message: "Cannot attach a repository connection to a missing project.",
        details: { projectId },
        httpStatus: 404
      });
    }

    const connection = await this.connections.upsert({
      projectId,
      provider: input.provider,
      repositoryOwner: input.repositoryOwner,
      repositoryName: input.repositoryName,
      repositoryId: input.repositoryId,
      defaultBranch: input.defaultBranch,
      credentialReference: input.credentialReference,
      connectedAt: input.connectedAt,
      lastVerifiedAt: input.lastVerifiedAt,
      createdBy: actor.id,
      updatedBy: actor.id
    });

    await this.projects.setRepositoryStatus(projectId, "connected");
    await this.audits.append({
      action: "repository_connection.saved",
      actorId: actor.id,
      correlationId: input.correlationId,
      metadata: {
        projectId,
        provider: input.provider,
        repositoryOwner: input.repositoryOwner,
        repositoryName: input.repositoryName,
        repositoryId: input.repositoryId
      }
    });

    logger.info({
      message: "Repository connection saved.",
      correlationId: input.correlationId,
      actorId: actor.id,
      context: {
        projectId,
        provider: input.provider,
        repositoryOwner: input.repositoryOwner,
        repositoryName: input.repositoryName
      }
    });

    const updatedProject = await this.projects.findById(projectId);

    return {
      project: updatedProject ?? project,
      repositoryConnection: connection,
      readyForNextSetupStep: true
    };
  }

  async getProjectView(projectId: string): Promise<RepositoryConnectionView | null> {
    const project = await this.projects.findById(projectId);

    if (!project) {
      return null;
    }

    return {
      project,
      repositoryConnection: await this.connections.findByProjectId(projectId),
      readyForNextSetupStep: project.repositoryStatus === "connected"
    };
  }
}
