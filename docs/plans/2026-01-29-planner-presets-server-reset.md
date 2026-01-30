# Planner Presets + Server-based Reset Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add (1) server-specific daily/weekly reset settings with fallback to default and (2) built-in AION2 “content pack” planner presets that can be applied in one click.

**Architecture:** Keep using the existing SQLite table `planner_settings`, but treat `id` as a scoped key (`default` or `server:<serverName>`). The renderer edits settings via IPC and always shows the effective settings used for the active character’s server. Presets are applied from the renderer via IPC in a single call that merges (or replaces) templates and reuses the existing auto-assignment behavior.

**Tech Stack:** Electron (main/preload/renderer), sql.js (SQLite), React, Tailwind.

---

### Task 1: Document the new behaviors and data model

**Files:**
- Create: `docs/plans/2026-01-29-planner-presets-server-reset.md`

**Steps:**
1. Describe settings scoping (`default` vs `server:<name>`) and fallback.
2. Describe preset apply modes (`merge` vs `replace`) and safety confirmations.

---

### Task 2: Add server-scoped planner settings in DB layer

**Files:**
- Modify: `apps/desktop/src/main/storage/db.ts`

**Steps:**
1. Add helpers to read/write `planner_settings` by scoped id.
2. Add methods:
   - `getPlannerSettingsBundle(server: string | null)`
   - `setPlannerSettingsDefault(...)`
   - `setPlannerSettingsForServer(server, ...)`
   - `clearPlannerSettingsForServer(server)`
   - `getPlannerSettingsEffective(server)`
3. Update planner period key computation in:
   - `getPlannerOverview(...)`
   - any IPC paths that compute `dailyPeriodKey/weeklyPeriodKey` (toggleComplete)
4. Update backup schema:
   - Export `schemaVersion: 2` and include `planner.settings.default` + `planner.settings.perServer[]`
   - Import supports both v1 and v2

**Verification:**
- Run: `pnpm --filter desktop typecheck` (expect PASS)

---

### Task 3: Add preset apply in DB and IPC

**Files:**
- Modify: `apps/desktop/src/main/storage/db.ts`
- Modify: `apps/desktop/src/main/ipc.ts`

**Steps:**
1. Implement `DesktopDb.applyPlannerPreset({ mode, templates })`:
   - `merge`: add missing templates by `(type,title)` key
   - `replace`: delete all templates first, then add all preset templates
   - return `{ created, skipped }`
2. Add IPC handler `planner:applyPreset` that calls `applyPlannerPreset` and persists once.

**Verification:**
- Run: `pnpm --filter desktop build` (expect PASS)

---

### Task 4: Wire new IPC surface through preload and renderer types

**Files:**
- Modify: `apps/desktop/src/preload/index.ts`
- Modify: `apps/desktop/src/renderer/src/types.d.ts`

**Steps:**
1. Update `planner.getSettings` to accept optional input `{ server?: string | null }`.
2. Add:
   - `planner.clearServerSettings(input)`
   - `planner.applyPreset(input)`

**Verification:**
- Run: `pnpm --filter desktop typecheck` (expect PASS)

---

### Task 5: UI — presets + server-specific reset editor (Planner Templates)

**Files:**
- Create: `apps/desktop/src/renderer/src/planner/presets.ts`
- Modify: `apps/desktop/src/renderer/src/pages/PlannerTemplatesPage.tsx`
- (Optional) Modify: `apps/desktop/src/renderer/src/pages/PlannerTodayPage.tsx`

**Steps:**
1. Add `PLANNER_PRESETS` (AION2 content pack) with a reasonable starter list of DAILY/WEEKLY/CHARGE templates.
2. Add a “프리셋 적용” card:
   - show counts
   - buttons for merge and replace (replace requires confirm)
   - show result `{created, skipped}`
3. Enhance “리셋 설정” card:
   - server selector (from existing character servers + “default”)
   - show whether override exists and what the default is
   - “Save” writes to default or server scope depending on selection
   - “기본값으로 되돌리기” deletes server override
   - show next daily/weekly reset preview based on current inputs
4. (Optional) Show next reset countdown on Planner Today page.

**Verification:**
- Run: `pnpm --filter desktop build` (expect PASS)

---

### Task 6: Add minimal tests for reset period logic

**Files:**
- Create: `apps/desktop/src/main/planner/period.test.ts`

**Steps:**
1. Write a couple of deterministic tests for `dailyPeriodKey` and `weeklyPeriodKey` (fixed Date inputs).
2. Run: `pnpm --filter desktop test` (expect PASS)

---

### Task 7: Package portable EXE and deliver to Windows folder

**Files:**
- Modify: `apps/desktop/package.json` (optional version bump)

**Steps:**
1. Run: `WINEPREFIX="$HOME/.wine-aion2" pnpm --filter desktop package:portable`
2. Copy EXE to: `/mnt/g/aion2hub/`

**Verification:**
- Confirm file exists: `/mnt/g/aion2hub/AION2-HUB-<version>.exe`

