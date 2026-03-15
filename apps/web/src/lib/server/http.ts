import { createApiErrorResponse } from "@repo/contracts";
import { DomainError } from "@repo/domain";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

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

  if (error instanceof ZodError) {
    return NextResponse.json(
      createApiErrorResponse({
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: {
          issues: error.issues.map((issue) => ({
            field: issue.path.join(".") || "request",
            message: issue.message
          }))
        },
        retryable: false
      }),
      { status: 400 }
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
