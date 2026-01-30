import { randomUUID } from "node:crypto";

import { allRows, oneRow, safeJsonParse, type SqlJsDatabase } from "../sql.js";

import type {
  BuildScorePreset,
  BuildScorePresetListItem,
  BuildScoreSet,
  BuildScoreState,
  BuildScoreStat,
  BuildScoreUnit
} from "../types.js";

function defaultBuildScoreState(): BuildScoreState {
  const now = new Date().toISOString();
  const stats: BuildScoreStat[] = [
    { id: "builtin:power", label: "위력", unit: "flat", enabled: true, weight: 1 },
    { id: "builtin:combatSpeed", label: "전투 속도", unit: "percent", enabled: true, weight: 1 },
    { id: "builtin:pveAmp", label: "PvE 피해 증폭", unit: "percent", enabled: true, weight: 1 },
    { id: "builtin:pvpAmp", label: "PvP 피해 증폭", unit: "percent", enabled: false, weight: 1 },
    { id: "builtin:crit", label: "치명타", unit: "flat", enabled: false, weight: 1 },
    { id: "builtin:critDmgAmp", label: "치명타 피해 증폭", unit: "percent", enabled: false, weight: 1 },
    { id: "builtin:double", label: "강타", unit: "percent", enabled: false, weight: 1 },
    { id: "builtin:perfect", label: "완벽", unit: "percent", enabled: false, weight: 1 },
    { id: "builtin:accuracy", label: "명중", unit: "percent", enabled: false, weight: 1 },
    { id: "builtin:evasion", label: "회피", unit: "percent", enabled: false, weight: 1 },
    { id: "builtin:block", label: "막기", unit: "percent", enabled: false, weight: 1 },
    { id: "builtin:ccHit", label: "상태이상 적중", unit: "percent", enabled: false, weight: 1 },
    { id: "builtin:ccResist", label: "상태이상 저항", unit: "percent", enabled: false, weight: 1 },
    { id: "builtin:hp", label: "생명력", unit: "flat", enabled: false, weight: 1 },
    { id: "builtin:defense", label: "방어력", unit: "percent", enabled: false, weight: 1 }
  ];

  return {
    version: 1,
    updatedAt: now,
    stats,
    setA: { name: "세팅 A", values: {} },
    setB: { name: "세팅 B", values: {} }
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function asBuildScoreUnit(value: unknown): BuildScoreUnit {
  return value === "percent" ? "percent" : "flat";
}

export function asBuildScoreStats(value: unknown): BuildScoreStat[] | null {
  if (!Array.isArray(value)) return null;

  const stats: BuildScoreStat[] = [];
  for (const s of value) {
    if (!isObject(s)) return null;
    if (typeof s.id !== "string" || !s.id) return null;
    if (typeof s.label !== "string" || !s.label) return null;
    const unit = asBuildScoreUnit(s.unit);
    const enabled = Boolean(s.enabled);
    const weight = typeof s.weight === "number" && Number.isFinite(s.weight) ? s.weight : 0;
    stats.push({ id: s.id, label: s.label, unit, enabled, weight });
  }

  return stats;
}

function asBuildScoreSet(value: unknown, fallbackName: string): BuildScoreSet | null {
  if (!isObject(value)) return null;
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : fallbackName;
  const valuesRaw = value.values;
  const values: Record<string, number> = {};
  if (isObject(valuesRaw)) {
    for (const [k, v] of Object.entries(valuesRaw)) {
      if (typeof v === "number" && Number.isFinite(v)) values[k] = v;
    }
  }
  return { name, values };
}

function asBuildScoreState(value: unknown): BuildScoreState | null {
  if (!isObject(value)) return null;
  if (value.version !== 1) return null;

  const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString();
  if (!Array.isArray(value.stats)) return null;

  const stats = asBuildScoreStats(value.stats);
  if (!stats) return null;

  const setA = asBuildScoreSet(value.setA, "세팅 A");
  const setB = asBuildScoreSet(value.setB, "세팅 B");
  if (!setA || !setB) return null;

  return { version: 1, updatedAt, stats, setA, setB };
}

export function getBuildScore(db: SqlJsDatabase, characterId: string): BuildScoreState {
  const row = oneRow(db, "SELECT data_json, updated_at FROM build_score WHERE character_id = $c LIMIT 1", { $c: characterId });
  if (!row?.data_json) return defaultBuildScoreState();
  const parsed = safeJsonParse(String(row.data_json));
  const state = asBuildScoreState(parsed);
  if (!state) return defaultBuildScoreState();
  return state;
}

export function setBuildScore(db: SqlJsDatabase, characterId: string, raw: unknown) {
  const parsed = asBuildScoreState(raw);
  if (!parsed) throw new Error("bad_build_score");
  const now = new Date().toISOString();
  const state: BuildScoreState = { ...parsed, version: 1, updatedAt: now };
  const json = JSON.stringify(state);
  db.run(
    `
      INSERT INTO build_score (character_id, data_json, updated_at)
      VALUES ($c, $json, $now)
      ON CONFLICT(character_id) DO UPDATE SET data_json = $json, updated_at = $now
      `,
    { $c: characterId, $json: json, $now: now }
  );
}

export function deleteBuildScore(db: SqlJsDatabase, characterId: string) {
  db.run("DELETE FROM build_score WHERE character_id = $c", { $c: characterId });
}

export function listBuildScorePresets(db: SqlJsDatabase, characterId: string): BuildScorePresetListItem[] {
  const rows = allRows(
    db,
    `
      SELECT id, name, description, stats_json, created_at, updated_at
      FROM build_score_preset
      WHERE character_id = $c
      ORDER BY updated_at DESC, created_at DESC
      `,
    { $c: characterId }
  );

  return rows.map((r) => {
    const statsRaw = safeJsonParse(String(r.stats_json));
    const stats = asBuildScoreStats(statsRaw) ?? [];
    return {
      id: String(r.id),
      name: String(r.name),
      description: r.description === null || r.description === undefined ? null : String(r.description),
      statCount: stats.length,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    };
  });
}

export function listBuildScorePresetsFull(db: SqlJsDatabase, characterId: string): BuildScorePreset[] {
  const rows = allRows(
    db,
    `
      SELECT id, character_id, name, description, stats_json, created_at, updated_at
      FROM build_score_preset
      WHERE character_id = $c
      ORDER BY updated_at DESC, created_at DESC
      `,
    { $c: characterId }
  );
  const out: BuildScorePreset[] = [];
  for (const r of rows) {
    const statsRaw = safeJsonParse(String(r.stats_json));
    const stats = asBuildScoreStats(statsRaw);
    if (!stats) continue;
    out.push({
      id: String(r.id),
      characterId: String(r.character_id),
      name: String(r.name),
      description: r.description === null || r.description === undefined ? null : String(r.description),
      stats,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    });
  }
  return out;
}

export function getBuildScorePreset(db: SqlJsDatabase, presetId: string): BuildScorePreset | null {
  const row = oneRow(
    db,
    `
      SELECT id, character_id, name, description, stats_json, created_at, updated_at
      FROM build_score_preset
      WHERE id = $id
      LIMIT 1
      `,
    { $id: presetId }
  );
  if (!row?.id) return null;
  const statsRaw = safeJsonParse(String(row.stats_json));
  const stats = asBuildScoreStats(statsRaw) ?? [];
  return {
    id: String(row.id),
    characterId: String(row.character_id),
    name: String(row.name),
    description: row.description === null || row.description === undefined ? null : String(row.description),
    stats,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export function createBuildScorePreset(
  db: SqlJsDatabase,
  input: { characterId: string; name: string; description?: string | null; state: unknown }
): BuildScorePresetListItem {
  const parsed = asBuildScoreState(input.state);
  if (!parsed) throw new Error("bad_build_score");
  const name = input.name.trim();
  if (!name) throw new Error("bad_request");
  const description = typeof input.description === "string" ? input.description.trim() : null;

  const id = randomUUID();
  const now = new Date().toISOString();
  const statsJson = JSON.stringify(parsed.stats);

  db.run(
    `
      INSERT INTO build_score_preset (id, character_id, name, description, stats_json, created_at, updated_at)
      VALUES ($id, $c, $name, $desc, $stats, $now, $now)
      `,
    { $id: id, $c: input.characterId, $name: name, $desc: description, $stats: statsJson, $now: now }
  );

  return { id, name, description, statCount: parsed.stats.length, createdAt: now, updatedAt: now };
}

export function createBuildScorePresetFromStats(
  db: SqlJsDatabase,
  input: { characterId: string; name: string; description?: string | null; stats: BuildScoreStat[]; createdAt?: string; updatedAt?: string }
): BuildScorePresetListItem {
  const name = input.name.trim();
  if (!name) throw new Error("bad_request");
  const description = typeof input.description === "string" ? input.description.trim() : null;
  const createdAt = typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString();
  const updatedAt = typeof input.updatedAt === "string" ? input.updatedAt : createdAt;
  const id = randomUUID();
  const statsJson = JSON.stringify(input.stats);

  db.run(
    `
      INSERT INTO build_score_preset (id, character_id, name, description, stats_json, created_at, updated_at)
      VALUES ($id, $c, $name, $desc, $stats, $createdAt, $updatedAt)
      `,
    { $id: id, $c: input.characterId, $name: name, $desc: description, $stats: statsJson, $createdAt: createdAt, $updatedAt: updatedAt }
  );

  return { id, name, description, statCount: input.stats.length, createdAt, updatedAt };
}

export function importBuildScorePresetsFromJson(
  db: SqlJsDatabase,
  input: { characterId: string; payload: unknown }
): BuildScorePresetListItem[] {
  const now = new Date().toISOString();

  const obj = input.payload && typeof input.payload === "object" ? (input.payload as Record<string, unknown>) : null;
  if (!obj) throw new Error("bad_request");

  const maybePresets = obj.presets;
  const maybePreset = obj.preset;

  const items: Array<Record<string, unknown>> = [];
  if (Array.isArray(maybePresets)) {
    for (const it of maybePresets) {
      if (it && typeof it === "object") items.push(it as Record<string, unknown>);
    }
  } else if (maybePreset && typeof maybePreset === "object") {
    items.push(maybePreset as Record<string, unknown>);
  } else if (obj.meta && typeof obj.meta === "object") {
    // Some exports may nest under meta; allow raw exports where preset lives at top-level.
    if (obj.name && obj.stats) items.push(obj as Record<string, unknown>);
  } else if (obj.name && obj.stats) {
    items.push(obj as Record<string, unknown>);
  }

  if (items.length === 0) throw new Error("bad_request");

  const created: BuildScorePresetListItem[] = [];
  for (const it of items) {
    const name = typeof it.name === "string" ? it.name.trim() : "";
    const resolvedName = name || `가져온 프리셋 (${created.length + 1})`;
    const description = it.description === null || typeof it.description === "string" ? (it.description as string | null) : null;

    const stats = asBuildScoreStats(it.stats);
    if (!stats) continue;

    const createdAt = typeof it.createdAt === "string" ? it.createdAt : now;
    const updatedAt = typeof it.updatedAt === "string" ? it.updatedAt : now;
    created.push(
      createBuildScorePresetFromStats(db, {
        characterId: input.characterId,
        name: resolvedName,
        description,
        stats,
        createdAt,
        updatedAt
      })
    );
  }

  return created;
}

export function updateBuildScorePreset(
  db: SqlJsDatabase,
  presetId: string,
  input: { name?: string; description?: string | null }
): BuildScorePresetListItem {
  const existing = getBuildScorePreset(db, presetId);
  if (!existing) throw new Error("not_found");

  const name = input.name === undefined ? existing.name : String(input.name).trim();
  if (!name) throw new Error("bad_request");

  const description = input.description === undefined ? existing.description : typeof input.description === "string" ? input.description.trim() : null;

  const now = new Date().toISOString();
  db.run(
    `
      UPDATE build_score_preset
      SET name = $name, description = $desc, updated_at = $now
      WHERE id = $id
      `,
    { $id: presetId, $name: name, $desc: description, $now: now }
  );

  return {
    id: presetId,
    name,
    description,
    statCount: existing.stats.length,
    createdAt: existing.createdAt,
    updatedAt: now
  };
}

export function cloneBuildScorePreset(db: SqlJsDatabase, presetId: string, newName?: string | null): BuildScorePresetListItem {
  const existing = getBuildScorePreset(db, presetId);
  if (!existing) throw new Error("not_found");

  const nameResolved = typeof newName === "string" && newName.trim() ? newName.trim() : `${existing.name} (복사)`;
  const id = randomUUID();
  const now = new Date().toISOString();
  const statsJson = JSON.stringify(existing.stats);

  db.run(
    `
      INSERT INTO build_score_preset (id, character_id, name, description, stats_json, created_at, updated_at)
      VALUES ($id, $c, $name, $desc, $stats, $now, $now)
      `,
    {
      $id: id,
      $c: existing.characterId,
      $name: nameResolved,
      $desc: existing.description,
      $stats: statsJson,
      $now: now
    }
  );

  return { id, name: nameResolved, description: existing.description, statCount: existing.stats.length, createdAt: now, updatedAt: now };
}

export function deleteBuildScorePreset(db: SqlJsDatabase, presetId: string) {
  db.run("DELETE FROM build_score_preset WHERE id = $id", { $id: presetId });
}
