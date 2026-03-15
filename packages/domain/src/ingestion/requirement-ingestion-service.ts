import path from "node:path";
import type {
  IngestionEventRecord,
  IngestionFileOutcome,
  RequirementRecord,
  RequirementSyncJobPayload
} from "@repo/contracts";
import {
  InMemoryAuditEntryRepository,
  InMemoryIngestionEventRepository,
  InMemoryProjectRepository,
  InMemoryRepositoryConnectionRepository,
  InMemoryRepositorySyncConfigRepository,
  InMemoryRequirementRepository,
  InMemoryRequirementRevisionRepository
} from "@repo/db";
import { connectionMetrics, logger } from "@repo/observability";
import { fileNameMatchesConvention, parseRequirementMarkdown } from "@repo/validation";
import { DomainError } from "../shared/domain-error";
import {
  InMemoryIngestionQueuePublisher,
  type IngestionQueuePublisher
} from "./ingestion-queue";
import {
  MockRequirementRepositoryProvider,
  type RequirementRepositoryProvider
} from "./requirement-repository-provider";

function isPathInScope(rootPath: string, filePath: string) {
  return filePath === rootPath || filePath.startsWith(`${rootPath}/`);
}

export class RequirementIngestionService {
  constructor(
    private readonly projects = new InMemoryProjectRepository(),
    private readonly connections = new InMemoryRepositoryConnectionRepository(),
    private readonly syncConfigs = new InMemoryRepositorySyncConfigRepository(),
    private readonly ingestionEvents = new InMemoryIngestionEventRepository(),
    private readonly requirements = new InMemoryRequirementRepository(),
    private readonly revisions = new InMemoryRequirementRevisionRepository(),
    private readonly audits = new InMemoryAuditEntryRepository(),
    private readonly provider: RequirementRepositoryProvider = new MockRequirementRepositoryProvider(),
    private readonly queue: IngestionQueuePublisher = new InMemoryIngestionQueuePublisher()
  ) {}

  async enqueueRequirementSync(payload: { eventId: string }) {
    const event = await this.getRequiredEvent(payload.eventId);

    await this.queue.enqueueRequirementSync(
      { eventId: event.id },
      { jobId: `${event.id}:sync` }
    );

    return event;
  }

