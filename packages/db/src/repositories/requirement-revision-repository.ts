import type { RequirementRevisionRecord } from "@repo/contracts";

export interface RequirementRevisionRepository {
  append(
    input: Omit<RequirementRevisionRecord, "id" | "createdAt">
  ): Promise<RequirementRevisionRecord>;
  findByEventAndRequirement(
    ingestionEventId: string,
    requirementId: string
  ): Promise<RequirementRevisionRecord | null>;
  list(): Promise<RequirementRevisionRecord[]>;
}

const revisions: RequirementRevisionRecord[] = [];

export class InMemoryRequirementRevisionRepository
  implements RequirementRevisionRepository
{
  async append(
    input: Omit<RequirementRevisionRecord, "id" | "createdAt">
  ): Promise<RequirementRevisionRecord> {
    const existing = revisions.find(
      (revision) =>
        revision.ingestionEventId === input.ingestionEventId &&
        revision.requirementId === input.requirementId
    );

    if (existing) {
      return existing;
    }

    const revision: RequirementRevisionRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...input
    };

    revisions.push(revision);
    return revision;
  }

  async findByEventAndRequirement(
    ingestionEventId: string,
    requirementId: string
  ): Promise<RequirementRevisionRecord | null> {
    return (
      revisions.find(
        (revision) =>
          revision.ingestionEventId === ingestionEventId &&
          revision.requirementId === requirementId
      ) ?? null
    );
  }

  async list(): Promise<RequirementRevisionRecord[]> {
    return [...revisions];
  }

  clear() {
    revisions.length = 0;
  }
}
