import { describe, expect, it } from "vitest";

import { buildLineDiffJson } from "../src/notices/diff.js";

describe("buildLineDiffJson", () => {
  it("produces deterministic added/removed/same blocks", () => {
    const fromText = ["a", "b", "c"].join("\n");
    const toText = ["a", "b2", "c"].join("\n");

    expect(buildLineDiffJson(fromText, toText)).toEqual([
      { type: "same", lines: ["a"] },
      { type: "removed", lines: ["b"] },
      { type: "added", lines: ["b2"] },
      { type: "same", lines: ["c"] }
    ]);
  });

  it("merges adjacent blocks of same type", () => {
    const fromText = ["a", "b", "c", "d"].join("\n");
    const toText = ["a", "b", "x", "d"].join("\n");

    expect(buildLineDiffJson(fromText, toText)).toEqual([
      { type: "same", lines: ["a", "b"] },
      { type: "removed", lines: ["c"] },
      { type: "added", lines: ["x"] },
      { type: "same", lines: ["d"] }
    ]);
  });
});

