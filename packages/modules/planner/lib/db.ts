import { Dexie, type Dexie as DexieInstance, type Table } from "dexie";

import type {
  PlannerChargeUse,
  PlannerCompletion,
  PlannerDuration,
  PlannerSettings,
  PlannerTemplate
} from "./types.js";

export type PlannerDB = DexieInstance & {
  templates: Table<PlannerTemplate, string>;
  completions: Table<PlannerCompletion, [string, string, string]>;
  durations: Table<PlannerDuration, number>;
  chargeUses: Table<PlannerChargeUse, number>;
  settings: Table<PlannerSettings, string>;
};

export const plannerDb = new Dexie("aion2hub.planner.v1") as PlannerDB;

plannerDb.version(1).stores({
  templates: "id, type, enabled, sort",
  completions:
    "[characterId+templateId+periodKey], [characterId+periodKey], characterId, templateId, periodKey, completedAt",
  durations: "++id, [characterId+templateId], characterId, templateId, startedAt, endedAt",
  chargeUses: "++id, [characterId+templateId], characterId, templateId, usedAt",
  settings: "id"
});

export async function getOrCreatePlannerSettings(): Promise<PlannerSettings> {
  const existing = await plannerDb.settings.get("settings");
  if (existing) return existing;

  const created: PlannerSettings = {
    id: "settings",
    dailyResetHour: 0,
    weeklyResetDay: 1,
    weeklyResetHour: 0
  };
  await plannerDb.settings.put(created);
  return created;
}
