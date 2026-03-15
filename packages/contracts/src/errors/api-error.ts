import { z } from "zod";

export const ApiErrorCodeSchema = z.enum([
  "FORBIDDEN",
  "VALIDATION_ERROR",
  "GITHUB_AUTHENTICATION_FAILED",
  "GITHUB_AUTHORIZATION_FAILED",
  "GITHUB_REPOSITORY_NOT_FOUND",
  "GITHUB_CONNECTION_VERIFICATION_FAILED"
]);

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).nullable().default(null),
    retryable: z.boolean().default(false)
  })
});

export type ApiErrorResponse = z.infer<typeof ApiErrorSchema>;

export function createApiErrorResponse(input: {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown> | null;
  retryable?: boolean;
}): ApiErrorResponse {
  return {
    error: {
      code: input.code,
      message: input.message,
      details: input.details ?? null,
      retryable: input.retryable ?? false
    }
  };
}
