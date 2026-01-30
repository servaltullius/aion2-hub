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

describe("planner duration list/delete", () => {
  it("lists recent durations and deletes by id", async () => {
    const db = await createTestDb();

    const characterId = "c1";
    const now = "2026-01-29T00:00:00.000Z";
    db.db.run(
      `
      INSERT INTO app_character (id, name, server, class, created_at, updated_at)
      VALUES ($id, $name, $server, $class, $createdAt, $updatedAt)
      `,
      { $id: characterId, $name: "Test", $server: null, $class: null, $createdAt: now, $updatedAt: now }
    );

    const templateId = "t1";
    db.db.run(
      `
      INSERT INTO planner_template (id, title, type, estimate_minutes, recharge_hours, max_stacks, created_at, updated_at)
      VALUES ($id, $title, $type, $estimate, $rechargeHours, $maxStacks, $now, $now)
      `,
      { $id: templateId, $title: "Daily 1", $type: "DAILY", $estimate: 10, $rechargeHours: null, $maxStacks: null, $now: now }
    );

    const id1 = db.addPlannerDuration({
      characterId,
      templateId,
      startedAt: "2026-01-29T00:00:00.000Z",
      endedAt: "2026-01-29T00:01:00.000Z",
      seconds: 60
    });
    const id2 = db.addPlannerDuration({
      characterId,
      templateId,
      startedAt: "2026-01-29T00:10:00.000Z",
      endedAt: "2026-01-29T00:12:00.000Z",
      seconds: 120
    });

    const list = db.listPlannerDurations({ characterId, limit: 10 });
    expect(list.map((r) => r.id)).toEqual([id2, id1]);

    db.deletePlannerDuration({ id: id2, characterId });
    const list2 = db.listPlannerDurations({ characterId, limit: 10 });
    expect(list2.map((r) => r.id)).toEqual([id1]);
  });
});

