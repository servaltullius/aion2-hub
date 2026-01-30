import { randomUUID } from "node:crypto";

import { PAGINATION } from "@aion2/constants";
import { dailyPeriodKey, weeklyPeriodKey } from "../../planner/period.js";

import { allRows, oneRow, type ParamsObject, type SqlJsDatabase } from "../sql.js";
import { getCharacter } from "./characters.js";

import type {
  PlannerChargeItem,
  PlannerChecklistItem,
  PlannerDurationRow,
  PlannerDurationStat,
  PlannerOverview,
  PlannerPresetTemplateInput,
  PlannerSettings,
  PlannerSettingsBundle,
  PlannerSettingsScope,
  PlannerTemplate,
  PlannerTemplateType
} from "../types.js";

function normalizeServerName(server: string | null) {
  const trimmed = (server ?? "").trim();
  return trimmed ? trimmed : null;
}

function plannerSettingsIdForServer(server: string) {
  return `server:${server}`;
}

function readPlannerSettingsById(db: SqlJsDatabase, id: string): PlannerSettings | null {
  const row = oneRow(db, "SELECT daily_reset_hhmm, weekly_reset_day, updated_at FROM planner_settings WHERE id = $id", { $id: id });
  if (!row) return null;
  return {
    dailyResetHhmm: String(row.daily_reset_hhmm),
    weeklyResetDay: Number(row.weekly_reset_day),
    updatedAt: String(row.updated_at)
  };
}

export function getPlannerSettings(db: SqlJsDatabase): PlannerSettings {
  const row = readPlannerSettingsById(db, "default");
  if (row) return row;

  const now = new Date().toISOString();
  db.run(
    `
      INSERT OR IGNORE INTO planner_settings (id, daily_reset_hhmm, weekly_reset_day, updated_at)
      VALUES ($id, $hhmm, $day, $now)
      `,
    { $id: "default", $hhmm: "09:00", $day: 1, $now: now }
  );
  return { dailyResetHhmm: "09:00", weeklyResetDay: 1, updatedAt: now };
}

export function getPlannerSettingsBundle(db: SqlJsDatabase, server: string | null): PlannerSettingsBundle {
  const base = getPlannerSettings(db);
  const normalizedServer = normalizeServerName(server);
  if (!normalizedServer) {
    return { default: base, server: null, effective: base, effectiveScope: "default" };
  }
  const serverRow = readPlannerSettingsById(db, plannerSettingsIdForServer(normalizedServer));
  if (!serverRow) {
    return { default: base, server: null, effective: base, effectiveScope: "default" };
  }
  return {
    default: base,
    server: { server: normalizedServer, settings: serverRow },
    effective: serverRow,
    effectiveScope: "server"
  };
}

export function getPlannerSettingsEffective(
  db: SqlJsDatabase,
  server: string | null
): { settings: PlannerSettings; scope: PlannerSettingsScope } {
  const bundle = getPlannerSettingsBundle(db, server);
  return { settings: bundle.effective, scope: bundle.effectiveScope };
}

export function setPlannerSettings(db: SqlJsDatabase, input: { dailyResetHhmm: string; weeklyResetDay: number }) {
  setPlannerSettingsDefault(db, input);
}

export function setPlannerSettingsDefault(db: SqlJsDatabase, input: { dailyResetHhmm: string; weeklyResetDay: number }) {
  const now = new Date().toISOString();
  db.run(
    `
      INSERT INTO planner_settings (id, daily_reset_hhmm, weekly_reset_day, updated_at)
      VALUES ($id, $hhmm, $day, $now)
      ON CONFLICT(id) DO UPDATE SET daily_reset_hhmm = $hhmm, weekly_reset_day = $day, updated_at = $now
      `,
    { $id: "default", $hhmm: input.dailyResetHhmm, $day: input.weeklyResetDay, $now: now }
  );
}

