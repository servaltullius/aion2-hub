import { createRequire } from "node:module";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { app } from "electron";
import initSqlJs, { type SqlJsStatic } from "sql.js";

import { builtinCollectibles } from "../collectibles/builtin.js";
import { SCHEMA_SQL } from "./schema.js";
import { allRows, oneRow, type ParamsObject, type SqlJsDatabase } from "./sql.js";
import {
  getLatestDiff as getLatestDiffDomain,
  getLatestSnapshot as getLatestSnapshotDomain,
  getNotice as getNoticeDomain,
  getNoticeItemByExternalId as getNoticeItemByExternalIdDomain,
  listNotices as listNoticesDomain,
  upsertDiff as upsertDiffDomain,
  upsertNoticeItem as upsertNoticeItemDomain,
  upsertSnapshot as upsertSnapshotDomain
} from "./domains/notices.js";
import {
  getActiveCharacterId as getActiveCharacterIdDomain,
  getSetting as getSettingDomain,
  setActiveCharacterId as setActiveCharacterIdDomain,
  setSetting as setSettingDomain
} from "./domains/appSettings.js";
import {
  createCharacter as createCharacterDomain,
  deleteCharacter as deleteCharacterDomain,
  getCharacter as getCharacterDomain,
  listCharacters as listCharactersDomain,
  updateCharacter as updateCharacterDomain
} from "./domains/characters.js";
import {
  cloneBuildScorePreset as cloneBuildScorePresetDomain,
  createBuildScorePreset as createBuildScorePresetDomain,
  createBuildScorePresetFromStats as createBuildScorePresetFromStatsDomain,
  deleteBuildScore as deleteBuildScoreDomain,
  deleteBuildScorePreset as deleteBuildScorePresetDomain,
  getBuildScore as getBuildScoreDomain,
  getBuildScorePreset as getBuildScorePresetDomain,
  importBuildScorePresetsFromJson as importBuildScorePresetsFromJsonDomain,
  listBuildScorePresets as listBuildScorePresetsDomain,
  listBuildScorePresetsFull as listBuildScorePresetsFullDomain,
  setBuildScore as setBuildScoreDomain,
  updateBuildScorePreset as updateBuildScorePresetDomain
} from "./domains/buildScore.js";
import {
  addPlannerDuration as addPlannerDurationDomain,
  applyPlannerPreset as applyPlannerPresetDomain,
  clearPlannerSettingsForServer as clearPlannerSettingsForServerDomain,
  createPlannerTemplate as createPlannerTemplateDomain,
  deletePlannerDuration as deletePlannerDurationDomain,
  deletePlannerTemplate as deletePlannerTemplateDomain,
  getPlannerDurationStats as getPlannerDurationStatsDomain,
  getPlannerOverview as getPlannerOverviewDomain,
  getPlannerSettings as getPlannerSettingsDomain,
  getPlannerSettingsBundle as getPlannerSettingsBundleDomain,
  getPlannerSettingsEffective as getPlannerSettingsEffectiveDomain,
  listPlannerDurations as listPlannerDurationsDomain,
  listPlannerTemplates as listPlannerTemplatesDomain,
  setPlannerCompletion as setPlannerCompletionDomain,
  setPlannerSettings as setPlannerSettingsDomain,
  setPlannerSettingsDefault as setPlannerSettingsDefaultDomain,
  setPlannerSettingsForServer as setPlannerSettingsForServerDomain,
  undoCharge as undoChargeDomain,
  updatePlannerTemplate as updatePlannerTemplateDomain,
  useCharge as useChargeDomain
} from "./domains/planner.js";
import {
  exportCollectibleItems as exportCollectibleItemsDomain,
  exportCollectibleProgress as exportCollectibleProgressDomain,
  importCollectibleItems as importCollectibleItemsDomain,
  importCollectibleProgress as importCollectibleProgressDomain,
  listCollectibleMaps as listCollectibleMapsDomain,
  listCollectibles as listCollectiblesDomain,
  setCollectibleDone as setCollectibleDoneDomain
} from "./domains/collectibles.js";
import { exportUserBackup as exportUserBackupDomain, importUserBackup as importUserBackupDomain } from "./domains/backup.js";

