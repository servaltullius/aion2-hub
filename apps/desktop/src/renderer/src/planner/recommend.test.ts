import { describe, expect, it } from "vitest";

import { recommendPlannerItems } from "./recommend.js";

describe("recommendPlannerItems", () => {
  it("uses avgSeconds when available (falls back to estimateMinutes)", () => {
    const avgSecondsByTemplateId = new Map<string, number>([
      ["t1", 5 * 60] // 5m avg
    ]);

    const res = recommendPlannerItems({
      budgetMinutes: 15,
      items: [
        { templateId: "t1", estimateMinutes: 20 },
        { templateId: "t2", estimateMinutes: 10 }
      ],
      avgSecondsByTemplateId
    });

    expect(res.totalMinutes).toBe(15);
    expect(res.picked.map((p) => p.templateId)).toEqual(["t1", "t2"]);
    expect(res.picked[0]?.source).toBe("avg");
    expect(res.picked[1]?.source).toBe("estimate");
  });

  it("clamps missing/invalid estimates to 5m fallback", () => {
    const res = recommendPlannerItems({
      budgetMinutes: 4,
      items: [{ templateId: "t1", estimateMinutes: 0 }]
    });
    expect(res.picked).toEqual([]);
    expect(res.totalMinutes).toBe(0);
  });
});

