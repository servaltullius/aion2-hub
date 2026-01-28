import { describe, expect, it } from "vitest";

import { getModuleById, registerModules } from "../src";
import type { HubModule } from "../src";

describe("module registry", () => {
  it("retrieves a registered module by id", () => {
    const module: HubModule = {
      id: "test",
      name: "Test",
      version: "0.0.0",
      permission: "public",
      nav: [],
      pages: [],
      widgets: []
    };

    registerModules([module]);
    expect(getModuleById("test")?.name).toBe("Test");
  });
});

