import { describe, expect, it } from "vitest";

import { detectBuildScoreClassId, getSuggestedPresetIdForClass } from "./classPresets.js";

describe("buildScore class presets", () => {
  it("detectBuildScoreClassId: Korean class label", () => {
    expect(detectBuildScoreClassId("검성")).toBe("gladiator");
  });

  it("getSuggestedPresetIdForClass: returns pve preset id", () => {
    expect(getSuggestedPresetIdForClass("검성", "pve")).toBe("pve:gladiator");
  });

  it("getSuggestedPresetIdForClass: returns pvp preset id", () => {
    expect(getSuggestedPresetIdForClass("검성", "pvp")).toBe("pvp:gladiator");
  });
});

