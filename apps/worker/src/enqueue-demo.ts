import "dotenv/config";

import { Redis } from "ioredis";

import { redisUrl } from "./config.js";
import { createDemoQueue } from "./queues/demoQueue.js";

const connection = new Redis(redisUrl);
const queue = createDemoQueue(connection);

await queue.add(
  "echo",
  { message: "hello from worker demo job" },
  { removeOnComplete: true, removeOnFail: true }
);

await queue.close();
await connection.quit();
