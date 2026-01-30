import { ipcMain } from "electron";

import type { IpcDeps } from "./types.js";
import { asRecord } from "./util.js";

export function registerNoticesHandlers(deps: IpcDeps) {
  ipcMain.handle("notices:list", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");

    const obj = asRecord(input);
    const source = obj.source;
    const q = typeof obj.q === "string" ? obj.q : undefined;
    const page = typeof obj.page === "number" ? obj.page : 1;
    const pageSize = typeof obj.pageSize === "number" ? obj.pageSize : 20;

    const args: { source?: "NOTICE" | "UPDATE"; q?: string; page: number; pageSize: number } = {
      page,
      pageSize
    };
    if (source === "NOTICE" || source === "UPDATE") args.source = source;
    if (q) args.q = q;

    return db.listNotices(args);
  });

  ipcMain.handle("notices:get", async (_evt, noticeId: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    if (typeof noticeId !== "string" || !noticeId) throw new Error("bad_request");
    return db.getNotice(noticeId);
  });

  ipcMain.handle("notices:getLatestDiff", async (_evt, noticeId: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    if (typeof noticeId !== "string" || !noticeId) throw new Error("bad_request");
    return db.getLatestDiff(noticeId);
  });

  ipcMain.handle("notices:syncNow", async () => {
    const scheduler = deps.getScheduler();
    if (!scheduler) throw new Error("scheduler_not_ready");
    await scheduler.syncNow();
    return scheduler.getStatus();
  });
}

