export const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
export const workerConcurrency = Number(process.env.WORKER_CONCURRENCY ?? 5);

