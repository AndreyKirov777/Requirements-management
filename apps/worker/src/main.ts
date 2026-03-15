export function bootstrapWorker() {
  return {
    queues: ["ingestion", "exports", "publish", "notifications"],
    status: "idle"
  };
}
