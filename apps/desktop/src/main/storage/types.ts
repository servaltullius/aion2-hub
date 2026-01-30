export type NoticeSource = "NOTICE" | "UPDATE";

export type NoticeListItem = {
  id: string;
  source: NoticeSource;
  externalId: string;
  url: string;
  title: string;
  publishedAt: string | null;
  updatedAt: string;
};

export type NoticeDiffBlock =
  | { type: "same"; lines: string[] }
  | { type: "added"; lines: string[] }
  | { type: "removed"; lines: string[] };

export type AppCharacter = {
  id: string;
  name: string;
  server: string | null;
  class: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlannerTemplateType = "DAILY" | "WEEKLY" | "CHARGE";

export type PlannerTemplate = {
  id: string;
  title: string;
  type: PlannerTemplateType;
  estimateMinutes: number;
  rechargeHours: number | null;
  maxStacks: number | null;
  createdAt: string;
  updatedAt: string;
};

export type PlannerSettings = {
  dailyResetHhmm: string;
  weeklyResetDay: number;
  updatedAt: string;
};

export type PlannerSettingsScope = "default" | "server";

export type PlannerSettingsBundle = {
  default: PlannerSettings;
  server: { server: string; settings: PlannerSettings } | null;
  effective: PlannerSettings;
  effectiveScope: PlannerSettingsScope;
};

export type PlannerPresetTemplateInput = {
  title: string;
  type: PlannerTemplateType;
  estimateMinutes?: number;
  rechargeHours?: number | null;
  maxStacks?: number | null;
};

export type BuildScoreUnit = "flat" | "percent";

export type BuildScoreStat = {
  id: string;
  label: string;
  unit: BuildScoreUnit;
  enabled: boolean;
  weight: number;
};

export type BuildScoreSet = {
  name: string;
  values: Record<string, number>;
};

export type BuildScoreState = {
  version: 1;
  updatedAt: string;
  stats: BuildScoreStat[];
  setA: BuildScoreSet;
  setB: BuildScoreSet;
};

export type BuildScorePreset = {
  id: string;
  characterId: string;
  name: string;
  description: string | null;
  stats: BuildScoreStat[];
  createdAt: string;
  updatedAt: string;
};

export type BuildScorePresetListItem = {
  id: string;
  name: string;
  description: string | null;
  statCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PlannerChecklistItem = {
  templateId: string;
  title: string;
  type: PlannerTemplateType;
  estimateMinutes: number;
  completed: boolean;
};

export type PlannerChargeItem = {
  templateId: string;
  title: string;
  type: "CHARGE";
  rechargeHours: number;
  maxStacks: number;
  usedCountInWindow: number;
  available: number;
  nextRechargeAt: string | null;
};

export type PlannerOverview = {
  now: string;
  periodKeys: { daily: string; weekly: string };
  settings: { dailyResetHhmm: string; weeklyResetDay: number };
  character: AppCharacter;
  daily: PlannerChecklistItem[];
  weekly: PlannerChecklistItem[];
  charges: PlannerChargeItem[];
};

export type PlannerDurationStat = {
  templateId: string;
  count: number;
  totalSeconds: number;
  avgSeconds: number;
};

export type PlannerDurationRow = {
  id: string;
  characterId: string;
  templateId: string;
  startedAt: string;
  endedAt: string;
  seconds: number;
};

export type CollectibleKind = "TRACE" | "CUBE" | "MATERIAL";

export type CollectibleScope = "ACCOUNT" | "CHARACTER";

export type CollectibleFaction = "ELYOS" | "ASMO" | "BOTH";

export type CollectibleListItem = {
  id: string;
  kind: CollectibleKind;
  map: string;
  faction: CollectibleFaction | null;
  region: string | null;
  name: string;
  note: string | null;
  x: number | null;
  y: number | null;
  source: string | null;
  done: boolean;
};

export type CollectibleMap = {
  name: string;
  order: number;
  type: string | null;
  tileWidth: number;
  tileHeight: number;
  tilesCountX: number;
  tilesCountY: number;
  width: number;
  height: number;
  source: string | null;
};

export type CollectibleItemRow = {
  id: string;
  kind: CollectibleKind;
  map: string;
  faction: CollectibleFaction | null;
  region: string | null;
  name: string;
  note: string | null;
  x: number | null;
  y: number | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CollectibleProgressRow = {
  id: string;
  scope: CollectibleScope;
  characterId: string | null;
  itemId: string;
  done: boolean;
  doneAt: string | null;
  updatedAt: string;
};

export type UserBackup = {
  schemaVersion: 1 | 2 | 3;
  exportedAt: string;
  activeCharacterId: string | null;
  characters: Array<{
    id: string;
    name: string;
    server: string | null;
    class: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  planner: {
    settings:
      | { dailyResetHhmm: string; weeklyResetDay: number; updatedAt: string }
      | {
          default: { dailyResetHhmm: string; weeklyResetDay: number; updatedAt: string };
          perServer: Array<{ server: string; dailyResetHhmm: string; weeklyResetDay: number; updatedAt: string }>;
        };
    templates: Array<{
      id: string;
      title: string;
      type: PlannerTemplateType;
      estimateMinutes: number;
      rechargeHours: number | null;
      maxStacks: number | null;
      createdAt: string;
      updatedAt: string;
    }>;
    assignments: Array<{
      id: string;
      characterId: string;
      templateId: string;
      enabled: boolean;
      targetCount: number | null;
      createdAt: string;
      updatedAt: string;
    }>;
    completions: Array<{
      id: string;
      characterId: string;
      templateId: string;
      periodKey: string;
      completedAt: string;
    }>;
    chargeUses: Array<{
      id: string;
      characterId: string;
      templateId: string;
      usedAt: string;
    }>;
    durations: Array<{
      id: string;
      characterId: string;
      templateId: string | null;
      startedAt: string;
      endedAt: string;
      seconds: number;
    }>;
  };
  buildScore?: {
    perCharacter: Array<{
      characterId: string;
      updatedAt: string;
      state: unknown;
    }>;
    presets?: Array<{
      id: string;
      characterId: string;
      name: string;
      description: string | null;
      createdAt: string;
      updatedAt: string;
      stats: unknown;
    }>;
  };
  collectibles?: {
    items: CollectibleItemRow[];
    progress: CollectibleProgressRow[];
  };
};

