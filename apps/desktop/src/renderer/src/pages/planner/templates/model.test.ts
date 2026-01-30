import { describe, expect, it } from "vitest";

import { asSettingsBundle, asTemplates } from "./model.js";

describe("planner templates model parsing", () => {
  it("parses templates list", () => {
    const out = asTemplates([
      { id: "t1", title: "X", type: "DAILY", estimateMinutes: 10, rechargeHours: null, maxStacks: null }
    ]);
    expect(out?.[0]?.id).toBe("t1");
  });

  it("returns null for invalid settings bundle", () => {
    expect(asSettingsBundle({})).toBeNull();
  });
});

