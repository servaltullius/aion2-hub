import { describe, expect, test } from "vitest";

import { nearestNeighborRoute, routeDistance, twoOptImproveRoute } from "./route.js";

describe("collectibles route", () => {
  test("nearestNeighborRoute keeps fixed start when present", () => {
    const points = [
      { id: "A", x: 0, y: 0 },
      { id: "B", x: 10, y: 0 },
      { id: "C", x: 0, y: 10 }
    ];
    const { order, fixedStart } = nearestNeighborRoute({ startId: "A", start: { x: 123, y: 456 }, points });
    expect(fixedStart).toBe(true);
    expect(order[0]).toBe("A");
    expect(order).toHaveLength(3);
  });

  test("twoOptImproveRoute reduces distance on a crossing route (fixed start)", () => {
    // A(0,0) -> D(2,2) -> B(2,0) -> C(0,2) is crossing and suboptimal.
    // 2-opt should improve it to A -> B -> D -> C (or equivalent shorter path).
    const points = [
      { id: "A", x: 0, y: 0 },
      { id: "B", x: 2, y: 0 },
      { id: "C", x: 0, y: 2 },
      { id: "D", x: 2, y: 2 }
    ];
    const pointsById = new Map(points.map((p) => [p.id, p]));
    const order = ["A", "D", "B", "C"];
    const before = routeDistance({ start: { x: 0, y: 0 }, order, pointsById, fixedStart: true });
    const improved = twoOptImproveRoute({ start: { x: 0, y: 0 }, order, pointsById, fixedStart: true, passes: 2 });
    const after = routeDistance({ start: { x: 0, y: 0 }, order: improved, pointsById, fixedStart: true });
    expect(after).toBeLessThan(before);
    expect(improved[0]).toBe("A");
  });
});

