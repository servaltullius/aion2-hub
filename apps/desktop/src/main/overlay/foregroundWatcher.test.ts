import { describe, expect, it } from "vitest";

import { parseForegroundLine } from "./foregroundWatcher.js";

describe("foreground watcher line parser", () => {
  it("parses pid/title/processName", () => {
    expect(parseForegroundLine("123\tAION2\tAION2.exe")).toEqual({ pid: 123, title: "AION2", processName: "AION2.exe" });
  });

  it("allows missing processName", () => {
    expect(parseForegroundLine("123\tAION2")).toEqual({ pid: 123, title: "AION2", processName: null });
  });

  it("rejects non-numeric pid", () => {
    expect(parseForegroundLine("x\tAION2")).toBeNull();
  });
});