export function setPlannerSettingsForServer(
  db: SqlJsDatabase,
  server: string,
  input: { dailyResetHhmm: string; weeklyResetDay: number }
) {
  const normalized = normalizeServerName(server);
  if (!normalized) return;
  const now = new Date().toISOString();
  const id = plannerSettingsIdForServer(normalized);
  db.run(
    `
      INSERT INTO planner_settings (id, daily_reset_hhmm, weekly_reset_day, updated_at)
      VALUES ($id, $hhmm, $day, $now)
      ON CONFLICT(id) DO UPDATE SET daily_reset_hhmm = $hhmm, weekly_reset_day = $day, updated_at = $now
      `,
    { $id: id, $hhmm: input.dailyResetHhmm, $day: input.weeklyResetDay, $now: now }
  );
}

export function clearPlannerSettingsForServer(db: SqlJsDatabase, server: string) {
  const normalized = normalizeServerName(server);
  if (!normalized) return;
  db.run("DELETE FROM planner_settings WHERE id = $id", { $id: plannerSettingsIdForServer(normalized) });
}

export function listPlannerTemplates(db: SqlJsDatabase) {
  const rows = allRows(
    db,
    `
      SELECT id, title, type, estimate_minutes, recharge_hours, max_stacks, created_at, updated_at
      FROM planner_template
      ORDER BY type ASC, title ASC
      `,
    {}
  );
  return rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    type: String(r.type) as PlannerTemplateType,
    estimateMinutes: Number(r.estimate_minutes ?? 0),
    rechargeHours: r.recharge_hours === null || r.recharge_hours === undefined ? null : Number(r.recharge_hours),
    maxStacks: r.max_stacks === null || r.max_stacks === undefined ? null : Number(r.max_stacks),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  })) satisfies PlannerTemplate[];
}

export function createPlannerTemplate(
  db: SqlJsDatabase,
  input: { title: string; type: PlannerTemplateType; estimateMinutes?: number; rechargeHours?: number | null; maxStacks?: number | null }
) {
  const now = new Date().toISOString();
  const id = randomUUID();
  db.run(
    `
      INSERT INTO planner_template (id, title, type, estimate_minutes, recharge_hours, max_stacks, created_at, updated_at)
      VALUES ($id, $title, $type, $estimate, $rechargeHours, $maxStacks, $now, $now)
      `,
    {
      $id: id,
      $title: input.title,
      $type: input.type,
      $estimate: Math.max(0, Math.floor(input.estimateMinutes ?? 0)),
      $rechargeHours: input.type === "CHARGE" ? (input.rechargeHours ?? null) : null,
      $maxStacks: input.type === "CHARGE" ? (input.maxStacks ?? null) : null,
      $now: now
    }
  );

  // Auto-assign to all characters.
  db.run(
    `
      INSERT OR IGNORE INTO planner_assignment (id, character_id, template_id, enabled, created_at, updated_at)
      SELECT $idPrefix || c.id, c.id, $templateId, 1, $now, $now
      FROM app_character c
      `,
    { $idPrefix: `assign:${id}:`, $templateId: id, $now: now }
  );

  return id;
}

export function updatePlannerTemplate(
  db: SqlJsDatabase,
  input: {
    id: string;
    title: string;
    type: PlannerTemplateType;
    estimateMinutes?: number;
    rechargeHours?: number | null;
    maxStacks?: number | null;
  }
) {
  const now = new Date().toISOString();
  db.run(
    `
      UPDATE planner_template
      SET title = $title,
          type = $type,
          estimate_minutes = $estimate,
          recharge_hours = $rechargeHours,
          max_stacks = $maxStacks,
          updated_at = $now
      WHERE id = $id
      `,
    {
      $id: input.id,
      $title: input.title,
      $type: input.type,
      $estimate: Math.max(0, Math.floor(input.estimateMinutes ?? 0)),
      $rechargeHours: input.type === "CHARGE" ? (input.rechargeHours ?? null) : null,
      $maxStacks: input.type === "CHARGE" ? (input.maxStacks ?? null) : null,
      $now: now
    }
  );
}

