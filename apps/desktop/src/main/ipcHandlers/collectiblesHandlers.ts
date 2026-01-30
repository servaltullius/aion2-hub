import { BrowserWindow, app, dialog, ipcMain, shell } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { syncCollectiblesFromAion2InteractiveMap } from "../collectibles/aion2InteractiveMap.js";
import { resolvePortableBaseDir } from "../portableDataDir.js";

import type { IpcDeps } from "./types.js";
import { asRecord } from "./util.js";

export function registerCollectiblesHandlers(deps: IpcDeps) {
  ipcMain.handle("collectibles:list", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);

    const scope = obj.scope === "CHARACTER" ? "CHARACTER" : "ACCOUNT";
    const characterId = typeof obj.characterId === "string" ? obj.characterId : null;
    const kind =
      obj.kind === "TRACE" || obj.kind === "CUBE" || obj.kind === "MATERIAL" ? (obj.kind as "TRACE" | "CUBE" | "MATERIAL") : null;
    const faction = obj.faction === "ELYOS" || obj.faction === "ASMO" || obj.faction === "BOTH" ? obj.faction : null;
    const q = typeof obj.q === "string" ? obj.q : null;
    const onlyRemaining = Boolean(obj.onlyRemaining);

    const query: Parameters<typeof db.listCollectibles>[0] = { scope, characterId };
    if (kind) query.kind = kind;
    if (faction) query.faction = faction;
    if (q) query.q = q;
    if (onlyRemaining) query.onlyRemaining = true;

    return db.listCollectibles(query);
  });

  ipcMain.handle("collectibles:listMaps", async () => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    return db.listCollectibleMaps();
  });

  ipcMain.handle("collectibles:exportItemsJson", async () => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");

    const baseDir = app.isPackaged ? resolvePortableBaseDir() : path.join(process.cwd(), "apps/desktop");
    const ts = new Date()
      .toISOString()
      .replaceAll(":", "")
      .replaceAll(".", "")
      .replace("T", "-")
      .replace("Z", "Z");
    const filePath = path.join(baseDir, `AION2-HUB-collectibles-items-${ts}.json`);

    const items = db.exportCollectibleItems();
    const payload = {
      meta: {
        format: "aion2-hub.collectibles.items",
        schemaVersion: 1,
        appVersion: app.getVersion(),
        exportedAt: new Date().toISOString()
      },
      items
    };

    await writeFile(filePath, JSON.stringify(payload, null, 2), { encoding: "utf8" });
    shell.showItemInFolder(filePath);
    return { filePath, count: items.length };
  });

  ipcMain.handle("collectibles:importItemsJson", async () => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");

    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
    const res = win
      ? await dialog.showOpenDialog(win, {
          title: "Import Collectibles Items (JSON)",
          properties: ["openFile"],
          filters: [{ name: "JSON", extensions: ["json"] }]
        })
      : await dialog.showOpenDialog({
          title: "Import Collectibles Items (JSON)",
          properties: ["openFile"],
          filters: [{ name: "JSON", extensions: ["json"] }]
        });
    if (res.canceled || res.filePaths.length === 0) return { canceled: true };
    const filePath = res.filePaths[0];
    if (!filePath) return { canceled: true };

    const text = await readFile(filePath, { encoding: "utf8" });
    const parsed = JSON.parse(text) as unknown;

    let items: unknown = parsed;
    let defaultSource: string | null = null;
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.items)) items = obj.items;
      const meta = obj.meta && typeof obj.meta === "object" ? (obj.meta as Record<string, unknown>) : null;
      defaultSource = meta && typeof meta.source === "string" ? meta.source : null;
    }

    const result = db.importCollectibleItems({ items, defaultSource });
    await db.persist();
    return { canceled: false, filePath, ...result };
  });

  ipcMain.handle("collectibles:syncAion2Im", async () => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");

    const result = await syncCollectiblesFromAion2InteractiveMap(db);
    await db.persist();
    return result;
  });

  ipcMain.handle("collectibles:toggleDone", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);

    const scope = obj.scope === "CHARACTER" ? "CHARACTER" : "ACCOUNT";
    const characterId = typeof obj.characterId === "string" ? obj.characterId : null;
    const itemId = typeof obj.itemId === "string" ? obj.itemId : "";
    const done = Boolean(obj.done);
    if (!itemId) throw new Error("bad_request");

    db.setCollectibleDone({ scope, characterId, itemId, done });
    await db.persist();
    return { ok: true };
  });
}
