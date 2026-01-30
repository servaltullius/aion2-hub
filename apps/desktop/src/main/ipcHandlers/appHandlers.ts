import { ipcMain } from "electron";

import type { IpcDeps } from "./types.js";

export function registerAppHandlers(deps: IpcDeps) {
  ipcMain.handle("app:ping", async () => "pong");

  ipcMain.handle("app:getStatus", async () => deps.getScheduler()?.getStatus() ?? null);

  ipcMain.handle("app:getActiveCharacterId", async () => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    return db.getActiveCharacterId();
  });

  ipcMain.handle("app:setActiveCharacterId", async (_evt, characterId: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    if (characterId !== null && typeof characterId !== "string") throw new Error("bad_request");
    db.setActiveCharacterId(characterId);
    await db.persist();
    return db.getActiveCharacterId();
  });
}

