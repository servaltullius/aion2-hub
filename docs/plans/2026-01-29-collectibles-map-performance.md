# Collectibles Map (Performance + UX) Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` (or implement task-by-task in this session).

**Goal:** 1600+ 마커에서도 “지도(그리드)”가 끊김 없이 드래그/줌이 되도록 **마커 렌더링을 최적화**한다.

**Architecture:** 지도 뷰포트(px) ↔ 월드좌표(맵 좌표계) 변환을 유틸로 분리하고, 현재 pan/scale 기준으로 **뷰포트 안(패딩 포함)** 의 마커만 렌더링한다. 드래그 팬은 `requestAnimationFrame` 으로 스로틀하여 과도한 리렌더를 줄인다.

**Tech Stack:** Electron (renderer), React, Tailwind, Vitest

---

## Task 1: Viewport bounds 유틸 + 테스트

**Files**
- Create: `apps/desktop/src/renderer/src/pages/collectiblesMapViewport.ts`
- Test: `apps/desktop/src/renderer/src/pages/collectiblesMapViewport.test.ts`

**Step 1: Write failing test**
- 월드 bounds 계산이 기대값과 일치하는지 확인:
  - viewport 1000×800, pan(0,0), scale=1 → bounds left=0, top=0, right=1000, bottom=800 (padding=0)
  - viewport 1000×800, pan(100,50), scale=2 → left=-50, top=-25, right=450, bottom=375 (padding=0)

**Step 2: Implement util**
- `worldBoundsForViewport({ viewportWidthPx, viewportHeightPx, panX, panY, scale, paddingPx })` 구현
- scale=0/NaN 방어 (최소 1e-6)

**Step 3: Run tests**
- Run: `pnpm --filter desktop test`
- Expected: PASS

---

## Task 2: MapCanvas 마커 “뷰포트 컬링”

**Files**
- Modify: `apps/desktop/src/renderer/src/pages/CollectiblesPage.tsx`

**Step 1: Track viewport size**
- `ResizeObserver` 로 `viewportRef` 크기(px) 상태를 추적

**Step 2: Compute visible markers**
- `worldBoundsForViewport(...)` 를 사용해 bounds 계산
- x/y 있는 마커만 대상으로 bounds 안(패딩 포함) 필터 → `visibleMarkers`

**Step 3: Render only visible markers**
- 기존 `markers.map(...)` 을 `visibleMarkers.map(...)` 으로 교체
- 선택된 마커는 bounds 밖이더라도 “선택 패널” 에서 유지

---

## Task 3: 드래그 팬 RAF 스로틀

**Files**
- Modify: `apps/desktop/src/renderer/src/pages/CollectiblesPage.tsx`

**Step 1: RAF-throttled pan setter**
- `onPointerMove` 에서 `setPan` 을 매 이벤트마다 호출하지 않고:
  - 최신 pan 목표값을 ref 에 저장
  - RAF 1회에 1번만 `setPan` 호출

**Step 2: Cleanup**
- pointer up/cancel 시 RAF 정리
- unmount 시 pending RAF 취소

---

## Task 4: 작은 UX 개선(표시 개수)

**Files**
- Modify: `apps/desktop/src/renderer/src/pages/CollectiblesPage.tsx`

**Step 1: Overlay stats**
- `표시: {visible}/{total}` 같이 현재 화면에 렌더되는 마커 수를 표시(디버그/안심용)

---

## Task 5: 검증 + 포터블 EXE

**Files**
- Modify: `apps/desktop/package.json` (version bump)

**Steps**
- Run: `pnpm --filter desktop typecheck`
- Run: `pnpm --filter desktop test`
- Run: `pnpm --filter desktop build`
- Run: `WINEPREFIX=\"$HOME/.wine-aion2\" pnpm --filter desktop package:portable`
- Copy: `cp apps/desktop/release/AION2-HUB-<ver>.exe /mnt/g/aion2hub/`

