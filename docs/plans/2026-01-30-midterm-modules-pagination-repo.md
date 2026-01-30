# Mid-term Hardening (Modules Cache + Pagination Constants + Repo Layer) Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Reduce runtime flakiness and “magic numbers” by (1) caching module page/widget dynamic loads with retry-safe behavior, (2) centralizing pagination-related constants, and (3) introducing a small repository layer for worker notice sync DB operations.

**Architecture:** Implement load caching in `@aion2/core` so all consumers benefit. Add a tiny `@aion2/constants` package for shared pagination values. Extract Prisma calls used by worker notices sync into a repository module and inject it into `syncNotices`.

**Tech Stack:** TypeScript, pnpm workspaces, Turbo, Next.js (web), Prisma (worker/api), Electron (desktop)

---

## Task 0: Baseline verification

**Files:**
- None

**Step 1: Lint/typecheck/tests**

Run: `pnpm -w lint && pnpm -w typecheck && pnpm -w test`

Expected: PASS

---

## Task 1: Module page/widget load caching + error boundary

**Files:**
- Modify: `packages/core/src/resolve.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `apps/web/components/ModulePageClient.tsx`
- Modify: `apps/web/components/DashboardWidgetGrid.tsx`
- Create: `apps/web/components/ErrorBoundary.tsx` (simple local boundary)

**Step 1: Add `loadModulePage()` / `loadModuleWidget()`**

- Cache the promise per key (`moduleId:pageId`, `moduleId:widgetId`).
- On load failure, delete cache entry so “Retry” can work.

**Step 2: Web usage**

- Replace direct `page.load()` / `widget.load()` calls with `loadModulePage()` / `loadModuleWidget()`.
- Wrap lazy components in an error boundary that shows a small message + Retry button.

**Step 3: Verify**

Run: `pnpm -w typecheck && pnpm -w test`

Expected: PASS

---

## Task 2: Pagination constants centralization

**Files:**
- Create: `packages/constants/package.json`
- Create: `packages/constants/tsconfig.json`
- Create: `packages/constants/src/index.ts`
- Modify: `apps/api/package.json` (add workspace dep)
- Modify: `apps/desktop/package.json` (add workspace dep)
- Modify: `apps/worker/package.json` (add workspace dep)
- Modify: `apps/api/src/routes/notices.ts`
- Modify: `apps/desktop/src/main/notices/sync.ts`
- Modify: `apps/worker/src/notices/sync.ts`
- Modify: `apps/worker/src/notices-sync.ts`
- Modify: `apps/desktop/src/main/storage/domains/notices.ts`
- Modify: `apps/desktop/src/main/storage/domains/planner.ts`

**Step 1: Add `@aion2/constants` with a `PAGINATION` object**

- Include: notices list defaults/max, notices sync defaults, planner duration limits.

**Step 2: Replace magic numbers**

- Replace `18/20/50/200` occurrences in the above files with named constants.

**Step 3: Verify**

Run: `pnpm -w lint && pnpm -w typecheck && pnpm -w test`

Expected: PASS

---

## Task 3: Repository layer refactor (worker notices sync)

**Files:**
- Create: `apps/worker/src/notices/repo.ts`
- Modify: `apps/worker/src/notices/sync.ts`

**Step 1: Extract DB calls behind a small interface**

- Introduce an interface for the operations `syncNotices` needs (find latest snapshot, upsert item, upsert snapshot, upsert diff).
- Default implementation uses Prisma.
- `syncNotices()` accepts an optional repo override for tests.

**Step 2: Verify**

Run: `pnpm -w typecheck && pnpm --dir apps/worker run test`

Expected: PASS

---

## Task 4: Final verification

**Files:**
- None

**Step 1: Full verification**

Run: `pnpm -w lint && pnpm -w typecheck && pnpm -w test`

Expected: PASS

