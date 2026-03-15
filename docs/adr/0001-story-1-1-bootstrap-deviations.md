# ADR 0001: Story 1.1 Bootstrap Deviations

## Status

Accepted

## Context

Story 1.1 is the first executable implementation story. The target architecture expects a shadcn monorepo initialized with `pnpm`, but the current machine did not have `pnpm` or `corepack` available during bootstrap.

## Decision

- Preserve the intended monorepo shape: `apps/web`, `apps/worker`, and the full `packages/*` boundary layout.
- Keep `pnpm-workspace.yaml` and `turbo.json` in the repository so later setup can converge on the target toolchain.
- Use explicit package manifests and hand-written starter files instead of a generated shadcn scaffold for this story.
- Keep repository-connection persistence modeled in Prisma schema now, while the running starter uses repository abstractions for the first vertical slice.

## Consequences

- The repo can move to the exact architecture toolchain later without a structural rewrite.
- Installing dependencies and generating the Prisma client remains a follow-up environment step after the package manager is available.
