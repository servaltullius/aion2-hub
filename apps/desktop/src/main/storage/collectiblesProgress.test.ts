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

describe("collectibles progress", () => {
  it("tracks done per scope (account vs character)", async () => {
    const db = await createTestDb();
    const itemId = builtinCollectibles[0]?.id;
    if (!itemId) throw new Error("missing builtinCollectibles");

    const before = db.listCollectibles({ scope: "ACCOUNT" }).find((v) => v.id === itemId);
    expect(before?.done).toBe(false);

    db.setCollectibleDone({ scope: "ACCOUNT", itemId, done: true });
    const after = db.listCollectibles({ scope: "ACCOUNT" }).find((v) => v.id === itemId);
    expect(after?.done).toBe(true);

    db.setCollectibleDone({ scope: "ACCOUNT", itemId, done: false });
    const cleared = db.listCollectibles({ scope: "ACCOUNT" }).find((v) => v.id === itemId);
    expect(cleared?.done).toBe(false);

    const characterId = "c1";
    const now = "2026-01-29T00:00:00.000Z";
    db.db.run(
      `
      INSERT INTO app_character (id, name, server, class, created_at, updated_at)
      VALUES ($id, $name, $server, $class, $createdAt, $updatedAt)
      `,
      { $id: characterId, $name: "Test", $server: null, $class: null, $createdAt: now, $updatedAt: now }
    );

    db.setCollectibleDone({ scope: "CHARACTER", characterId, itemId, done: true });

    const charView = db.listCollectibles({ scope: "CHARACTER", characterId }).find((v) => v.id === itemId);
    expect(charView?.done).toBe(true);

    const accountStill = db.listCollectibles({ scope: "ACCOUNT" }).find((v) => v.id === itemId);
    expect(accountStill?.done).toBe(false);
  });
});

