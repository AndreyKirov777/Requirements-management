import type { ApiErrorCode } from "@repo/contracts";

export class DomainError extends Error {
  code: ApiErrorCode;
  details: Record<string, unknown> | null;
  retryable: boolean;
  httpStatus: number;

  constructor(input: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown> | null;
    retryable?: boolean;
    httpStatus?: number;
  }) {
    super(input.message);
    this.code = input.code;
    this.details = input.details ?? null;
    this.retryable = input.retryable ?? false;
    this.httpStatus = input.httpStatus ?? 400;
  }
}
