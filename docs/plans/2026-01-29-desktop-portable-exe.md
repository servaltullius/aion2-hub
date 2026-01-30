# Desktop (Windows) Portable Single-EXE Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Windows 사용자에게 “설치 없이 실행 가능한 단일 EXE(포터블)”로 배포하고, 외부 의존성(Postgres/Redis) 없이 Notices Feed+Diff + 30분 자동 수집을 제공한다. 데이터는 **EXE 옆 `./data/`**에 저장하며, 쓰기 권한이 없으면 오류 안내(A1).

**Architecture:** Electron 앱(메인 프로세스)이 로컬 데이터 저장소(SQLite)와 공지 수집 스케줄러(앱 실행 시 1회 + 30분마다)를 담당한다. 렌더러(React)는 IPC를 통해 Feed 목록/검색/페이지네이션과 최신 Diff 뷰를 조회한다. 서버(Fastify)나 별도 Worker/Queue는 Desktop 모드에서 사용하지 않는다.

**Tech Stack:** Electron + `electron-vite`, React(렌더러), IPC(`contextBridge`), SQLite(embedded), `diff`(line diff), `cheerio`(HTML→text), PlayNC community JSON API

---

### Task 1: Desktop 앱 스캐폴딩 추가 (Electron + React)

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/electron.vite.config.ts`
- Create: `apps/desktop/src/main/index.ts`
- Create: `apps/desktop/src/preload/index.ts`
- Create: `apps/desktop/src/renderer/index.html`
- Create: `apps/desktop/src/renderer/src/main.tsx`
- Create: `apps/desktop/src/renderer/src/App.tsx`
- Create: `apps/desktop/src/renderer/src/types.d.ts`

**Step 1: 스캐폴딩 작성**
- Electron 메인에서 `BrowserWindow`를 띄우고(개발/프로덕션 URL 분기), preload를 연결한다.
- preload에서 IPC API를 `window.aion2Hub`로 expose 한다(아직은 ping 정도만).

**Step 2: typecheck/lint 통과 확인**
- Run: `pnpm --filter desktop typecheck`
- Run: `pnpm --filter desktop lint`

---

### Task 2: 포터블 데이터 경로(A1) + SQLite 저장소 레이어

**Files:**
- Create: `apps/desktop/src/main/portableDataDir.ts`
- Create: `apps/desktop/src/main/storage/db.ts`
- Create: `apps/desktop/src/main/storage/schema.ts`

**Step 1: EXE 옆 `./data/` 경로 계산**
- packaged: `dirname(app.getPath("exe"))/data`
- dev: `process.cwd()/apps/desktop/data` (또는 `process.cwd()/data-desktop`)
- `mkdir -p` 후 write access 확인, 실패 시 사용자에게 메시지 후 종료(A1).

**Step 2: SQLite 테이블 생성(자동)**
- `notice_item`, `notice_snapshot`, `notice_diff` 테이블을 `CREATE TABLE IF NOT EXISTS`로 생성
- 인덱스: `(source, external_id) UNIQUE`, `(source, published_at)`, `(notice_item_id, fetched_at)`

**Step 3: 저장소 API 제공**
- `listNotices({ source?, q?, page, pageSize })`
- `getNotice(id)`
- `getLatestDiff(noticeId)`
- `upsertItem+snapshot+diff` helpers

Verify:
- `pnpm --filter desktop typecheck`

---

### Task 3: Notices Sync (앱 실행 시 1회 + 30분마다)

**Files:**
- Create: `apps/desktop/src/main/notices/plaync.ts`
- Create: `apps/desktop/src/main/notices/normalize.ts`
- Create: `apps/desktop/src/main/notices/diff.ts`
- Create: `apps/desktop/src/main/notices/sync.ts`
- Create: `apps/desktop/src/main/scheduler.ts`

**Step 1: PlayNC JSON API fetch**
- `notice_ko`, `update_ko` 대상으로 pinned + “최신 1페이지” 목록을 가져온다.
- 새 글/업데이트 감지 후에만 detail을 추가로 가져오도록 최적화(가능하면 `updatedAt` 기반).

**Step 2: normalize + hash + diff**
- HTML → 텍스트 정규화 후 `sha256`
- hash 변경 시 line diff blocks 생성 후 저장

**Step 3: 스케줄러**
- 앱 시작 후 1회 즉시 sync
- 이후 30분 interval(중복 실행 방지 lock)
- sync 결과(새 snapshot/diff 수) 로그 + 렌더러에 상태 제공(IPC로 조회 가능)

---

### Task 4: Renderer UI (Feed + Diff)

**Files:**
- Update: `apps/desktop/src/preload/index.ts`
- Create: `apps/desktop/src/main/ipc.ts`
- Update: `apps/desktop/src/main/index.ts`
- Update: `apps/desktop/src/renderer/src/App.tsx`
- Create: `apps/desktop/src/renderer/src/FeedPage.tsx`
- Create: `apps/desktop/src/renderer/src/DiffPage.tsx`

**Step 1: IPC handlers**
- `notices:list`, `notices:getLatestDiff`, `notices:syncNow`, `app:getStatus`

**Step 2: Feed**
- source 필터(전체/공지/업데이트), 제목 검색, 페이지네이션
- 원문 링크(외부 브라우저) + Diff 보기

**Step 3: Diff**
- latest diff 렌더
- same 블록은 접기(details)

---

### Task 5: Windows 단일 EXE 빌드(Portable)

**Files:**
- Update: `apps/desktop/package.json` (electron-builder config)
- (Optional) Create: `apps/desktop/build/icon.ico`

**Step 1: electron-builder portable 설정**
- `win.target = ["portable"]`
- 산출물 이름: `AION2-HUB-${version}.exe`

**Step 2: 빌드 커맨드**
- Run(Windows): `pnpm --filter desktop build`
- Run(Windows): `pnpm --filter desktop package:portable`
- Expected: `apps/desktop/release/`에 단일 exe 생성

---

### Task 6: 최종 검증

Run:
- `pnpm -r lint`
- `pnpm -r typecheck`
- `pnpm -r test`
- `pnpm -r build`

