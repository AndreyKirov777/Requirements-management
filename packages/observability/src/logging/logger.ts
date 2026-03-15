type LogLevel = "info" | "warn" | "error";

export type LogEntry = {
  level: LogLevel;
  message: string;
  correlationId: string;
  actorId?: string;
  context?: Record<string, unknown>;
};

const entries: LogEntry[] = [];

function redactSecrets(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redactSecrets);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => {
      if (/(token|secret|privateKey)/i.test(key)) {
        return [key, "[REDACTED]"];
      }

      return [key, redactSecrets(nestedValue)];
    })
  ) as Record<string, unknown>;
}

export const logger = {
  info(entry: Omit<LogEntry, "level">) {
    entries.push({
      ...entry,
      context: redactSecrets(entry.context) as Record<string, unknown> | undefined,
      level: "info"
    });
  },
  warn(entry: Omit<LogEntry, "level">) {
    entries.push({
      ...entry,
      context: redactSecrets(entry.context) as Record<string, unknown> | undefined,
      level: "warn"
    });
  },
  error(entry: Omit<LogEntry, "level">) {
    entries.push({
      ...entry,
      context: redactSecrets(entry.context) as Record<string, unknown> | undefined,
      level: "error"
    });
  },
  flush() {
    return [...entries];
  },
  clear() {
    entries.length = 0;
  }
};
