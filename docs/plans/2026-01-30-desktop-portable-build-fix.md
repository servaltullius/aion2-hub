# Desktop Portable Build Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Prevent `ERR_MODULE_NOT_FOUND` for workspace deps (ex: `@aion2/constants`) in the Windows portable single-EXE by ensuring `dist/` is always rebuilt before packaging and by adding a regression test that asserts the main bundle does not reference workspace package specifiers at runtime.

**Architecture:** Keep the current approach of shipping only `dist/**` (no `node_modules`) inside `app.asar`. Therefore the Electron main bundle must be self-contained, including workspace packages. Guard this with a small build-output test.

**Tech Stack:** Electron + electron-vite + electron-builder (portable), pnpm workspaces, Vitest.

---

### Task 1: Add regression test for main bundle workspace imports

**Files:**
- Create: `apps/desktop/src/main/bundleSmoke.test.ts`

**Step 1: Write the failing test**

Create `apps/desktop/src/main/bundleSmoke.test.ts` that:
- reads `dist/main/index.js`
- asserts it does **not** contain `from "@aion2/` or `require("@aion2/`

**Step 2: Run test to verify it fails (if bundling regressed)**

Run: `pnpm test`
Expected: FAIL if `dist/main/index.js` still references `@aion2/*`

**Step 3: Adjust test to fail loudly when `dist/main/index.js` is missing**

If `dist/main/index.js` is missing, fail with a clear message like:
`"dist/main/index.js missing — run 'pnpm --filter desktop build' first"`

**Step 4: Run tests**

Run: `pnpm test`
Expected: PASS

---

### Task 2: Make portable packaging rebuild `dist/` automatically

**Files:**
- Modify: `apps/desktop/package.json`

**Step 1: Update `package:portable` script**

Change:
- `node scripts/patch-portable-nsi.mjs && electron-builder --win portable`

To:
- `pnpm run build && node scripts/patch-portable-nsi.mjs && electron-builder --win portable`

**Step 2: Verify build works**

Run: `pnpm --filter desktop package:portable`
Expected: `dist/` rebuilt before `electron-builder` runs

---

### Task 3: Bump Desktop version for release artifact

**Files:**
- Modify: `apps/desktop/package.json`

**Step 1: Bump version**

Bump `version` patch (ex: `0.1.35` → `0.1.36`).

---

### Task 4: Build Windows portable EXE (WSL-safe)

**Files:**
- None (build artifact only)

**Step 1: Desktop build**

Run: `pnpm --filter desktop build`

**Step 2: Patch NSIS portable extraction dir**

Run: `cd apps/desktop && pnpm exec node scripts/patch-portable-nsi.mjs`

**Step 3: Produce EXE**

Run: `cd apps/desktop && pnpm exec electron-builder --win portable --config.win.signAndEditExecutable=false`

Expected artifact:
- `apps/desktop/release/AION2-HUB-0.1.36.exe`

