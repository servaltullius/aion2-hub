import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { describe, expect, it } from "vitest";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

describe("worker demo queue", () => {
  it("processes an echo job (requires redis)", async () => {
    const ping = new Redis(redisUrl, { lazyConnect: true });
    ping.on("error", () => undefined);
    try {
      await ping.connect();
      await ping.ping();
    } catch {
      // Redis isn't available in this environment (e.g., no docker). Treat as skipped.
      return;
    } finally {
      await ping.quit().catch(() => undefined);
    }

    const queueName = `demo-test-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const queueConnection = new Redis(redisUrl);
    const workerConnection = new Redis(redisUrl);

    const queue = new Queue(queueName, { connection: queueConnection });
    const worker = new Worker(
      queueName,
      async (job) => {
        if (job.name === "echo") return { echoed: job.data.message };
        return { ok: true };
      },
      { connection: workerConnection }
    );

    const completion = new Promise<{ echoed: string }>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout waiting for job completion")), 5000);

      worker.on("completed", (_job, result) => {
        clearTimeout(timeout);
        resolve(result as { echoed: string });
      });

      worker.on("failed", (_job, err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    await queue.add("echo", { message: "hi" }, { removeOnComplete: true, removeOnFail: true });

    const result = await completion;
    expect(result.echoed).toBe("hi");

    await worker.close();
    await queue.close();
    await queueConnection.quit();
    await workerConnection.quit();
  });
});
