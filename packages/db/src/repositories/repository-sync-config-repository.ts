import type { RepositorySyncConfigRecord } from "@repo/contracts";

export interface RepositorySyncConfigRepository {
  upsert(input: Omit<RepositorySyncConfigRecord, "id" | "createdAt" | "updatedAt">): Promise<RepositorySyncConfigRecord>;
  findByProjectId(projectId: string): Promise<RepositorySyncConfigRecord | null>;
}

const repositorySyncConfigs = new Map<string, RepositorySyncConfigRecord>();

export class InMemoryRepositorySyncConfigRepository
  implements RepositorySyncConfigRepository
{
  async upsert(
    input: Omit<RepositorySyncConfigRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<RepositorySyncConfigRecord> {
    const existing = repositorySyncConfigs.get(input.projectId);
    const timestamp = new Date().toISOString();
    const record: RepositorySyncConfigRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      ...input
    };

    repositorySyncConfigs.set(input.projectId, record);
    return record;
  }

  async findByProjectId(projectId: string): Promise<RepositorySyncConfigRecord | null> {
    return repositorySyncConfigs.get(projectId) ?? null;
  }

  clear() {
    repositorySyncConfigs.clear();
  }
}
