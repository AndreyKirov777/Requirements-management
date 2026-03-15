import { GitHubVerificationInputSchema } from "@repo/contracts";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getActorFromHeaders } from "../../../../../../lib/auth/actor";
import { toErrorResponse } from "../../../../../../lib/server/http";
import { getRepositoryConnectionService } from "../../../../../../lib/server/service";

export async function POST(request: Request) {
  try {
    const input = GitHubVerificationInputSchema.parse(await request.json());
    const actor = getActorFromHeaders(await headers());
    const service = getRepositoryConnectionService();
    const result = await service.verify(actor, input);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
