import { BUILD_SCORE_CATALOG, type BuildScoreUnit } from "../../buildScore/catalog.js";
import type { BuildScoreClassPreset } from "../../buildScore/classPresets.js";
import { isObject } from "../../lib/guards.js";

export type BuildScoreStat = {
  id: string;
  label: string;
  unit: BuildScoreUnit;
  enabled: boolean;
  weight: number;
};

export type BuildScorePresetListItem = {
  id: string;
  name: string;
  description: string | null;
  statCount: number;
  createdAt: string;
  updatedAt: string;
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

export function asBuildScoreState(value: unknown): BuildScoreState | null {
  if (!isObject(value)) return null;
  if (value.version !== 1) return null;
  if (typeof value.updatedAt !== "string") return null;
  if (!Array.isArray(value.stats)) return null;
  if (!isObject(value.setA) || !isObject(value.setB)) return null;

  const parseSet = (raw: Record<string, unknown>): BuildScoreSet | null => {
    const name = typeof raw.name === "string" ? raw.name : "";
    const valuesRaw = raw.values;
    const values: Record<string, number> = {};
    if (isObject(valuesRaw)) {
      for (const [k, v] of Object.entries(valuesRaw)) {
        if (typeof v === "number" && Number.isFinite(v)) values[k] = v;
      }
    }
    return { name, values };
  };

  const setA = parseSet(value.setA);
  const setB = parseSet(value.setB);
  if (!setA || !setB) return null;

  const stats = asBuildScoreStats(value.stats);
  if (!stats) return null;

  return { version: 1, updatedAt: value.updatedAt, stats, setA, setB };
}

export function asBuildScoreStats(value: unknown): BuildScoreStat[] | null {
  if (!Array.isArray(value)) return null;
  const stats: BuildScoreStat[] = [];
  for (const s of value) {
    if (!isObject(s)) return null;
    if (typeof s.id !== "string" || !s.id) return null;
    if (typeof s.label !== "string") return null;
    const unit = s.unit === "percent" ? "percent" : "flat";
    const enabled = Boolean(s.enabled);
    const weight = typeof s.weight === "number" && Number.isFinite(s.weight) ? s.weight : 0;
    stats.push({ id: s.id, label: s.label, unit, enabled, weight });
  }
  return stats;
}

export function asBuildScorePresetListItem(value: unknown): BuildScorePresetListItem | null {
  if (!isObject(value)) return null;
  const id = typeof value.id === "string" ? value.id : "";
  const name = typeof value.name === "string" ? value.name : "";
  const description = value.description === null || typeof value.description === "string" ? (value.description as string | null) : null;
  const statCount = typeof value.statCount === "number" ? value.statCount : 0;
  const createdAt = typeof value.createdAt === "string" ? value.createdAt : "";
  const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : "";
  if (!id || !name || !createdAt || !updatedAt) return null;
  return { id, name, description, statCount, createdAt, updatedAt };
}

export function asBuildScorePresetList(value: unknown): BuildScorePresetListItem[] {
  if (!Array.isArray(value)) return [];
  const out: BuildScorePresetListItem[] = [];
  for (const item of value) {
    const parsed = asBuildScorePresetListItem(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function asBuildScorePreset(value: unknown): BuildScorePreset | null {
  if (!isObject(value)) return null;
  const id = typeof value.id === "string" ? value.id : "";
  const characterId = typeof value.characterId === "string" ? value.characterId : "";
  const name = typeof value.name === "string" ? value.name : "";
  const description = value.description === null || typeof value.description === "string" ? (value.description as string | null) : null;
  const createdAt = typeof value.createdAt === "string" ? value.createdAt : "";
  const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : "";
  const stats = asBuildScoreStats(value.stats);
  if (!id || !characterId || !name || !createdAt || !updatedAt || !stats) return null;
  return { id, characterId, name, description, stats, createdAt, updatedAt };
}

export function numberOrZero(raw: string) {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function computeScore(state: BuildScoreState, which: "A" | "B") {
  const values = which === "A" ? state.setA.values : state.setB.values;
  let sum = 0;
  for (const s of state.stats) {
    if (!s.enabled) continue;
    const v = values[s.id] ?? 0;
    sum += s.weight * v;
  }
  return sum;
}

export function applyClassPreset(state: BuildScoreState, preset: BuildScoreClassPreset): BuildScoreState {
  const catalogById = new Map(BUILD_SCORE_CATALOG.map((it) => [it.id, it] as const));
  const nextStats = new Map(state.stats.map((s) => [s.id, s] as const));

  for (const p of preset.stats) {
    const existing = nextStats.get(p.id);
    const cat = catalogById.get(p.id);
    const label = cat?.label ?? existing?.label ?? p.id;
    const unit = cat?.unit ?? existing?.unit ?? "flat";
    const merged: BuildScoreStat = {
      id: p.id,
      label,
      unit,
      enabled: p.enabled,
      weight: p.weight
    };
    nextStats.set(p.id, merged);
  }

  return { ...state, stats: Array.from(nextStats.values()) };
}

export function applyUserPreset(state: BuildScoreState, preset: BuildScorePreset): BuildScoreState {
  const presetById = new Map(preset.stats.map((s) => [s.id, s] as const));
  const next: BuildScoreStat[] = state.stats.map((s) => {
    const ps = presetById.get(s.id);
    if (ps) {
      presetById.delete(s.id);
      return { ...ps };
    }
    return { ...s, enabled: false };
  });

  for (const ps of presetById.values()) {
    next.push({ ...ps });
  }

  return { ...state, stats: next };
}

