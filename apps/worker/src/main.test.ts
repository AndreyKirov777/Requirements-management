import { describe, expect, it } from "vitest";
import { bootstrapWorker } from "./main";

describe("bootstrapWorker", () => {
  it("returns the initial queue inventory", () => {
    expect(bootstrapWorker()).toEqual({
      queues: ["ingestion", "exports", "publish", "notifications"],
      status: "idle"
    });
  });
});
