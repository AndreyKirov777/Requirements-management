import { Queue, type ConnectionOptions } from "bullmq";
import type {
  RequirementSyncJobPayload,
  WebhookReceivedJobPayload
} from "@repo/contracts";
import {
  INGESTION_QUEUE_NAME,
  INGESTION_REQUIREMENT_SYNC_JOB,
  INGESTION_WEBHOOK_RECEIVED_JOB,
  type IngestionQueuePublisher
} from "@repo/domain";

function getRedisConnection() {
  const url = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    maxRetriesPerRequest: null
  } satisfies ConnectionOptions;
}

export function createBullMqIngestionQueue() {
  return new Queue(INGESTION_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000
      },
      removeOnComplete: 100,
      removeOnFail: 100
    }
  });
}

export class BullMqIngestionQueuePublisher implements IngestionQueuePublisher {
  constructor(private readonly queue = createBullMqIngestionQueue()) {}

  async enqueueWebhookReceived(
    payload: WebhookReceivedJobPayload,
    options?: { jobId?: string }
  ) {
    await this.queue.add(INGESTION_WEBHOOK_RECEIVED_JOB, payload, {
      jobId: options?.jobId ?? payload.idempotencyKey
    });
  }

  async enqueueRequirementSync(
    payload: RequirementSyncJobPayload,
    options?: { jobId?: string }
  ) {
    await this.queue.add(INGESTION_REQUIREMENT_SYNC_JOB, payload, {
      jobId: options?.jobId ?? `${payload.eventId}:sync`
    });
  }
}
