import { ipcMain } from "electron";

import type { IpcDeps } from "./types.js";
import { asRecord } from "./util.js";

export function registerCharactersHandlers(deps: IpcDeps) {
  ipcMain.handle("characters:list", async () => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    return db.listCharacters();
  });

  ipcMain.handle("characters:create", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const name = typeof obj.name === "string" ? obj.name.trim() : "";
    if (!name) throw new Error("bad_request");
    const server = typeof obj.server === "string" ? obj.server.trim() : null;
    const klass = typeof obj.class === "string" ? obj.class.trim() : null;
    const id = db.createCharacter({ name, server, class: klass });
    if (!db.getActiveCharacterId()) db.setActiveCharacterId(id);
    await db.persist();
    return { id };
  });

  ipcMain.handle("characters:update", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const id = typeof obj.id === "string" ? obj.id : "";
    const name = typeof obj.name === "string" ? obj.name.trim() : "";
    if (!id || !name) throw new Error("bad_request");
    const server = typeof obj.server === "string" ? obj.server.trim() : null;
    const klass = typeof obj.class === "string" ? obj.class.trim() : null;
    db.updateCharacter({ id, name, server, class: klass });
    await db.persist();
    return { ok: true };
  });

  ipcMain.handle("characters:delete", async (_evt, characterId: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    if (typeof characterId !== "string" || !characterId) throw new Error("bad_request");
    const active = db.getActiveCharacterId();
    db.deleteCharacter(characterId);
    if (active === characterId) db.setActiveCharacterId(null);
    await db.persist();
    return { ok: true };
  });
}

