import type { Actor } from "@repo/contracts";
import { DomainError } from "../shared/domain-error";

export function requireAdministrator(actor: Actor) {
  if (actor.role !== "administrator") {
    throw new DomainError({
      code: "FORBIDDEN",
      message: "Only administrators can manage repository connections.",
      details: { role: actor.role },
      httpStatus: 403
    });
  }
}
