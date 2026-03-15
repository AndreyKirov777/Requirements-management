export type AuditEntry = {
  id: string;
  action: string;
  actorId: string;
  correlationId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export interface AuditEntryRepository {
  append(input: Omit<AuditEntry, "id" | "createdAt">): Promise<AuditEntry>;
  list(): Promise<AuditEntry[]>;
}

const auditEntries: AuditEntry[] = [];

export class InMemoryAuditEntryRepository implements AuditEntryRepository {
  async append(input: Omit<AuditEntry, "id" | "createdAt">): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...input
    };

    auditEntries.push(entry);
    return entry;
  }

  async list(): Promise<AuditEntry[]> {
    return [...auditEntries];
  }

  clear() {
    auditEntries.length = 0;
  }
}
