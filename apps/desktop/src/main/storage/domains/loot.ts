import { randomUUID } from "node:crypto";

import { allRows, oneRow, type SqlJsDatabase } from "../sql.js";

import { getLatestPricesByItemId, upsertEconomyItemByName } from "./economy.js";

import type { LootRun, LootRunCost, LootRunCostKind, LootRunDrop, LootRunListItem, LootWeeklyReport } from "../types.js";

function asCostKind(value: unknown): LootRunCostKind | null {
  return value === "KINAH" || value === "ITEM" ? value : null;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatLocalDateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseHhmm(hhmm: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return { hour: 9, minute: 0 };
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return { hour: 9, minute: 0 };
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return { hour: 9, minute: 0 };
  return { hour, minute };
}

function resolveWeeklyStartLocal(now: Date, dailyResetHhmm: string, weeklyResetDay: number) {
  const { hour, minute } = parseHhmm(dailyResetHhmm);
  const resetDay = Number.isFinite(weeklyResetDay) ? Math.max(0, Math.min(6, weeklyResetDay)) : 1;

  const start = new Date(now);
  const nowDay = start.getDay();
  const daysSinceReset = (nowDay - resetDay + 7) % 7;
  start.setDate(start.getDate() - daysSinceReset);
  start.setHours(hour, minute, 0, 0);

  if (now.getTime() < start.getTime()) start.setDate(start.getDate() - 7);
  return start;
}

function getPlannerResetForServer(db: SqlJsDatabase, server: string | null) {
  if (server) {
    const row = oneRow(
      db,
      "SELECT daily_reset_hhmm, weekly_reset_day FROM planner_settings WHERE id = $id LIMIT 1",
      { $id: `server:${server}` }
    );
    if (row?.daily_reset_hhmm && row?.weekly_reset_day !== undefined) {
      return { dailyResetHhmm: String(row.daily_reset_hhmm), weeklyResetDay: Number(row.weekly_reset_day) };
    }
  }
  const row = oneRow(db, "SELECT daily_reset_hhmm, weekly_reset_day FROM planner_settings WHERE id = 'default' LIMIT 1", {});
  return {
    dailyResetHhmm: row?.daily_reset_hhmm ? String(row.daily_reset_hhmm) : "09:00",
    weeklyResetDay: row?.weekly_reset_day !== undefined ? Number(row.weekly_reset_day) : 1
  };
}

export function listLootRuns(
  db: SqlJsDatabase,
  input: { characterId: string; limit?: number | null } = { characterId: "" }
): LootRunListItem[] {
  const characterId = input.characterId;
  if (!characterId) throw new Error("bad_request");
  const limit = typeof input.limit === "number" && Number.isFinite(input.limit) ? Math.max(1, Math.min(500, input.limit)) : 100;

  const rows = allRows(
    db,
    `
      SELECT
        r.id, r.character_id, r.server, r.content, r.role, r.power_bracket,
        r.started_at, r.ended_at, r.seconds, r.created_at, r.updated_at,
        (SELECT COUNT(1) FROM loot_run_drop d WHERE d.run_id = r.id) AS drop_count,
        (SELECT COUNT(1) FROM loot_run_cost c WHERE c.run_id = r.id) AS cost_count
      FROM loot_run r
      WHERE r.character_id = $c
      ORDER BY COALESCE(r.ended_at, r.created_at) DESC
      LIMIT ${limit}
      `,
    { $c: characterId }
  );

  return rows.map((r) => ({
    id: String(r.id),
    characterId: String(r.character_id),
    server: r.server === null || r.server === undefined ? null : String(r.server),
    content: String(r.content),
    role: r.role === null || r.role === undefined ? null : String(r.role),
    powerBracket: r.power_bracket === null || r.power_bracket === undefined ? null : String(r.power_bracket),
    startedAt: r.started_at === null || r.started_at === undefined ? null : String(r.started_at),
    endedAt: r.ended_at === null || r.ended_at === undefined ? null : String(r.ended_at),
    seconds: Number(r.seconds ?? 0),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    dropCount: Number(r.drop_count ?? 0),
    costCount: Number(r.cost_count ?? 0)
  }));
}

export function getLootRun(db: SqlJsDatabase, runId: string): { run: LootRun; drops: LootRunDrop[]; costs: LootRunCost[] } | null {
  const row = oneRow(
    db,
    `
      SELECT id, character_id, server, content, role, power_bracket, started_at, ended_at, seconds, created_at, updated_at
      FROM loot_run
      WHERE id = $id
      LIMIT 1
      `,
    { $id: runId }
  );
  if (!row?.id) return null;

  const dropsRows = allRows(
    db,
    `
      SELECT id, run_id, item_id, item_name, qty, note, created_at, updated_at
      FROM loot_run_drop
      WHERE run_id = $id
      ORDER BY created_at ASC
      `,
    { $id: runId }
  );
  const costRows = allRows(
    db,
    `
      SELECT id, run_id, kind, item_id, item_name, qty, kinah, note, created_at, updated_at
      FROM loot_run_cost
      WHERE run_id = $id
      ORDER BY created_at ASC
      `,
    { $id: runId }
  );

  return {
    run: {
      id: String(row.id),
      characterId: String(row.character_id),
      server: row.server === null || row.server === undefined ? null : String(row.server),
      content: String(row.content),
      role: row.role === null || row.role === undefined ? null : String(row.role),
      powerBracket: row.power_bracket === null || row.power_bracket === undefined ? null : String(row.power_bracket),
      startedAt: row.started_at === null || row.started_at === undefined ? null : String(row.started_at),
      endedAt: row.ended_at === null || row.ended_at === undefined ? null : String(row.ended_at),
      seconds: Number(row.seconds ?? 0),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    },
    drops: dropsRows.map((d) => ({
      id: String(d.id),
      runId: String(d.run_id),
      itemId: d.item_id === null || d.item_id === undefined ? null : String(d.item_id),
      itemName: String(d.item_name),
      qty: Number(d.qty ?? 0),
      note: d.note === null || d.note === undefined ? null : String(d.note),
      createdAt: String(d.created_at),
      updatedAt: String(d.updated_at)
    })),
    costs: costRows.map((c) => ({
      id: String(c.id),
      runId: String(c.run_id),
      kind: asCostKind(c.kind) ?? "KINAH",
      itemId: c.item_id === null || c.item_id === undefined ? null : String(c.item_id),
      itemName: c.item_name === null || c.item_name === undefined ? null : String(c.item_name),
      qty: Number(c.qty ?? 0),
      kinah: Number(c.kinah ?? 0),
      note: c.note === null || c.note === undefined ? null : String(c.note),
      createdAt: String(c.created_at),
      updatedAt: String(c.updated_at)
    }))
  };
}

export function createLootRun(
  db: SqlJsDatabase,
  input: {
    characterId: string;
    content: string;
    role?: string | null;
    powerBracket?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    seconds?: number | null;
    drops?: Array<{ itemName: string; qty: number; note?: string | null }> | null;
    costs?: Array<{ kind: LootRunCostKind; kinah?: number; itemName?: string | null; qty?: number; note?: string | null }> | null;
  }
) {
  const characterId = input.characterId;
  if (!characterId) throw new Error("bad_request");
  const content = input.content.trim();
  if (!content) throw new Error("bad_request");

  const charRow = oneRow(db, "SELECT id, server FROM app_character WHERE id = $id LIMIT 1", { $id: characterId });
  if (!charRow?.id) throw new Error("no_character");
  const server = charRow.server === null || charRow.server === undefined ? null : String(charRow.server);

  const now = new Date().toISOString();
  const endedAt = typeof input.endedAt === "string" && input.endedAt ? input.endedAt : now;
  const startedAt = typeof input.startedAt === "string" && input.startedAt ? input.startedAt : null;

  let seconds = typeof input.seconds === "number" && Number.isFinite(input.seconds) ? Math.max(0, Math.floor(input.seconds)) : null;
  if (seconds === null && startedAt) {
    const s = new Date(startedAt);
    const e = new Date(endedAt);
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) seconds = Math.max(0, Math.floor((e.getTime() - s.getTime()) / 1000));
  }
  if (seconds === null) seconds = 0;

  const role = typeof input.role === "string" && input.role.trim() ? input.role.trim() : null;
  const powerBracket = typeof input.powerBracket === "string" && input.powerBracket.trim() ? input.powerBracket.trim() : null;

  const drops = Array.isArray(input.drops) ? input.drops : [];
  const costs = Array.isArray(input.costs) ? input.costs : [];

  const id = randomUUID();

  db.run("BEGIN;");
  try {
    db.run(
      `
        INSERT INTO loot_run
          (id, character_id, server, content, role, power_bracket, started_at, ended_at, seconds, created_at, updated_at)
        VALUES
          ($id, $c, $server, $content, $role, $power, $startedAt, $endedAt, $sec, $now, $now)
        `,
      {
        $id: id,
        $c: characterId,
        $server: server,
        $content: content,
        $role: role,
        $power: powerBracket,
        $startedAt: startedAt,
        $endedAt: endedAt,
        $sec: seconds,
        $now: now
      }
    );

    for (const d of drops) {
      if (!d || typeof d !== "object") continue;
      const name = typeof d.itemName === "string" ? d.itemName.trim() : "";
      if (!name) continue;
      const qty = typeof d.qty === "number" && Number.isFinite(d.qty) ? Math.max(0, Math.floor(d.qty)) : 0;
      if (qty <= 0) continue;
      const note = typeof d.note === "string" && d.note.trim() ? d.note.trim() : null;
      const item = upsertEconomyItemByName(db, { name });
      const dropId = randomUUID();
      db.run(
        `
          INSERT INTO loot_run_drop (id, run_id, item_id, item_name, qty, note, created_at, updated_at)
          VALUES ($id, $run, $itemId, $name, $qty, $note, $now, $now)
          `,
        { $id: dropId, $run: id, $itemId: item.id, $name: item.name, $qty: qty, $note: note, $now: now }
      );
    }

    for (const c of costs) {
      if (!c || typeof c !== "object") continue;
      const kind = asCostKind((c as { kind?: unknown }).kind);
      if (!kind) continue;
      const note = typeof c.note === "string" && c.note.trim() ? c.note.trim() : null;
      const costId = randomUUID();

      if (kind === "KINAH") {
        const kinah = typeof c.kinah === "number" && Number.isFinite(c.kinah) ? Math.max(0, Math.floor(c.kinah)) : 0;
        if (kinah <= 0) continue;
        db.run(
          `
            INSERT INTO loot_run_cost (id, run_id, kind, kinah, created_at, updated_at, note)
            VALUES ($id, $run, 'KINAH', $kinah, $now, $now, $note)
            `,
          { $id: costId, $run: id, $kinah: kinah, $now: now, $note: note }
        );
      } else {
        const itemName = typeof c.itemName === "string" ? c.itemName.trim() : "";
        if (!itemName) continue;
        const qty = typeof c.qty === "number" && Number.isFinite(c.qty) ? Math.max(0, Math.floor(c.qty)) : 0;
        if (qty <= 0) continue;
        const item = upsertEconomyItemByName(db, { name: itemName });
        db.run(
          `
            INSERT INTO loot_run_cost (id, run_id, kind, item_id, item_name, qty, created_at, updated_at, note)
            VALUES ($id, $run, 'ITEM', $itemId, $name, $qty, $now, $now, $note)
            `,
          { $id: costId, $run: id, $itemId: item.id, $name: item.name, $qty: qty, $now: now, $note: note }
        );
      }
    }

    db.run("COMMIT;");
  } catch (e) {
    try {
      db.run("ROLLBACK;");
    } catch (rollbackErr) {
      const original = e instanceof Error ? e : new Error(String(e));
      const rollback = rollbackErr instanceof Error ? rollbackErr : new Error(String(rollbackErr));
      const err = new Error(
        `CRITICAL: loot run create failed and rollback failed; DB may be corrupted. original="${original.message}" rollback="${rollback.message}"`
      );
      (err as Error & { cause?: unknown }).cause = original;
      throw err;
    }
    throw e;
  }

  return { id };
}

