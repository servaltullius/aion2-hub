# Remove Collectibles (Map/Traces/Cubes) Feature — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Completely remove the “Collectibles (수집/지도/루트)” feature from the desktop app (renderer + main + storage + docs) and ship a clean portable single-file Windows `.exe`.

**Architecture:** Treat Collectibles as a deleted module. Remove UI routes, IPC, storage schema/domains, tests, and any docs that assume the feature exists. Keep backward compatibility by ignoring legacy `collectibles` data in old backups (schema v3) rather than failing import.

**Tech Stack:** Electron + Vite (renderer), sql.js (SQLite), pnpm monorepo, vitest.

---

### Task 1: Remove remaining main/storage Collectibles code

**Files:**
- Modify: `apps/desktop/src/main/storage/db.ts`
- Delete: `apps/desktop/src/main/storage/domains/collectibles.ts`
- Delete: `apps/desktop/src/main/collectibles/**`

**Step 1: Remove schema migration hooks that assume collectibles tables exist**

- Delete `#migrateSchema()`, `#migrateCollectibleItemTable()`, `#backfillCollectibleItemFactionFromMap()`, `#collectibleItemAllowsMaterialKind()`, and the call site in `init()`.

**Step 2: Delete the main-process Collectibles domain and built-in data**

- Remove `apps/desktop/src/main/storage/domains/collectibles.ts`.
- Remove `apps/desktop/src/main/collectibles/` (builtins/map helpers/interactive-map parser).

**Step 3: Verify no remaining imports**

Run: `rg -n "collectibles?|collectible_" apps/desktop/src/main`
Expected: no Collectibles domain/migration references.

---

### Task 2: Remove Collectibles tests and fix any backup tests

**Files:**
- Delete: `apps/desktop/src/main/storage/collectibles*.test.ts`
- Delete: `apps/desktop/src/main/storage/userBackupCollectibles.test.ts`

**Step 1: Delete tests that exist only to validate Collectibles**

- Remove `collectiblesSeed`, `collectiblesMaps`, `collectiblesProgress`, `collectiblesKindMigration`, `userBackupCollectibles` tests.

**Step 2: Run desktop tests**

Run: `pnpm --filter desktop test`
Expected: PASS.

---

### Task 3: Remove Collectibles mentions from renderer copy

**Files:**
- Modify: `apps/desktop/src/renderer/src/pages/SettingsBackupPage.tsx`

**Step 1: Update import warning text**

- Remove “수집” from the copy so it reflects current modules (캐릭터/플래너/세팅 등).

---

### Task 4: Remove Collectibles docs (plans/specs)

**Files:**
- Delete: `docs/plans/2026-01-29-collectibles-*.md`
- Delete: `docs/plans/2026-01-30-collectibles-*.md`

**Step 1: Delete collectibles-only plan docs**

Run: `ls docs/plans | rg "collectibles"`
Then delete those plan documents to avoid confusion.

---

### Task 5: Verify build + create Windows portable single-file `.exe`

**Step 1: Desktop typecheck/build**

Run:
- `pnpm --filter desktop typecheck`
- `pnpm --filter desktop build`

Expected: PASS.

**Step 2: Build Windows portable without WSL rcedit issues**

Run:
- `cd apps/desktop && pnpm exec electron-builder --win portable --config.win.signAndEditExecutable=false`

Expected output: `apps/desktop/release/AION2-HUB-<version>.exe`

