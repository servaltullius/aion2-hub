# Code Review Hardening Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Apply the high-signal parts of the external review (PlayNC duplication + backup import safety + date parsing consistency) without changing user-facing behavior.

**Architecture:** Extract shared PlayNC fetch/parse logic into a new workspace package and consume it from `apps/worker` + `apps/desktop`. Tighten error handling in backup import transactions. Centralize date parsing to return a single canonical representation (ISO string) across worker/desktop.

**Tech Stack:** TypeScript, pnpm workspaces, Turbo, Electron (desktop), Node (worker)

---

## Task 0: Baseline snapshot (before changes)

**Files:**
- None

**Step 1: Run typecheck**

Run: `pnpm -w typecheck`

Expected: PASS (or capture current failures before proceeding)

---

## Task 1: Verify PlayNC duplication and surface differences

**Files:**
- Read: `apps/worker/src/notices/plaync.ts`
- Read: `apps/desktop/src/main/notices/plaync.ts`

**Step 1: Diff the two implementations**

Run: `git diff --no-index apps/worker/src/notices/plaync.ts apps/desktop/src/main/notices/plaync.ts`

Expected: a mostly-overlapping implementation with a small set of behavioral differences to preserve (e.g. fallback URL rules, postedAt parsing).

---

## Task 2: Create shared PlayNC client package

**Files:**
- Create: `packages/notices-client/package.json`
- Create: `packages/notices-client/tsconfig.json`
- Create: `packages/notices-client/src/index.ts`
- Create: `packages/notices-client/src/plaync.ts`
- Modify: `pnpm-workspace.yaml` (only if needed; should already include `packages/*`)

**Step 1: Add package skeleton**

- Implement a small API surface (pure functions; no Electron deps).

**Step 2: Add minimal unit tests (if existing test infra supports it in packages)**

- Prefer `vitest` if other packages already use it; otherwise skip tests and rely on integration tests in worker/desktop.

**Step 3: Wire workspace dependency**

- Add `@aion2/notices-client` to:
  - `apps/worker/package.json`
  - `apps/desktop/package.json`

---

## Task 3: Refactor worker + desktop to use shared PlayNC client

**Files:**
- Modify: `apps/worker/src/notices/plaync.ts` (convert to re-export/wrapper or delete and update imports)
- Modify: `apps/desktop/src/main/notices/plaync.ts` (convert to re-export/wrapper or delete and update imports)
- Modify: worker/desktop call sites (where those modules are imported)

**Step 1: Replace internal logic with shared import**

- Preserve current behavior (esp. URL fallback + date fields).

**Step 2: Run typecheck for affected apps**

Run: `pnpm -w typecheck`

Expected: PASS

---

## Task 4: Backup import transaction safety

**Files:**
- Modify: `apps/desktop/src/main/storage/domains/backup.ts`

**Step 1: Identify the `BEGIN/COMMIT/ROLLBACK` block**

- Confirm where rollback errors are currently ignored.

**Step 2: Change rollback failure handling**

- If rollback fails, throw a new error that includes both the original error and rollback failure context.
- Keep external behavior stable, but avoid silently continuing after a failed rollback.

**Step 3: Run desktop tests (if present)**

Run: `pnpm -w test`

Expected: PASS

---

## Task 5: Unify date parsing across worker/desktop notices sync

**Files:**
- Create/Modify: `packages/core/src/date.ts` (or `packages/notices-client/src/date.ts` if that better matches existing structure)
- Modify: `apps/worker/src/notices/sync.ts`
- Modify: `apps/desktop/src/main/notices/sync.ts`

**Step 1: Create a single parsing helper**

- Canonical output: ISO string (`string | null`).

**Step 2: Replace local helpers**

- Ensure the DB/storage representation stays unchanged.

**Step 3: Run typecheck/tests**

Run: `pnpm -w typecheck && pnpm -w test`

Expected: PASS

---

## Task 6: Verification pass

**Files:**
- None

**Step 1: Lint + typecheck**

Run: `pnpm -w lint && pnpm -w typecheck`

Expected: PASS

**Step 2: (Optional) Build**

Run: `pnpm -w build`

Expected: PASS

---

## Notes / Constraints

- Repo rule: do not create commits/branches unless explicitly requested.
- Keep behavior stable; this is a refactor + safety hardening pass.
