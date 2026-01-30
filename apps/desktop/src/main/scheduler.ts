import type { DesktopDb } from "./storage/db.js";

import { syncNotices } from "./notices/sync.js";

export type NoticesSchedulerStatus = {
  running: boolean;
  lastRunAt: string | null;
  lastResult: unknown | null;
  lastError: string | null;
};

export function startNoticesScheduler(
  db: DesktopDb,
  options?: { intervalMs?: number; sync?: (db: DesktopDb) => Promise<unknown> }
) {
  const intervalMs = options?.intervalMs ?? 30 * 60 * 1000;
  const sync = options?.sync ?? ((db: DesktopDb) => syncNotices(db));

  const status: NoticesSchedulerStatus = {
    running: false,
    lastRunAt: null,
    lastResult: null,
    lastError: null
  };

  let timer: NodeJS.Timeout | null = null;
  let inFlight: Promise<void> | null = null;

  function run(reason: "startup" | "interval" | "manual") {
    if (inFlight) return inFlight;

    status.running = true;
    status.lastError = null;

    inFlight = (async () => {
      try {
        const result = await sync(db);
        status.lastRunAt = new Date().toISOString();
        status.lastResult = { reason, ...(result && typeof result === "object" ? result : { result }) };
        status.lastError = null;
        console.log("[notices] sync ok", status.lastResult);
      } catch (e: unknown) {
        status.lastRunAt = new Date().toISOString();
        status.lastResult = { reason };
        status.lastError = e instanceof Error ? e.message : String(e);
        console.error("[notices] sync failed", { reason, err: e });
      } finally {
        status.running = false;
        inFlight = null;
      }
    })();

    return inFlight;
  }

  void run("startup");
  timer = setInterval(() => void run("interval"), intervalMs);

  return {
    syncNow: async () => {
      await run("manual");
    },
    getStatus: () => ({ ...status }),
    stop: () => {
      if (timer) clearInterval(timer);
      timer = null;
    }
  };
}
