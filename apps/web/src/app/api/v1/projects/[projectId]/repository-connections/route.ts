import { SaveRepositoryConnectionInputSchema } from "@repo/contracts";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getActorFromHeaders } from "../../../../../../lib/auth/actor";
import { toErrorResponse } from "../../../../../../lib/server/http";
import { getRepositoryConnectionService } from "../../../../../../lib/server/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const input = SaveRepositoryConnectionInputSchema.parse(await request.json());
    const actor = getActorFromHeaders(await headers());
    const { projectId } = await context.params;
    const service = getRepositoryConnectionService();
    const result = await service.saveConnection(actor, projectId, input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
