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

describe("collectibles maps", () => {
  it("returns map metadata for seeded collectible maps", async () => {
    const db = await createTestDb();

    const expectedNames = new Set(builtinCollectibles.map((v) => v.map));
    const maps = db.listCollectibleMaps();

    for (const name of expectedNames) {
      expect(maps.some((m) => m.name === name)).toBe(true);
    }

    const lightA = maps.find((m) => m.name === "World_L_A");
    expect(lightA?.width).toBe(8192);
    expect(lightA?.height).toBe(8192);

    const abyssB = maps.find((m) => m.name === "Abyss_Reshanta_B");
    expect(abyssB?.width).toBe(2048);
    expect(abyssB?.height).toBe(2048);
  });
});