  async syncEvent(input: {
    eventId: string;
    attempt: number;
    maxAttempts: number;
  }) {
    const event = await this.getRequiredEvent(input.eventId);

    if (event.status === "completed" || event.status === "dead_lettered") {
      return event;
    }

    const connection = await this.connections.findByProjectId(event.projectId);
    const syncConfig = await this.syncConfigs.findByProjectId(event.projectId);
    const project = await this.projects.findById(event.projectId);

    if (!project || !connection || !syncConfig) {
      return this.failEvent(event, {
        status: "dead_lettered",
        error: new DomainError({
          code: "WEBHOOK_CONFIGURATION_INVALID",
          message: "Ingestion cannot continue without repository configuration.",
          details: { eventId: event.id, projectId: event.projectId },
          retryable: false,
          httpStatus: 500
        }),
        attempt: input.attempt
      });
    }

    await this.ingestionEvents.update(event.id, {
      status: "processing",
      retryCount: Math.max(0, input.attempt - 1),
      lastError: null
    });

    try {
      const outcomes: IngestionFileOutcome[] = [];

      for (const affectedPath of event.affectedFilePaths) {
        const fileName = path.basename(affectedPath);

        if (!isPathInScope(syncConfig.requirementsRootPath, affectedPath)) {
          outcomes.push({
            path: affectedPath,
            status: "skipped",
            reason: "out_of_scope",
            requirementKey: null
          });
          continue;
        }

        if (
          !fileNameMatchesConvention({
            fileName,
            kind: syncConfig.namingConventionKind,
            pattern: syncConfig.namingConventionPattern
          })
        ) {
          outcomes.push({
            path: affectedPath,
            status: "skipped",
            reason: "naming_convention_mismatch",
            requirementKey: null
          });
          continue;
        }

        const file = await this.provider.fetchRequirementFile(connection, {
          commitSha: event.commitSha,
          path: affectedPath
        });

        const parsed = parseRequirementMarkdown({
          content: file.content,
          schema: syncConfig
        });

        if (!parsed.success) {
          throw new DomainError({
            code: "REQUIREMENT_MARKDOWN_INVALID",
            message: "Requirement markdown did not satisfy the configured schema.",
            details: {
              path: affectedPath,
              issues: parsed.issues
            },
            retryable: false,
            httpStatus: 422
          });
        }

        const now = new Date().toISOString();
        const requirement = await this.requirements.upsert({
          projectId: event.projectId,
          requirementKey: parsed.document.requirementKey,
          title: parsed.document.title,
          status: parsed.document.status,
          bodyMarkdown: parsed.document.bodyMarkdown,
          parsedContent: {
            frontmatter: parsed.document.frontmatter,
            sections: parsed.document.sections
          },
          sourcePath: affectedPath,
          lastSyncedCommitSha: event.commitSha,
          syncState: "in_sync",
          lastSyncedAt: now
        });

        await this.revisions.append({
          requirementId: requirement.id,
          ingestionEventId: event.id,
          commitSha: event.commitSha,
          sourcePath: affectedPath,
          bodyMarkdown: parsed.document.bodyMarkdown
        });

        await this.audits.append({
          action: "requirement.synced",
          actorId: "system:worker",
          correlationId: event.id,
          metadata: {
            eventId: event.id,
            projectId: event.projectId,
            requirementId: requirement.id,
            requirementKey: requirement.requirementKey,
            sourcePath: affectedPath,
            commitSha: event.commitSha
          }
        });

        outcomes.push({
          path: affectedPath,
          status: "synced",
          reason: null,
          requirementKey: requirement.requirementKey
        });
      }

      const completed = await this.ingestionEvents.update(event.id, {
        status: "completed",
        fileOutcomes: outcomes,
        lastError: null,
        processedAt: new Date().toISOString(),
        retryCount: Math.max(0, input.attempt - 1)
      });

      connectionMetrics.trackIngestionJobCompleted();
      logger.info({
        message: "Requirement ingestion completed.",
        correlationId: event.id,
        context: {
          eventId: event.id,
          projectId: event.projectId,
          syncedCount: outcomes.filter((outcome) => outcome.status === "synced").length,
          skippedCount: outcomes.filter((outcome) => outcome.status === "skipped").length
        }
      });

      return completed ?? event;
    } catch (error) {
      const domainError =
        error instanceof DomainError
          ? error
          : new DomainError({
              code: "TRANSIENT_INGESTION_FAILURE",
              message: "Requirement ingestion failed unexpectedly.",
              details: {
                eventId: event.id,
                cause: error instanceof Error ? error.message : "unknown"
              },
              retryable: true,
              httpStatus: 500
            });

      if (domainError.retryable && input.attempt < input.maxAttempts) {
        await this.ingestionEvents.update(event.id, {
          status: "failed",
          lastError: domainError.message,
          retryCount: input.attempt
        });
        throw domainError;
      }

      return this.failEvent(event, {
        status: "dead_lettered",
        error: domainError,
        attempt: input.attempt
      });
    }
  }

  private async failEvent(
    event: IngestionEventRecord,
    input: {
      status: "dead_lettered";
      error: DomainError;
      attempt: number;
    }
  ) {
    const updated = await this.ingestionEvents.update(event.id, {
      status: input.status,
      lastError: input.error.message,
      processedAt: new Date().toISOString(),
      retryCount: Math.max(0, input.attempt - 1)
    });

    connectionMetrics.trackIngestionJobDeadLettered();
    logger.error({
      message: "Requirement ingestion moved to dead-letter handling.",
      correlationId: event.id,
      context: {
        eventId: event.id,
        projectId: event.projectId,
        code: input.error.code,
        retryable: input.error.retryable
      }
    });

    return updated ?? event;
  }

  private async getRequiredEvent(eventId: string) {
    const event = await this.ingestionEvents.findById(eventId);

    if (!event) {
      throw new DomainError({
        code: "INGESTION_EVENT_NOT_FOUND",
        message: "The ingestion event could not be found.",
        details: { eventId },
        retryable: false,
        httpStatus: 404
      });
    }

    return event;
  }
}
