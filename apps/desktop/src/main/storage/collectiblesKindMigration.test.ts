import path from "node:path";
import { createRequire } from "node:module";

import initSqlJs from "sql.js";
import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    isPackaged: false
  }
}));

async function createLegacyDb() {
  const wasmDir = path.dirname(createRequire(import.meta.url).resolve("sql.js/dist/sql-wasm.wasm"));
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(wasmDir, file)
  });
  const db = new SQL.Database();
  const now = "2026-01-29T00:00:00.000Z";

  // Simulate an older schema:
  // - collectible_item.kind only allowed TRACE/CUBE
  // - no faction column
  db.run(
    `
    CREATE TABLE collectible_item (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK(kind IN ('TRACE','CUBE')),
      map TEXT NOT NULL,
      region TEXT,
      name TEXT NOT NULL,
      note TEXT,
      x REAL,
      y REAL,
      source TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    `
  );

  db.run(
    `
    CREATE TABLE app_character (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      server TEXT,
      class TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    `
  );

  db.run(
    `
    CREATE TABLE collectible_progress (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL CHECK(scope IN ('ACCOUNT','CHARACTER')),
      character_id TEXT,
      item_id TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 1 CHECK(done IN (0,1)),
      done_at TEXT,
      updated_at TEXT NOT NULL,
      CHECK((scope = 'ACCOUNT' AND character_id IS NULL) OR (scope = 'CHARACTER' AND character_id IS NOT NULL)),
      FOREIGN KEY (character_id) REFERENCES app_character(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES collectible_item(id) ON DELETE CASCADE
    );
    `
  );

  db.run(
    `
    INSERT INTO collectible_item (id, kind, map, region, name, note, x, y, source, created_at, updated_at)
    VALUES ($id, $kind, $map, $region, $name, $note, $x, $y, $source, $now, $now)
    `,
    {
      $id: "legacy:trace:1",
      $kind: "TRACE",
      $map: "World_L_A",
      $region: null,
      $name: "LegacyTrace",
      $note: null,
      $x: 100,
      $y: 200,
      $source: "legacy",
      $now: now
    }
  );

  db.run(
    `
    INSERT INTO collectible_progress (id, scope, character_id, item_id, done, done_at, updated_at)
    VALUES ($id, $scope, $characterId, $itemId, 1, $doneAt, $now)
    `,
    { $id: "legacy:progress:1", $scope: "ACCOUNT", $characterId: null, $itemId: "legacy:trace:1", $doneAt: now, $now: now }
  );

  const { DesktopDb } = await import("./db.js");
  const wrapped = new DesktopDb("test.sqlite", db);
  wrapped.init();
  return wrapped;
}

describe("collectibles migration", () => {
  it("rebuilds collectible_item to allow MATERIAL and keeps existing progress", async () => {
    const db = await createLegacyDb();

    const legacy = db.listCollectibles({ scope: "ACCOUNT", kind: "TRACE" }).find((v) => v.id === "legacy:trace:1");
    expect(legacy?.done).toBe(true);

    db.importCollectibleItems({
      items: [
        {
          id: "import:material:1",
          kind: "MATERIAL",
          map: "World_L_A",
          faction: "ELYOS",
          region: "TestRegion",
          name: "1",
          note: null,
          x: 1,
          y: 2,
          source: "test"
        }
      ]
    });

    const material = db.listCollectibles({ scope: "ACCOUNT", kind: "MATERIAL" }).find((v) => v.id === "import:material:1");
    expect(material).not.toBeNull();
  });
});

