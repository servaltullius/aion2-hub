import type { Redis } from "ioredis";
import { Queue } from "bullmq";

export const DEMO_QUEUE_NAME = "demo";

export type DemoJobData = {
  message: string;
};

export function createDemoQueue(connection: Redis) {
  return new Queue<DemoJobData>(DEMO_QUEUE_NAME, { connection });
}
