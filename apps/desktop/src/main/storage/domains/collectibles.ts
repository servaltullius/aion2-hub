import { createHash, randomUUID } from "node:crypto";

import { findBuiltinCollectibleMap, mapPixelSize } from "../../collectibles/maps.js";

import { allRows, escapeLike, oneRow, type ParamsObject, type SqlJsDatabase } from "../sql.js";
import type {
  CollectibleFaction,
  CollectibleItemRow,
  CollectibleKind,
  CollectibleListItem,
  CollectibleMap,
  CollectibleProgressRow,
  CollectibleScope
} from "../types.js";

function normalizeCollectibleFaction(value: unknown): CollectibleFaction | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const v = value.trim().toUpperCase();
  if (!v) return null;

  if (v === "ELYOS" || v === "E" || v === "LIGHT" || v === "L" || v === "천족") return "ELYOS";
  if (v === "ASMO" || v === "ASMODIANS" || v === "A" || v === "DARK" || v === "D" || v === "마족") return "ASMO";
  if (v === "BOTH" || v === "ALL" || v === "ANY" || v === "공통" || v === "전체") return "BOTH";

  return null;
}

function hashCollectibleId(input: {
  kind: CollectibleKind;
  map: string;
  name: string;
  region: string | null;
  x: number | null;
  y: number | null;
  faction: CollectibleFaction | null;
}) {
  const key = JSON.stringify(input);
  const hex = createHash("sha256").update(key).digest("hex").slice(0, 24);
  return `import:${hex}`;
}

