import { createApiErrorResponse } from "@repo/contracts";
import { DomainError } from "@repo/domain";
import { NextResponse } from "next/server";

export function toErrorResponse(error: unknown) {
  if (error instanceof DomainError) {
    return NextResponse.json(
      createApiErrorResponse({
        code: error.code,
        message: error.message,
        details: error.details,
        retryable: error.retryable
      }),
      { status: error.httpStatus }
    );
  }

  return NextResponse.json(
    createApiErrorResponse({
      code: "VALIDATION_ERROR",
      message: "An unexpected error occurred.",
      retryable: false
    }),
    { status: 500 }
  );
}
