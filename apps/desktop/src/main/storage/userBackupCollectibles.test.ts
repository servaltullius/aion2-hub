import path from "node:path";
import { createRequire } from "node:module";

import initSqlJs from "sql.js";
import { describe, expect, it, vi } from "vitest";

import { builtinCollectibles } from "../collectibles/builtin.js";

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getVersion: () => "test"
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

describe("user backup (schema v3) includes collectibles", () => {
  it("exports and restores collectibles items + progress", async () => {
    const db = await createTestDb();

    const [item1, item2, item3] = builtinCollectibles.slice(0, 3);
    if (!item1 || !item2 || !item3) throw new Error("missing builtinCollectibles");

    db.setCollectibleDone({ scope: "ACCOUNT", itemId: item1.id, done: true });

    const characterId = db.createCharacter({ name: "Test" });
    db.setCollectibleDone({ scope: "CHARACTER", characterId, itemId: item2.id, done: true });

    const backup = db.exportUserBackup();
    expect(backup.schemaVersion).toBe(3);
    expect(backup.collectibles?.items?.length).toBeGreaterThan(0);
    expect(backup.collectibles?.progress?.length).toBeGreaterThanOrEqual(2);

    const p1 = backup.collectibles?.progress.find((p) => p.scope === "ACCOUNT" && p.itemId === item1.id);
    expect(p1?.characterId ?? null).toBeNull();
    expect(p1?.done).toBe(true);

    const p2 = backup.collectibles?.progress.find((p) => p.scope === "CHARACTER" && p.itemId === item2.id);
    expect(p2?.characterId).toBe(characterId);
    expect(p2?.done).toBe(true);

    const restored = await createTestDb();

    // Ensure the import clears existing ACCOUNT progress not present in the backup.
    restored.setCollectibleDone({ scope: "ACCOUNT", itemId: item3.id, done: true });
    const beforeReplace = restored.listCollectibles({ scope: "ACCOUNT" }).find((v) => v.id === item3.id);
    expect(beforeReplace?.done).toBe(true);

    restored.importUserBackup(backup);

    const afterAccount = restored.listCollectibles({ scope: "ACCOUNT" }).find((v) => v.id === item1.id);
    expect(afterAccount?.done).toBe(true);

    const afterReplaced = restored.listCollectibles({ scope: "ACCOUNT" }).find((v) => v.id === item3.id);
    expect(afterReplaced?.done).toBe(false);

    const afterCharacter = restored.listCollectibles({ scope: "CHARACTER", characterId }).find((v) => v.id === item2.id);
    expect(afterCharacter?.done).toBe(true);
  });
});
