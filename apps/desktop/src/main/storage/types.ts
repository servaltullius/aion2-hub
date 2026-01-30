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

export type EconomyItem = {
  id: string;
  name: string;
  category: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EconomyPrice = {
  id: string;
  server: string;
  itemId: string;
  price: number;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type EconomyPriceWatchOp = "<" | "<=" | ">" | ">=";

export type EconomyPriceWatch = {
  id: string;
  server: string;
  itemId: string;
  op: EconomyPriceWatchOp;
  threshold: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EconomyAlertEvent = {
  id: string;
  server: string;
  itemId: string;
  itemName: string;
  op: EconomyPriceWatchOp;
  threshold: number;
  price: number;
  triggeredAt: string;
  readAt: string | null;
};

export type LootRun = {
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
};

export type LootRunDrop = {
  id: string;
  runId: string;
  itemId: string | null;
  itemName: string;
  qty: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LootRunCostKind = "KINAH" | "ITEM";

export type LootRunCost = {
  id: string;
  runId: string;
  kind: LootRunCostKind;
  itemId: string | null;
  itemName: string | null;
  qty: number;
  kinah: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LootRunListItem = LootRun & {
  dropCount: number;
  costCount: number;
};

export type LootWeeklyReport = {
  server: string | null;
  weekStartIso: string;
  weekEndIso: string;
  totals: {
    runs: number;
    seconds: number;
    value: number;
    cost: number;
    net: number;
    valuePerHour: number;
    netPerHour: number;
    missingPriceItems: string[];
  };
  byContent: Array<{
    content: string;
    runs: number;
    seconds: number;
    value: number;
    cost: number;
    net: number;
    valuePerHour: number;
    netPerHour: number;
  }>;
  debug?: unknown;
};

export type UserBackup = {
  schemaVersion: 1 | 2 | 3 | 4;
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
  economy?: {
    items: Array<{
      id: string;
      name: string;
      category: string | null;
      note: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    prices: Array<{
      id: string;
      server: string;
      itemId: string;
      price: number;
      recordedAt: string;
      createdAt: string;
      updatedAt: string;
    }>;
    watches: Array<{
      id: string;
      server: string;
      itemId: string;
      op: EconomyPriceWatchOp;
      threshold: number;
      active: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  loot?: {
    runs: Array<{
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
    }>;
    drops: Array<{
      id: string;
      runId: string;
      itemId: string | null;
      itemName: string;
      qty: number;
      note: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    costs: Array<{
      id: string;
      runId: string;
      kind: LootRunCostKind;
      itemId: string | null;
      itemName: string | null;
      qty: number;
      kinah: number;
      note: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
  };
};
