import { BrowserWindow, app, dialog, ipcMain, shell } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolvePortableBaseDir } from "../portableDataDir.js";

import type { IpcDeps } from "./types.js";
import { asRecord, resolveCharacterId } from "./util.js";

function sanitizeFilePart(raw: string) {
  const safe = raw
    .trim()
    .replaceAll(/[<>:"/\\|?*\p{Cc}]/gu, "_")
    .replaceAll(/\s+/g, " ")
    .trim();
  if (!safe) return "preset";
  return safe.length > 80 ? safe.slice(0, 80) : safe;
}

export function registerBuildScoreHandlers(deps: IpcDeps) {
  ipcMain.handle("buildScore:get", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) return null;
    return db.getBuildScore(characterId);
  });

  ipcMain.handle("buildScore:set", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) throw new Error("no_character");
    db.setBuildScore(characterId, obj.state);
    await db.persist();
    return { ok: true };
  });

  ipcMain.handle("buildScore:reset", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) throw new Error("no_character");
    db.deleteBuildScore(characterId);
    await db.persist();
    return { ok: true };
  });

  ipcMain.handle("buildScorePreset:list", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) return [];
    return db.listBuildScorePresets(characterId);
  });

  ipcMain.handle("buildScorePreset:get", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const presetId = typeof obj.presetId === "string" ? obj.presetId : "";
    if (!presetId) throw new Error("bad_request");
    return db.getBuildScorePreset(presetId);
  });

  ipcMain.handle("buildScorePreset:create", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) throw new Error("no_character");
    const name = typeof obj.name === "string" ? obj.name : "";
    const description = obj.description === null || typeof obj.description === "string" ? (obj.description as string | null) : null;
    const preset = db.createBuildScorePreset({ characterId, name, description, state: obj.state });
    await db.persist();
    return preset;
  });

  ipcMain.handle("buildScorePreset:update", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const presetId = typeof obj.presetId === "string" ? obj.presetId : "";
    if (!presetId) throw new Error("bad_request");
    const update: { name?: string; description?: string | null } = {};
    if (obj.name !== undefined) update.name = typeof obj.name === "string" ? obj.name : "";
    if (obj.description !== undefined) {
      update.description = obj.description === null || typeof obj.description === "string" ? (obj.description as string | null) : null;
    }
    const preset = db.updateBuildScorePreset(presetId, update);
    await db.persist();
    return preset;
  });

  ipcMain.handle("buildScorePreset:clone", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const presetId = typeof obj.presetId === "string" ? obj.presetId : "";
    if (!presetId) throw new Error("bad_request");
    const name = obj.name === null || typeof obj.name === "string" ? (obj.name as string | null) : null;
    const preset = db.cloneBuildScorePreset(presetId, name);
    await db.persist();
    return preset;
  });

  ipcMain.handle("buildScorePreset:delete", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const presetId = typeof obj.presetId === "string" ? obj.presetId : "";
    if (!presetId) throw new Error("bad_request");
    db.deleteBuildScorePreset(presetId);
    await db.persist();
    return { ok: true };
  });

  ipcMain.handle("buildScorePreset:exportJson", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");

    const obj = asRecord(input);
    const presetId = typeof obj.presetId === "string" ? obj.presetId : "";
    const all = Boolean(obj.all);
    const characterId = resolveCharacterId(db, obj);

    const baseDir = app.isPackaged ? resolvePortableBaseDir() : path.join(process.cwd(), "apps/desktop");
    const ts = new Date()
      .toISOString()
      .replaceAll(":", "")
      .replaceAll(".", "")
      .replace("T", "-")
      .replace("Z", "Z");

    if (presetId) {
      const preset = db.getBuildScorePreset(presetId);
      if (!preset) throw new Error("not_found");

      const payload = {
        meta: {
          kind: "buildScorePreset",
          appVersion: app.getVersion(),
          platform: process.platform,
          exportedAt: new Date().toISOString()
        },
        preset: {
          name: preset.name,
          description: preset.description,
          stats: preset.stats
        }
      };

      const filePath = path.join(baseDir, `AION2-HUB-buildScore-preset-${sanitizeFilePart(preset.name)}-${ts}.json`);
      await writeFile(filePath, JSON.stringify(payload, null, 2), { encoding: "utf8" });
      shell.showItemInFolder(filePath);
      return { filePath };
    }

    if (all) {
      if (!characterId) throw new Error("no_character");
      const presets = db.listBuildScorePresetsFull(characterId).map((p) => ({
        name: p.name,
        description: p.description,
        stats: p.stats
      }));

      const payload = {
        meta: {
          kind: "buildScorePresets",
          appVersion: app.getVersion(),
          platform: process.platform,
          exportedAt: new Date().toISOString()
        },
        presets
      };

      const filePath = path.join(baseDir, `AION2-HUB-buildScore-presets-${ts}.json`);
      await writeFile(filePath, JSON.stringify(payload, null, 2), { encoding: "utf8" });
      shell.showItemInFolder(filePath);
      return { filePath, count: presets.length };
    }

    throw new Error("bad_request");
  });

  ipcMain.handle("buildScorePreset:importJson", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");

    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) throw new Error("no_character");

    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
    const res = win
      ? await dialog.showOpenDialog(win, {
          title: "Import Build Score Preset(s) (JSON)",
          properties: ["openFile"],
          filters: [{ name: "JSON", extensions: ["json"] }]
        })
      : await dialog.showOpenDialog({
          title: "Import Build Score Preset(s) (JSON)",
          properties: ["openFile"],
          filters: [{ name: "JSON", extensions: ["json"] }]
        });
    if (res.canceled || res.filePaths.length === 0) return { canceled: true };
    const filePath = res.filePaths[0];
    if (!filePath) return { canceled: true };

    const text = await readFile(filePath, { encoding: "utf8" });
    const parsed = JSON.parse(text) as unknown;
    const created = db.importBuildScorePresetsFromJson({ characterId, payload: parsed });
    await db.persist();
    return { canceled: false, filePath, imported: created.length, created };
  });
}