export function listCollectibles(
  db: SqlJsDatabase,
  input: {
    scope: CollectibleScope;
    characterId?: string | null;
    kind?: CollectibleKind;
    faction?: CollectibleFaction;
    q?: string;
    onlyRemaining?: boolean;
  }
): CollectibleListItem[] {
  const scope = input.scope;
  const characterId = input.characterId ?? null;
  if (scope === "CHARACTER" && !characterId) throw new Error("bad_request");

  const where: string[] = [];
  const params: ParamsObject = { $scope: scope };

  const joinCharacter = scope === "ACCOUNT" ? "p.character_id IS NULL" : "p.character_id = $characterId";
  if (scope === "CHARACTER") params.$characterId = characterId;

  if (input.kind) {
    where.push("i.kind = $kind");
    params.$kind = input.kind;
  }

  if (input.faction) {
    where.push("(i.faction IS NULL OR i.faction = 'BOTH' OR i.faction = $faction)");
    params.$faction = input.faction;
  }

  const q = typeof input.q === "string" ? input.q.trim() : "";
  if (q) {
    where.push(
      "(i.name LIKE $q ESCAPE '\\\\' COLLATE NOCASE OR i.region LIKE $q ESCAPE '\\\\' COLLATE NOCASE OR i.map LIKE $q ESCAPE '\\\\' COLLATE NOCASE)"
    );
    params.$q = `%${escapeLike(q)}%`;
  }

  if (input.onlyRemaining) {
    where.push("p.id IS NULL");
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = allRows(
    db,
    `
      SELECT i.id, i.kind, i.map, i.faction, i.region, i.name, i.note, i.x, i.y, i.source,
             CASE WHEN p.id IS NULL THEN 0 ELSE 1 END AS done
      FROM collectible_item i
      LEFT JOIN collectible_progress p
        ON p.item_id = i.id
       AND p.scope = $scope
       AND ${joinCharacter}
      ${whereSql}
      ORDER BY i.map ASC, COALESCE(i.region, '') ASC, i.name ASC, i.id ASC
      `,
    params
  );

  return rows.map((r) => ({
    id: String(r.id),
    kind: r.kind as CollectibleKind,
    map: String(r.map),
    faction: r.faction ? (String(r.faction) as CollectibleFaction) : null,
    region: r.region ? String(r.region) : null,
    name: String(r.name),
    note: r.note ? String(r.note) : null,
    x: typeof r.x === "number" ? (r.x as number) : r.x === null || r.x === undefined ? null : Number(r.x),
    y: typeof r.y === "number" ? (r.y as number) : r.y === null || r.y === undefined ? null : Number(r.y),
    source: r.source ? String(r.source) : null,
    done: Boolean(r.done)
  }));
}

export function listCollectibleMaps(db: SqlJsDatabase): CollectibleMap[] {
  const rows = allRows(db, "SELECT DISTINCT map AS name FROM collectible_item ORDER BY map ASC", {});
  const out: CollectibleMap[] = [];

  for (const r of rows) {
    const name = String(r.name);
    const meta = findBuiltinCollectibleMap(name);
    if (meta) {
      const size = mapPixelSize(meta);
      out.push({
        name,
        order: meta.order,
        type: meta.type,
        tileWidth: meta.tileWidth,
        tileHeight: meta.tileHeight,
        tilesCountX: meta.tilesCountX,
        tilesCountY: meta.tilesCountY,
        width: size.width,
        height: size.height,
        source: meta.source
      });
      continue;
    }

    const bounds = oneRow(db, "SELECT MAX(COALESCE(x, 0)) AS maxX, MAX(COALESCE(y, 0)) AS maxY FROM collectible_item WHERE map = $m", {
      $m: name
    });
    const maxX = Number(bounds?.maxX ?? 0);
    const maxY = Number(bounds?.maxY ?? 0);
    const tileWidth = 1024;
    const tileHeight = 1024;
    const tilesCountX = Math.max(1, Math.ceil(maxX / tileWidth));
    const tilesCountY = Math.max(1, Math.ceil(maxY / tileHeight));
    out.push({
      name,
      order: 999,
      type: null,
      tileWidth,
      tileHeight,
      tilesCountX,
      tilesCountY,
      width: tileWidth * tilesCountX,
      height: tileHeight * tilesCountY,
      source: null
    });
  }

  out.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return out;
}

export function exportCollectibleItems(db: SqlJsDatabase): CollectibleItemRow[] {
  const rows = allRows(
    db,
    `
      SELECT id, kind, map, faction, region, name, note, x, y, source, created_at, updated_at
      FROM collectible_item
      ORDER BY map ASC, COALESCE(region, '') ASC, name ASC, id ASC
      `,
    {}
  );

  return rows.map((r) => ({
    id: String(r.id),
    kind: r.kind as CollectibleKind,
    map: String(r.map),
    faction: r.faction ? (String(r.faction) as CollectibleFaction) : null,
    region: r.region ? String(r.region) : null,
    name: String(r.name),
    note: r.note ? String(r.note) : null,
    x: typeof r.x === "number" ? (r.x as number) : r.x === null || r.x === undefined ? null : Number(r.x),
    y: typeof r.y === "number" ? (r.y as number) : r.y === null || r.y === undefined ? null : Number(r.y),
    source: r.source ? String(r.source) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }));
}

export function exportCollectibleProgress(db: SqlJsDatabase): CollectibleProgressRow[] {
  const rows = allRows(
    db,
    `
      SELECT id, scope, character_id, item_id, done, done_at, updated_at
      FROM collectible_progress
      WHERE done = 1
      ORDER BY scope ASC, IFNULL(character_id, '') ASC, item_id ASC, id ASC
      `,
    {}
  );

  return rows.map((r) => ({
    id: String(r.id),
    scope: r.scope as CollectibleScope,
    characterId: r.character_id ? String(r.character_id) : null,
    itemId: String(r.item_id),
    done: Boolean(r.done),
    doneAt: r.done_at ? String(r.done_at) : null,
    updatedAt: String(r.updated_at)
  }));
}

export function importCollectibleItems(db: SqlJsDatabase, input: { items: unknown; defaultSource?: string | null; wrapInTransaction?: boolean }) {
  if (!Array.isArray(input.items)) throw new Error("bad_collectibles_items");

  const now = new Date().toISOString();
  let inserted = 0;
  let updated = 0;

  const wrapInTransaction = input.wrapInTransaction !== false;
  if (wrapInTransaction) db.run("BEGIN");
  try {
    const sql = `
        INSERT INTO collectible_item
          (id, kind, map, faction, region, name, note, x, y, source, created_at, updated_at)
        VALUES
          ($id, $kind, $map, $faction, $region, $name, $note, $x, $y, $source, $now, $now)
        ON CONFLICT(id) DO UPDATE SET
          kind = excluded.kind,
          map = excluded.map,
          faction = excluded.faction,
          region = excluded.region,
          name = excluded.name,
          note = excluded.note,
          x = excluded.x,
          y = excluded.y,
          source = excluded.source,
          updated_at = excluded.updated_at
      `;

    for (const raw of input.items) {
      if (!raw || typeof raw !== "object") continue;
      const obj = raw as Record<string, unknown>;
      const kind = obj.kind === "TRACE" || obj.kind === "CUBE" || obj.kind === "MATERIAL" ? (obj.kind as CollectibleKind) : null;
      const map = typeof obj.map === "string" ? obj.map.trim() : "";
      const name = typeof obj.name === "string" ? obj.name.trim() : "";
      if (!kind || !map || !name) continue;

      const region = obj.region === null || typeof obj.region === "string" ? (obj.region as string | null) : null;
      const note = obj.note === null || typeof obj.note === "string" ? (obj.note as string | null) : null;
      const x = obj.x === null || typeof obj.x === "number" ? (obj.x as number | null) : null;
      const y = obj.y === null || typeof obj.y === "number" ? (obj.y as number | null) : null;
      const faction = normalizeCollectibleFaction(obj.faction);
      const source =
        typeof obj.source === "string" && obj.source.trim()
          ? obj.source.trim()
          : typeof input.defaultSource === "string" && input.defaultSource.trim()
            ? input.defaultSource.trim()
            : "import";

      const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : hashCollectibleId({ kind, map, name, region, x, y, faction });

      const exists = oneRow(db, "SELECT 1 AS c FROM collectible_item WHERE id = $id LIMIT 1", { $id: id });
      db.run(sql, {
        $id: id,
        $kind: kind,
        $map: map,
        $faction: faction,
        $region: region,
        $name: name,
        $note: note,
        $x: x,
        $y: y,
        $source: source,
        $now: now
      });
      if (exists) updated += 1;
      else inserted += 1;
    }

    if (wrapInTransaction) db.run("COMMIT");
  } catch (e) {
    if (wrapInTransaction) db.run("ROLLBACK");
    throw e;
  }

  return { inserted, updated, total: inserted + updated };
}

export function importCollectibleProgress(db: SqlJsDatabase, input: { progress: unknown; wrapInTransaction?: boolean }) {
  if (!Array.isArray(input.progress)) throw new Error("bad_collectibles_progress");

  const now = new Date().toISOString();
  let inserted = 0;
  let updated = 0;

  const wrapInTransaction = input.wrapInTransaction !== false;
  if (wrapInTransaction) db.run("BEGIN");
  try {
    const sql = `
        INSERT OR REPLACE INTO collectible_progress
          (id, scope, character_id, item_id, done, done_at, updated_at)
        VALUES
          ($id, $scope, $characterId, $itemId, $done, $doneAt, $updatedAt)
      `;

    for (const raw of input.progress) {
      if (!raw || typeof raw !== "object") continue;
      const obj = raw as Record<string, unknown>;

      const scope = obj.scope === "ACCOUNT" || obj.scope === "CHARACTER" ? (obj.scope as CollectibleScope) : null;
      if (!scope) continue;

      const itemId = typeof obj.itemId === "string" ? obj.itemId.trim() : "";
      if (!itemId) continue;

      const done = Boolean(obj.done);
      if (!done) continue;

      const characterId = obj.characterId === null || typeof obj.characterId === "string" ? (obj.characterId as string | null) : null;
      if (scope === "CHARACTER" && !characterId) continue;

      const hasItem = oneRow(db, "SELECT 1 AS c FROM collectible_item WHERE id = $id LIMIT 1", { $id: itemId });
      if (!hasItem) continue;

      if (scope === "CHARACTER") {
        const hasCharacter = oneRow(db, "SELECT 1 AS c FROM app_character WHERE id = $id LIMIT 1", { $id: characterId });
        if (!hasCharacter) continue;
      }

      const doneAt = typeof obj.doneAt === "string" ? obj.doneAt : now;
      const updatedAt = typeof obj.updatedAt === "string" ? obj.updatedAt : now;
      const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : randomUUID();

      const exists = oneRow(db, "SELECT 1 AS c FROM collectible_progress WHERE id = $id LIMIT 1", { $id: id });
      db.run(sql, {
        $id: id,
        $scope: scope,
        $characterId: scope === "ACCOUNT" ? null : characterId,
        $itemId: itemId,
        $done: 1,
        $doneAt: doneAt,
        $updatedAt: updatedAt
      });
      if (exists) updated += 1;
      else inserted += 1;
    }

    if (wrapInTransaction) db.run("COMMIT");
  } catch (e) {
    if (wrapInTransaction) db.run("ROLLBACK");
    throw e;
  }

  return { inserted, updated, total: inserted + updated };
}

export function setCollectibleDone(db: SqlJsDatabase, input: { scope: CollectibleScope; characterId?: string | null; itemId: string; done: boolean }) {
  const scope = input.scope;
  const characterId = input.characterId ?? null;
  if (scope === "CHARACTER" && !characterId) throw new Error("bad_request");

  const now = new Date().toISOString();
  const where =
    scope === "ACCOUNT"
      ? "scope = $scope AND character_id IS NULL AND item_id = $itemId"
      : "scope = $scope AND character_id = $characterId AND item_id = $itemId";
  const params: ParamsObject = { $scope: scope, $itemId: input.itemId };
  if (scope === "CHARACTER") params.$characterId = characterId;

  if (!input.done) {
    db.run(`DELETE FROM collectible_progress WHERE ${where}`, params);
    return;
  }

  const existing = oneRow(db, `SELECT id FROM collectible_progress WHERE ${where} LIMIT 1`, params);
  if (existing?.id) {
    db.run(
      `
        UPDATE collectible_progress
        SET done = 1, done_at = $doneAt, updated_at = $now
        WHERE id = $id
        `,
      { $id: String(existing.id), $doneAt: now, $now: now }
    );
    return;
  }

  const id = randomUUID();
  db.run(
    `
      INSERT INTO collectible_progress (id, scope, character_id, item_id, done, done_at, updated_at)
      VALUES ($id, $scope, $characterId, $itemId, 1, $doneAt, $now)
      `,
    {
      $id: id,
      $scope: scope,
      $characterId: scope === "ACCOUNT" ? null : characterId,
      $itemId: input.itemId,
      $doneAt: now,
      $now: now
    }
  );
}
