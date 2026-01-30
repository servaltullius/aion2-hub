# Collectibles Map (Grid + Markers) Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` (or implement task-by-task in this session).

**Goal:** “주신의 흔적/히든 큐브” 수집품을 **지도 배경 없이(그리드+마커)** 로 시각화하고, 마커 클릭으로 완료 체크를 지원한다.

**Architecture:** 수집품 위치(x,y)는 기존 `collectible_item` 데이터를 사용한다. 맵 크기(타일 그리드)는 커뮤니티 데이터(`/public/data/maps.yaml`)를 기반으로 내장 맵 메타데이터로 제공하고, 렌더러는 IPC로 메타데이터를 받아 **pan/zoom 가능한 캔버스(div)** 위에 그리드와 마커를 렌더링한다.

**Tech Stack:** Electron (main+preload+renderer), React, Tailwind, sql.js(SQLite)

---

## Task 1: Built-in map metadata + IPC API

**Files**
- Create: `apps/desktop/src/main/collectibles/maps.ts`
- Modify: `apps/desktop/src/main/ipc.ts`
- Modify: `apps/desktop/src/preload/index.ts`
- Modify: `apps/desktop/src/renderer/src/types.d.ts`
- Test: `apps/desktop/src/main/storage/collectiblesMaps.test.ts`

**Step 1: Write failing test**
- Test ensures:
  - `listCollectibleMaps()` returns at least the maps present in `builtinCollectibles` (`World_L_A`, `World_D_A`, `Abyss_Reshanta_B`)
  - Computed width/height match `tileWidth*tilesCountX`, `tileHeight*tilesCountY`

**Step 2: Implement built-in maps**
- Add `builtinCollectibleMaps` with minimal fields:
  - `name`, `tileWidth`, `tileHeight`, `tilesCountX`, `tilesCountY`, `type`, `source`
- Add helper to compute `width`, `height`.

**Step 3: Expose via IPC**
- `collectibles:listMaps` → returns array of maps.
- Preload: `window.aion2Hub.collectibles.listMaps()`
- Types: add signatures.

**Step 4: Run tests**
- Run: `pnpm --filter desktop test`
- Expected: PASS

---

## Task 2: Renderer “Map view” (pan/zoom + grid + markers)

**Files**
- Modify: `apps/desktop/src/renderer/src/pages/CollectiblesPage.tsx`

**Step 1: Add view mode**
- Extend `view` to include `MAP`.
- When `MAP`:
  - Map selector (`Select`) built from `listMaps()` response
  - Progress: `done/total` for selected map only

**Step 2: Implement pan/zoom viewport**
- Use nested wrappers so math stays simple:
  - `pan` wrapper: `transform: translate(panX, panY)`
  - `scale` wrapper: `transform: scale(scale)`
  - `content` wrapper: `width=mapWidth`, `height=mapHeight`
- Wheel zoom around cursor:
  - `world = (cursor - pan) / scale`
  - `pan' = cursor - scale' * world`
- Drag to pan (pointer events).
- Buttons: `Fit`, `Reset`, `+`, `-`

**Step 3: Draw grid**
- Tile boundary grid lines every `tileWidth` / `tileHeight` (e.g. 0..8192 step 1024).
- Label the 0/width/height corners (optional).

**Step 4: Draw markers**
- For each item in selected map where `x,y != null`:
  - Position: `left=x`, `top=y`
  - Style:
    - done: filled/green
    - remaining: outline/red (or yellow)
  - Hover: show tooltip name + coords
  - Click: toggle done via existing `collectibles.toggleDone`

**Step 5: Run typecheck/build**
- Run: `pnpm --filter desktop typecheck`
- Run: `pnpm --filter desktop build`
- Expected: PASS

---

## Task 3: Packaging smoke (optional in this pass)

**Files**
- Modify: `apps/desktop/package.json` (version bump)

**Steps**
- `pnpm --filter desktop build`
- `WINEPREFIX=\"$HOME/.wine-aion2\" pnpm --filter desktop package:portable`
- Copy: `cp apps/desktop/release/AION2-HUB-<ver>.exe /mnt/g/aion2hub/`

