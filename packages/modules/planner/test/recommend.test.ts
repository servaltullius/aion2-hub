import { describe, expect, it } from "vitest";

import { recommendForBudget } from "../lib/recommend";

describe("recommendForBudget", () => {
  it("selects smallest durations first (greedy)", () => {
    const result = recommendForBudget(
      [
        { id: "a", estimatedSeconds: 60 * 10 },
        { id: "b", estimatedSeconds: 60 * 20 },
        { id: "c", estimatedSeconds: 60 * 40 }
      ],
      60 * 30
    );

    expect(result.selected.map((c) => c.id)).toEqual(["a", "b"]);
    expect(result.totalSeconds).toBe(60 * 30);
    expect(result.remainingSeconds).toBe(0);
  });

  it("skips items that do not fit", () => {
    const result = recommendForBudget([{ id: "big", estimatedSeconds: 60 * 50 }], 60 * 30);
    expect(result.selected).toEqual([]);
    expect(result.totalSeconds).toBe(0);
    expect(result.remainingSeconds).toBe(60 * 30);
  });
});

