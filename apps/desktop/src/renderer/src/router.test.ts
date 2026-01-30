import { describe, expect, it } from "vitest";

import { parseRoute } from "./router.js";

describe("parseRoute", () => {
  it("parses overlay route + tab", () => {
    expect(parseRoute("#/overlay?tab=loot")).toEqual({ name: "overlay", tab: "loot" });
  });

  it("defaults overlay tab to planner", () => {
    expect(parseRoute("#/overlay")).toEqual({ name: "overlay", tab: "planner" });
  });
});

