export function createTestActor(role: "administrator" | "viewer" = "administrator") {
  return {
    id: `${role}-1`,
    email: `${role}@example.com`,
    role
  };
}