export function deleteLootRun(db: SqlJsDatabase, input: { id: string; characterId: string }) {
  const id = input.id;
  const characterId = input.characterId;
  if (!id || !characterId) throw new Error("bad_request");
  db.run("DELETE FROM loot_run WHERE id = $id AND character_id = $c", { $id: id, $c: characterId });
}

export function getLootWeeklyReport(
  db: SqlJsDatabase,
  input: { characterId: string; server?: string | null; nowIso?: string | null }
): LootWeeklyReport {
  const characterId = input.characterId;
  if (!characterId) throw new Error("bad_request");
  const now = typeof input.nowIso === "string" ? new Date(input.nowIso) : new Date();
  const nowResolved = Number.isNaN(now.getTime()) ? new Date() : now;

  const server = typeof input.server === "string" && input.server.trim() ? input.server.trim() : null;
  const reset = getPlannerResetForServer(db, server);
  const startLocal = resolveWeeklyStartLocal(nowResolved, reset.dailyResetHhmm, reset.weeklyResetDay);
  const startIso = startLocal.toISOString();
  const endIso = nowResolved.toISOString();

  const runs = allRows(
    db,
    `
      SELECT id, content, seconds, ended_at, server
      FROM loot_run
      WHERE character_id = $c AND ended_at >= $start AND ended_at <= $end
      ORDER BY ended_at DESC
      `,
    { $c: characterId, $start: startIso, $end: endIso }
  ).map((r) => ({
    id: String(r.id),
    content: String(r.content),
    seconds: Number(r.seconds ?? 0),
    endedAt: String(r.ended_at),
    server: r.server === null || r.server === undefined ? null : String(r.server)
  }));

  const runIds = runs.map((r) => r.id);
  if (!runIds.length) {
    return {
      server,
      weekStartIso: startIso,
      weekEndIso: endIso,
      totals: { runs: 0, seconds: 0, value: 0, cost: 0, net: 0, valuePerHour: 0, netPerHour: 0, missingPriceItems: [] },
      byContent: []
    };
  }

  const drops = allRows(
    db,
    `
      SELECT run_id, item_id, item_name, qty
      FROM loot_run_drop
      WHERE run_id IN (${runIds.map((_, i) => `$r${i}`).join(", ")})
      `,
    Object.fromEntries(runIds.map((v, i) => [`$r${i}`, v]))
  ).map((r) => ({
    runId: String(r.run_id),
    itemId: r.item_id === null || r.item_id === undefined ? null : String(r.item_id),
    itemName: String(r.item_name),
    qty: Number(r.qty ?? 0)
  }));

  const costs = allRows(
    db,
    `
      SELECT run_id, kind, item_id, item_name, qty, kinah
      FROM loot_run_cost
      WHERE run_id IN (${runIds.map((_, i) => `$r${i}`).join(", ")})
      `,
    Object.fromEntries(runIds.map((v, i) => [`$r${i}`, v]))
  ).map((r) => ({
    runId: String(r.run_id),
    kind: asCostKind(r.kind) ?? "KINAH",
    itemId: r.item_id === null || r.item_id === undefined ? null : String(r.item_id),
    itemName: r.item_name === null || r.item_name === undefined ? null : String(r.item_name),
    qty: Number(r.qty ?? 0),
    kinah: Number(r.kinah ?? 0)
  }));

  const effectiveServer = server ?? runs.find((r) => r.server)?.server ?? null;
  const priceServer = effectiveServer;

  const itemIds: string[] = [];
  for (const d of drops) if (d.itemId) itemIds.push(d.itemId);
  for (const c of costs) if (c.kind === "ITEM" && c.itemId) itemIds.push(c.itemId);
  const uniqueItemIds = Array.from(new Set(itemIds));
  const priceById = priceServer ? getLatestPricesByItemId(db, { server: priceServer, itemIds: uniqueItemIds }) : {};

  const missingPriceItemsSet = new Set<string>();

  const byRunValue: Record<string, number> = {};
  const byRunCost: Record<string, number> = {};
  for (const r of runs) {
    byRunValue[r.id] = 0;
    byRunCost[r.id] = 0;
  }

  for (const d of drops) {
    if (!d.itemId) continue;
    const price = priceById[d.itemId];
    if (price === undefined) {
      missingPriceItemsSet.add(d.itemId);
      continue;
    }
    byRunValue[d.runId] = (byRunValue[d.runId] ?? 0) + d.qty * price;
  }

  for (const c of costs) {
    if (c.kind === "KINAH") {
      byRunCost[c.runId] = (byRunCost[c.runId] ?? 0) + Math.max(0, Math.floor(c.kinah));
      continue;
    }
    if (!c.itemId) continue;
    const price = priceById[c.itemId];
    if (price === undefined) {
      missingPriceItemsSet.add(c.itemId);
      continue;
    }
    byRunCost[c.runId] = (byRunCost[c.runId] ?? 0) + c.qty * price;
  }

  const totals = { runs: 0, seconds: 0, value: 0, cost: 0 };
  const perContent = new Map<string, { runs: number; seconds: number; value: number; cost: number }>();
  for (const r of runs) {
    totals.runs += 1;
    totals.seconds += r.seconds;
    const value = byRunValue[r.id] ?? 0;
    const cost = byRunCost[r.id] ?? 0;
    totals.value += value;
    totals.cost += cost;

    const key = r.content;
    const prev = perContent.get(key) ?? { runs: 0, seconds: 0, value: 0, cost: 0 };
    prev.runs += 1;
    prev.seconds += r.seconds;
    prev.value += value;
    prev.cost += cost;
    perContent.set(key, prev);
  }

  const hours = totals.seconds / 3600;
  const net = totals.value - totals.cost;
  const valuePerHour = hours > 0 ? totals.value / hours : 0;
  const netPerHour = hours > 0 ? net / hours : 0;

  const byContent = Array.from(perContent.entries())
    .map(([content, v]) => {
      const h = v.seconds / 3600;
      const n = v.value - v.cost;
      return {
        content,
        runs: v.runs,
        seconds: v.seconds,
        value: v.value,
        cost: v.cost,
        net: n,
        valuePerHour: h > 0 ? v.value / h : 0,
        netPerHour: h > 0 ? n / h : 0
      };
    })
    .sort((a, b) => b.net - a.net);

  const weekKey = formatLocalDateKey(startLocal);

  return {
    server: priceServer,
    weekStartIso: startIso,
    weekEndIso: endIso,
    totals: {
      runs: totals.runs,
      seconds: totals.seconds,
      value: totals.value,
      cost: totals.cost,
      net,
      valuePerHour,
      netPerHour,
      missingPriceItems: Array.from(missingPriceItemsSet)
    },
    byContent,
    debug: {
      periodKey: `W:${weekKey}`,
      reset: { dailyResetHhmm: reset.dailyResetHhmm, weeklyResetDay: reset.weeklyResetDay }
    }
  } as LootWeeklyReport;
}
