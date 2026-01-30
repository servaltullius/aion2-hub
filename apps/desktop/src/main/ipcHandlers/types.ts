import type { DesktopDb } from "../storage/db.js";
import type { startNoticesScheduler } from "../scheduler.js";

export type IpcDeps = {
  getDb: () => DesktopDb | null;
  getScheduler: () => ReturnType<typeof startNoticesScheduler> | null;
  toggleOverlay: () => Promise<{ enabled: boolean }> | { enabled: boolean };
  showMainWindow: (hash?: string | null) => Promise<void> | void;
};
