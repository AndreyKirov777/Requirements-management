import { describe, expect, it } from "vitest";
import { bootstrapWorker } from "./main";

describe("bootstrapWorker", () => {
  it("returns the initial queue inventory", () => {
    expect(bootstrapWorker()).toEqual({
      queues: [
        {
          name: "ingestion",
          jobs: ["ingestion.webhook.received", "ingestion.requirement.sync"],
          attempts: 3,
          backoff: "exponential"
        }
      ],
      status: "ready"
    });
  });
});
