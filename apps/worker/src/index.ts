import "dotenv/config";

import { Worker } from "bullmq";
import { Redis } from "ioredis";

import { redisUrl, workerConcurrency } from "./config.js";
import { DEMO_QUEUE_NAME, type DemoJobData } from "./queues/demoQueue.js";

const connection = new Redis(redisUrl);

const worker = new Worker<DemoJobData>(
  DEMO_QUEUE_NAME,
  async (job) => {
    if (job.name === "echo") {
      return { echoed: job.data.message };
    }
    return { ok: true };
  },
  {
    connection,
    concurrency: workerConcurrency
  }
);

worker.on("ready", () => {
  console.log(`worker ready: queue=${DEMO_QUEUE_NAME} concurrency=${workerConcurrency}`);
});

worker.on("failed", (job, err) => {
  console.error("job failed", { jobId: job?.id, err });
});

async function shutdown() {
  await worker.close();
  await connection.quit();
}

process.on("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});
process.on("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});
