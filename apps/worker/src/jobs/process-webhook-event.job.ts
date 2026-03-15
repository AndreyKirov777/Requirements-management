import type { WebhookReceivedJobPayload } from "@repo/contracts";
import type { RequirementIngestionService } from "@repo/domain";

export async function processWebhookEventJob(input: {
  payload: WebhookReceivedJobPayload;
  service: RequirementIngestionService;
}) {
  const event = await input.service.enqueueRequirementSync({
    eventId: input.payload.eventId
  });

  return {
    eventId: event.id,
    status: event.status
  };
}
