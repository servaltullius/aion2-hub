import { describe, expect, it } from "vitest";

import { worldBoundsForViewport } from "./collectiblesMapViewport.js";

describe("worldBoundsForViewport", () => {
  it("returns expected bounds for identity transform", () => {
    const b = worldBoundsForViewport({
      viewportWidthPx: 1000,
      viewportHeightPx: 800,
      panX: 0,
      panY: 0,
      scale: 1,
      paddingPx: 0
    });

    expect(b).toEqual({ left: 0, top: 0, right: 1000, bottom: 800 });
  });

  it("handles pan+scale", () => {
    const b = worldBoundsForViewport({
      viewportWidthPx: 1000,
      viewportHeightPx: 800,
      panX: 100,
      panY: 50,
      scale: 2,
      paddingPx: 0
    });

    expect(b).toEqual({ left: -50, top: -25, right: 450, bottom: 375 });
  });
});

