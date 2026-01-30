# Collectibles (주신의 흔적/히든 큐브) MVP Implementation Plan

> **For Codex:** Execute step-by-step (TDD where possible), keep changes minimal, don’t `git commit` unless explicitly requested.

**Goal:** 데스크톱 앱에 “주신의 흔적/히든 큐브” 수집 진행도 트래커를 추가한다 (검색 + 지역 그룹 보기, 계정/캐릭터 진행도 모두 지원).

**Architecture:** SQLite(sql.js)에 수집 아이템 목록(`collectible_item`)과 진행도(`collectible_progress`)를 저장한다. 앱 시작 시 최소한의 기본(내장) 목록을 idempotent하게 시드한다. 렌더러는 IPC로 목록/진행도를 조회하고 체크/해제 이벤트를 저장한다.

**Tech Stack:** Electron(main+preload+renderer), React, Tailwind, sql.js(SQLite)

---

## Task 1: Storage schema + seed

**Files**
- Modify: `apps/desktop/src/main/storage/schema.ts`
- Modify: `apps/desktop/src/main/storage/db.ts`
- Create: `apps/desktop/src/main/collectibles/builtin.ts`

**Step 1: Write failing test (seed idempotent)**
- Create test: `apps/desktop/src/main/storage/collectiblesSeed.test.ts`
- Expectation:
  - DB init 후 `collectible_item`에 built-in rows가 존재
  - 같은 init을 2번 해도 rows 수가 증가하지 않음

**Step 2: Implement schema**
- Add tables:
  - `collectible_item(id TEXT PRIMARY KEY, kind TEXT, region TEXT, name TEXT, note TEXT, created_at TEXT, updated_at TEXT)`
  - `collectible_progress(id TEXT PRIMARY KEY, scope TEXT, character_id TEXT, item_id TEXT, done INTEGER, done_at TEXT, updated_at TEXT, UNIQUE(scope, character_id, item_id))`
- Index: `(kind, region)`, `(scope, character_id)`

**Step 3: Implement seed**
- Add `builtinCollectibles` constant list (small starter set; can expand later).
- In `DesktopDb.ensureDefaults()` call `ensureCollectiblesSeeded()`.

**Step 4: Run test**
- Run: `pnpm --filter desktop test`
- Expected: PASS

---

## Task 2: DB API for list/progress/toggle

**Files**
- Modify: `apps/desktop/src/main/storage/db.ts`
- Create test: `apps/desktop/src/main/storage/collectiblesProgress.test.ts`

**Step 1: Write failing test (toggle)**
- Test the behaviors:
  - List returns items with `done=false` by default
  - Toggle done creates/updates row
  - Toggle again clears done
  - Character scope isolates per-character

**Step 2: Implement DB methods**
- `listCollectibles({ kind?, q?, view, scope, characterId? })`
- `toggleCollectibleDone({ scope, characterId?, itemId, done })`

**Step 3: Run test**
- Run: `pnpm --filter desktop test`
- Expected: PASS

---

## Task 3: IPC + preload bridge + renderer types

**Files**
- Modify: `apps/desktop/src/main/ipc.ts`
- Modify: `apps/desktop/src/preload/index.ts`
- Modify: `apps/desktop/src/renderer/src/types.d.ts`

**Steps**
- Add IPC channels:
  - `collectibles:list`
  - `collectibles:toggleDone`
- Validate inputs (string checks, scope allowlist, nullable characterId)
- Wire to `window.aion2Hub.collectibles.*`

**Verification**
- `pnpm --filter desktop typecheck`

---

## Task 4: Renderer page (UI)

**Files**
- Create: `apps/desktop/src/renderer/src/pages/CollectiblesPage.tsx`
- Modify: `apps/desktop/src/renderer/src/App.tsx`
- Modify: `apps/desktop/src/renderer/src/pages/SettingsModulesPage.tsx`

**UI Requirements**
- Kind filter: `전체 / 주신의 흔적 / 히든 큐브`
- Scope: `계정 / 캐릭터(활성 캐릭터)`
- Search input
- View mode: `지역 그룹 / 전체`
- “미완료만” 토글
- List rows with checkbox + item name (+ optional note)
- Grouped view shows region header with `done/total`

**Verification**
- `pnpm --filter desktop build`

---

## Task 5: Packaging smoke

**Steps**
- Bump `apps/desktop/package.json` version.
- Build portable exe:
  - `pnpm --filter desktop build`
  - `WINEPREFIX=\"$HOME/.wine-aion2\" pnpm --filter desktop package:portable`
- Copy artifact to Windows folder (WSL):
  - `cp apps/desktop/release/AION2-HUB-<version>.exe /mnt/g/aion2hub/`

