import path from "node:path";
import { createRequire } from "node:module";

import initSqlJs from "sql.js";
import { describe, expect, it, vi } from "vitest";

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

describe("build score preset JSON import", () => {
  it("does not overwrite existing preset even if payload includes matching id", async () => {
    const db = await createTestDb();

    const characterId = "c1";
    const now = new Date().toISOString();
    db.db.run(
      `
      INSERT INTO app_character (id, name, server, class, created_at, updated_at)
      VALUES ($id, $name, $server, $class, $createdAt, $updatedAt)
      `,
      { $id: characterId, $name: "Test", $server: null, $class: null, $createdAt: now, $updatedAt: now }
    );

    const existingId = "p1";
    const originalStats = [{ id: "builtin:power", label: "위력", unit: "flat", enabled: true, weight: 1 }];
    db.db.run(
      `
      INSERT INTO build_score_preset (id, character_id, name, description, stats_json, created_at, updated_at)
      VALUES ($id, $c, $name, $desc, $stats, $createdAt, $updatedAt)
      `,
      {
        $id: existingId,
        $c: characterId,
        $name: "Original",
        $desc: null,
        $stats: JSON.stringify(originalStats),
        $createdAt: now,
        $updatedAt: now
      }
    );

    const importedStats = [{ id: "builtin:power", label: "위력", unit: "flat", enabled: true, weight: 2 }];
    const payload = {
      preset: { id: existingId, name: "Imported", description: null, stats: importedStats }
    };

    const created = db.importBuildScorePresetsFromJson({ characterId, payload });

    expect(created).toHaveLength(1);
    expect(created[0]?.id).not.toBe(existingId);

    const existing = db.getBuildScorePreset(existingId);
    expect(existing?.name).toBe("Original");
    expect(existing?.stats).toEqual(originalStats);
  });
});

