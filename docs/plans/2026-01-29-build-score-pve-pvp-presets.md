# Build Score PvE/PvP Presets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split Build Score “직업 프리셋(추천)” into PvE / PvP variants (option 1) without changing persistence: users pick a mode + class and apply the preset (then Save to persist).

**Architecture:** Keep presets renderer-only (`apps/desktop/src/renderer/src/buildScore/classPresets.ts`). Add `mode` (`pve|pvp`) and provide helper to detect the active character class and suggest the default preset id. UI uses a simple mode toggle + class select (no DB schema changes). Applying preset upserts built-in stats by id and keeps custom stats intact.

**Tech Stack:** Electron (renderer), React, Tailwind, Vitest (unit tests).

---

### Task 1: Define preset “mode” and add PvP presets

**Files:**
- Modify: `apps/desktop/src/renderer/src/buildScore/classPresets.ts`

**Step 1: Implement minimal API for mode**

- Add `BuildScorePresetMode = "pve" | "pvp"`
- Update helper to select a preset by `(mode, classId)`

**Step 2: Add PvP presets (one per class)**

- Create 8 presets: `pvp:<classId>` (e.g. `pvp:gladiator`)
- Ensure each preset references only existing catalog ids
- Keep descriptions clear (“추천 시작점 / 사용자 조정”)

**Step 3: No behavior change for existing PvE ids**

- Keep existing ids (e.g. `pve:gladiator`) stable

---

### Task 2: UI — add PvE/PvP toggle and class select

**Files:**
- Modify: `apps/desktop/src/renderer/src/pages/BuildScorePage.tsx`

**Step 1: Add state**

- Add `presetMode` (`"pve"` default)
- Add `presetClassId` (auto from active character class)

**Step 2: Render controls**

- Add a 2-button segmented toggle: `PvE` / `PvP`
- Add a class select (검성/수호성/…)
- Show description for the selected `(mode,class)`

**Step 3: Apply**

- Apply updates `state.stats` (upsert built-ins by id) and does not auto-save
- Show message: “적용됨 — Save를 눌러 저장”

---

### Task 3: Tests — preset helpers

**Files:**
- Create: `apps/desktop/src/renderer/src/buildScore/classPresets.test.ts`

**Step 1: Write failing tests**

- `detectBuildScoreClassId("검성") === "gladiator"`
- `getSuggestedPresetIdForClass("검성","pve") === "pve:gladiator"`
- `getSuggestedPresetIdForClass("검성","pvp") === "pvp:gladiator"`

**Step 2: Run tests to confirm FAIL**

Run: `pnpm --filter desktop test`

**Step 3: Implement minimal code to pass**

- Adjust exports/helpers as needed

**Step 4: Run tests to confirm PASS**

Run: `pnpm --filter desktop test`

---

### Task 4: Build + package portable EXE

**Files:**
- Modify: `apps/desktop/package.json` (version bump)

**Step 1: Verify**

Run:
- `pnpm --filter desktop typecheck`
- `pnpm --filter desktop build`
- `pnpm --filter desktop test`

**Step 2: Package**

Run:
- `WINEPREFIX="$HOME/.wine-aion2" pnpm --filter desktop package:portable`

**Step 3: Copy to Windows share**

- Copy `apps/desktop/release/AION2-HUB-<version>.exe` → `/mnt/g/aion2hub/`

