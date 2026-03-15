import { ActorSchema, type Actor } from "@repo/contracts";

const defaultActor: Actor = {
  id: "admin-1",
  email: "admin@example.com",
  role: "administrator"
};

export function getActorFromHeaders(headers: Headers): Actor {
  const actor = {
    id: headers.get("x-user-id") ?? defaultActor.id,
    email: headers.get("x-user-email") ?? defaultActor.email,
    role: headers.get("x-user-role") ?? defaultActor.role
  };

  return ActorSchema.parse(actor);
}
