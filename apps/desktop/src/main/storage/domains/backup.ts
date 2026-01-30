import { allRows, safeJsonParse, type SqlJsDatabase } from "../sql.js";

import { asBuildScoreStats } from "./buildScore.js";
import { getActiveCharacterId, setActiveCharacterId } from "./appSettings.js";
import { listCharacters } from "./characters.js";
import { getPlannerSettings, listPlannerTemplates } from "./planner.js";

import type { BuildScoreStat, EconomyPriceWatchOp, LootRunCostKind, UserBackup } from "../types.js";

function asEconomyOp(value: unknown): EconomyPriceWatchOp {
  return value === "<" || value === "<=" || value === ">" || value === ">=" ? value : "<=";
}

function asLootCostKind(value: unknown): LootRunCostKind {
  return value === "KINAH" || value === "ITEM" ? value : "KINAH";
}

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

  const economyItemRows = allRows(
    db,
    `
      SELECT id, name, category, note, created_at, updated_at
      FROM economy_item
      ORDER BY updated_at DESC, created_at DESC
      `,
    {}
  ).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    category: r.category === null || r.category === undefined ? null : String(r.category),
    note: r.note === null || r.note === undefined ? null : String(r.note),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }));

  const economyPriceRows = allRows(
    db,
    `
      SELECT id, server, item_id, price, recorded_at, created_at, updated_at
      FROM economy_price
      ORDER BY recorded_at DESC, created_at DESC
      `,
    {}
  ).map((r) => ({
    id: String(r.id),
    server: String(r.server),
    itemId: String(r.item_id),
    price: Number(r.price ?? 0),
    recordedAt: String(r.recorded_at),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }));

  const economyWatchRows = allRows(
    db,
    `
      SELECT id, server, item_id, op, threshold, active, created_at, updated_at
      FROM economy_price_watch
      ORDER BY updated_at DESC, created_at DESC
      `,
    {}
  ).map((r) => ({
    id: String(r.id),
    server: String(r.server),
    itemId: String(r.item_id),
    op: asEconomyOp(r.op),
    threshold: Number(r.threshold ?? 0),
    active: Boolean(r.active),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }));

  const economy =
    economyItemRows.length || economyPriceRows.length || economyWatchRows.length
      ? { items: economyItemRows, prices: economyPriceRows, watches: economyWatchRows }
      : undefined;

  const lootRunRows = allRows(
    db,
    `
      SELECT id, character_id, server, content, role, power_bracket, started_at, ended_at, seconds, created_at, updated_at
      FROM loot_run
      ORDER BY ended_at DESC, created_at DESC
      `,
    {}
  ).map((r) => ({
    id: String(r.id),
    characterId: String(r.character_id),
    server: r.server === null || r.server === undefined ? null : String(r.server),
    content: String(r.content),
    role: r.role === null || r.role === undefined ? null : String(r.role),
    powerBracket: r.power_bracket === null || r.power_bracket === undefined ? null : String(r.power_bracket),
    startedAt: r.started_at === null || r.started_at === undefined ? null : String(r.started_at),
    endedAt: r.ended_at === null || r.ended_at === undefined ? null : String(r.ended_at),
    seconds: Number(r.seconds ?? 0),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }));

  const lootDropRows = allRows(
    db,
    `
      SELECT id, run_id, item_id, item_name, qty, note, created_at, updated_at
      FROM loot_run_drop
      ORDER BY created_at DESC
      `,
    {}
  ).map((r) => ({
    id: String(r.id),
    runId: String(r.run_id),
    itemId: r.item_id === null || r.item_id === undefined ? null : String(r.item_id),
    itemName: String(r.item_name),
    qty: Number(r.qty ?? 0),
    note: r.note === null || r.note === undefined ? null : String(r.note),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }));

  const lootCostRows = allRows(
    db,
    `
      SELECT id, run_id, kind, item_id, item_name, qty, kinah, note, created_at, updated_at
      FROM loot_run_cost
      ORDER BY created_at DESC
      `,
    {}
  ).map((r) => ({
    id: String(r.id),
    runId: String(r.run_id),
    kind: asLootCostKind(r.kind),
    itemId: r.item_id === null || r.item_id === undefined ? null : String(r.item_id),
    itemName: r.item_name === null || r.item_name === undefined ? null : String(r.item_name),
    qty: Number(r.qty ?? 0),
    kinah: Number(r.kinah ?? 0),
    note: r.note === null || r.note === undefined ? null : String(r.note),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }));

  const loot =
    lootRunRows.length || lootDropRows.length || lootCostRows.length
      ? { runs: lootRunRows, drops: lootDropRows, costs: lootCostRows }
      : undefined;

  return {
    schemaVersion: 4,
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
    ...(economy ? { economy } : {}),
    ...(loot ? { loot } : {})
  };
}

