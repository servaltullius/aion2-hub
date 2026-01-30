import { randomUUID } from "node:crypto";

import { allRows, oneRow, type ParamsObject, type SqlJsDatabase } from "../sql.js";

import type { EconomyAlertEvent, EconomyItem, EconomyPrice, EconomyPriceWatch, EconomyPriceWatchOp } from "../types.js";

function asOp(value: unknown): EconomyPriceWatchOp | null {
  return value === "<" || value === "<=" || value === ">" || value === ">=" ? value : null;
}

function compare(price: number, op: EconomyPriceWatchOp, threshold: number) {
  switch (op) {
    case "<":
      return price < threshold;
    case "<=":
      return price <= threshold;
    case ">":
      return price > threshold;
    case ">=":
      return price >= threshold;
  }
}

export function listEconomyItems(db: SqlJsDatabase, input: { q?: string | null; limit?: number | null } = {}): EconomyItem[] {
  const q = typeof input.q === "string" ? input.q.trim() : "";
  const limit = typeof input.limit === "number" && Number.isFinite(input.limit) ? Math.max(1, Math.min(500, input.limit)) : 100;
  const like = q ? `%${q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%` : null;

  const rows = allRows(
    db,
    `
      SELECT id, name, category, note, created_at, updated_at
      FROM economy_item
      ${like ? "WHERE name LIKE $q ESCAPE '\\\\'" : ""}
      ORDER BY name ASC
      LIMIT ${limit}
      `,
    like ? { $q: like } : {}
  );

  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    category: r.category === null || r.category === undefined ? null : String(r.category),
    note: r.note === null || r.note === undefined ? null : String(r.note),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }));
}

