import { isObject } from "../../../lib/guards.js";

export type PlannerTemplateType = "DAILY" | "WEEKLY" | "CHARGE";

export type ChecklistItem = {
  templateId: string;
  title: string;
  type: Exclude<PlannerTemplateType, "CHARGE">;
  estimateMinutes: number;
  completed: boolean;
};

export type ChargeItem = {
  templateId: string;
  title: string;
  type: "CHARGE";
  rechargeHours: number;
  maxStacks: number;
  usedCountInWindow: number;
  available: number;
  nextRechargeAt: string | null;
};

export type PlannerCharacter = {
  id: string;
  name: string;
  server: string | null;
  class: string | null;
};

export type PlannerOverview = {
  now: string;
  periodKeys: { daily: string; weekly: string };
  settings: { dailyResetHhmm: string; weeklyResetDay: number };
  character: PlannerCharacter;
  daily: ChecklistItem[];
  weekly: ChecklistItem[];
  charges: ChargeItem[];
};

export type PlannerDurationStat = {
  templateId: string;
  count: number;
  totalSeconds: number;
  avgSeconds: number;
};

export function asDurationStats(value: unknown): PlannerDurationStat[] | null {
  if (!Array.isArray(value)) return null;
  const out: PlannerDurationStat[] = [];
  for (const v of value) {
    if (!isObject(v)) return null;
    if (typeof v.templateId !== "string") return null;
    if (typeof v.count !== "number") return null;
    if (typeof v.totalSeconds !== "number") return null;
    if (typeof v.avgSeconds !== "number") return null;
    out.push({
      templateId: v.templateId,
      count: v.count,
      totalSeconds: v.totalSeconds,
      avgSeconds: v.avgSeconds
    });
  }
  return out;
}

export function asOverview(value: unknown): PlannerOverview | null {
  if (!isObject(value)) return null;
  if (typeof value.now !== "string") return null;
  if (!isObject(value.periodKeys)) return null;
  if (typeof value.periodKeys.daily !== "string") return null;
  if (typeof value.periodKeys.weekly !== "string") return null;
  if (!isObject(value.settings)) return null;
  if (typeof value.settings.dailyResetHhmm !== "string") return null;
  if (typeof value.settings.weeklyResetDay !== "number") return null;
  if (!isObject(value.character)) return null;
  if (typeof value.character.id !== "string" || typeof value.character.name !== "string") return null;
  if (!Array.isArray(value.daily) || !Array.isArray(value.weekly) || !Array.isArray(value.charges)) return null;

  const parseChecklist = (raw: unknown, type: "DAILY" | "WEEKLY"): ChecklistItem | null => {
    if (!isObject(raw)) return null;
    if (typeof raw.templateId !== "string") return null;
    if (typeof raw.title !== "string") return null;
    if (raw.type !== type) return null;
    if (typeof raw.estimateMinutes !== "number") return null;
    if (typeof raw.completed !== "boolean") return null;
    return {
      templateId: raw.templateId,
      title: raw.title,
      type,
      estimateMinutes: raw.estimateMinutes,
      completed: raw.completed
    };
  };

  const parseCharge = (raw: unknown): ChargeItem | null => {
    if (!isObject(raw)) return null;
    if (typeof raw.templateId !== "string") return null;
    if (typeof raw.title !== "string") return null;
    if (raw.type !== "CHARGE") return null;
    if (typeof raw.rechargeHours !== "number") return null;
    if (typeof raw.maxStacks !== "number") return null;
    if (typeof raw.usedCountInWindow !== "number") return null;
    if (typeof raw.available !== "number") return null;
    if (raw.nextRechargeAt !== null && typeof raw.nextRechargeAt !== "string") return null;
    return {
      templateId: raw.templateId,
      title: raw.title,
      type: "CHARGE",
      rechargeHours: raw.rechargeHours,
      maxStacks: raw.maxStacks,
      usedCountInWindow: raw.usedCountInWindow,
      available: raw.available,
      nextRechargeAt: raw.nextRechargeAt
    };
  };

  const daily: ChecklistItem[] = [];
  for (const d of value.daily) {
    const parsed = parseChecklist(d, "DAILY");
    if (!parsed) return null;
    daily.push(parsed);
  }
  const weekly: ChecklistItem[] = [];
  for (const w of value.weekly) {
    const parsed = parseChecklist(w, "WEEKLY");
    if (!parsed) return null;
    weekly.push(parsed);
  }
  const charges: ChargeItem[] = [];
  for (const c of value.charges) {
    const parsed = parseCharge(c);
    if (!parsed) return null;
    charges.push(parsed);
  }

  return {
    now: value.now,
    periodKeys: { daily: value.periodKeys.daily, weekly: value.periodKeys.weekly },
    settings: { dailyResetHhmm: value.settings.dailyResetHhmm, weeklyResetDay: value.settings.weeklyResetDay },
    character: {
      id: value.character.id,
      name: value.character.name,
      server: value.character.server === null || typeof value.character.server === "string" ? value.character.server : null,
      class: value.character.class === null || typeof value.character.class === "string" ? value.character.class : null
    },
    daily,
    weekly,
    charges
  };
}

export function formatDate(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function estimateForBudget(item: { estimateMinutes: number }) {
  const m = item.estimateMinutes;
  if (!Number.isFinite(m) || m <= 0) return 5;
  return Math.min(240, Math.max(1, Math.round(m)));
}

