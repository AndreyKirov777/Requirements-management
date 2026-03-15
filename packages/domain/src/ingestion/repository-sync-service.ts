import type {
  Actor,
  RepositoryConnectionRecord,
  RepositorySyncConfigRecord,
  RepositorySyncPreviewInput,
  RepositorySyncPreviewResult,
  RepositorySyncSettingsInput,
  RepositorySyncSettingsView,
  RepositorySyncValidationIssue,
  SyncReadinessState
} from "@repo/contracts";
import {
  InMemoryAuditEntryRepository,
  InMemoryProjectRepository,
  InMemoryRepositoryConnectionRepository,
  InMemoryRepositorySyncConfigRepository
} from "@repo/db";
import { connectionMetrics, logger } from "@repo/observability";
import {
  validateMarkdownSchemaRules,
  validateNamingConvention
} from "@repo/validation";
import { requireAdministrator } from "../auth/require-admin";
import { type RepositoryScopeProvider, MockRepositoryScopeProvider } from "../integrations/repository-scope-provider";
import { DomainError } from "../shared/domain-error";

function dedupeIssues(issues: RepositorySyncValidationIssue[]) {
  return issues.filter(
    (issue, index) =>
      issues.findIndex(
        (candidate) =>
          candidate.field === issue.field && candidate.message === issue.message
      ) === index
  );
}

function createValidationError(issues: RepositorySyncValidationIssue[]): DomainError {
  return new DomainError({
    code: "VALIDATION_ERROR",
    message: "Sync settings are invalid. Fix the highlighted fields and try again.",
    details: { issues },
    httpStatus: 400
  });
}

function toFieldIssues(error: DomainError): RepositorySyncValidationIssue[] {
  const issues = error.details?.issues;

  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.filter(
    (issue): issue is RepositorySyncValidationIssue =>
      typeof issue === "object" &&
      issue !== null &&
      typeof issue.field === "string" &&
      typeof issue.message === "string"
  );
}

function computeReadinessState(input: {
  hasConnection: boolean;
  preview: RepositorySyncPreviewResult | null;
  issues: RepositorySyncValidationIssue[];
}): SyncReadinessState {
  if (!input.hasConnection || input.issues.length > 0 || !input.preview?.pathExists) {
    return "not_ready";
  }

  return "ready_for_ingestion";
}

function readinessLabel(state: SyncReadinessState) {
  return state === "ready_for_ingestion"
    ? "Ready for webhook-based ingestion"
    : "Configuration incomplete";
}

export class RepositorySyncService {
  constructor(
    private readonly projects = new InMemoryProjectRepository(),
    private readonly connections = new InMemoryRepositoryConnectionRepository(),
    private readonly syncConfigs = new InMemoryRepositorySyncConfigRepository(),
    private readonly audits = new InMemoryAuditEntryRepository(),
    private readonly provider: RepositoryScopeProvider = new MockRepositoryScopeProvider()
  ) {}

  async getSettings(projectId: string): Promise<RepositorySyncSettingsView | null> {
    const project = await this.projects.findById(projectId);

    if (!project) {
      return null;
    }

    const connection = await this.connections.findByProjectId(projectId);
    const syncConfig = await this.syncConfigs.findByProjectId(projectId);

    return {
      projectId,
      repositoryConnection: connection
        ? {
            provider: connection.provider,
            repositoryOwner: connection.repositoryOwner,
            repositoryName: connection.repositoryName,
            defaultBranch: connection.defaultBranch
          }
        : null,
      syncConfig,
      readinessState: syncConfig?.readinessState ?? "not_ready",
      readinessLabel: readinessLabel(syncConfig?.readinessState ?? "not_ready"),
      readyForWebhookIngestion:
        (syncConfig?.readinessState ?? "not_ready") === "ready_for_ingestion",
      preview: null
    };
  }

  async preview(
    actor: Actor,
    projectId: string,
    input: RepositorySyncPreviewInput
  ): Promise<RepositorySyncPreviewResult> {
    requireAdministrator(actor);
    connectionMetrics.trackSyncValidationAttempt();

    const connection = await this.getRequiredConnection(projectId);
    const result = await this.provider.previewRequirementsPath(connection, input);

    logger.info({
      message: "Repository sync configuration preview completed.",
      correlationId: input.correlationId,
      actorId: actor.id,
      context: {
        projectId,
        branchPolicy: input.branchPolicy,
        requirementsRootPath: input.requirementsRootPath,
        pathExists: result.pathExists
      }
    });

    return result;
  }