export function deletePlannerTemplate(db: SqlJsDatabase, templateId: string) {
  db.run("DELETE FROM planner_template WHERE id = $id", { $id: templateId });
}

export function applyPlannerPreset(db: SqlJsDatabase, input: { mode: "merge" | "replace"; templates: PlannerPresetTemplateInput[] }) {
  const mode = input.mode === "replace" ? "replace" : "merge";
  const normalizedTemplates: PlannerPresetTemplateInput[] = [];

  for (const t of input.templates ?? []) {
    if (!t || typeof t !== "object") continue;
    const raw = t as PlannerPresetTemplateInput;
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const type = raw.type;
    if (!title) continue;
    if (type !== "DAILY" && type !== "WEEKLY" && type !== "CHARGE") continue;
    const estimateMinutes = typeof raw.estimateMinutes === "number" ? Math.max(0, Math.floor(raw.estimateMinutes)) : 0;
    const rechargeHours = raw.rechargeHours === null || typeof raw.rechargeHours === "number" ? raw.rechargeHours : null;
    const maxStacks = raw.maxStacks === null || typeof raw.maxStacks === "number" ? raw.maxStacks : null;

    normalizedTemplates.push({
      title,
      type,
      estimateMinutes,
      rechargeHours: type === "CHARGE" ? rechargeHours : null,
      maxStacks: type === "CHARGE" ? maxStacks : null
    });
  }

  const makeKey = (type: PlannerTemplateType, title: string) => `${type}:${title.trim().toLowerCase()}`;

  if (mode === "replace") {
    db.run("DELETE FROM planner_template;");
  }

  const existingRows = allRows(db, "SELECT title, type FROM planner_template", {});
  const existingKeys = new Set<string>();
  for (const r of existingRows) existingKeys.add(makeKey(String(r.type) as PlannerTemplateType, String(r.title)));

  let created = 0;
  let skipped = 0;
  for (const t of normalizedTemplates) {
    const key = makeKey(t.type, t.title);
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }
    createPlannerTemplate(db, {
      title: t.title,
      type: t.type,
      estimateMinutes: t.estimateMinutes ?? 0,
      rechargeHours: t.type === "CHARGE" ? (t.rechargeHours ?? null) : null,
      maxStacks: t.type === "CHARGE" ? (t.maxStacks ?? null) : null
    });
    existingKeys.add(key);
    created += 1;
  }

  return { created, skipped };
}

