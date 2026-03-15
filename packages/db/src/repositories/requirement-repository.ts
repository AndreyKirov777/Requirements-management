import type { RequirementRecord, RequirementSyncState } from "@repo/contracts";

export interface RequirementRepository {
  upsert(
    input: Omit<RequirementRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<RequirementRecord>;
  findByProjectAndKey(
    projectId: string,
    requirementKey: string
  ): Promise<RequirementRecord | null>;
  listByProjectId(projectId: string): Promise<RequirementRecord[]>;
}

const requirements = new Map<string, RequirementRecord>();

function recordKey(projectId: string, requirementKey: string) {
  return `${projectId}:${requirementKey}`;
}

export class InMemoryRequirementRepository implements RequirementRepository {
  async upsert(
    input: Omit<RequirementRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<RequirementRecord> {
    const key = recordKey(input.projectId, input.requirementKey);
    const existing = requirements.get(key);
    const timestamp = new Date().toISOString();
    const record: RequirementRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      ...input
    };

    requirements.set(key, record);
    return record;
  }

  async findByProjectAndKey(
    projectId: string,
    requirementKey: string
  ): Promise<RequirementRecord | null> {
    return requirements.get(recordKey(projectId, requirementKey)) ?? null;
  }

  async listByProjectId(projectId: string): Promise<RequirementRecord[]> {
    return [...requirements.values()].filter(
      (requirement) => requirement.projectId === projectId
    );
  }

  clear() {
    requirements.clear();
  }
}
