import { allRows, safeJsonParse, type SqlJsDatabase } from "../sql.js";

import { asBuildScoreStats } from "./buildScore.js";
import { exportCollectibleItems, exportCollectibleProgress, importCollectibleItems, importCollectibleProgress } from "./collectibles.js";
import { getActiveCharacterId, setActiveCharacterId } from "./appSettings.js";
import { listCharacters } from "./characters.js";
import { getPlannerSettings, listPlannerTemplates } from "./planner.js";

import type { BuildScoreStat, UserBackup } from "../types.js";

export function exportUserBackup(db: SqlJsDatabase): UserBackup {
  const exportedAt = new Date().toISOString();
  const activeCharacterId = getActiveCharacterId(db);

  const characters = listCharacters(db).map((c) => ({
    id: c.id,
    name: c.name,
    server: c.server,
    class: c.class,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  }));

  const plannerSettings = getPlannerSettings(db);
  const perServerSettings = allRows(
    db,
    `
      SELECT id, daily_reset_hhmm, weekly_reset_day, updated_at
      FROM planner_settings
      WHERE id LIKE 'server:%'
      ORDER BY id ASC
      `,
    {}
  ).map((r) => ({
    server: String(r.id).replace(/^server:/, ""),
    dailyResetHhmm: String(r.daily_reset_hhmm),
    weeklyResetDay: Number(r.weekly_reset_day),
    updatedAt: String(r.updated_at)
  }));

  const templates = listPlannerTemplates(db).map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    estimateMinutes: t.estimateMinutes,
    rechargeHours: t.rechargeHours,
    maxStacks: t.maxStacks,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
  }));

  const assignments = allRows(
    db,
    `
      SELECT id, character_id, template_id, enabled, target_count, created_at, updated_at
      FROM planner_assignment
      ORDER BY updated_at DESC, created_at DESC
      `,
    {}
  ).map((r) => ({
    id: String(r.id),
    characterId: String(r.character_id),
    templateId: String(r.template_id),
    enabled: Boolean(r.enabled),
    targetCount: r.target_count === null || r.target_count === undefined ? null : Number(r.target_count),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }));

  const completions = allRows(
    db,
    `
      SELECT id, character_id, template_id, period_key, completed_at
      FROM planner_completion
      ORDER BY completed_at DESC
      `,
    {}
  ).map((r) => ({
    id: String(r.id),
    characterId: String(r.character_id),
    templateId: String(r.template_id),
    periodKey: String(r.period_key),
    completedAt: String(r.completed_at)
  }));

  const chargeUses = allRows(
    db,
    `
      SELECT id, character_id, template_id, used_at
      FROM planner_charge_use
      ORDER BY used_at DESC
      `,
    {}
  ).map((r) => ({
    id: String(r.id),
    characterId: String(r.character_id),
    templateId: String(r.template_id),
    usedAt: String(r.used_at)
  }));

  const durations = allRows(
    db,
    `
      SELECT id, character_id, template_id, started_at, ended_at, seconds
      FROM planner_duration
      ORDER BY started_at DESC
      `,
    {}
  ).map((r) => ({
    id: String(r.id),
    characterId: String(r.character_id),
    templateId: r.template_id ? String(r.template_id) : null,
    startedAt: String(r.started_at),
    endedAt: String(r.ended_at),
    seconds: Number(r.seconds ?? 0)
  }));

  const buildScoreRows = allRows(
    db,
    `
      SELECT character_id, data_json, updated_at
      FROM build_score
      ORDER BY updated_at DESC
      `,
    {}
  ).map((r) => ({
    characterId: String(r.character_id),
    updatedAt: String(r.updated_at),
    state: safeJsonParse(String(r.data_json))
  }));

  const buildScorePresetRows = allRows(
    db,
    `
      SELECT id, character_id, name, description, stats_json, created_at, updated_at
      FROM build_score_preset
      ORDER BY updated_at DESC, created_at DESC
      `,
    {}
  ).map((r) => ({
    id: String(r.id),
    characterId: String(r.character_id),
    name: String(r.name),
    description: r.description === null || r.description === undefined ? null : String(r.description),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    stats: safeJsonParse(String(r.stats_json))
  }));

  const buildScore =
    buildScoreRows.length || buildScorePresetRows.length
      ? {
          perCharacter: buildScoreRows,
          ...(buildScorePresetRows.length ? { presets: buildScorePresetRows } : {})
        }
      : undefined;

  return {
    schemaVersion: 3,
    exportedAt,
    activeCharacterId,
    characters,
    planner: {
      settings: {
        default: plannerSettings,
        perServer: perServerSettings
      },
      templates,
      assignments,
      completions,
      chargeUses,
      durations
    },
    ...(buildScore ? { buildScore } : {}),
    collectibles: {
      items: exportCollectibleItems(db),
      progress: exportCollectibleProgress(db)
    }
  };
}