import type {
  AppCharacter,
  BuildScorePreset,
  BuildScorePresetListItem,
  BuildScoreSet,
  BuildScoreState,
  BuildScoreStat,
  BuildScoreUnit,
  CollectibleFaction,
  CollectibleItemRow,
  CollectibleKind,
  CollectibleListItem,
  CollectibleMap,
  CollectibleProgressRow,
  CollectibleScope,
  NoticeDiffBlock,
  NoticeListItem,
  NoticeSource,
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
  PlannerTemplateType,
  UserBackup
} from "./types.js";

export type {
  AppCharacter,
  BuildScorePreset,
  BuildScorePresetListItem,
  BuildScoreSet,
  BuildScoreState,
  BuildScoreStat,
  BuildScoreUnit,
  CollectibleFaction,
  CollectibleItemRow,
  CollectibleKind,
  CollectibleListItem,
  CollectibleMap,
  CollectibleProgressRow,
  CollectibleScope,
  NoticeDiffBlock,
  NoticeListItem,
  NoticeSource,
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
  PlannerTemplateType,
  UserBackup
} from "./types.js";

export class DesktopDb {
  readonly filePath: string;
  readonly db: SqlJsDatabase;
  #persistChain: Promise<void> = Promise.resolve();

  constructor(filePath: string, db: SqlJsDatabase) {
    this.filePath = filePath;
    this.db = db;
  }

  init() {
    this.db.run("PRAGMA foreign_keys = ON;");
    this.db.run(SCHEMA_SQL);
    this.#migrateSchema();
    this.ensureDefaults();
  }

