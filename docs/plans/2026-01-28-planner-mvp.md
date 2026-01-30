# Planner MVP (15~20) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** `@aion2/module-planner`를 “로컬-퍼스트(IndexedDB)”로 구현해 `today/week/templates/stats` 페이지와 기본 타임버짓 추천/세션 타이머까지 동작하게 만든다.

**Architecture:** Planner 데이터는 Dexie(IndexedDB)에 저장하고, “템플릿(숙제 정의)” + “완료(기간별 체크)” + “소요시간(duration)”을 분리한다. Web(AppShell)은 기존 module manifest 기반 lazy import 렌더링을 유지한다.

**Tech Stack:** React(Next.js client component), TypeScript, Dexie(IndexedDB), Vitest, localStorage(캐릭터 목록 연동은 core key 읽기)

---

### Task 1: Module toggles를 실제 동작에 적용

**Files:**
- Modify: `apps/web/lib/moduleToggleStore.ts`
- Modify: `apps/web/app/settings/modules/page.tsx`
- Modify: `apps/web/components/SidebarNav.tsx`
- Modify: `apps/web/components/DashboardWidgetGrid.tsx`
- Modify: `apps/web/components/ModulePageClient.tsx`

**Steps**
1. `loadEnabledModuleIds()`가 “설정 저장 전”과 “빈 배열(모두 끔)”을 구분하도록 수정한다.
2. Sidebar/Dashboard/Module renderer가 enabled 모듈만 노출하도록 필터링한다.
3. Settings > Modules 페이지 안내 문구를 “적용됨”으로 업데이트한다.

Verify:
- `pnpm --filter web build`

---

### Task 2: Planner DB 스키마(Dexie) + 타입 정의

**Files:**
- Modify: `packages/modules/planner/package.json`
- Modify: `packages/modules/planner/tsconfig.json`
- Create: `packages/modules/planner/lib/db.ts`
- Create: `packages/modules/planner/lib/types.ts`

**Steps**
1. `dexie` 의존성을 추가한다.
2. 다음 테이블을 포함하는 Dexie DB를 만든다.
   - `templates`: 숙제 템플릿(일일/주간/충전형)
   - `completions`: 기간(periodKey) 기준 완료 상태(존재=완료)
   - `durations`: 세션 타이머 기록(start/end/seconds)
   - `settings`: 리셋 시간/요일 등 사용자 설정(최소 1개 row)

Verify:
- `pnpm --filter @aion2/module-planner build`

---

### Task 3: 리셋(periodKey) / 추천 로직 유틸 + 단위테스트

**Files:**
- Create: `packages/modules/planner/lib/period.ts`
- Create: `packages/modules/planner/lib/recommend.ts`
- Test: `packages/modules/planner/test/period.test.ts`
- Test: `packages/modules/planner/test/recommend.test.ts`

**Steps**
1. “일일/주간” periodKey 계산 함수를 만든다(설정 값 반영).
2. 타임버짓 추천(30/60분)을 위한 greedy 추천 함수를 만든다.
3. 결정적 입력 기반 unit test를 추가한다.

Verify:
- `pnpm --filter @aion2/module-planner test`

---

### Task 4: Planner pages 구현(today/week/templates/stats)

**Files:**
- Modify: `packages/modules/planner/manifest.ts`
- Modify: `packages/modules/planner/pages/today.tsx`
- Create: `packages/modules/planner/pages/week.tsx`
- Create: `packages/modules/planner/pages/templates.tsx`
- Create: `packages/modules/planner/pages/stats.tsx`

**Steps**
1. manifest에 `week/templates/stats` 페이지와 nav를 추가한다.
2. `/today`: 캐릭터 선택 + (일일/주간/충전형) 그룹 렌더 + 체크/해제 + 타이머 기록.
3. `/templates`: 템플릿 CRUD(충전형: maxStacks/rechargeHours 포함).
4. `/week`: 주간 목록 + 다음 리셋 카운트다운(설정 값).
5. `/stats`: placeholder라도 “최근 소요시간 평균” 등 최소 통계 표시.

Verify:
- `pnpm --filter @aion2/module-planner build`
- `pnpm --filter web build`

---

### Task 5: Planner widget을 실제 데이터 기반으로 표시

**Files:**
- Modify: `packages/modules/planner/widgets/today.tsx`

**Steps**
1. 오늘 선택 캐릭터 기준 “완료/전체”를 계산해 표시한다(데이터 없으면 placeholder).

Verify:
- `pnpm --filter web build`

---

### Task 6: Final verification

Run:
- `pnpm -r lint`
- `pnpm -r typecheck`
- `pnpm -r test`
- `pnpm -r build`

