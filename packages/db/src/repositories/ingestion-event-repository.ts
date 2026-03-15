import type {
  IngestionEventRecord,
  IngestionEventStatus,
  IngestionFileOutcome
} from "@repo/contracts";

export interface IngestionEventRepository {
  create(
    input: Omit<IngestionEventRecord, "id" | "receivedAt" | "processedAt" | "retryCount">
  ): Promise<IngestionEventRecord>;
  findById(eventId: string): Promise<IngestionEventRecord | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<IngestionEventRecord | null>;
  update(
    eventId: string,
    input: Partial<
      Pick<
        IngestionEventRecord,
        "status" | "fileOutcomes" | "lastError" | "processedAt" | "retryCount"
      >
    >
  ): Promise<IngestionEventRecord | null>;
  list(): Promise<IngestionEventRecord[]>;
}

const ingestionEvents = new Map<string, IngestionEventRecord>();

export class InMemoryIngestionEventRepository implements IngestionEventRepository {
  async create(
    input: Omit<IngestionEventRecord, "id" | "receivedAt" | "processedAt" | "retryCount">
  ): Promise<IngestionEventRecord> {
    const record: IngestionEventRecord = {
      id: crypto.randomUUID(),
      receivedAt: new Date().toISOString(),
      processedAt: null,
      retryCount: 0,
      ...input
    };

    ingestionEvents.set(record.id, record);
    return record;
  }

  async findById(eventId: string): Promise<IngestionEventRecord | null> {
    return ingestionEvents.get(eventId) ?? null;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<IngestionEventRecord | null> {
    for (const event of ingestionEvents.values()) {
      if (event.idempotencyKey === idempotencyKey) {
        return event;
      }
    }

    return null;
  }

  async update(
    eventId: string,
    input: Partial<
      Pick<
        IngestionEventRecord,
        "status" | "fileOutcomes" | "lastError" | "processedAt" | "retryCount"
      >
    >
  ): Promise<IngestionEventRecord | null> {
    const existing = ingestionEvents.get(eventId);

    if (!existing) {
      return null;
    }

    const record: IngestionEventRecord = {
      ...existing,
      ...input,
      fileOutcomes: input.fileOutcomes ?? existing.fileOutcomes,
      lastError:
        input.lastError === undefined ? existing.lastError : input.lastError,
      processedAt:
        input.processedAt === undefined ? existing.processedAt : input.processedAt,
      retryCount: input.retryCount ?? existing.retryCount
    };

    ingestionEvents.set(eventId, record);
    return record;
  }

  async list(): Promise<IngestionEventRecord[]> {
    return [...ingestionEvents.values()];
  }

  clear() {
    ingestionEvents.clear();
  }
}