export function getEconomyItemById(db: SqlJsDatabase, itemId: string): EconomyItem | null {
  const row = oneRow(
    db,
    `
      SELECT id, name, category, note, created_at, updated_at
      FROM economy_item
      WHERE id = $id
      LIMIT 1
      `,
    { $id: itemId }
  );
  if (!row?.id) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    category: row.category === null || row.category === undefined ? null : String(row.category),
    note: row.note === null || row.note === undefined ? null : String(row.note),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export function upsertEconomyItemByName(
  db: SqlJsDatabase,
  input: { name: string; category?: string | null; note?: string | null }
): EconomyItem {
  const name = input.name.trim();
  if (!name) throw new Error("bad_request");
  const category = typeof input.category === "string" && input.category.trim() ? input.category.trim() : null;
  const note = typeof input.note === "string" && input.note.trim() ? input.note.trim() : null;

  const existing = oneRow(
    db,
    `
      SELECT id, name, category, note, created_at, updated_at
      FROM economy_item
      WHERE name = $name
      LIMIT 1
      `,
    { $name: name }
  );

  const now = new Date().toISOString();
  if (existing?.id) {
    const nextCategory = category ?? (existing.category === null || existing.category === undefined ? null : String(existing.category));
    const nextNote = note ?? (existing.note === null || existing.note === undefined ? null : String(existing.note));
    db.run(
      `
        UPDATE economy_item
        SET category = $category, note = $note, updated_at = $now
        WHERE id = $id
        `,
      { $id: String(existing.id), $category: nextCategory, $note: nextNote, $now: now }
    );
    return {
      id: String(existing.id),
      name: String(existing.name),
      category: nextCategory,
      note: nextNote,
      createdAt: String(existing.created_at),
      updatedAt: now
    };
  }

  const id = randomUUID();
  db.run(
    `
      INSERT INTO economy_item (id, name, category, note, created_at, updated_at)
      VALUES ($id, $name, $category, $note, $now, $now)
      `,
    { $id: id, $name: name, $category: category, $note: note, $now: now }
  );

  return { id, name, category, note, createdAt: now, updatedAt: now };
}

export function updateEconomyItem(db: SqlJsDatabase, input: { id: string; name: string; category?: string | null; note?: string | null }) {
  const id = input.id;
  const name = input.name.trim();
  if (!id || !name) throw new Error("bad_request");
  const category = typeof input.category === "string" && input.category.trim() ? input.category.trim() : null;
  const note = typeof input.note === "string" && input.note.trim() ? input.note.trim() : null;
  const now = new Date().toISOString();
  db.run(
    `
      UPDATE economy_item
      SET name = $name, category = $category, note = $note, updated_at = $now
      WHERE id = $id
      `,
    { $id: id, $name: name, $category: category, $note: note, $now: now }
  );
}

export function deleteEconomyItem(db: SqlJsDatabase, itemId: string) {
  db.run("DELETE FROM economy_item WHERE id = $id", { $id: itemId });
}

export function addEconomyPrice(db: SqlJsDatabase, input: { server: string; itemName: string; price: number; recordedAt?: string | null }) {
  const server = input.server.trim();
  if (!server) throw new Error("bad_request");
  const item = upsertEconomyItemByName(db, { name: input.itemName });
  const price = Number.isFinite(input.price) ? Math.max(0, Math.floor(input.price)) : 0;
  const recordedAt = typeof input.recordedAt === "string" && input.recordedAt ? input.recordedAt : new Date().toISOString();
  const now = new Date().toISOString();
  const id = randomUUID();

  db.run(
    `
      INSERT INTO economy_price (id, server, item_id, price, recorded_at, created_at, updated_at)
      VALUES ($id, $server, $itemId, $price, $recordedAt, $now, $now)
      `,
    { $id: id, $server: server, $itemId: item.id, $price: price, $recordedAt: recordedAt, $now: now }
  );

  const triggered = triggerWatchesForPrice(db, {
    server,
    itemId: item.id,
    itemName: item.name,
    price,
    triggeredAt: recordedAt
  });

  return { priceId: id, item, triggered };
}

export function listEconomyPrices(db: SqlJsDatabase, input: { server: string; itemId: string; limit?: number | null }): EconomyPrice[] {
  const server = input.server.trim();
  const itemId = input.itemId;
  if (!server || !itemId) throw new Error("bad_request");
  const limit = typeof input.limit === "number" && Number.isFinite(input.limit) ? Math.max(1, Math.min(500, input.limit)) : 100;

  const rows = allRows(
    db,
    `
      SELECT id, server, item_id, price, recorded_at, created_at, updated_at
      FROM economy_price
      WHERE server = $server AND item_id = $itemId
      ORDER BY recorded_at DESC, created_at DESC
      LIMIT ${limit}
      `,
    { $server: server, $itemId: itemId }
  );

  return rows.map((r) => ({
    id: String(r.id),
    server: String(r.server),
    itemId: String(r.item_id),
    price: Number(r.price ?? 0),
    recordedAt: String(r.recorded_at),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }));
}

export function getLatestPricesByItemId(db: SqlJsDatabase, input: { server: string; itemIds: string[] }): Record<string, number> {
  const server = input.server.trim();
  if (!server) throw new Error("bad_request");
  const ids = Array.from(new Set(input.itemIds.filter(Boolean)));
  const out: Record<string, number> = {};
  if (!ids.length) return out;

  // Pull all prices for these items ordered by time desc, then take first per item.
  const rows = allRows(
    db,
    `
      SELECT item_id, price, recorded_at
      FROM economy_price
      WHERE server = $server AND item_id IN (${ids.map((_, i) => `$id${i}`).join(", ")})
      ORDER BY recorded_at DESC, created_at DESC
      `,
    Object.fromEntries([["$server", server], ...ids.map((v, i) => [`$id${i}`, v])] as Array<[string, string]>)
  );

  for (const r of rows) {
    const itemId = String(r.item_id);
    if (out[itemId] !== undefined) continue;
    out[itemId] = Number(r.price ?? 0);
  }

  return out;
}

export function listEconomyWatches(db: SqlJsDatabase, input: { server: string }): Array<EconomyPriceWatch & { itemName: string }> {
  const server = input.server.trim();
  if (!server) throw new Error("bad_request");

  const rows = allRows(
    db,
    `
      SELECT w.id, w.server, w.item_id, i.name AS item_name, w.op, w.threshold, w.active, w.created_at, w.updated_at
      FROM economy_price_watch w
      JOIN economy_item i ON i.id = w.item_id
      WHERE w.server = $server
      ORDER BY i.name ASC
      `,
    { $server: server }
  );

  return rows.map((r) => ({
    id: String(r.id),
    server: String(r.server),
    itemId: String(r.item_id),
    itemName: String(r.item_name),
    op: asOp(r.op) ?? "<=",
    threshold: Number(r.threshold ?? 0),
    active: Boolean(r.active),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }));
}

export function createEconomyWatch(
  db: SqlJsDatabase,
  input: { server: string; itemName: string; op: EconomyPriceWatchOp; threshold: number }
): EconomyPriceWatch {
  const server = input.server.trim();
  if (!server) throw new Error("bad_request");
  const op = asOp(input.op);
  if (!op) throw new Error("bad_request");
  const threshold = Number.isFinite(input.threshold) ? Math.max(0, Math.floor(input.threshold)) : 0;
  const item = upsertEconomyItemByName(db, { name: input.itemName });

  const id = randomUUID();
  const now = new Date().toISOString();
  db.run(
    `
      INSERT INTO economy_price_watch (id, server, item_id, op, threshold, active, created_at, updated_at)
      VALUES ($id, $server, $itemId, $op, $threshold, 1, $now, $now)
      `,
    { $id: id, $server: server, $itemId: item.id, $op: op, $threshold: threshold, $now: now }
  );
  return { id, server, itemId: item.id, op, threshold, active: true, createdAt: now, updatedAt: now };
}

export function setEconomyWatchActive(db: SqlJsDatabase, input: { id: string; active: boolean }) {
  const id = input.id;
  if (!id) throw new Error("bad_request");
  const now = new Date().toISOString();
  db.run(
    `
      UPDATE economy_price_watch
      SET active = $active, updated_at = $now
      WHERE id = $id
      `,
    { $id: id, $active: input.active ? 1 : 0, $now: now }
  );
}

export function deleteEconomyWatch(db: SqlJsDatabase, watchId: string) {
  db.run("DELETE FROM economy_price_watch WHERE id = $id", { $id: watchId });
}

export function listEconomyAlertEvents(
  db: SqlJsDatabase,
  input: { server?: string | null; unreadOnly?: boolean | null; limit?: number | null } = {}
): EconomyAlertEvent[] {
  const server = typeof input.server === "string" ? input.server.trim() : "";
  const unreadOnly = Boolean(input.unreadOnly);
  const limit = typeof input.limit === "number" && Number.isFinite(input.limit) ? Math.max(1, Math.min(500, input.limit)) : 100;

  const where: string[] = [];
  const params: ParamsObject = {};
  if (server) {
    where.push("server = $server");
    params.$server = server;
  }
  if (unreadOnly) where.push("read_at IS NULL");
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = allRows(
    db,
    `
      SELECT id, server, item_id, item_name, op, threshold, price, triggered_at, read_at
      FROM economy_alert_event
      ${whereSql}
      ORDER BY triggered_at DESC
      LIMIT ${limit}
      `,
    params
  );

  return rows.map((r) => ({
    id: String(r.id),
    server: String(r.server),
    itemId: String(r.item_id),
    itemName: String(r.item_name),
    op: asOp(r.op) ?? "<=",
    threshold: Number(r.threshold ?? 0),
    price: Number(r.price ?? 0),
    triggeredAt: String(r.triggered_at),
    readAt: r.read_at === null || r.read_at === undefined ? null : String(r.read_at)
  }));
}

export function markEconomyAlertRead(db: SqlJsDatabase, input: { id: string }) {
  const id = input.id;
  if (!id) throw new Error("bad_request");
  const now = new Date().toISOString();
  db.run(
    `
      UPDATE economy_alert_event
      SET read_at = $now
      WHERE id = $id
      `,
    { $id: id, $now: now }
  );
}

function triggerWatchesForPrice(db: SqlJsDatabase, input: { server: string; itemId: string; itemName: string; price: number; triggeredAt: string }) {
  const rows = allRows(
    db,
    `
      SELECT id, op, threshold
      FROM economy_price_watch
      WHERE server = $server AND item_id = $itemId AND active = 1
      ORDER BY created_at DESC
      `,
    { $server: input.server, $itemId: input.itemId }
  );

  const triggered: EconomyAlertEvent[] = [];
  for (const r of rows) {
    const op = asOp(r.op);
    if (!op) continue;
    const threshold = Number(r.threshold ?? 0);
    if (!compare(input.price, op, threshold)) continue;

    const id = randomUUID();
    db.run(
      `
        INSERT INTO economy_alert_event
          (id, server, item_id, item_name, op, threshold, price, triggered_at)
        VALUES
          ($id, $server, $itemId, $itemName, $op, $threshold, $price, $at)
        `,
      {
        $id: id,
        $server: input.server,
        $itemId: input.itemId,
        $itemName: input.itemName,
        $op: op,
        $threshold: threshold,
        $price: input.price,
        $at: input.triggeredAt
      }
    );

    triggered.push({
      id,
      server: input.server,
      itemId: input.itemId,
      itemName: input.itemName,
      op,
      threshold,
      price: input.price,
      triggeredAt: input.triggeredAt,
      readAt: null
    });
  }
  return triggered;
}
