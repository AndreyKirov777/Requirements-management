import {
  RepositorySyncSettingsInputSchema
} from "@repo/contracts";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getActorFromHeaders } from "../../../../../../lib/auth/actor";
import { toErrorResponse } from "../../../../../../lib/server/http";
import { getRepositorySyncService } from "../../../../../../lib/server/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;
    const service = getRepositorySyncService();
    const result = await service.getSettings(projectId);

    if (!result) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Project not found." } },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const input = RepositorySyncSettingsInputSchema.parse(await request.json());
    const actor = getActorFromHeaders(await headers());
    const { projectId } = await context.params;
    const service = getRepositorySyncService();
    const result = await service.saveSettings(actor, projectId, input);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
