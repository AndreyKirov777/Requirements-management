import type { RequirementSyncJobPayload } from "@repo/contracts";
import type { RequirementIngestionService } from "@repo/domain";

export async function validateRequirementMarkdownJob(input: {
  payload: RequirementSyncJobPayload;
  attempt?: number;
  maxAttempts?: number;
  service: RequirementIngestionService;
}) {
  const event = await input.service.syncEvent({
    eventId: input.payload.eventId,
    attempt: input.attempt ?? 1,
    maxAttempts: input.maxAttempts ?? 3
  });

  return {
    eventId: event.id,
    status: event.status
  };
}
