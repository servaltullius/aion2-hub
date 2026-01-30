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

describe("planner duration stats", () => {
  it("aggregates count/total/avg per template with optional since filter", async () => {
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

    const t1 = "t1";
    const t2 = "t2";
    db.db.run(
      `
      INSERT INTO planner_template (id, title, type, estimate_minutes, recharge_hours, max_stacks, created_at, updated_at)
      VALUES ($id, $title, $type, $estimate, $rechargeHours, $maxStacks, $now, $now)
      `,
      { $id: t1, $title: "Daily 1", $type: "DAILY", $estimate: 10, $rechargeHours: null, $maxStacks: null, $now: now }
    );
    db.db.run(
      `
      INSERT INTO planner_template (id, title, type, estimate_minutes, recharge_hours, max_stacks, created_at, updated_at)
      VALUES ($id, $title, $type, $estimate, $rechargeHours, $maxStacks, $now, $now)
      `,
      { $id: t2, $title: "Weekly 1", $type: "WEEKLY", $estimate: 20, $rechargeHours: null, $maxStacks: null, $now: now }
    );

    db.addPlannerDuration({
      characterId,
      templateId: t1,
      startedAt: "2026-01-29T00:00:00.000Z",
      endedAt: "2026-01-29T00:01:00.000Z",
      seconds: 60
    });
    db.addPlannerDuration({
      characterId,
      templateId: t1,
      startedAt: "2026-01-29T00:10:00.000Z",
      endedAt: "2026-01-29T00:12:00.000Z",
      seconds: 120
    });
    db.addPlannerDuration({
      characterId,
      templateId: t2,
      startedAt: "2026-01-29T00:20:00.000Z",
      endedAt: "2026-01-29T00:20:30.000Z",
      seconds: 30
    });

    const all = db.getPlannerDurationStats({ characterId });
    expect(all).toEqual([
      { templateId: t1, count: 2, totalSeconds: 180, avgSeconds: 90 },
      { templateId: t2, count: 1, totalSeconds: 30, avgSeconds: 30 }
    ]);

    const since = db.getPlannerDurationStats({ characterId, sinceIso: "2026-01-29T00:05:00.000Z" });
    expect(since).toEqual([
      { templateId: t1, count: 1, totalSeconds: 120, avgSeconds: 120 },
      { templateId: t2, count: 1, totalSeconds: 30, avgSeconds: 30 }
    ]);
  });
});

