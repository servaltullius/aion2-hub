import { describe, expect, it } from "vitest";

import { computeDurationSeconds, formatDurationSeconds } from "./duration.js";

describe("planner duration helpers", () => {
  it("computeDurationSeconds clamps to >= 1s", () => {
    expect(computeDurationSeconds(1000, 1000)).toBe(1);
    expect(computeDurationSeconds(1000, 1500)).toBe(1);
    expect(computeDurationSeconds(1000, 2500)).toBe(2);
  });

  it("formatDurationSeconds formats seconds into mm ss", () => {
    expect(formatDurationSeconds(5)).toBe("0m 5s");
    expect(formatDurationSeconds(65)).toBe("1m 5s");
  });
});

