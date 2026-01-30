import { describe, expect, it } from "vitest";

import type { DesktopDb } from "./storage/db.js";
import { startNoticesScheduler } from "./scheduler.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("notices scheduler", () => {
  it("syncNow joins in-flight run", async () => {
    const gate = deferred<void>();
    let calls = 0;

    const scheduler = startNoticesScheduler({} as DesktopDb, {
      intervalMs: 60 * 60 * 1000,
      sync: async () => {
        calls += 1;
        await gate.promise;
        return { ok: true };
      }
    });

    expect(calls).toBe(1); // startup run started immediately
    expect(scheduler.getStatus().running).toBe(true);

    let resolved = false;
    const p = scheduler.syncNow().then(() => {
      resolved = true;
    });

    // Still one in-flight call; syncNow should not start a second run.
    expect(calls).toBe(1);

    await new Promise((r) => setTimeout(r, 0));
    expect(resolved).toBe(false);

    gate.resolve();
    await p;

    expect(resolved).toBe(true);
    expect(scheduler.getStatus().running).toBe(false);
    expect(calls).toBe(1);

    scheduler.stop();
  });
});

