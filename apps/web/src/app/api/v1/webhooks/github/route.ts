import { DomainError, normalizeGithubPushWebhook, verifyGithubWebhookSignature } from "@repo/domain";
import { NextResponse } from "next/server";
import { toErrorResponse } from "../../../../../lib/server/http";
import { getWebhookIntakeService } from "../../../../../lib/server/service";

function getWebhookSecret() {
  return process.env.GITHUB_WEBHOOK_SECRET ?? "development-webhook-secret";
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const event = request.headers.get("x-github-event");
    const deliveryId = request.headers.get("x-github-delivery");
    const signature = request.headers.get("x-hub-signature-256");

    if (
      !verifyGithubWebhookSignature({
        rawBody,
        signature,
        secret: getWebhookSecret()
      })
    ) {
      throw new DomainError({
        code: "WEBHOOK_SIGNATURE_INVALID",
        message: "The GitHub webhook signature could not be verified.",
        retryable: false,
        httpStatus: 401
      });
    }

    const payload = JSON.parse(rawBody) as unknown;
    const normalized = normalizeGithubPushWebhook({
      event,
      deliveryId,
      payload
    });

    if (!normalized) {
      return NextResponse.json(
        {
          accepted: false,
          duplicate: false,
          ignored: true,
          eventId: null,
          reason: "unsupported_event"
        },
        { status: 202 }
      );
    }

    const service = getWebhookIntakeService();
    const result = await service.receive(normalized);

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
