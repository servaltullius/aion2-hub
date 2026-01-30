import { describe, expect, it } from "vitest";

import { getDailyPeriodKey, getNextDailyResetAt, getNextWeeklyResetAt, getWeeklyPeriodKey } from "../lib/period";

function ymdh(date: Date): [number, number, number, number] {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours()];
}

describe("period keys", () => {
  it("shifts daily period by resetHour", () => {
    const resetHour = 6;
    expect(getDailyPeriodKey(new Date(2026, 0, 28, 5, 0, 0), resetHour)).toBe("2026-01-27");
    expect(getDailyPeriodKey(new Date(2026, 0, 28, 6, 0, 0), resetHour)).toBe("2026-01-28");
  });

  it("computes weekly period key by reset day/hour", () => {
    const resetDay = 1; // Monday
    const resetHour = 6;
    expect(getWeeklyPeriodKey(new Date(2026, 0, 28, 12, 0, 0), resetDay, resetHour)).toBe("2026-01-26");
  });
});

describe("next reset", () => {
  it("computes next daily reset", () => {
    const resetHour = 6;
    expect(ymdh(getNextDailyResetAt(new Date(2026, 0, 28, 5, 0, 0), resetHour))).toEqual([2026, 1, 28, 6]);
    expect(ymdh(getNextDailyResetAt(new Date(2026, 0, 28, 6, 0, 0), resetHour))).toEqual([2026, 1, 29, 6]);
  });

  it("computes next weekly reset", () => {
    const resetDay = 1; // Monday
    const resetHour = 6;
    expect(ymdh(getNextWeeklyResetAt(new Date(2026, 0, 28, 12, 0, 0), resetDay, resetHour))).toEqual([
      2026, 2, 2, 6
    ]);
  });
});
