import type { DesktopDb } from "./storage/db.js";

import { syncNotices } from "./notices/sync.js";

export type NoticesSchedulerStatus = {
  running: boolean;
  lastRunAt: string | null;
  lastResult: unknown | null;
  lastError: string | null;
};

export function startNoticesScheduler(db: DesktopDb, options?: { intervalMs?: number }) {
  const intervalMs = options?.intervalMs ?? 30 * 60 * 1000;

  const status: NoticesSchedulerStatus = {
    running: false,
    lastRunAt: null,
    lastResult: null,
    lastError: null
  };

  let timer: NodeJS.Timeout | null = null;

  async function run(reason: "startup" | "interval" | "manual") {
    if (status.running) return;
    status.running = true;
    status.lastError = null;

    try {
      const result = await syncNotices(db);
      status.lastRunAt = new Date().toISOString();
      status.lastResult = { reason, ...result };
      status.lastError = null;
      console.log("[notices] sync ok", status.lastResult);
    } catch (e: unknown) {
      status.lastRunAt = new Date().toISOString();
      status.lastResult = { reason };
      status.lastError = e instanceof Error ? e.message : String(e);
      console.error("[notices] sync failed", { reason, err: e });
    } finally {
      status.running = false;
    }
  }

  void run("startup");
  timer = setInterval(() => void run("interval"), intervalMs);

  return {
    syncNow: async () => run("manual"),
    getStatus: () => ({ ...status }),
    stop: () => {
      if (timer) clearInterval(timer);
      timer = null;
    }
  };
}