export function getPlannerOverview(db: SqlJsDatabase, characterId: string, nowIso?: string): PlannerOverview {
  const now = nowIso ? new Date(nowIso) : new Date();
  const nowResolved = Number.isNaN(now.getTime()) ? new Date() : now;
  const nowString = nowResolved.toISOString();

  const character = getCharacter(db, characterId);
  if (!character) throw new Error("character_not_found");

  const settings = getPlannerSettingsEffective(db, character.server).settings;
  const dailyKey = dailyPeriodKey(nowResolved, settings.dailyResetHhmm);
  const weeklyKey = weeklyPeriodKey(nowResolved, settings.dailyResetHhmm, settings.weeklyResetDay);

  const completionRows = allRows(
    db,
    `
      SELECT template_id, period_key
      FROM planner_completion
      WHERE character_id = $c AND period_key IN ($d, $w)
      `,
    { $c: characterId, $d: dailyKey, $w: weeklyKey }
  );

  const doneDaily = new Set<string>();
  const doneWeekly = new Set<string>();
  for (const r of completionRows) {
    const tid = String(r.template_id);
    const pk = String(r.period_key);
    if (pk === dailyKey) doneDaily.add(tid);
    if (pk === weeklyKey) doneWeekly.add(tid);
  }

  const rows = allRows(
    db,
    `
      SELECT t.id AS template_id, t.title, t.type, t.estimate_minutes, t.recharge_hours, t.max_stacks
      FROM planner_assignment a
      JOIN planner_template t ON t.id = a.template_id
      WHERE a.character_id = $c AND a.enabled = 1
      ORDER BY t.type ASC, t.title ASC
      `,
    { $c: characterId }
  );

  const daily: PlannerChecklistItem[] = [];
  const weekly: PlannerChecklistItem[] = [];
  const charges: PlannerChargeItem[] = [];

  for (const r of rows) {
    const templateId = String(r.template_id);
    const title = String(r.title);
    const type = String(r.type) as PlannerTemplateType;
    const estimateMinutes = Number(r.estimate_minutes ?? 0);

    if (type === "DAILY") {
      daily.push({ templateId, title, type, estimateMinutes, completed: doneDaily.has(templateId) });
      continue;
    }
    if (type === "WEEKLY") {
      weekly.push({ templateId, title, type, estimateMinutes, completed: doneWeekly.has(templateId) });
      continue;
    }

    const rechargeHours = Number(r.recharge_hours ?? 0);
    const maxStacks = Number(r.max_stacks ?? 0);
    const windowMs = rechargeHours * 60 * 60 * 1000;
    const cutoff = new Date(nowResolved.getTime() - windowMs).toISOString();
    const useRows = allRows(
      db,
      `
        SELECT used_at
        FROM planner_charge_use
        WHERE character_id = $c AND template_id = $t AND used_at > $cutoff
        ORDER BY used_at ASC
        `,
      { $c: characterId, $t: templateId, $cutoff: cutoff }
    );
    const usedCountInWindow = useRows.length;
    const available = Math.max(0, maxStacks - usedCountInWindow);
    const firstUse = useRows[0];
    const nextRechargeAt =
      available >= maxStacks || useRows.length === 0 || !firstUse
        ? null
        : new Date(new Date(String(firstUse.used_at)).getTime() + windowMs).toISOString();

    charges.push({
      templateId,
      title,
      type: "CHARGE",
      rechargeHours,
      maxStacks,
      usedCountInWindow,
      available,
      nextRechargeAt
    });
  }

  return {
    now: nowString,
    periodKeys: { daily: dailyKey, weekly: weeklyKey },
    settings: { dailyResetHhmm: settings.dailyResetHhmm, weeklyResetDay: settings.weeklyResetDay },
    character,
    daily,
    weekly,
    charges
  };
}

export function setPlannerCompletion(
  db: SqlJsDatabase,
  input: { characterId: string; templateId: string; periodKey: string; completed: boolean; atIso?: string }
) {
  const at = input.atIso ? new Date(input.atIso) : new Date();
  const atResolved = Number.isNaN(at.getTime()) ? new Date() : at;
  const atIso = atResolved.toISOString();

  if (!input.completed) {
    db.run(
      `
        DELETE FROM planner_completion
        WHERE character_id = $c AND template_id = $t AND period_key = $p
        `,
      { $c: input.characterId, $t: input.templateId, $p: input.periodKey }
    );
    return;
  }

  const id = randomUUID();
  db.run(
    `
      INSERT OR IGNORE INTO planner_completion (id, character_id, template_id, period_key, completed_at)
      VALUES ($id, $c, $t, $p, $at)
      `,
    { $id: id, $c: input.characterId, $t: input.templateId, $p: input.periodKey, $at: atIso }
  );
}

export function useCharge(db: SqlJsDatabase, input: { characterId: string; templateId: string; usedAtIso?: string }) {
  const usedAt = input.usedAtIso ? new Date(input.usedAtIso) : new Date();
  const usedAtResolved = Number.isNaN(usedAt.getTime()) ? new Date() : usedAt;
  const id = randomUUID();
  db.run(
    `
      INSERT INTO planner_charge_use (id, character_id, template_id, used_at)
      VALUES ($id, $c, $t, $u)
      `,
    { $id: id, $c: input.characterId, $t: input.templateId, $u: usedAtResolved.toISOString() }
  );
  return id;
}

