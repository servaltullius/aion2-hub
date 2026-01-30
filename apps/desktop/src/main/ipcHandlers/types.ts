import type { DesktopDb } from "../storage/db.js";
import type { startNoticesScheduler } from "../scheduler.js";

export type IpcDeps = {
  getDb: () => DesktopDb | null;
  getScheduler: () => ReturnType<typeof startNoticesScheduler> | null;
};

