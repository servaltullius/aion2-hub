import { ipcMain } from "electron";

import type { EconomyPriceWatchOp } from "../storage/types.js";

import type { IpcDeps } from "./types.js";
import { asRecord } from "./util.js";

function asOp(value: unknown): EconomyPriceWatchOp | null {
  return value === "<" || value === "<=" || value === ">" || value === ">=" ? value : null;
}

export function registerEconomyHandlers(deps: IpcDeps) {
  ipcMain.handle("economy:listItems", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const q = typeof obj.q === "string" ? obj.q : null;
    const limit = typeof obj.limit === "number" ? obj.limit : null;
    return db.listEconomyItems({ q, limit });
  });

  ipcMain.handle("economy:updateItem", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const id = typeof obj.id === "string" ? obj.id : "";
    const name = typeof obj.name === "string" ? obj.name : "";
    const category = obj.category === null || typeof obj.category === "string" ? (obj.category as string | null) : null;
    const note = obj.note === null || typeof obj.note === "string" ? (obj.note as string | null) : null;
    if (!id || !name.trim()) throw new Error("bad_request");
    db.updateEconomyItem({ id, name, category, note });
    await db.persist();
    return { ok: true };
  });

  ipcMain.handle("economy:deleteItem", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const id = typeof obj.id === "string" ? obj.id : "";
    if (!id) throw new Error("bad_request");
    db.deleteEconomyItem(id);
    await db.persist();
    return { ok: true };
  });

  ipcMain.handle("economy:addPrice", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const server = typeof obj.server === "string" ? obj.server.trim() : "";
    const itemName = typeof obj.itemName === "string" ? obj.itemName.trim() : "";
    const price = typeof obj.price === "number" ? obj.price : 0;
    const recordedAt = typeof obj.recordedAt === "string" ? obj.recordedAt : null;
    if (!server || !itemName) throw new Error("bad_request");
    const result = db.addEconomyPrice({ server, itemName, price, recordedAt });
    await db.persist();
    return result;
  });

  ipcMain.handle("economy:listPrices", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const server = typeof obj.server === "string" ? obj.server.trim() : "";
    const itemId = typeof obj.itemId === "string" ? obj.itemId : "";
    const limit = typeof obj.limit === "number" ? obj.limit : null;
    if (!server || !itemId) throw new Error("bad_request");
    return db.listEconomyPrices({ server, itemId, limit });
  });

  ipcMain.handle("economy:listWatches", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const server = typeof obj.server === "string" ? obj.server.trim() : "";
    if (!server) throw new Error("bad_request");
    return db.listEconomyWatches({ server });
  });

  ipcMain.handle("economy:createWatch", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const server = typeof obj.server === "string" ? obj.server.trim() : "";
    const itemName = typeof obj.itemName === "string" ? obj.itemName.trim() : "";
    const op = asOp(obj.op);
    const threshold = typeof obj.threshold === "number" ? obj.threshold : 0;
    if (!server || !itemName || !op) throw new Error("bad_request");
    const watch = db.createEconomyWatch({ server, itemName, op, threshold });
    await db.persist();
    return watch;
  });

  ipcMain.handle("economy:setWatchActive", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const id = typeof obj.id === "string" ? obj.id : "";
    const active = Boolean(obj.active);
    if (!id) throw new Error("bad_request");
    db.setEconomyWatchActive({ id, active });
    await db.persist();
    return { ok: true };
  });

  ipcMain.handle("economy:deleteWatch", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const id = typeof obj.id === "string" ? obj.id : "";
    if (!id) throw new Error("bad_request");
    db.deleteEconomyWatch(id);
    await db.persist();
    return { ok: true };
  });

  ipcMain.handle("economy:listAlerts", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const server = typeof obj.server === "string" ? obj.server.trim() : null;
    const unreadOnly = obj.unreadOnly === undefined ? null : Boolean(obj.unreadOnly);
    const limit = typeof obj.limit === "number" ? obj.limit : null;
    return db.listEconomyAlertEvents({ server, unreadOnly, limit });
  });

  ipcMain.handle("economy:markAlertRead", async (_evt, input: unknown) => {
    const db = deps.getDb();
    if (!db) throw new Error("db_not_ready");
    const obj = asRecord(input);
    const id = typeof obj.id === "string" ? obj.id : "";
    if (!id) throw new Error("bad_request");
    db.markEconomyAlertRead({ id });
    await db.persist();
    return { ok: true };
  });
}

