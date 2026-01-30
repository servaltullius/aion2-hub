import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function resolveMainBundlePath() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "dist", "main", "index.js");
}

describe("desktop main bundle", () => {
  it("does not reference workspace packages at runtime", async () => {
    const mainBundlePath = resolveMainBundlePath();
    let bundleText: string;

    try {
      bundleText = await readFile(mainBundlePath, "utf8");
    } catch (err) {
      throw new Error(
        `dist/main/index.js missing (${mainBundlePath}) — run 'pnpm --filter desktop build' first`,
        { cause: err },
      );
    }

    expect(bundleText).not.toMatch(/from\s+["']@aion2\//);
    expect(bundleText).not.toMatch(/import\s+["']@aion2\//);
    expect(bundleText).not.toMatch(/require\(\s*["']@aion2\//);
  });
});
