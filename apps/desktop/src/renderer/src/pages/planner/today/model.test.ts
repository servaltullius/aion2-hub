import { describe, expect, it } from "vitest";

import { asDurationStats, asOverview } from "./model.js";

describe("planner today model parsing", () => {
  it("returns null for invalid overview payload", () => {
    expect(asOverview(null)).toBeNull();
    expect(asOverview({})).toBeNull();
  });

  it("parses duration stats list", () => {
    const out = asDurationStats([{ templateId: "t1", count: 1, totalSeconds: 10, avgSeconds: 10 }]);
    expect(out?.[0]?.templateId).toBe("t1");
  });
});