export function importUserBackup(db: SqlJsDatabase, raw: unknown) {
  if (!raw || typeof raw !== "object") throw new Error("bad_backup");
  const obj = raw as Record<string, unknown>;
  const schemaVersion = obj.schemaVersion;
  if (schemaVersion !== 1 && schemaVersion !== 2 && schemaVersion !== 3 && schemaVersion !== 4) throw new Error("unsupported_backup_version");

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

  const economyContainer = obj.economy && typeof obj.economy === "object" ? (obj.economy as Record<string, unknown>) : null;
  const economyItemsRaw = economyContainer && Array.isArray(economyContainer.items) ? economyContainer.items : [];
  const economyPricesRaw = economyContainer && Array.isArray(economyContainer.prices) ? economyContainer.prices : [];
  const economyWatchesRaw = economyContainer && Array.isArray(economyContainer.watches) ? economyContainer.watches : [];

  const economyItems: Array<{ id: string; name: string; category: string | null; note: string | null; createdAt: string; updatedAt: string }> = [];
  for (const it of economyItemsRaw) {
    if (!it || typeof it !== "object") continue;
    const ii = it as Record<string, unknown>;
    if (typeof ii.id !== "string" || typeof ii.name !== "string") continue;
    const name = ii.name.trim();
    if (!name) continue;
    economyItems.push({
      id: ii.id,
      name,
      category: ii.category === null || typeof ii.category === "string" ? (ii.category as string | null) : null,
      note: ii.note === null || typeof ii.note === "string" ? (ii.note as string | null) : null,
      createdAt: typeof ii.createdAt === "string" ? ii.createdAt : now,
      updatedAt: typeof ii.updatedAt === "string" ? ii.updatedAt : now
    });
  }
  const economyItemIds = new Set(economyItems.map((v) => v.id));

  const economyPrices: Array<{
    id: string;
    server: string;
    itemId: string;
    price: number;
    recordedAt: string;
    createdAt: string;
    updatedAt: string;
  }> = [];
  for (const p of economyPricesRaw) {
    if (!p || typeof p !== "object") continue;
    const pp = p as Record<string, unknown>;
    if (typeof pp.id !== "string") continue;
    if (typeof pp.server !== "string") continue;
    if (typeof pp.itemId !== "string") continue;
    if (!economyItemIds.has(pp.itemId)) continue;
    const server = pp.server.trim();
    if (!server) continue;
    const price = typeof pp.price === "number" ? Math.max(0, Math.floor(pp.price)) : 0;
    const recordedAt = typeof pp.recordedAt === "string" ? pp.recordedAt : now;
    economyPrices.push({
      id: pp.id,
      server,
      itemId: pp.itemId,
      price,
      recordedAt,
      createdAt: typeof pp.createdAt === "string" ? pp.createdAt : now,
      updatedAt: typeof pp.updatedAt === "string" ? pp.updatedAt : now
    });
  }

  const economyWatches: Array<{
    id: string;
    server: string;
    itemId: string;
    op: string;
    threshold: number;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  }> = [];
  for (const w of economyWatchesRaw) {
    if (!w || typeof w !== "object") continue;
    const ww = w as Record<string, unknown>;
    if (typeof ww.id !== "string") continue;
    if (typeof ww.server !== "string") continue;
    if (typeof ww.itemId !== "string") continue;
    if (!economyItemIds.has(ww.itemId)) continue;
    const server = ww.server.trim();
    if (!server) continue;
    const op = ww.op === "<" || ww.op === "<=" || ww.op === ">" || ww.op === ">=" ? ww.op : null;
    if (!op) continue;
    const threshold = typeof ww.threshold === "number" ? Math.max(0, Math.floor(ww.threshold)) : 0;
    economyWatches.push({
      id: ww.id,
      server,
      itemId: ww.itemId,
      op,
      threshold,
      active: Boolean(ww.active),
      createdAt: typeof ww.createdAt === "string" ? ww.createdAt : now,
      updatedAt: typeof ww.updatedAt === "string" ? ww.updatedAt : now
    });
  }

  const lootContainer = obj.loot && typeof obj.loot === "object" ? (obj.loot as Record<string, unknown>) : null;
  const lootRunsRaw = lootContainer && Array.isArray(lootContainer.runs) ? lootContainer.runs : [];
  const lootDropsRaw = lootContainer && Array.isArray(lootContainer.drops) ? lootContainer.drops : [];
  const lootCostsRaw = lootContainer && Array.isArray(lootContainer.costs) ? lootContainer.costs : [];

  const lootRuns: Array<{
    id: string;
    characterId: string;
    server: string | null;
    content: string;
    role: string | null;
    powerBracket: string | null;
    startedAt: string | null;
    endedAt: string | null;
    seconds: number;
    createdAt: string;
    updatedAt: string;
  }> = [];
  for (const r of lootRunsRaw) {
    if (!r || typeof r !== "object") continue;
    const rr = r as Record<string, unknown>;
    if (typeof rr.id !== "string") continue;
    if (typeof rr.characterId !== "string") continue;
    if (!characterIds.has(rr.characterId)) continue;
    const content = typeof rr.content === "string" ? rr.content.trim() : "";
    if (!content) continue;
    lootRuns.push({
      id: rr.id,
      characterId: rr.characterId,
      server: rr.server === null || typeof rr.server === "string" ? (rr.server as string | null) : null,
      content,
      role: rr.role === null || typeof rr.role === "string" ? (rr.role as string | null) : null,
      powerBracket: rr.powerBracket === null || typeof rr.powerBracket === "string" ? (rr.powerBracket as string | null) : null,
      startedAt: rr.startedAt === null || typeof rr.startedAt === "string" ? (rr.startedAt as string | null) : null,
      endedAt: rr.endedAt === null || typeof rr.endedAt === "string" ? (rr.endedAt as string | null) : null,
      seconds: typeof rr.seconds === "number" ? Math.max(0, Math.floor(rr.seconds)) : 0,
      createdAt: typeof rr.createdAt === "string" ? rr.createdAt : now,
      updatedAt: typeof rr.updatedAt === "string" ? rr.updatedAt : now
    });
  }
  const lootRunIds = new Set(lootRuns.map((v) => v.id));

  const lootDrops: Array<{
    id: string;
    runId: string;
    itemId: string | null;
    itemName: string;
    qty: number;
    note: string | null;
    createdAt: string;
    updatedAt: string;
  }> = [];
  for (const d of lootDropsRaw) {
    if (!d || typeof d !== "object") continue;
    const dd = d as Record<string, unknown>;
    if (typeof dd.id !== "string") continue;
    if (typeof dd.runId !== "string" || !lootRunIds.has(dd.runId)) continue;
    const itemName = typeof dd.itemName === "string" ? dd.itemName.trim() : "";
    if (!itemName) continue;
    const qty = typeof dd.qty === "number" ? Math.max(0, Math.floor(dd.qty)) : 0;
    if (qty <= 0) continue;
    const itemId = typeof dd.itemId === "string" && economyItemIds.has(dd.itemId) ? dd.itemId : null;
    lootDrops.push({
      id: dd.id,
      runId: dd.runId,
      itemId,
      itemName,
      qty,
      note: dd.note === null || typeof dd.note === "string" ? (dd.note as string | null) : null,
      createdAt: typeof dd.createdAt === "string" ? dd.createdAt : now,
      updatedAt: typeof dd.updatedAt === "string" ? dd.updatedAt : now
    });
  }

  const lootCosts: Array<{
    id: string;
    runId: string;
    kind: string;
    itemId: string | null;
    itemName: string | null;
    qty: number;
    kinah: number;
    note: string | null;
    createdAt: string;
    updatedAt: string;
  }> = [];
  for (const c of lootCostsRaw) {
    if (!c || typeof c !== "object") continue;
    const cc = c as Record<string, unknown>;
    if (typeof cc.id !== "string") continue;
    if (typeof cc.runId !== "string" || !lootRunIds.has(cc.runId)) continue;
    const kind = cc.kind === "KINAH" || cc.kind === "ITEM" ? cc.kind : null;
    if (!kind) continue;
    const itemId = typeof cc.itemId === "string" && economyItemIds.has(cc.itemId) ? cc.itemId : null;
    lootCosts.push({
      id: cc.id,
      runId: cc.runId,
      kind,
      itemId: kind === "ITEM" ? itemId : null,
      itemName: cc.itemName === null || typeof cc.itemName === "string" ? (cc.itemName as string | null) : null,
      qty: typeof cc.qty === "number" ? Math.max(0, Math.floor(cc.qty)) : 0,
      kinah: typeof cc.kinah === "number" ? Math.max(0, Math.floor(cc.kinah)) : 0,
      note: cc.note === null || typeof cc.note === "string" ? (cc.note as string | null) : null,
      createdAt: typeof cc.createdAt === "string" ? cc.createdAt : now,
      updatedAt: typeof cc.updatedAt === "string" ? cc.updatedAt : now
    });
  }

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

  db.run("BEGIN;");
  try {
    // Replace user data only.
    db.run("DELETE FROM app_setting;");
    db.run("DELETE FROM app_character;");
    db.run("DELETE FROM planner_template;");
    db.run("DELETE FROM planner_settings;");
    db.run("DELETE FROM economy_alert_event;");
    db.run("DELETE FROM economy_price_watch;");
    db.run("DELETE FROM economy_price;");
    db.run("DELETE FROM economy_item;");

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

    for (const it of economyItems) {
      db.run(
        `
          INSERT OR REPLACE INTO economy_item (id, name, category, note, created_at, updated_at)
          VALUES ($id, $name, $category, $note, $createdAt, $updatedAt)
          `,
        {
          $id: it.id,
          $name: it.name,
          $category: it.category,
          $note: it.note,
          $createdAt: it.createdAt,
          $updatedAt: it.updatedAt
        }
      );
    }

    for (const p of economyPrices) {
      db.run(
        `
          INSERT OR REPLACE INTO economy_price (id, server, item_id, price, recorded_at, created_at, updated_at)
          VALUES ($id, $server, $itemId, $price, $recordedAt, $createdAt, $updatedAt)
          `,
        {
          $id: p.id,
          $server: p.server,
          $itemId: p.itemId,
          $price: p.price,
          $recordedAt: p.recordedAt,
          $createdAt: p.createdAt,
          $updatedAt: p.updatedAt
        }
      );
    }

    for (const w of economyWatches) {
      db.run(
        `
          INSERT OR REPLACE INTO economy_price_watch (id, server, item_id, op, threshold, active, created_at, updated_at)
          VALUES ($id, $server, $itemId, $op, $threshold, $active, $createdAt, $updatedAt)
          `,
        {
          $id: w.id,
          $server: w.server,
          $itemId: w.itemId,
          $op: w.op,
          $threshold: w.threshold,
          $active: w.active ? 1 : 0,
          $createdAt: w.createdAt,
          $updatedAt: w.updatedAt
        }
      );
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

    for (const r of lootRuns) {
      db.run(
        `
          INSERT OR REPLACE INTO loot_run
            (id, character_id, server, content, role, power_bracket, started_at, ended_at, seconds, created_at, updated_at)
          VALUES
            ($id, $c, $server, $content, $role, $power, $startedAt, $endedAt, $sec, $createdAt, $updatedAt)
          `,
        {
          $id: r.id,
          $c: r.characterId,
          $server: r.server,
          $content: r.content,
          $role: r.role,
          $power: r.powerBracket,
          $startedAt: r.startedAt,
          $endedAt: r.endedAt,
          $sec: r.seconds,
          $createdAt: r.createdAt,
          $updatedAt: r.updatedAt
        }
      );
    }

    for (const d of lootDrops) {
      db.run(
        `
          INSERT OR REPLACE INTO loot_run_drop (id, run_id, item_id, item_name, qty, note, created_at, updated_at)
          VALUES ($id, $run, $itemId, $name, $qty, $note, $createdAt, $updatedAt)
          `,
        {
          $id: d.id,
          $run: d.runId,
          $itemId: d.itemId,
          $name: d.itemName,
          $qty: d.qty,
          $note: d.note,
          $createdAt: d.createdAt,
          $updatedAt: d.updatedAt
        }
      );
    }

    for (const c of lootCosts) {
      db.run(
        `
          INSERT OR REPLACE INTO loot_run_cost (id, run_id, kind, item_id, item_name, qty, kinah, note, created_at, updated_at)
          VALUES ($id, $run, $kind, $itemId, $name, $qty, $kinah, $note, $createdAt, $updatedAt)
          `,
        {
          $id: c.id,
          $run: c.runId,
          $kind: c.kind,
          $itemId: c.itemId,
          $name: c.itemName,
          $qty: c.qty,
          $kinah: c.kinah,
          $note: c.note,
          $createdAt: c.createdAt,
          $updatedAt: c.updatedAt
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
    } catch (rollbackErr) {
      const original = e instanceof Error ? e : new Error(String(e));
      const rollback = rollbackErr instanceof Error ? rollbackErr : new Error(String(rollbackErr));
      const err = new Error(
        `CRITICAL: backup import failed and rollback failed; DB may be corrupted. original="${original.message}" rollback="${rollback.message}"`
      );
      (err as Error & { cause?: unknown }).cause = original;
      throw err;
    }
    throw e;
  }
}
