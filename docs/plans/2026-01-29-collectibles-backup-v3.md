# Collectibles Backup v3 (Items + Progress) Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` (or implement task-by-task in this session).

**Goal:** 사용자 백업/복원(`exportUserBackup`/`importUserBackup`)에 수집품(주신의 흔적/히든 큐브) **데이터셋(items)** 과 **완료 진행도(progress)** 를 포함한다.

**Architecture:** 백업 `schemaVersion` 을 `3`으로 올리고, `collectibles: { items, progress }` 를 포함한다. 복원 시에는 기존 데이터(특히 ACCOUNT 범위 진행도가 남는 문제)를 정리하고, `collectibles.items → collectibles.progress` 순서로 머지/복원한다(캐릭터 FK를 위해 캐릭터 생성 후 진행도 복원).

**Tech Stack:** Electron(main+preload+renderer), sql.js(SQLite), Vitest

---

## Task 1: Export collectibles progress rows

**Files**
- Modify: `apps/desktop/src/main/storage/db.ts`
- Test: `apps/desktop/src/main/storage/userBackupCollectibles.test.ts`

**Step 1: Write failing test**
- Create a DB
- Mark 1 built-in item as done for `ACCOUNT`
- Create a character and mark 1 item as done for `CHARACTER`
- Export backup and assert `backup.collectibles.progress.length >= 2`

**Step 2: Implement export method**
- Add `exportCollectibleProgress()` that returns rows in a stable order:
  - fields: `id, scope, characterId, itemId, done, doneAt, updatedAt`

**Step 3: Run tests**
- Run: `pnpm --filter desktop test`
- Expected: FAIL before implementation, PASS after.

---

## Task 2: Import collectibles progress rows (transaction-safe)

**Files**
- Modify: `apps/desktop/src/main/storage/db.ts`
- Test: `apps/desktop/src/main/storage/userBackupCollectibles.test.ts`

**Step 1: Extend failing test**
- New DB (fresh)
- Import backup (schema v3)
- Assert account/character progress restored (`listCollectibles` shows done)

**Step 2: Implement import method**
- Add `importCollectibleProgress({ progress, wrapInTransaction? })`
  - Validate array
  - Skip invalid rows and rows referencing missing characters/items
  - Use `INSERT OR REPLACE INTO collectible_progress (...) VALUES (...)`
  - Support `wrapInTransaction:false` for nested calls inside `importUserBackup()`.

**Step 3: Run tests**
- Run: `pnpm --filter desktop test`
- Expected: PASS

---

## Task 3: Update `exportUserBackup()` to schema v3

**Files**
- Modify: `apps/desktop/src/main/storage/db.ts`
- Test: `apps/desktop/src/main/storage/userBackupCollectibles.test.ts`

**Step 1: Write failing assertion**
- `exportUserBackup().schemaVersion === 3`
- `exportUserBackup().collectibles` exists with `items` and `progress`

**Step 2: Implement**
- Change `schemaVersion: 2` → `3`
- Add `collectibles: { items: exportCollectibleItems(), progress: exportCollectibleProgress() }`

**Step 3: Run tests**
- Run: `pnpm --filter desktop test`
- Expected: PASS

---

## Task 4: Update `importUserBackup()` to accept schema v3

**Files**
- Modify: `apps/desktop/src/main/storage/db.ts`
- Test: `apps/desktop/src/main/storage/userBackupCollectibles.test.ts`

**Step 1: Write failing test**
- Import schema v3 backup should not throw `unsupported_backup_version`
- After import, `ACCOUNT` progress must not be left behind from previous DB state.

**Step 2: Implement**
- Allow `schemaVersion` of `1 | 2 | 3`
- If schema v3 and `collectibles` present:
  - `DELETE FROM collectible_progress;` (to remove ACCOUNT rows too)
  - `importCollectibleItems(..., wrapInTransaction:false)` (merge)
  - `importCollectibleProgress(..., wrapInTransaction:false)`

**Step 3: Run tests**
- Run: `pnpm --filter desktop test`
- Expected: PASS

---

## Task 5: Verify backup export/import flow end-to-end

**Files**
- (No code changes expected; validate behavior via tests/TypeScript)

**Step 1: Typecheck**
- Run: `pnpm --filter desktop typecheck`
- Expected: PASS

**Step 2: Run tests**
- Run: `pnpm --filter desktop test`
- Expected: PASS

