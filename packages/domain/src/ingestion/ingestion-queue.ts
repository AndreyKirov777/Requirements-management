import type {
  RequirementSyncJobPayload,
  WebhookReceivedJobPayload
} from "@repo/contracts";

export const INGESTION_QUEUE_NAME = "ingestion";
export const INGESTION_WEBHOOK_RECEIVED_JOB = "ingestion.webhook.received";
export const INGESTION_REQUIREMENT_SYNC_JOB = "ingestion.requirement.sync";

export type EnqueuedJob =
  | {
      name: typeof INGESTION_WEBHOOK_RECEIVED_JOB;
      payload: WebhookReceivedJobPayload;
      jobId: string;
    }
  | {
      name: typeof INGESTION_REQUIREMENT_SYNC_JOB;
      payload: RequirementSyncJobPayload;
      jobId: string;
    };

export interface IngestionQueuePublisher {
  enqueueWebhookReceived(
    payload: WebhookReceivedJobPayload,
    options?: { jobId?: string }
  ): Promise<void>;
  enqueueRequirementSync(
    payload: RequirementSyncJobPayload,
    options?: { jobId?: string }
  ): Promise<void>;
}

const enqueuedJobs: EnqueuedJob[] = [];

export class InMemoryIngestionQueuePublisher implements IngestionQueuePublisher {
  async enqueueWebhookReceived(
    payload: WebhookReceivedJobPayload,
    options?: { jobId?: string }
  ) {
    const jobId = options?.jobId ?? payload.idempotencyKey;

    if (!enqueuedJobs.some((job) => job.jobId === jobId)) {
      enqueuedJobs.push({
        name: INGESTION_WEBHOOK_RECEIVED_JOB,
        payload,
        jobId
      });
    }
  }

  async enqueueRequirementSync(
    payload: RequirementSyncJobPayload,
    options?: { jobId?: string }
  ) {
    const jobId = options?.jobId ?? `${payload.eventId}:sync`;

    if (!enqueuedJobs.some((job) => job.jobId === jobId)) {
      enqueuedJobs.push({
        name: INGESTION_REQUIREMENT_SYNC_JOB,
        payload,
        jobId
      });
    }
  }

  async list() {
    return [...enqueuedJobs];
  }

  clear() {
    enqueuedJobs.length = 0;
  }
}
