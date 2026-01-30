# Build Score “내 프리셋” (저장/복제/삭제) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-character user presets for Build Score weights: save current weights as a named preset, clone, rename, delete, and apply (then Save to persist).

**Architecture:** Store presets in SQLite (new table `build_score_preset`) keyed by `character_id`. Presets store only the **weights list** (`stats[]`) and metadata (name/description timestamps). Renderer loads presets via IPC and can apply a preset to the current state without auto-saving.

**Tech Stack:** Electron (main/preload/renderer), sql.js (SQLite), React, Tailwind, Vitest.

---

### Task 1: Storage — add `build_score_preset` table

**Files:**
- Modify: `apps/desktop/src/main/storage/schema.ts`

**Step 1: Add table**

```sql
CREATE TABLE IF NOT EXISTS build_score_preset (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stats_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (character_id) REFERENCES app_character(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_build_score_preset_character_updated
  ON build_score_preset (character_id, updated_at);
```

---

### Task 2: DB API — CRUD for presets + backup round-trip

**Files:**
- Modify: `apps/desktop/src/main/storage/db.ts`

**Step 1: Add types**

- `BuildScorePreset` and `BuildScorePresetListItem` (id/name/updatedAt etc.)

**Step 2: Add methods**

- `listBuildScorePresets(characterId)`
- `getBuildScorePreset(presetId)`
- `createBuildScorePreset(characterId, input)` (name/description + raw buildScore state to extract `stats`)
- `updateBuildScorePreset(presetId, input)` (rename/description)
- `cloneBuildScorePreset(presetId, newName?)`
- `deleteBuildScorePreset(presetId)`

**Step 3: Backup export/import**

- Export presets under `buildScore.presets` when present
- Import restores presets after characters are inserted

**Verification:**
- `pnpm --filter desktop typecheck` (PASS)

---

### Task 3: IPC + preload surface

**Files:**
- Modify: `apps/desktop/src/main/ipc.ts`
- Modify: `apps/desktop/src/preload/index.ts`
- Modify: `apps/desktop/src/renderer/src/types.d.ts`

**Step 1: IPC handlers**

- `buildScorePreset:list`
- `buildScorePreset:get`
- `buildScorePreset:create`
- `buildScorePreset:update`
- `buildScorePreset:clone`
- `buildScorePreset:delete`

**Step 2: Preload**

- Expose `window.aion2Hub.buildScorePresets.*`

---

### Task 4: UI — “내 프리셋” card

**Files:**
- Modify: `apps/desktop/src/renderer/src/pages/BuildScorePage.tsx`

**Step 1: Load presets**

- On character change, load preset list

**Step 2: Save current**

- Name input + “현재 가중치 저장” → creates preset from current state.stats

**Step 3: Apply / Rename / Clone / Delete**

- Apply modifies local state only (message: “적용됨 — Save로 저장”)
- Rename/Clone via prompt (simple UX)
- Delete requires confirm

---

### Task 5: Tests — DB-free sanity + build/package

**Files:**
- Create (optional): `apps/desktop/src/renderer/src/buildScore/presetApply.test.ts`
- Modify: `apps/desktop/package.json` (version bump)

**Step 1: Verify**

- `pnpm --filter desktop test`
- `pnpm --filter desktop build`

**Step 2: Package**

- `WINEPREFIX="$HOME/.wine-aion2" pnpm --filter desktop package:portable`
- Copy EXE to `/mnt/g/aion2hub/`