  async saveSettings(
    actor: Actor,
    projectId: string,
    input: RepositorySyncSettingsInput
  ): Promise<RepositorySyncSettingsView> {
    requireAdministrator(actor);
    connectionMetrics.trackSyncValidationAttempt();

    const project = await this.projects.findById(projectId);

    if (!project) {
      throw new DomainError({
        code: "VALIDATION_ERROR",
        message: "Cannot configure sync rules for a missing project.",
        details: { projectId },
        httpStatus: 404
      });
    }

    const connection = await this.getRequiredConnection(projectId);
    const preview = await this.provider.previewRequirementsPath(connection, {
      projectId,
      provider: connection.provider,
      repositoryOwner: connection.repositoryOwner,
      repositoryName: connection.repositoryName,
      defaultBranch: connection.defaultBranch,
      requirementsRootPath: input.requirementsRootPath,
      branchPolicy: input.branchPolicy,
      correlationId: input.correlationId
    });

    const issues = await this.collectValidationIssues(input, preview);

    if (issues.length > 0) {
      logger.warn({
        message: "Repository sync configuration validation failed.",
        correlationId: input.correlationId,
        actorId: actor.id,
        context: {
          projectId,
          issueCount: issues.length,
          requirementsRootPath: input.requirementsRootPath
        }
      });
      throw createValidationError(issues);
    }

    const previous = await this.syncConfigs.findByProjectId(projectId);
    const validatedAt = new Date().toISOString();
    const readinessState = computeReadinessState({
      hasConnection: true,
      preview,
      issues
    });

    const saved = await this.syncConfigs.upsert({
      projectId,
      requirementsRootPath: input.requirementsRootPath,
      namingConventionKind: input.namingConventionKind,
      namingConventionPattern: input.namingConventionPattern,
      branchPolicy: input.branchPolicy,
      schemaVersion: input.schema.schemaVersion,
      requiredFrontmatterFields: input.schema.requiredFrontmatterFields,
      requiredBodySections: input.schema.requiredBodySections,
      readinessState,
      validatedAt,
      readyForIngestionAt:
        readinessState === "ready_for_ingestion" ? validatedAt : null,
      createdBy: previous?.createdBy ?? actor.id,
      updatedBy: actor.id
    });

    await this.audits.append({
      action: "repository_sync_config.saved",
      actorId: actor.id,
      correlationId: input.correlationId,
      metadata: {
        projectId,
        changedFields: this.diffConfig(previous, saved),
        readinessState,
        requirementsRootPath: saved.requirementsRootPath,
        namingConventionKind: saved.namingConventionKind,
        branchPolicy: saved.branchPolicy,
        schemaVersion: saved.schemaVersion
      }
    });

    connectionMetrics.trackSyncConfigurationSaved();
    logger.info({
      message: "Repository sync configuration saved.",
      correlationId: input.correlationId,
      actorId: actor.id,
      context: {
        projectId,
        readinessState,
        requirementsRootPath: saved.requirementsRootPath,
        namingConventionKind: saved.namingConventionKind
      }
    });

    return {
      projectId,
      repositoryConnection: {
        provider: connection.provider,
        repositoryOwner: connection.repositoryOwner,
        repositoryName: connection.repositoryName,
        defaultBranch: connection.defaultBranch
      },
      syncConfig: saved,
      readinessState,
      readinessLabel: readinessLabel(readinessState),
      readyForWebhookIngestion: readinessState === "ready_for_ingestion",
      preview
    };
  }

  private async getRequiredConnection(
    projectId: string
  ): Promise<RepositoryConnectionRecord> {
    const connection = await this.connections.findByProjectId(projectId);

    if (!connection) {
      throw new DomainError({
        code: "VALIDATION_ERROR",
        message: "Connect a repository before configuring sync rules.",
        details: { projectId },
        httpStatus: 409
      });
    }

    return connection;
  }

  private async collectValidationIssues(
    input: RepositorySyncSettingsInput,
    preview: RepositorySyncPreviewResult
  ) {
    const schemaIssues = validateMarkdownSchemaRules(input.schema);
    const namingIssues = validateNamingConvention(
      input.namingConventionKind,
      input.namingConventionPattern
    );

    return dedupeIssues([...preview.issues, ...schemaIssues, ...namingIssues]);
  }

  private diffConfig(
    previous: RepositorySyncConfigRecord | null,
    next: RepositorySyncConfigRecord
  ) {
    if (!previous) {
      return ["requirementsRootPath", "namingConventionKind", "branchPolicy", "schema"];
    }

    const changedFields: string[] = [];

    if (previous.requirementsRootPath !== next.requirementsRootPath) {
      changedFields.push("requirementsRootPath");
    }
    if (previous.namingConventionKind !== next.namingConventionKind) {
      changedFields.push("namingConventionKind");
    }
    if (previous.namingConventionPattern !== next.namingConventionPattern) {
      changedFields.push("namingConventionPattern");
    }
    if (previous.branchPolicy !== next.branchPolicy) {
      changedFields.push("branchPolicy");
    }
    if (previous.schemaVersion !== next.schemaVersion) {
      changedFields.push("schemaVersion");
    }
    if (
      JSON.stringify(previous.requiredFrontmatterFields) !==
      JSON.stringify(next.requiredFrontmatterFields)
    ) {
      changedFields.push("requiredFrontmatterFields");
    }
    if (
      JSON.stringify(previous.requiredBodySections) !==
      JSON.stringify(next.requiredBodySections)
    ) {
      changedFields.push("requiredBodySections");
    }

    return changedFields;
  }
}

export function getValidationIssues(error: unknown): RepositorySyncValidationIssue[] {
  return error instanceof DomainError ? toFieldIssues(error) : [];
}
