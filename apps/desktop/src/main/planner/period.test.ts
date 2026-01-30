import { describe, expect, it } from "vitest";

import { dailyPeriodKey, weeklyPeriodKey } from "./period.js";

describe("planner period keys", () => {
  it("dailyPeriodKey: before reset uses previous day key", () => {
    const now = new Date(2026, 0, 29, 8, 59, 0, 0);
    expect(dailyPeriodKey(now, "09:00")).toBe("D:2026-01-28");
  });

  it("dailyPeriodKey: at/after reset uses same day key", () => {
    const atReset = new Date(2026, 0, 29, 9, 0, 0, 0);
    const after = new Date(2026, 0, 29, 23, 0, 0, 0);
    expect(dailyPeriodKey(atReset, "09:00")).toBe("D:2026-01-29");
    expect(dailyPeriodKey(after, "09:00")).toBe("D:2026-01-29");
  });

  it("weeklyPeriodKey: uses weekly reset day at reset time", () => {
    const now = new Date(2026, 0, 29, 10, 0, 0, 0); // Thu
    expect(weeklyPeriodKey(now, "09:00", 1)).toBe("W:2026-01-26"); // Mon
  });

  it("weeklyPeriodKey: before reset time falls back to previous week", () => {
    const now = new Date(2026, 0, 26, 8, 0, 0, 0); // Mon, before 09:00
    expect(weeklyPeriodKey(now, "09:00", 1)).toBe("W:2026-01-19");
  });
});

