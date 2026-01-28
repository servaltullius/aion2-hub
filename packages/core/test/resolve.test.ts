import { describe, expect, it } from "vitest";

import { registerModules, resolveModulePage } from "../src";
import type { HubModule } from "../src";

describe("resolveModulePage", () => {
  it("returns a page when it exists", () => {
    const module: HubModule = {
      id: "planner",
      name: "Planner",
      version: "0.0.0",
      permission: "public",
      nav: [],
      pages: [
        {
          id: "today",
          title: "Today",
          href: "/m/planner/today",
          load: async () => ({ default: () => null })
        }
      ],
      widgets: []
    };

    registerModules([module]);

    const resolved = resolveModulePage("planner", "today");
    expect(resolved?.module.id).toBe("planner");
    expect(resolved?.page.id).toBe("today");
  });

  it("returns undefined when missing", () => {
    const resolved = resolveModulePage("planner", "missing");
    expect(resolved).toBeUndefined();
  });
});

