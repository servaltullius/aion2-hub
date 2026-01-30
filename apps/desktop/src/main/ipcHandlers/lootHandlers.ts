import { ipcMain } from "electron";
import { z } from "zod";

import type { LootRunCostKind } from "../storage/types.js";

import type { IpcDeps } from "./types.js";
import { asRecord, resolveCharacterId } from "./util.js";
import { parseInput } from "./validate.js";

const LootCreateRunInputSchema = z.object({
  characterId: z.string().optional(),
  content: z.string(),
  role: z.string().nullable().optional(),
  powerBracket: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  endedAt: z.string().nullable().optional(),
  seconds: z.number().finite().nullable().optional(),
  drops: z.array(z.unknown()).optional(),
  costs: z.array(z.unknown()).optional()
});

const LootDropSchema = z.object({
  itemName: z.string(),
  qty: z.number().finite(),
  note: z.string().nullable().optional()
});

const LootCostSchema = z.union([
  z.object({
    kind: z.literal("KINAH"),
    kinah: z.number().finite().optional(),
    note: z.string().nullable().optional()
  }),
  z.object({
    kind: z.literal("ITEM"),
    itemName: z.string().nullable().optional(),
    qty: z.number().finite().optional(),
    note: z.string().nullable().optional()
  })
]);

export function registerLootHandlers(deps: IpcDeps) {
  ipcMain.handle("loot:listRuns", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) throw new Error("no_character");
    const limit = typeof obj.limit === "number" ? obj.limit : null;
    return db.listLootRuns({ characterId, limit });
  });

  ipcMain.handle("loot:getRun", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const id = typeof obj.id === "string" ? obj.id : "";
    if (!id) throw new Error("bad_request");
    return db.getLootRun(id);
  });

  ipcMain.handle("loot:createRun", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = parseInput(LootCreateRunInputSchema, input);
    const characterId = obj.characterId ?? db.getActiveCharacterId();
    if (!characterId) throw new Error("no_character");

    const content = obj.content.trim();
    if (!content) throw new Error("bad_request");
    const role = typeof obj.role === "string" ? obj.role.trim() || null : null;
    const powerBracket = typeof obj.powerBracket === "string" ? obj.powerBracket.trim() || null : null;
    const startedAt = obj.startedAt ?? null;
    const endedAt = obj.endedAt ?? null;
    const seconds = typeof obj.seconds === "number" ? obj.seconds : null;

    const drops: Array<{ itemName: string; qty: number; note?: string | null }> = [];
    for (const raw of obj.drops ?? []) {
      const parsed = LootDropSchema.safeParse(raw);
      if (!parsed.success) continue;
      const itemName = parsed.data.itemName.trim();
      if (!itemName) continue;
      drops.push({ itemName, qty: parsed.data.qty, note: parsed.data.note ?? null });
    }

    const costs: Array<{ kind: LootRunCostKind; kinah?: number; itemName?: string | null; qty?: number; note?: string | null }> =
      [];
    for (const raw of obj.costs ?? []) {
      const parsed = LootCostSchema.safeParse(raw);
      if (!parsed.success) continue;
      const note = parsed.data.note ?? null;
      if (parsed.data.kind === "KINAH") {
        costs.push({ kind: "KINAH", kinah: parsed.data.kinah ?? 0, note });
      } else {
        costs.push({
          kind: "ITEM",
          itemName: typeof parsed.data.itemName === "string" ? parsed.data.itemName.trim() : null,
          qty: parsed.data.qty ?? 0,
          note
        });
      }
    }

    const result = db.createLootRun({
      characterId,
      content,
      role,
      powerBracket,
      startedAt,
      endedAt,
      seconds,
      drops,
      costs
    });
    await db.persist();
    return result;
  });

  ipcMain.handle("loot:deleteRun", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) throw new Error("no_character");
    const id = typeof obj.id === "string" ? obj.id : "";
    if (!id) throw new Error("bad_request");
    db.deleteLootRun({ id, characterId });
    await db.persist();
    return { ok: true };
  });

  ipcMain.handle("loot:weeklyReport", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const characterId = resolveCharacterId(db, obj);
    if (!characterId) throw new Error("no_character");
    const server = obj.server === null || typeof obj.server === "string" ? (obj.server as string | null) : null;
    const nowIso = typeof obj.nowIso === "string" ? obj.nowIso : null;
    return db.getLootWeeklyReport({ characterId, server, nowIso });
  });
}
