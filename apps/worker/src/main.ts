import {
  INGESTION_QUEUE_NAME,
  INGESTION_REQUIREMENT_SYNC_JOB,
  INGESTION_WEBHOOK_RECEIVED_JOB
} from "@repo/domain";

export function bootstrapWorker() {
  return {
    queues: [
      {
        name: INGESTION_QUEUE_NAME,
        jobs: [INGESTION_WEBHOOK_RECEIVED_JOB, INGESTION_REQUIREMENT_SYNC_JOB],
        attempts: 3,
        backoff: "exponential"
      }
    ],
    status: "ready"
  };
}