  #migrateSchema() {
    this.#migrateCollectibleItemTable();
    this.#backfillCollectibleItemFactionFromMap();
  }

  #hasColumn(tableName: string, columnName: string) {
    const rows = allRows(this.db, `PRAGMA table_info(${tableName})`, {});
    return rows.some((r) => String(r.name) === columnName);
  }

  #migrateCollectibleItemTable() {
    const hasFaction = this.#hasColumn("collectible_item", "faction");
    const allowsMaterial = this.#collectibleItemAllowsMaterialKind();
    if (hasFaction && allowsMaterial) {
      this.db.run("CREATE INDEX IF NOT EXISTS idx_collectible_item_kind_faction ON collectible_item (kind, faction)");
      return;
    }

    const fkRow = oneRow(this.db, "PRAGMA foreign_keys", {});
    const fkWasOn = Number(fkRow?.foreign_keys ?? 0) === 1;

    // Disabling foreign_keys must happen outside a transaction.
    this.db.run("PRAGMA foreign_keys = OFF;");
    this.db.run("BEGIN;");
    try {
      // Drop old indexes (if any) so we can recreate them after rebuilding the table.
      this.db.run("DROP INDEX IF EXISTS idx_collectible_item_kind_map;");
      this.db.run("DROP INDEX IF EXISTS idx_collectible_item_kind_region;");
      this.db.run("DROP INDEX IF EXISTS idx_collectible_item_kind_faction;");

      this.db.run("ALTER TABLE collectible_item RENAME TO collectible_item_old;");

      this.db.run(
        `
        CREATE TABLE collectible_item (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL CHECK(kind IN ('TRACE','CUBE','MATERIAL')),
          map TEXT NOT NULL,
          faction TEXT,
          region TEXT,
          name TEXT NOT NULL,
          note TEXT,
          x REAL,
          y REAL,
          source TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        `
      );

      const selectFaction = hasFaction ? "faction" : "NULL";
      this.db.run(
        `
        INSERT INTO collectible_item
          (id, kind, map, faction, region, name, note, x, y, source, created_at, updated_at)
        SELECT
          id, kind, map, ${selectFaction} AS faction, region, name, note, x, y, source, created_at, updated_at
        FROM collectible_item_old;
        `
      );

      this.db.run("DROP TABLE collectible_item_old;");

      this.db.run("CREATE INDEX IF NOT EXISTS idx_collectible_item_kind_map ON collectible_item (kind, map);");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_collectible_item_kind_region ON collectible_item (kind, region);");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_collectible_item_kind_faction ON collectible_item (kind, faction);");

      this.db.run("COMMIT;");
    } catch (e) {
      try {
        this.db.run("ROLLBACK;");
      } catch {
        // ignore rollback errors
      }
      throw e;
    } finally {
      if (fkWasOn) this.db.run("PRAGMA foreign_keys = ON;");
    }
  }

  #collectibleItemAllowsMaterialKind() {
    const row = oneRow(
      this.db,
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'collectible_item' LIMIT 1",
      {}
    );
    const sql = row?.sql ? String(row.sql) : "";
    if (!sql) return false;
    return sql.includes("'MATERIAL'") || sql.includes("\"MATERIAL\"");
  }

  #backfillCollectibleItemFactionFromMap() {
    if (!this.#hasColumn("collectible_item", "faction")) return;
    this.db.run("UPDATE collectible_item SET faction = 'ELYOS' WHERE faction IS NULL AND map LIKE 'World_L_%'");
    this.db.run("UPDATE collectible_item SET faction = 'ASMO' WHERE faction IS NULL AND map LIKE 'World_D_%'");
    this.db.run("UPDATE collectible_item SET faction = 'BOTH' WHERE faction IS NULL AND map LIKE 'Abyss_%'");
  }

  async persist() {
    const run = async () => {
      const data = this.db.export();
      const tmp = `${this.filePath}.tmp.${randomUUID()}`;
      await writeFile(tmp, data);
      await rename(tmp, this.filePath);
    };

    this.#persistChain = this.#persistChain.then(run, run);
    await this.#persistChain;
  }

  listNotices(input: { source?: NoticeSource; q?: string; page: number; pageSize: number }) {
    return listNoticesDomain(this.db, input);
  }

  upsertNoticeItem(input: {
    source: NoticeSource;
    externalId: string;
    url: string;
    title: string;
    publishedAt: string | null;
    updatedAt: string | null;
  }) {
    return upsertNoticeItemDomain(this.db, input);
  }

  getNoticeItemByExternalId(input: { source: NoticeSource; externalId: string }) {
    return getNoticeItemByExternalIdDomain(this.db, input);
  }

  getLatestSnapshot(noticeItemId: string) {
    return getLatestSnapshotDomain(this.db, noticeItemId);
  }

  upsertSnapshot(input: { noticeItemId: string; contentHash: string; normalizedText: string }) {
    return upsertSnapshotDomain(this.db, input);
  }

  upsertDiff(input: {
    noticeItemId: string;
    fromSnapshotId: string;
    toSnapshotId: string;
    diffJson: NoticeDiffBlock[];
  }) {
    return upsertDiffDomain(this.db, input);
  }

  getLatestDiff(noticeItemId: string) {
    return getLatestDiffDomain(this.db, noticeItemId);
  }

  getNotice(noticeItemId: string) {
    return getNoticeDomain(this.db, noticeItemId);
  }

  ensureDefaults() {
    const now = new Date().toISOString();
    this.db.run(
      `
      INSERT OR IGNORE INTO planner_settings (id, daily_reset_hhmm, weekly_reset_day, updated_at)
      VALUES ($id, $hhmm, $day, $now)
      `,
      { $id: "default", $hhmm: "09:00", $day: 1, $now: now }
    );

    this.#ensureCollectiblesSeeded(now);
  }

  #ensureCollectiblesSeeded(now: string) {
    const sql = `
      INSERT OR IGNORE INTO collectible_item
        (id, kind, map, faction, region, name, note, x, y, source, created_at, updated_at)
      VALUES
        ($id, $kind, $map, $faction, $region, $name, $note, $x, $y, $source, $now, $now)
    `;

    for (const item of builtinCollectibles) {
      this.db.run(sql, {
        $id: item.id,
        $kind: item.kind,
        $map: item.map,
        $faction: collectibleFactionFromMap(item.map),
        $region: item.region,
        $name: item.name,
        $note: null,
        $x: item.x,
        $y: item.y,
        $source: item.source,
        $now: now
      });
    }
  }

  getSetting(key: string) {
    return getSettingDomain(this.db, key);
  }

  setSetting(key: string, value: string | null) {
    setSettingDomain(this.db, key, value);
  }

  getActiveCharacterId() {
    return getActiveCharacterIdDomain(this.db);
  }

  setActiveCharacterId(characterId: string | null) {
    setActiveCharacterIdDomain(this.db, characterId);
  }

  listCharacters() {
    return listCharactersDomain(this.db);
  }

  getCharacter(characterId: string) {
    return getCharacterDomain(this.db, characterId);
  }

  createCharacter(input: { name: string; server?: string | null; class?: string | null }) {
    return createCharacterDomain(this.db, input);
  }

  updateCharacter(input: { id: string; name: string; server?: string | null; class?: string | null }) {
    updateCharacterDomain(this.db, input);
  }

  deleteCharacter(characterId: string) {
    deleteCharacterDomain(this.db, characterId);
  }

  getBuildScore(characterId: string): BuildScoreState {
    return getBuildScoreDomain(this.db, characterId);
  }

  setBuildScore(characterId: string, raw: unknown) {
    setBuildScoreDomain(this.db, characterId, raw);
  }

  deleteBuildScore(characterId: string) {
    deleteBuildScoreDomain(this.db, characterId);
  }

  listBuildScorePresets(characterId: string): BuildScorePresetListItem[] {
    return listBuildScorePresetsDomain(this.db, characterId);
  }

  listBuildScorePresetsFull(characterId: string): BuildScorePreset[] {
    return listBuildScorePresetsFullDomain(this.db, characterId);
  }

  getBuildScorePreset(presetId: string): BuildScorePreset | null {
    return getBuildScorePresetDomain(this.db, presetId);
  }

  createBuildScorePreset(input: { characterId: string; name: string; description?: string | null; state: unknown }): BuildScorePresetListItem {
    return createBuildScorePresetDomain(this.db, input);
  }

  createBuildScorePresetFromStats(input: {
    characterId: string;
    name: string;
    description?: string | null;
    stats: BuildScoreStat[];
    createdAt?: string;
    updatedAt?: string;
  }): BuildScorePresetListItem {
    return createBuildScorePresetFromStatsDomain(this.db, input);
  }

  importBuildScorePresetsFromJson(input: { characterId: string; payload: unknown }): BuildScorePresetListItem[] {
    return importBuildScorePresetsFromJsonDomain(this.db, input);
  }

  updateBuildScorePreset(presetId: string, input: { name?: string; description?: string | null }): BuildScorePresetListItem {
    return updateBuildScorePresetDomain(this.db, presetId, input);
  }

  cloneBuildScorePreset(presetId: string, newName?: string | null): BuildScorePresetListItem {
    return cloneBuildScorePresetDomain(this.db, presetId, newName);
  }

  deleteBuildScorePreset(presetId: string) {
    deleteBuildScorePresetDomain(this.db, presetId);
  }

  getPlannerSettings(): PlannerSettings {
    return getPlannerSettingsDomain(this.db);
  }

  getPlannerSettingsBundle(server: string | null): PlannerSettingsBundle {
    return getPlannerSettingsBundleDomain(this.db, server);
  }

  getPlannerSettingsEffective(server: string | null): { settings: PlannerSettings; scope: PlannerSettingsScope } {
    return getPlannerSettingsEffectiveDomain(this.db, server);
  }

  setPlannerSettings(input: { dailyResetHhmm: string; weeklyResetDay: number }) {
    setPlannerSettingsDomain(this.db, input);
  }

  setPlannerSettingsDefault(input: { dailyResetHhmm: string; weeklyResetDay: number }) {
    setPlannerSettingsDefaultDomain(this.db, input);
  }

  setPlannerSettingsForServer(server: string, input: { dailyResetHhmm: string; weeklyResetDay: number }) {
    setPlannerSettingsForServerDomain(this.db, server, input);
  }

  clearPlannerSettingsForServer(server: string) {
    clearPlannerSettingsForServerDomain(this.db, server);
  }

  listPlannerTemplates() {
    return listPlannerTemplatesDomain(this.db);
  }

  createPlannerTemplate(input: {
    title: string;
    type: PlannerTemplateType;
    estimateMinutes?: number;
    rechargeHours?: number | null;
    maxStacks?: number | null;
  }) {
    return createPlannerTemplateDomain(this.db, input);
  }

  updatePlannerTemplate(input: {
    id: string;
    title: string;
    type: PlannerTemplateType;
    estimateMinutes?: number;
    rechargeHours?: number | null;
    maxStacks?: number | null;
  }) {
    updatePlannerTemplateDomain(this.db, input);
  }

  deletePlannerTemplate(templateId: string) {
    deletePlannerTemplateDomain(this.db, templateId);
  }

  applyPlannerPreset(input: { mode: "merge" | "replace"; templates: PlannerPresetTemplateInput[] }) {
    return applyPlannerPresetDomain(this.db, input);
  }

  getPlannerOverview(characterId: string, nowIso?: string): PlannerOverview {
    return getPlannerOverviewDomain(this.db, characterId, nowIso);
  }

  setPlannerCompletion(input: {
    characterId: string;
    templateId: string;
    periodKey: string;
    completed: boolean;
    atIso?: string;
  }) {
    setPlannerCompletionDomain(this.db, input);
  }

  useCharge(input: { characterId: string; templateId: string; usedAtIso?: string }) {
    return useChargeDomain(this.db, input);
  }

  undoCharge(input: { characterId: string; templateId: string }) {
    return undoChargeDomain(this.db, input);
  }

  addPlannerDuration(input: { characterId: string; templateId: string; startedAt: string; endedAt: string; seconds: number }) {
    return addPlannerDurationDomain(this.db, input);
  }

  listPlannerDurations(input: { characterId: string; limit?: number }): PlannerDurationRow[] {
    return listPlannerDurationsDomain(this.db, input);
  }

  deletePlannerDuration(input: { id: string; characterId: string }) {
    deletePlannerDurationDomain(this.db, input);
  }

  getPlannerDurationStats(input: { characterId: string; sinceIso?: string }): PlannerDurationStat[] {
    return getPlannerDurationStatsDomain(this.db, input);
  }

  listCollectibles(input: {
    scope: CollectibleScope;
    characterId?: string | null;
    kind?: CollectibleKind;
    faction?: CollectibleFaction;
    q?: string;
    onlyRemaining?: boolean;
  }): CollectibleListItem[] {
    return listCollectiblesDomain(this.db, input);
  }

  listCollectibleMaps(): CollectibleMap[] {
    return listCollectibleMapsDomain(this.db);
  }

  exportCollectibleItems(): CollectibleItemRow[] {
    return exportCollectibleItemsDomain(this.db);
  }

  exportCollectibleProgress(): CollectibleProgressRow[] {
    return exportCollectibleProgressDomain(this.db);
  }

  importCollectibleItems(input: { items: unknown; defaultSource?: string | null; wrapInTransaction?: boolean }) {
    return importCollectibleItemsDomain(this.db, input);
  }

  importCollectibleProgress(input: { progress: unknown; wrapInTransaction?: boolean }) {
    return importCollectibleProgressDomain(this.db, input);
  }

  setCollectibleDone(input: { scope: CollectibleScope; characterId?: string | null; itemId: string; done: boolean }) {
    setCollectibleDoneDomain(this.db, input);
  }

  exportUserBackup(): UserBackup {
    return exportUserBackupDomain(this.db);
  }

  importUserBackup(raw: unknown) {
    importUserBackupDomain(this.db, raw);
  }
}

export async function openDesktopDb(dataDir: string) {
  const filePath = path.join(dataDir, "aion2-hub.sqlite");

  let existing: Uint8Array | undefined;
  try {
    const buf = await readFile(filePath);
    existing = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  } catch {
    existing = undefined;
  }

  const wasmDir = app.isPackaged
    ? path.join(process.resourcesPath, "sql.js")
    : path.dirname(createRequire(import.meta.url).resolve("sql.js/dist/sql-wasm.wasm"));

  const SQL: SqlJsStatic = await initSqlJs({
    locateFile: (file: string) => path.join(wasmDir, file)
  });

  const db = existing ? new SQL.Database(existing) : new SQL.Database();
  const wrapped = new DesktopDb(filePath, db);
  wrapped.init();
  await wrapped.persist();

  return wrapped;
}

function collectibleFactionFromMap(map: string): CollectibleFaction | null {
  const m = map.trim();
  if (!m) return null;
  if (m.startsWith("World_L_")) return "ELYOS";
  if (m.startsWith("World_D_")) return "ASMO";
  if (m.startsWith("Abyss_")) return "BOTH";
  return null;
}