export function importUserBackup(db: SqlJsDatabase, raw: unknown) {
  if (!raw || typeof raw !== "object") throw new Error("bad_backup");
  const obj = raw as Record<string, unknown>;
  const schemaVersion = obj.schemaVersion;
  if (schemaVersion !== 1 && schemaVersion !== 2 && schemaVersion !== 3) throw new Error("unsupported_backup_version");

  const now = new Date().toISOString();

  const charactersRaw = Array.isArray(obj.characters) ? obj.characters : [];
  const plannerRaw = (obj.planner && typeof obj.planner === "object" ? (obj.planner as Record<string, unknown>) : {}) as Record<string, unknown>;

  let dailyResetHhmm = "09:00";
  let weeklyResetDay = 1;
  const perServerSettings: Array<{ server: string; dailyResetHhmm: string; weeklyResetDay: number; updatedAt: string }> = [];

  if (schemaVersion === 1) {
    const settingsRaw = plannerRaw.settings && typeof plannerRaw.settings === "object" ? (plannerRaw.settings as Record<string, unknown>) : {};
    dailyResetHhmm = typeof settingsRaw.dailyResetHhmm === "string" ? settingsRaw.dailyResetHhmm : "09:00";
    weeklyResetDay = typeof settingsRaw.weeklyResetDay === "number" ? settingsRaw.weeklyResetDay : 1;
  } else {
    const settingsContainer = plannerRaw.settings && typeof plannerRaw.settings === "object" ? (plannerRaw.settings as Record<string, unknown>) : {};
    const defaultRaw =
      settingsContainer.default && typeof settingsContainer.default === "object" ? (settingsContainer.default as Record<string, unknown>) : {};
    dailyResetHhmm = typeof defaultRaw.dailyResetHhmm === "string" ? defaultRaw.dailyResetHhmm : "09:00";
    weeklyResetDay = typeof defaultRaw.weeklyResetDay === "number" ? defaultRaw.weeklyResetDay : 1;

    const perServerRaw = Array.isArray(settingsContainer.perServer) ? settingsContainer.perServer : [];
    for (const s of perServerRaw) {
      if (!s || typeof s !== "object") continue;
      const ss = s as Record<string, unknown>;
      const server = typeof ss.server === "string" ? ss.server.trim() : "";
      if (!server) continue;
      const shhmm = typeof ss.dailyResetHhmm === "string" ? ss.dailyResetHhmm : dailyResetHhmm;
      const sday = typeof ss.weeklyResetDay === "number" ? ss.weeklyResetDay : weeklyResetDay;
      const supdated = typeof ss.updatedAt === "string" ? ss.updatedAt : now;
      perServerSettings.push({ server, dailyResetHhmm: shhmm, weeklyResetDay: sday, updatedAt: supdated });
    }
  }

  const templatesRaw = Array.isArray(plannerRaw.templates) ? plannerRaw.templates : [];
  const assignmentsRaw = Array.isArray(plannerRaw.assignments) ? plannerRaw.assignments : [];
  const completionsRaw = Array.isArray(plannerRaw.completions) ? plannerRaw.completions : [];
  const chargeUsesRaw = Array.isArray(plannerRaw.chargeUses) ? plannerRaw.chargeUses : [];
  const durationsRaw = Array.isArray(plannerRaw.durations) ? plannerRaw.durations : [];

  const activeCharacterId = typeof obj.activeCharacterId === "string" ? obj.activeCharacterId : null;

  const buildScoreContainer = obj.buildScore && typeof obj.buildScore === "object" ? (obj.buildScore as Record<string, unknown>) : null;
  const buildScorePerChar = buildScoreContainer && Array.isArray(buildScoreContainer.perCharacter) ? buildScoreContainer.perCharacter : [];
  const buildScores: Array<{ characterId: string; updatedAt: string; state: unknown }> = [];
  for (const b of buildScorePerChar) {
    if (!b || typeof b !== "object") continue;
    const bb = b as Record<string, unknown>;
    if (typeof bb.characterId !== "string") continue;
    const characterId = bb.characterId;
    const updatedAt = typeof bb.updatedAt === "string" ? bb.updatedAt : now;
    buildScores.push({ characterId, updatedAt, state: bb.state });
  }

  const buildScorePresetsRaw = buildScoreContainer && Array.isArray(buildScoreContainer.presets) ? buildScoreContainer.presets : [];
  const buildScorePresets: Array<{
    id: string;
    characterId: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    stats: BuildScoreStat[];
  }> = [];
  for (const p of buildScorePresetsRaw) {
    if (!p || typeof p !== "object") continue;
    const pp = p as Record<string, unknown>;
    if (typeof pp.id !== "string") continue;
    if (typeof pp.characterId !== "string") continue;
    const name = typeof pp.name === "string" ? pp.name.trim() : "";
    if (!name) continue;
    const stats = asBuildScoreStats(pp.stats);
    if (!stats) continue;
    buildScorePresets.push({
      id: pp.id,
      characterId: pp.characterId,
      name,
      description: pp.description === null || typeof pp.description === "string" ? (pp.description as string | null) : null,
      createdAt: typeof pp.createdAt === "string" ? pp.createdAt : now,
      updatedAt: typeof pp.updatedAt === "string" ? pp.updatedAt : now,
      stats
    });
  }

  const characters: UserBackup["characters"] = [];
  for (const c of charactersRaw) {
    if (!c || typeof c !== "object") continue;
    const cc = c as Record<string, unknown>;
    if (typeof cc.id !== "string" || typeof cc.name !== "string") continue;
    characters.push({
      id: cc.id,
      name: cc.name,
      server: cc.server === null || typeof cc.server === "string" ? (cc.server as string | null) : null,
      class: cc.class === null || typeof cc.class === "string" ? (cc.class as string | null) : null,
      createdAt: typeof cc.createdAt === "string" ? cc.createdAt : now,
      updatedAt: typeof cc.updatedAt === "string" ? cc.updatedAt : now
    });
  }
  const characterIds = new Set(characters.map((c) => c.id));

  const templates: UserBackup["planner"]["templates"] = [];
  for (const t of templatesRaw) {
    if (!t || typeof t !== "object") continue;
    const tt = t as Record<string, unknown>;
    if (typeof tt.id !== "string" || typeof tt.title !== "string") continue;
    const type = tt.type;
    if (type !== "DAILY" && type !== "WEEKLY" && type !== "CHARGE") continue;
    templates.push({
      id: tt.id,
      title: tt.title,
      type,
      estimateMinutes: typeof tt.estimateMinutes === "number" ? tt.estimateMinutes : 0,
      rechargeHours: tt.rechargeHours === null || typeof tt.rechargeHours === "number" ? (tt.rechargeHours as number | null) : null,
      maxStacks: tt.maxStacks === null || typeof tt.maxStacks === "number" ? (tt.maxStacks as number | null) : null,
      createdAt: typeof tt.createdAt === "string" ? tt.createdAt : now,
      updatedAt: typeof tt.updatedAt === "string" ? tt.updatedAt : now
    });
  }
  const templateIds = new Set(templates.map((t) => t.id));

  const collectiblesContainer =
    schemaVersion === 3 && obj.collectibles && typeof obj.collectibles === "object" ? (obj.collectibles as Record<string, unknown>) : null;
  const collectiblesItemsRaw = collectiblesContainer ? collectiblesContainer.items : null;
  const collectiblesProgressRaw = collectiblesContainer ? collectiblesContainer.progress : null;

  db.run("BEGIN;");
  try {
    // Replace user data only.
    db.run("DELETE FROM app_setting;");
    db.run("DELETE FROM app_character;");
    db.run("DELETE FROM planner_template;");
    db.run("DELETE FROM planner_settings;");

    if (schemaVersion === 3 && collectiblesContainer) {
      // Account-scoped progress is not removed by deleting characters.
      db.run("DELETE FROM collectible_progress;");
      if (Array.isArray(collectiblesItemsRaw)) {
        importCollectibleItems(db, { items: collectiblesItemsRaw, defaultSource: "backup", wrapInTransaction: false });
      }
    }

    db.run(
      `
        INSERT INTO planner_settings (id, daily_reset_hhmm, weekly_reset_day, updated_at)
        VALUES ($id, $hhmm, $day, $now)
        `,
      { $id: "default", $hhmm: dailyResetHhmm, $day: weeklyResetDay, $now: now }
    );

    for (const s of perServerSettings) {
      db.run(
        `
          INSERT INTO planner_settings (id, daily_reset_hhmm, weekly_reset_day, updated_at)
          VALUES ($id, $hhmm, $day, $now)
          `,
        { $id: `server:${s.server}`, $hhmm: s.dailyResetHhmm, $day: s.weeklyResetDay, $now: s.updatedAt }
      );
    }

    if (activeCharacterId) setActiveCharacterId(db, activeCharacterId);

    for (const c of characters) {
      db.run(
        `
          INSERT INTO app_character (id, name, server, class, created_at, updated_at)
          VALUES ($id, $name, $server, $class, $createdAt, $updatedAt)
          `,
        {
          $id: c.id,
          $name: c.name,
          $server: c.server,
          $class: c.class,
          $createdAt: c.createdAt,
          $updatedAt: c.updatedAt
        }
      );
    }

    if (schemaVersion === 3 && collectiblesContainer && Array.isArray(collectiblesProgressRaw)) {
      importCollectibleProgress(db, { progress: collectiblesProgressRaw, wrapInTransaction: false });
    }

    for (const b of buildScores) {
      if (!characterIds.has(b.characterId)) continue;
      const json = JSON.stringify(b.state ?? null);
      db.run(
        `
          INSERT OR REPLACE INTO build_score (character_id, data_json, updated_at)
          VALUES ($c, $json, $now)
          `,
        { $c: b.characterId, $json: json, $now: b.updatedAt }
      );
    }

    for (const p of buildScorePresets) {
      if (!characterIds.has(p.characterId)) continue;
      const statsJson = JSON.stringify(p.stats);
      db.run(
        `
          INSERT OR REPLACE INTO build_score_preset (id, character_id, name, description, stats_json, created_at, updated_at)
          VALUES ($id, $c, $name, $desc, $stats, $createdAt, $updatedAt)
          `,
        {
          $id: p.id,
          $c: p.characterId,
          $name: p.name,
          $desc: p.description,
          $stats: statsJson,
          $createdAt: p.createdAt,
          $updatedAt: p.updatedAt
        }
      );
    }

    for (const t of templates) {
      db.run(
        `
          INSERT INTO planner_template (id, title, type, estimate_minutes, recharge_hours, max_stacks, created_at, updated_at)
          VALUES ($id, $title, $type, $estimate, $rechargeHours, $maxStacks, $createdAt, $updatedAt)
          `,
        {
          $id: t.id,
          $title: t.title,
          $type: t.type,
          $estimate: Math.max(0, Math.floor(t.estimateMinutes ?? 0)),
          $rechargeHours: t.type === "CHARGE" ? (t.rechargeHours ?? null) : null,
          $maxStacks: t.type === "CHARGE" ? (t.maxStacks ?? null) : null,
          $createdAt: t.createdAt,
          $updatedAt: t.updatedAt
        }
      );
    }

    for (const a of assignmentsRaw) {
      if (!a || typeof a !== "object") continue;
      const aa = a as Record<string, unknown>;
      if (typeof aa.id !== "string") continue;
      const characterId = typeof aa.characterId === "string" ? aa.characterId : null;
      const templateId = typeof aa.templateId === "string" ? aa.templateId : null;
      if (!characterId || !templateId) continue;
      if (!characterIds.has(characterId) || !templateIds.has(templateId)) continue;
      const enabled = Boolean(aa.enabled);
      const targetCount = aa.targetCount === null || typeof aa.targetCount === "number" ? (aa.targetCount as number | null) : null;
      db.run(
        `
          INSERT OR IGNORE INTO planner_assignment (id, character_id, template_id, enabled, target_count, created_at, updated_at)
          VALUES ($id, $c, $t, $enabled, $targetCount, $createdAt, $updatedAt)
          `,
        {
          $id: aa.id,
          $c: characterId,
          $t: templateId,
          $enabled: enabled ? 1 : 0,
          $targetCount: targetCount,
          $createdAt: typeof aa.createdAt === "string" ? aa.createdAt : now,
          $updatedAt: typeof aa.updatedAt === "string" ? aa.updatedAt : now
        }
      );
    }

    for (const c of completionsRaw) {
      if (!c || typeof c !== "object") continue;
      const cc = c as Record<string, unknown>;
      if (typeof cc.id !== "string") continue;
      const characterId = typeof cc.characterId === "string" ? cc.characterId : null;
      const templateId = typeof cc.templateId === "string" ? cc.templateId : null;
      if (!characterId || !templateId) continue;
      if (!characterIds.has(characterId) || !templateIds.has(templateId)) continue;
      if (typeof cc.periodKey !== "string" || typeof cc.completedAt !== "string") continue;
      db.run(
        `
          INSERT OR IGNORE INTO planner_completion (id, character_id, template_id, period_key, completed_at)
          VALUES ($id, $c, $t, $p, $at)
          `,
        { $id: cc.id, $c: characterId, $t: templateId, $p: cc.periodKey, $at: cc.completedAt }
      );
    }

    for (const u of chargeUsesRaw) {
      if (!u || typeof u !== "object") continue;
      const uu = u as Record<string, unknown>;
      if (typeof uu.id !== "string") continue;
      const characterId = typeof uu.characterId === "string" ? uu.characterId : null;
      const templateId = typeof uu.templateId === "string" ? uu.templateId : null;
      if (!characterId || !templateId) continue;
      if (!characterIds.has(characterId) || !templateIds.has(templateId)) continue;
      if (typeof uu.usedAt !== "string") continue;
      db.run(
        `
          INSERT OR IGNORE INTO planner_charge_use (id, character_id, template_id, used_at)
          VALUES ($id, $c, $t, $u)
          `,
        { $id: uu.id, $c: characterId, $t: templateId, $u: uu.usedAt }
      );
    }

    for (const d of durationsRaw) {
      if (!d || typeof d !== "object") continue;
      const dd = d as Record<string, unknown>;
      if (typeof dd.id !== "string") continue;
      const characterId = typeof dd.characterId === "string" ? dd.characterId : null;
      if (!characterId || !characterIds.has(characterId)) continue;
      const templateId = typeof dd.templateId === "string" ? dd.templateId : null;
      if (templateId && !templateIds.has(templateId)) continue;
      if (typeof dd.startedAt !== "string" || typeof dd.endedAt !== "string") continue;
      const seconds = typeof dd.seconds === "number" ? dd.seconds : 0;
      db.run(
        `
          INSERT OR IGNORE INTO planner_duration (id, character_id, template_id, started_at, ended_at, seconds)
          VALUES ($id, $c, $t, $s, $e, $sec)
          `,
        { $id: dd.id, $c: characterId, $t: templateId, $s: dd.startedAt, $e: dd.endedAt, $sec: seconds }
      );
    }

    // Ensure auto-assignments exist (in case assignments missing).
    db.run(
      `
        INSERT OR IGNORE INTO planner_assignment (id, character_id, template_id, enabled, created_at, updated_at)
        SELECT 'assign:' || c.id || ':' || t.id, c.id, t.id, 1, $now, $now
        FROM app_character c
        CROSS JOIN planner_template t
        `,
      { $now: now }
    );

    db.run("COMMIT;");
  } catch (e) {
    try {
      db.run("ROLLBACK;");
    } catch {
      // ignore rollback errors
    }
    throw e;
  }
}
