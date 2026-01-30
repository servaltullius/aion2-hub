import { ipcMain } from "electron";

import { dailyPeriodKey, weeklyPeriodKey } from "../planner/period.js";
import type { PlannerPresetTemplateInput } from "../storage/types.js";

import type { IpcDeps } from "./types.js";
import { asRecord, resolveCharacterId } from "./util.js";

export function registerPlannerHandlers(deps: IpcDeps) {
  ipcMain.handle("planner:getSettings", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const server = typeof obj.server === "string" ? obj.server.trim() : null;
    return db.getPlannerSettingsBundle(server);
  });

  ipcMain.handle("planner:setSettings", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const dailyResetHhmm = typeof obj.dailyResetHhmm === "string" ? obj.dailyResetHhmm.trim() : "09:00";
    const weeklyResetDay = typeof obj.weeklyResetDay === "number" ? obj.weeklyResetDay : 1;
    const server = typeof obj.server === "string" ? obj.server.trim() : null;
    if (server) {
      db.setPlannerSettingsForServer(server, { dailyResetHhmm, weeklyResetDay });
    } else {
      db.setPlannerSettingsDefault({ dailyResetHhmm, weeklyResetDay });
    }
    await db.persist();
    return db.getPlannerSettingsBundle(server);
  });

  ipcMain.handle("planner:clearServerSettings", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const server = typeof obj.server === "string" ? obj.server.trim() : "";
    if (!server) throw new Error("bad_request");
    db.clearPlannerSettingsForServer(server);
    await db.persist();
    return { ok: true };
  });

  ipcMain.handle("planner:listTemplates", async () => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    return db.listPlannerTemplates();
  });

  ipcMain.handle("planner:createTemplate", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    const type = obj.type;
    if (!title) throw new Error("bad_request");
    if (type !== "DAILY" && type !== "WEEKLY" && type !== "CHARGE") throw new Error("bad_request");
    const estimateMinutes = typeof obj.estimateMinutes === "number" ? obj.estimateMinutes : 0;
    const rechargeHours = typeof obj.rechargeHours === "number" ? obj.rechargeHours : null;
    const maxStacks = typeof obj.maxStacks === "number" ? obj.maxStacks : null;
    const id = db.createPlannerTemplate({ title, type, estimateMinutes, rechargeHours, maxStacks });
    await db.persist();
    return { id };
  });

  ipcMain.handle("planner:updateTemplate", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const id = typeof obj.id === "string" ? obj.id : "";
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    const type = obj.type;
    if (!id || !title) throw new Error("bad_request");
    if (type !== "DAILY" && type !== "WEEKLY" && type !== "CHARGE") throw new Error("bad_request");
    const estimateMinutes = typeof obj.estimateMinutes === "number" ? obj.estimateMinutes : 0;
    const rechargeHours = typeof obj.rechargeHours === "number" ? obj.rechargeHours : null;
    const maxStacks = typeof obj.maxStacks === "number" ? obj.maxStacks : null;
    db.updatePlannerTemplate({ id, title, type, estimateMinutes, rechargeHours, maxStacks });
    await db.persist();
    return { ok: true };
  });

  ipcMain.handle("planner:deleteTemplate", async (_evt, templateId: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    if (typeof templateId !== "string" || !templateId) throw new Error("bad_request");
    db.deletePlannerTemplate(templateId);
    await db.persist();
    return { ok: true };
  });

  ipcMain.handle("planner:getOverview", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) return null;
    const nowIso = typeof obj.nowIso === "string" ? obj.nowIso : undefined;
    try {
      return db.getPlannerOverview(characterId, nowIso);
    } catch {
      db.setActiveCharacterId(null);
      await db.persist();
      return null;
    }
  });

  ipcMain.handle("planner:toggleComplete", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) throw new Error("no_character");
    const templateId = typeof obj.templateId === "string" ? obj.templateId : "";
    const period = obj.period;
    const completed = Boolean(obj.completed);
    if (!templateId) throw new Error("bad_request");
    if (period !== "DAILY" && period !== "WEEKLY") throw new Error("bad_request");

    const nowIso = typeof obj.nowIso === "string" ? obj.nowIso : undefined;
    const now = nowIso ? new Date(nowIso) : new Date();
    const nowResolved = Number.isNaN(now.getTime()) ? new Date() : now;

    const character = db.getCharacter(characterId);
    if (!character) throw new Error("no_character");

    const settings = db.getPlannerSettingsEffective(character.server).settings;
    const periodKey =
      period === "DAILY"
        ? dailyPeriodKey(nowResolved, settings.dailyResetHhmm)
        : weeklyPeriodKey(nowResolved, settings.dailyResetHhmm, settings.weeklyResetDay);
    db.setPlannerCompletion({ characterId, templateId, periodKey, completed, atIso: nowResolved.toISOString() });
    await db.persist();
    return db.getPlannerOverview(characterId);
  });

  ipcMain.handle("planner:applyPreset", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const mode = obj.mode === "replace" ? "replace" : "merge";
    const templates = Array.isArray(obj.templates) ? (obj.templates as PlannerPresetTemplateInput[]) : [];
    const result = db.applyPlannerPreset({ mode, templates });
    await db.persist();
    return result;
  });

  ipcMain.handle("planner:useCharge", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) throw new Error("no_character");
    const templateId = typeof obj.templateId === "string" ? obj.templateId : "";
    if (!templateId) throw new Error("bad_request");
    db.useCharge({ characterId, templateId });
    await db.persist();
    return db.getPlannerOverview(characterId);
  });

  ipcMain.handle("planner:undoCharge", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) throw new Error("no_character");
    const templateId = typeof obj.templateId === "string" ? obj.templateId : "";
    if (!templateId) throw new Error("bad_request");
    db.undoCharge({ characterId, templateId });
    await db.persist();
    return db.getPlannerOverview(characterId);
  });

  ipcMain.handle("planner:addDuration", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) throw new Error("no_character");
    const templateId = typeof obj.templateId === "string" ? obj.templateId : "";
    if (!templateId) throw new Error("bad_request");
    const startedAt = typeof obj.startedAt === "string" ? obj.startedAt : "";
    const endedAt = typeof obj.endedAt === "string" ? obj.endedAt : "";
    const seconds = typeof obj.seconds === "number" ? obj.seconds : 0;
    db.addPlannerDuration({ characterId, templateId, startedAt, endedAt, seconds });
    await db.persist();
    return { ok: true };
  });

  ipcMain.handle("planner:listDurations", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) throw new Error("no_character");
    const limit = typeof obj.limit === "number" ? obj.limit : null;
    const query: { characterId: string; limit?: number } = { characterId };
    if (limit !== null) query.limit = limit;
    return db.listPlannerDurations(query);
  });

  ipcMain.handle("planner:deleteDuration", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) throw new Error("no_character");
    const id = typeof obj.id === "string" ? obj.id : "";
    if (!id) throw new Error("bad_request");
    db.deletePlannerDuration({ id, characterId });
    await db.persist();
    return { ok: true };
  });

  ipcMain.handle("planner:getDurationStats", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) throw new Error("no_character");
    const sinceIso = typeof obj.sinceIso === "string" ? obj.sinceIso : null;
    const query: { characterId: string; sinceIso?: string } = { characterId };
    if (sinceIso) query.sinceIso = sinceIso;
    return db.getPlannerDurationStats(query);
  });
}
