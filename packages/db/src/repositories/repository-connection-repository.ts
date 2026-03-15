import type { RepositoryConnectionRecord } from "@repo/contracts";

export interface RepositoryConnectionRepository {
  upsert(input: Omit<RepositoryConnectionRecord, "id">): Promise<RepositoryConnectionRecord>;
  findByProjectId(projectId: string): Promise<RepositoryConnectionRecord | null>;
  findByRepository(
    provider: RepositoryConnectionRecord["provider"],
    repositoryOwner: string,
    repositoryName: string
  ): Promise<RepositoryConnectionRecord | null>;
}

const repositoryConnections = new Map<string, RepositoryConnectionRecord>();

export class InMemoryRepositoryConnectionRepository
  implements RepositoryConnectionRepository
{
  async upsert(
    input: Omit<RepositoryConnectionRecord, "id">
  ): Promise<RepositoryConnectionRecord> {
    const existing = repositoryConnections.get(input.projectId);
    const record: RepositoryConnectionRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      ...input
    };

    repositoryConnections.set(input.projectId, record);
    return record;
  }

  async findByProjectId(projectId: string): Promise<RepositoryConnectionRecord | null> {
    return repositoryConnections.get(projectId) ?? null;
  }

  async findByRepository(
    provider: RepositoryConnectionRecord["provider"],
    repositoryOwner: string,
    repositoryName: string
  ): Promise<RepositoryConnectionRecord | null> {
    for (const connection of repositoryConnections.values()) {
      if (
        connection.provider === provider &&
        connection.repositoryOwner === repositoryOwner &&
        connection.repositoryName === repositoryName
      ) {
        return connection;
      }
    }

    return null;
  }

  clear() {
    repositoryConnections.clear();
  }
}