export function undoCharge(db: SqlJsDatabase, input: { characterId: string; templateId: string }) {
  const row = oneRow(
    db,
    `
      SELECT id
      FROM planner_charge_use
      WHERE character_id = $c AND template_id = $t
      ORDER BY used_at DESC
      LIMIT 1
      `,
    { $c: input.characterId, $t: input.templateId }
  );
  if (!row?.id) return null;
  const id = String(row.id);
  db.run("DELETE FROM planner_charge_use WHERE id = $id", { $id: id });
  return id;
}

export function addPlannerDuration(
  db: SqlJsDatabase,
  input: { characterId: string; templateId: string; startedAt: string; endedAt: string; seconds: number }
) {
  const started = new Date(input.startedAt);
  const ended = new Date(input.endedAt);
  if (Number.isNaN(started.getTime()) || Number.isNaN(ended.getTime())) throw new Error("bad_request");
  const seconds = Math.max(1, Math.floor(input.seconds));

  const id = randomUUID();
  db.run(
    `
      INSERT INTO planner_duration (id, character_id, template_id, started_at, ended_at, seconds)
      VALUES ($id, $c, $t, $s, $e, $sec)
      `,
    { $id: id, $c: input.characterId, $t: input.templateId, $s: started.toISOString(), $e: ended.toISOString(), $sec: seconds }
  );
  return id;
}

export function listPlannerDurations(db: SqlJsDatabase, input: { characterId: string; limit?: number }): PlannerDurationRow[] {
  const limit = Math.max(
    1,
    Math.min(PAGINATION.PLANNER_DURATION_MAX_LIMIT, Math.floor(input.limit ?? PAGINATION.PLANNER_DURATION_DEFAULT_LIMIT))
  );
  const rows = allRows(
    db,
    `
      SELECT id, character_id, template_id, started_at, ended_at, seconds
      FROM planner_duration
      WHERE character_id = $c AND template_id IS NOT NULL
      ORDER BY ended_at DESC
      LIMIT $limit
      `,
    { $c: input.characterId, $limit: limit }
  );
  return rows.map((r) => ({
    id: String(r.id),
    characterId: String(r.character_id),
    templateId: String(r.template_id),
    startedAt: String(r.started_at),
    endedAt: String(r.ended_at),
    seconds: Number(r.seconds ?? 0)
  }));
}

export function deletePlannerDuration(db: SqlJsDatabase, input: { id: string; characterId: string }) {
  db.run("DELETE FROM planner_duration WHERE id = $id AND character_id = $c", { $id: input.id, $c: input.characterId });
}

export function getPlannerDurationStats(db: SqlJsDatabase, input: { characterId: string; sinceIso?: string }): PlannerDurationStat[] {
  const since = typeof input.sinceIso === "string" && input.sinceIso ? input.sinceIso : null;
  const where = since ? "AND ended_at >= $since" : "";
  const params: ParamsObject = { $c: input.characterId };
  if (since) params.$since = since;

  const rows = allRows(
    db,
    `
      SELECT template_id AS templateId,
             COUNT(1) AS count,
             SUM(seconds) AS totalSeconds,
             AVG(seconds) AS avgSeconds
      FROM planner_duration
      WHERE character_id = $c
        AND template_id IS NOT NULL
        ${where}
      GROUP BY template_id
      ORDER BY totalSeconds DESC, avgSeconds DESC
      `,
    params
  );

  return rows.map((r) => ({
    templateId: String(r.templateId),
    count: Number(r.count ?? 0),
    totalSeconds: Number(r.totalSeconds ?? 0),
    avgSeconds: Math.round(Number(r.avgSeconds ?? 0))
  }));
}
