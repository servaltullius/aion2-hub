import { isObject } from "../../../lib/guards.js";

export type PlannerTemplateType = "DAILY" | "WEEKLY" | "CHARGE";

export type PlannerTemplate = {
  id: string;
  title: string;
  type: PlannerTemplateType;
  estimateMinutes: number;
  rechargeHours: number | null;
  maxStacks: number | null;
};

export type PlannerSettings = {
  dailyResetHhmm: string;
  weeklyResetDay: number;
  updatedAt?: string;
};

export function asTemplates(value: unknown): PlannerTemplate[] | null {
  if (!Array.isArray(value)) return null;
  const out: PlannerTemplate[] = [];
  for (const v of value) {
    if (!isObject(v)) return null;
    if (typeof v.id !== "string") return null;
    if (typeof v.title !== "string") return null;
    if (v.type !== "DAILY" && v.type !== "WEEKLY" && v.type !== "CHARGE") return null;
    const estimateMinutes = typeof v.estimateMinutes === "number" ? v.estimateMinutes : 0;
    const rechargeHours = v.rechargeHours === null || typeof v.rechargeHours === "number" ? v.rechargeHours : null;
    const maxStacks = v.maxStacks === null || typeof v.maxStacks === "number" ? v.maxStacks : null;
    out.push({
      id: v.id,
      title: v.title,
      type: v.type,
      estimateMinutes,
      rechargeHours,
      maxStacks
    });
  }
  return out;
}

export function asSettings(value: unknown): PlannerSettings | null {
  if (!isObject(value)) return null;
  if (typeof value.dailyResetHhmm !== "string") return null;
  if (typeof value.weeklyResetDay !== "number") return null;
  const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : undefined;
  if (!updatedAt) return { dailyResetHhmm: value.dailyResetHhmm, weeklyResetDay: value.weeklyResetDay };
  return { dailyResetHhmm: value.dailyResetHhmm, weeklyResetDay: value.weeklyResetDay, updatedAt };
}

export type PlannerSettingsBundle = {
  default: PlannerSettings;
  server: { server: string; settings: PlannerSettings } | null;
  effective: PlannerSettings;
  effectiveScope: "default" | "server";
};

export function asSettingsBundle(value: unknown): PlannerSettingsBundle | null {
  if (!isObject(value)) return null;
  const def = asSettings(value.default);
  const effective = asSettings(value.effective);
  if (!def || !effective) return null;

  let server: PlannerSettingsBundle["server"] = null;
  if (value.server !== null) {
    if (!isObject(value.server)) return null;
    if (typeof value.server.server !== "string") return null;
    const settings = asSettings(value.server.settings);
    if (!settings) return null;
    server = { server: value.server.server, settings };
  }

  const scope = value.effectiveScope === "server" ? "server" : "default";
  return { default: def, server, effective, effectiveScope: scope };
}

export type ApplyPresetResult = { created: number; skipped: number };

export function asApplyPresetResult(value: unknown): ApplyPresetResult | null {
  if (!isObject(value)) return null;
  if (typeof value.created !== "number") return null;
  if (typeof value.skipped !== "number") return null;
  return { created: value.created, skipped: value.skipped };
}

export function asServersFromCharacters(value: unknown) {
  if (!Array.isArray(value)) return [];
  const set = new Set<string>();
  for (const v of value) {
    if (!isObject(v)) continue;
    const server = typeof v.server === "string" ? v.server.trim() : "";
    if (server) set.add(server);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ko"));
}

