import path from "node:path";
import { createRequire } from "node:module";

import initSqlJs from "sql.js";
import { describe, expect, it, vi } from "vitest";

import { builtinCollectibles } from "../collectibles/builtin.js";

vi.mock("electron", () => ({
  app: {
    isPackaged: false
  }
}));

async function createTestDb() {
  const wasmDir = path.dirname(createRequire(import.meta.url).resolve("sql.js/dist/sql-wasm.wasm"));
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(wasmDir, file)
  });
  const db = new SQL.Database();
  const { DesktopDb } = await import("./db.js");
  const wrapped = new DesktopDb("test.sqlite", db);
  wrapped.init();
  return wrapped;
}

function countRows(db: { db: { prepare: (sql: string) => any } }, sql: string) {
  const stmt = db.db.prepare(sql);
  try {
    if (!stmt.step()) return 0;
    const row = stmt.getAsObject() as Record<string, unknown>;
    return Number(row.c ?? 0);
  } finally {
    stmt.free();
  }
}

describe("collectibles seed", () => {
  it("seeds built-in collectibles idempotently", async () => {
    const db = await createTestDb();

    const seeded = countRows(db, "SELECT COUNT(1) AS c FROM collectible_item");
    expect(seeded).toBe(builtinCollectibles.length);

    db.init();
    const seededAgain = countRows(db, "SELECT COUNT(1) AS c FROM collectible_item");
    expect(seededAgain).toBe(builtinCollectibles.length);
  });
});

