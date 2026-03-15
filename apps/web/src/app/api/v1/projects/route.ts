import { CreateProjectInputSchema } from "@repo/contracts";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getActorFromHeaders } from "../../../../lib/auth/actor";
import { toErrorResponse } from "../../../../lib/server/http";
import { getRepositoryConnectionService } from "../../../../lib/server/service";

export async function POST(request: Request) {
  try {
    const input = CreateProjectInputSchema.parse(await request.json());
    const actor = getActorFromHeaders(await headers());
    const service = getRepositoryConnectionService();
    const project = await service.createProject(actor, input);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
