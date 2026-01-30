import { BrowserWindow, app, dialog, ipcMain, shell } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolvePortableBaseDir } from "../portableDataDir.js";

import type { IpcDeps } from "./types.js";

export function registerBackupHandlers(deps: IpcDeps) {
  ipcMain.handle("backup:exportJson", async () => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");

    const baseDir = app.isPackaged ? resolvePortableBaseDir() : path.join(process.cwd(), "apps/desktop");
    const ts = new Date()
      .toISOString()
      .replaceAll(":", "")
      .replaceAll(".", "")
      .replace("T", "-")
      .replace("Z", "Z");
    const filePath = path.join(baseDir, `AION2-HUB-backup-${ts}.json`);

    const backup = db.exportUserBackup();
    const payload = {
      meta: {
        appVersion: app.getVersion(),
        platform: process.platform,
        exportedAt: backup.exportedAt
      },
      ...backup
    };

    await writeFile(filePath, JSON.stringify(payload, null, 2), { encoding: "utf8" });
    shell.showItemInFolder(filePath);
    return { filePath };
  });

  ipcMain.handle("backup:importJson", async () => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");

    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
    const res = win
      ? await dialog.showOpenDialog(win, {
          title: "Import AION2 HUB Backup (JSON)",
          properties: ["openFile"],
          filters: [{ name: "JSON", extensions: ["json"] }]
        })
      : await dialog.showOpenDialog({
          title: "Import AION2 HUB Backup (JSON)",
          properties: ["openFile"],
          filters: [{ name: "JSON", extensions: ["json"] }]
        });
    if (res.canceled || res.filePaths.length === 0) return { canceled: true };
    const filePath = res.filePaths[0];
    if (!filePath) return { canceled: true };

    const text = await readFile(filePath, { encoding: "utf8" });
    const parsed = JSON.parse(text) as unknown;
    db.importUserBackup(parsed);
    await db.persist();
    return { canceled: false, filePath };
  });
}

