# Build Score — Class Presets + Stat Terminology Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add (1) recommended class-based weight presets and (2) more accurate AION2 stat labels in the Build Score module.

**Architecture:** Keep Build Score data local-first and per-character (SQLite row `build_score.character_id`). Presets live in the renderer as a small catalog that updates the current character’s saved Build Score state by *upserting* built-in stat rows (by id) and adjusting `enabled/weight` while leaving custom stats intact.

**Tech Stack:** Electron (main/preload/renderer), React, Tailwind.

---

### Task 1: Web research — confirm stat labels/terms

**Files:**
- Modify: `apps/desktop/src/renderer/src/buildScore/catalog.ts`
- Modify: `apps/desktop/src/main/storage/db.ts`

**Steps:**
1. Verify common stat labels used in AION2 UI/community references (e.g. 위력/민첩/정확/의지/지식/체력, 전투 속도, 피해 증폭, 무기 피해 증폭, 강타/완벽/철벽/재생, 명중/회피/막기/방어력 등).
2. Update `BUILD_SCORE_CATALOG` labels/units and add any missing “frequently referenced” stats (keep ids stable when possible).
3. Align `defaultBuildScoreState()` ids/labels to the renderer catalog so new characters start with consistent terms.

**Verification:**
- Run: `pnpm --filter desktop typecheck` (expect PASS)

---

### Task 2: Define class preset catalog (recommended starting points)

**Files:**
- Create: `apps/desktop/src/renderer/src/buildScore/classPresets.ts`

**Steps:**
1. Define supported classes (initially the 8 core classes) and a single “추천 (PvE)” preset per class.
2. For each preset, list built-in stat ids with `enabled` + `weight` adjustments.
3. Keep presets conservative and labeled as “추천 시작점” (user-editable).

---

### Task 3: UI — apply preset into current character state

**Files:**
- Modify: `apps/desktop/src/renderer/src/pages/BuildScorePage.tsx`

**Steps:**
1. Add a “직업 프리셋” card:
   - selects class (defaults to active character class when possible)
   - button to apply preset (non-destructive: merges into existing stats; keeps custom stats)
2. Implement `applyPreset(state, preset)` that:
   - upserts the built-in stat rows by id (ensure label/unit from catalog)
   - sets `enabled/weight` for preset stats
   - does not delete other stats
3. Show a small toast/message after applying (e.g. “프리셋을 적용했습니다. Save를 눌러 저장하세요.”)

**Verification:**
- Run: `pnpm --filter desktop build` (expect PASS)

---

### Task 4: Regression check — export/import + packaging

**Files:**
- (Optional) Modify: `apps/desktop/src/main/storage/db.ts`

**Steps:**
1. Ensure backup export/import continues to round-trip Build Score state (schema v2 optional field).
2. Package portable EXE:
   - Run: `WINEPREFIX=\"$HOME/.wine-aion2\" pnpm --filter desktop package:portable`

**Verification:**
- Launch the EXE on Windows and confirm:
  - Build Score page loads
  - preset apply works and can be saved
  - existing characters are unaffected unless user saves

