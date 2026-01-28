# Core Web Shell + Module System (9~14) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Web(AppShell)에서 모듈 레지스트리 기반으로 네비/대시보드 위젯/`/m/[moduleId]/[pageId]` 라우팅을 렌더하고, Settings/Characters(로컬) 기본 기능까지 동작하게 만든다.

**Architecture:** `apps/web`는 App Router 기반. 모듈 메타는 `packages/modules/*`의 `manifest`를 사용하고, `packages/core` registry가 런타임 등록/조회/라우트 해석을 담당한다. 페이지/위젯은 lazy import(클라이언트)로 로드한다.

**Tech Stack:** Next.js(App Router), React, TypeScript, Vitest, localStorage(Characters/Settings), `@aion2/core` module registry.

---

### Task 1: Module resolver 유틸 + 단위테스트

**Files:**
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/src/resolve.ts`
- Test: `packages/core/test/resolve.test.ts`

**Step 1: Failing test 작성**
- Create `packages/core/test/resolve.test.ts`:
  - registerModules로 모듈 등록
  - `resolveModulePage("planner","today")`가 페이지를 반환하는지
  - 없는 pageId는 `undefined` 반환하는지

**Step 2: 테스트 실패 확인**
- Run: `pnpm --filter @aion2/core test`
- Expected: FAIL (resolve 함수 없음)

**Step 3: 최소 구현**
- Add `resolveModulePage(moduleId,pageId)` / `resolveModuleWidget(moduleId,widgetId)` 구현

**Step 4: 테스트 통과 확인**
- Run: `pnpm --filter @aion2/core test`
- Expected: PASS

**Step 5: Commit**
- `git add packages/core/src/resolve.ts packages/core/src/index.ts packages/core/test/resolve.test.ts`
- `git commit -m "feat(core): add module route resolvers"`

---

### Task 2: 모듈 manifest에 pages/widgets/nav 추가(placeholder)

**Files:**
- Modify: `packages/modules/planner/manifest.ts`
- Modify: `packages/modules/notices/manifest.ts`
- Modify: `packages/modules/legion/manifest.ts`
- Modify: `packages/modules/links/manifest.ts`

**Step 1: pages/nav/widgets 최소 정의**
- planner: page `today`, widget `today`
- notices: page `feed`, widget `changes`
- legion: page `overview`, widget `next-event` (permission은 유지)
- links: page `official`, widget 0개(또는 1개)

**Step 2: build 확인**
- Run: `pnpm -r build`
- Expected: PASS

**Step 3: Commit**
- `git add packages/modules/*/manifest.ts`
- `git commit -m "feat(modules): add base pages and widgets"`

---

### Task 3: Web AppShell(Topbar/Sidebar) + 라우트 뼈대

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Create: `apps/web/components/AppShell.tsx`
- Create: `apps/web/components/SidebarNav.tsx`
- Create: `apps/web/components/TopBar.tsx`
- Create: `apps/web/app/characters/page.tsx`
- Create: `apps/web/app/settings/layout.tsx`
- Create: `apps/web/app/settings/page.tsx`
- Create: `apps/web/app/settings/modules/page.tsx`
- Create: `apps/web/app/settings/backup/page.tsx`
- Create: `apps/web/app/settings/notifications/page.tsx`
- Create: `apps/web/app/settings/safety/page.tsx`

**Step 1: AppShell 추가**
- Sidebar: Dashboard/Characters/Settings + 모듈 nav(등록된 모듈 기준)
- TopBar: Search/Char/Legion/User는 placeholder

**Step 2: 페이지 스켈레톤 추가**
- Settings 하위 페이지 생성 (내용은 placeholder OK)
- Safety 페이지는 `.codex/skills/SAFE_BOUNDARIES/README.md` 요약/링크 포함

**Step 3: build 확인**
- Run: `pnpm --filter web build`
- Expected: PASS

**Step 4: Commit**
- `git add apps/web`
- `git commit -m "feat(web): add app shell and settings routes"`

---

### Task 4: `/m/[moduleId]/[pageId]` 모듈 페이지 렌더러

**Files:**
- Create: `apps/web/app/m/[moduleId]/[pageId]/page.tsx`
- Create: `apps/web/components/ModulePageClient.tsx`
- Create: `apps/web/components/LazyComponent.tsx`
- Create: `apps/web/lib/moduleRegistry.ts`

**Step 1: module registry 로더**
- `apps/web/lib/moduleRegistry.ts`에서 `registerModules([...manifests])`

**Step 2: 클라이언트 렌더러**
- `ModulePageClient`(use client): resolver로 page 찾고 lazy load + fallback UI
- permission(public/user/discord-guild-admin) 스텁 처리(현재는 안내 UI)

**Step 3: build/test**
- Run: `pnpm -r build`
- Run: `pnpm -r test`
- Expected: PASS

**Step 4: Commit**
- `git add apps/web apps/web/lib apps/web/components`
- `git commit -m "feat(web): render module pages via manifest loader"`

---

### Task 5: Dashboard 위젯 그리드

**Files:**
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/components/DashboardWidgetGrid.tsx`

**Step 1: 위젯 카드**
- modules의 widgets를 3개 정도 홈에 렌더
- 로딩/EmptyState 처리

**Step 2: build 확인**
- Run: `pnpm --filter web build`
- Expected: PASS

**Step 3: Commit**
- `git add apps/web/app/page.tsx apps/web/components/DashboardWidgetGrid.tsx`
- `git commit -m "feat(web): dashboard widget grid"`

---

### Task 6: Characters 로컬 CRUD (localStorage)

**Files:**
- Modify: `apps/web/app/characters/page.tsx`
- Create: `apps/web/lib/charactersStore.ts`
- Test: `apps/web/lib/charactersStore.test.ts`

**Step 1: failing test**
- 로드/저장/중복 방지(이름 기준) 테스트

**Step 2: 구현**
- localStorage key: `aion2hub.characters.v1`
- add/update/remove + validation(빈값 금지)

**Step 3: test**
- Run: `pnpm --filter web test`
- Expected: PASS

**Step 4: Commit**
- `git add apps/web/app/characters/page.tsx apps/web/lib/charactersStore.ts apps/web/lib/charactersStore.test.ts`
- `git commit -m "feat(web): local characters CRUD"`

---

### Task 7: PWA 기본(Manifest + Offline banner)

**Files:**
- Create: `apps/web/public/manifest.webmanifest`
- Create: `apps/web/public/icons/icon-192.png`
- Create: `apps/web/public/icons/icon-512.png`
- Modify: `apps/web/app/layout.tsx`
- Create: `apps/web/components/OfflineBanner.tsx`

**Step 1: manifest 추가**
- name/short_name/start_url/display/theme_color/background_color/icons

**Step 2: offline banner**
- `navigator.onLine` + `online/offline` 이벤트로 상태 표시

**Step 3: verify**
- Run: `pnpm --filter web build`
- Expected: PASS

**Step 4: Commit**
- `git add apps/web/public apps/web/app/layout.tsx apps/web/components/OfflineBanner.tsx`
- `git commit -m "feat(web): add basic PWA manifest and offline banner"`

---

### Task 8: Final verification

**Steps**
- Run: `pnpm -r lint`
- Run: `pnpm -r typecheck`
- Run: `pnpm -r test`
- Run: `pnpm -r build`

