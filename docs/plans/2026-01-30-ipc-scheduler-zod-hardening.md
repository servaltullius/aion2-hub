# IPC/Scheduler/Zod Hardening Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Standardize IPC error handling (no silent failures), make the notices scheduler `syncNow()` deterministic under concurrency, and introduce Zod-based runtime validation for at least one complex IPC input (keeping existing IPC return shapes).

**Architecture:** Keep existing IPC channel names + return payloads. Tighten one known “catch-all swallow” in `planner:getOverview` to only handle the intended “active character missing” case. Update the scheduler to track an in-flight promise so manual sync requests join the current run instead of no-op. Introduce a small Zod helper and apply it to a representative complex IPC endpoint (`loot:createRun`) for safer parsing.

**Tech Stack:** Electron (main/renderer), TypeScript, Vitest, pnpm workspaces, Turbo

> Note: Repo rule says no commits unless explicitly requested, so this plan omits commit steps.

---

## Task 0: Baseline verification

**Files:**
- None

**Step 1: Run tests**

Run: `pnpm -w test`

Expected: PASS

---

## Task 1: IPC error handling standardization (option 1)

**Files:**
- Modify: `apps/desktop/src/main/ipcHandlers/plannerHandlers.ts`

**Step 1: Narrow the `planner:getOverview` catch**

- Keep returning `null` when there is no active character.
- Only swallow the specific `"character_not_found"` case:
  - Clear active character id
  - Persist
  - Return `null`
- Re-throw all other errors (no silent failures).

**Step 2: Typecheck desktop**

Run: `pnpm --dir apps/desktop run typecheck`

Expected: PASS

---

## Task 2: Scheduler in-flight joining + tests

**Files:**
- Modify: `apps/desktop/src/main/scheduler.ts`
- Test: `apps/desktop/src/main/scheduler.test.ts`

**Step 1: Add in-flight promise tracking**

- Ensure `run()` returns the same promise while a run is in progress.
- Ensure `syncNow()` always waits for completion (even if already running).
- Preserve current status fields.

**Step 2: Add a test harness**

- Allow injecting a `sync` function via `startNoticesScheduler(db, { sync })` for tests.
- Write tests:
  - Multiple `syncNow()` calls while running should resolve after the single in-flight run finishes.

**Step 3: Run desktop tests**

Run: `pnpm --dir apps/desktop run test`

Expected: PASS

---

## Task 3: Zod runtime validation (minimal, high-value)

**Files:**
- Modify: `apps/desktop/package.json` (add `zod`)
- Create: `apps/desktop/src/main/ipcHandlers/validate.ts`
- Modify: `apps/desktop/src/main/ipcHandlers/lootHandlers.ts`

**Step 1: Add Zod dependency**

- Add `zod` to desktop dependencies.

**Step 2: Add `parseInput()` helper**

- `parseInput(schema, unknown)` should throw `new Error("bad_request")` on validation failures.
- Keep error surface stable (same error codes).

**Step 3: Apply to `loot:createRun`**

- Use a schema for the complex payload (drops/costs arrays).
- Keep current normalization behavior (trim/filter) as needed.

**Step 4: Typecheck**

Run: `pnpm --dir apps/desktop run typecheck`

Expected: PASS

---

## Task 4: Final verification

**Files:**
- None

**Step 1: Lint + typecheck + tests**

Run: `pnpm -w lint && pnpm -w typecheck && pnpm -w test`

Expected: PASS

