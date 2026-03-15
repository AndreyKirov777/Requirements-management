import type {
  NormalizedWebhookEvent,
  WebhookReceiptResult
} from "@repo/contracts";
import {
  InMemoryAuditEntryRepository,
  InMemoryIngestionEventRepository,
  InMemoryProjectRepository,
  InMemoryRepositoryConnectionRepository,
  InMemoryRepositorySyncConfigRepository
} from "@repo/db";
import { connectionMetrics, logger } from "@repo/observability";
import { InMemoryIngestionQueuePublisher, type IngestionQueuePublisher } from "./ingestion-queue";

export class WebhookIntakeService {
  constructor(
    private readonly projects = new InMemoryProjectRepository(),
    private readonly connections = new InMemoryRepositoryConnectionRepository(),
    private readonly syncConfigs = new InMemoryRepositorySyncConfigRepository(),
    private readonly ingestionEvents = new InMemoryIngestionEventRepository(),
    private readonly audits = new InMemoryAuditEntryRepository(),
    private readonly queue = new InMemoryIngestionQueuePublisher()
  ) {}

  async receive(normalized: NormalizedWebhookEvent): Promise<WebhookReceiptResult> {
    const connection = await this.connections.findByRepository(
      normalized.provider,
      normalized.repositoryOwner,
      normalized.repositoryName
    );

    if (!connection) {
      return {
        accepted: false,
        duplicate: false,
        ignored: true,
        eventId: null,
        reason: "repository_not_connected"
      };
    }

    const project = await this.projects.findById(connection.projectId);
    const syncConfig = await this.syncConfigs.findByProjectId(connection.projectId);

    if (
      !project ||
      project.repositoryStatus !== "connected" ||
      !syncConfig ||
      syncConfig.readinessState !== "ready_for_ingestion"
    ) {
      return {
        accepted: false,
        duplicate: false,
        ignored: true,
        eventId: null,
        reason: "ingestion_not_ready"
      };
    }

    const idempotencyKey = `${normalized.provider}:${normalized.deliveryId}:${normalized.commitSha}`;
    const existing = await this.ingestionEvents.findByIdempotencyKey(idempotencyKey);

    if (existing) {
      connectionMetrics.trackIngestionWebhookDuplicate();
      return {
        accepted: true,
        duplicate: true,
        ignored: false,
        eventId: existing.id,
        reason: null
      };
    }

    const event = await this.ingestionEvents.create({
      projectId: connection.projectId,
      provider: normalized.provider,
      providerEventId: normalized.providerEventId,
      deliveryId: normalized.deliveryId,
      idempotencyKey,
      eventType: normalized.eventType,
      commitSha: normalized.commitSha,
      status: "queued",
      affectedFilePaths: normalized.affectedFilePaths,
      payloadSummary: normalized.payloadSummary,
      fileOutcomes: [],
      lastError: null
    });

    await this.audits.append({
      action: "ingestion_event.queued",
      actorId: "system:webhook",
      correlationId: event.id,
      metadata: {
        eventId: event.id,
        projectId: event.projectId,
        provider: event.provider,
        commitSha: event.commitSha,
        affectedFilePaths: event.affectedFilePaths
      }
    });

    await this.queue.enqueueWebhookReceived(
      {
        eventId: event.id,
        idempotencyKey
      },
      { jobId: idempotencyKey }
    );

    connectionMetrics.trackIngestionWebhookAccepted();
    logger.info({
      message: "Webhook event accepted for ingestion.",
      correlationId: event.id,
      context: {
        projectId: event.projectId,
        providerEventId: event.providerEventId,
        commitSha: event.commitSha,
        affectedFilePaths: event.affectedFilePaths
      }
    });

    return {
      accepted: true,
      duplicate: false,
      ignored: false,
      eventId: event.id,
      reason: null
    };
  }
}
