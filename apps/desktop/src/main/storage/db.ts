import { createRequire } from "node:module";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { app } from "electron";
import initSqlJs, { type SqlJsStatic } from "sql.js";

import { SCHEMA_SQL } from "./schema.js";
import { type SqlJsDatabase } from "./sql.js";
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
import { exportUserBackup as exportUserBackupDomain, importUserBackup as importUserBackupDomain } from "./domains/backup.js";
import {
  addEconomyPrice as addEconomyPriceDomain,
  createEconomyWatch as createEconomyWatchDomain,
  deleteEconomyItem as deleteEconomyItemDomain,
  deleteEconomyWatch as deleteEconomyWatchDomain,
  listEconomyAlertEvents as listEconomyAlertEventsDomain,
  listEconomyItems as listEconomyItemsDomain,
  listEconomyPrices as listEconomyPricesDomain,
  listEconomyWatches as listEconomyWatchesDomain,
  markEconomyAlertRead as markEconomyAlertReadDomain,
  setEconomyWatchActive as setEconomyWatchActiveDomain,
  updateEconomyItem as updateEconomyItemDomain
} from "./domains/economy.js";
import {
  createLootRun as createLootRunDomain,
  deleteLootRun as deleteLootRunDomain,
  getLootRun as getLootRunDomain,
  getLootWeeklyReport as getLootWeeklyReportDomain,
  listLootRuns as listLootRunsDomain
} from "./domains/loot.js";

import type {
  BuildScorePreset,
  BuildScorePresetListItem,
  BuildScoreState,
  BuildScoreStat,
  EconomyAlertEvent,
  EconomyItem,
  EconomyPrice,
  EconomyPriceWatch,
  EconomyPriceWatchOp,
  LootRunCostKind,
  LootRunListItem,
  LootWeeklyReport,
  NoticeDiffBlock,
  NoticeSource,
  PlannerDurationRow,
  PlannerDurationStat,
  PlannerOverview,
  PlannerPresetTemplateInput,
  PlannerSettings,
  PlannerSettingsBundle,
  PlannerSettingsScope,
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
  EconomyAlertEvent,
  EconomyItem,
  EconomyPrice,
  EconomyPriceWatch,
  EconomyPriceWatchOp,
  LootRun,
  LootRunCost,
  LootRunCostKind,
  LootRunDrop,
  LootRunListItem,
  LootWeeklyReport,
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
    this.ensureDefaults();
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

  exportUserBackup(): UserBackup {
    return exportUserBackupDomain(this.db);
  }

  importUserBackup(raw: unknown) {
    importUserBackupDomain(this.db, raw);
  }

  // Economy (manual prices + alerts)
  listEconomyItems(input?: { q?: string | null; limit?: number | null }): EconomyItem[] {
    return listEconomyItemsDomain(this.db, input);
  }

  updateEconomyItem(input: { id: string; name: string; category?: string | null; note?: string | null }) {
    updateEconomyItemDomain(this.db, input);
  }

  deleteEconomyItem(itemId: string) {
    deleteEconomyItemDomain(this.db, itemId);
  }

  addEconomyPrice(input: { server: string; itemName: string; price: number; recordedAt?: string | null }) {
    return addEconomyPriceDomain(this.db, input);
  }

  listEconomyPrices(input: { server: string; itemId: string; limit?: number | null }): EconomyPrice[] {
    return listEconomyPricesDomain(this.db, input);
  }

  listEconomyWatches(input: { server: string }) {
    return listEconomyWatchesDomain(this.db, input);
  }

  createEconomyWatch(input: { server: string; itemName: string; op: EconomyPriceWatchOp; threshold: number }): EconomyPriceWatch {
    return createEconomyWatchDomain(this.db, input);
  }

  setEconomyWatchActive(input: { id: string; active: boolean }) {
    setEconomyWatchActiveDomain(this.db, input);
  }

  deleteEconomyWatch(watchId: string) {
    deleteEconomyWatchDomain(this.db, watchId);
  }

  listEconomyAlertEvents(input?: { server?: string | null; unreadOnly?: boolean | null; limit?: number | null }): EconomyAlertEvent[] {
    return listEconomyAlertEventsDomain(this.db, input);
  }

  markEconomyAlertRead(input: { id: string }) {
    markEconomyAlertReadDomain(this.db, input);
  }

  // Loot logbook (manual runs + ROI report)
  listLootRuns(input: { characterId: string; limit?: number | null }): LootRunListItem[] {
    return listLootRunsDomain(this.db, input);
  }

  getLootRun(runId: string) {
    return getLootRunDomain(this.db, runId);
  }

  createLootRun(input: {
    characterId: string;
    content: string;
    role?: string | null;
    powerBracket?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    seconds?: number | null;
    drops?: Array<{ itemName: string; qty: number; note?: string | null }> | null;
    costs?: Array<{ kind: LootRunCostKind; kinah?: number; itemName?: string | null; qty?: number; note?: string | null }> | null;
  }) {
    return createLootRunDomain(this.db, input);
  }

  deleteLootRun(input: { id: string; characterId: string }) {
    deleteLootRunDomain(this.db, input);
  }

  getLootWeeklyReport(input: { characterId: string; server?: string | null; nowIso?: string | null }): LootWeeklyReport {
    return getLootWeeklyReportDomain(this.db, input);
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
