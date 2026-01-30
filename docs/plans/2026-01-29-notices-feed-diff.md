# Notices Feed + Diff (21~25, No Notifications) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** 공식 공지/업데이트를 수집해 `NoticeSnapshot/NoticeDiff`를 생성하고, Web에서 Feed + Diff 뷰어만 동작하게 만든다(키워드 구독/알림은 제외).

**Architecture:** Worker는 `api-community.plaync.com`의 board JSON API(`notice_ko`, `update_ko`)로 목록/상세 HTML을 가져와 `normalizedText` + `sha256`를 저장한다. hash가 바뀌면 line diff를 생성해 `NoticeDiff.diffJson`로 저장한다. API는 DB에서 Feed/Detail/Diff를 제공하고, Web(모듈)은 API를 조회해 렌더한다.

**Tech Stack:** Node.js fetch, Prisma(Postgres), Fastify, React client component, `diff`(line diff), `cheerio`(HTML→text)

---

### Task 1: Worker에 notices sync 스크립트/유틸 추가

**Files:**
- Modify: `apps/worker/package.json`
- Create: `apps/worker/src/notices/plaync.ts`
- Create: `apps/worker/src/notices/normalize.ts`
- Create: `apps/worker/src/notices/diff.ts`
- Create: `apps/worker/src/notices/sync.ts`
- Create: `apps/worker/src/notices-sync.ts`
- Test: `apps/worker/test/noticesDiff.test.ts`

**Step 1: failing test 작성**
- `apps/worker/test/noticesDiff.test.ts`에 line diff 블록 생성 테스트(결정적 입력) 작성.

**Step 2: 테스트 실패 확인**
- Run: `pnpm --filter worker test`
- Expected: FAIL (diff 유틸 없음)

**Step 3: minimal diff 구현**
- `apps/worker/src/notices/diff.ts`에 `buildLineDiffJson(fromText,toText)` 구현.

**Step 4: 테스트 통과 확인**
- Run: `pnpm --filter worker test`
- Expected: PASS

**Step 5: worker sync 구현**
- `plaync.ts`: board alias(`notice_ko`, `update_ko`)별 목록/상세 fetch.
- `normalize.ts`: `contentHtml`을 text로 정규화(공백 normalize).
- `sync.ts`: DB upsert + snapshot insert + diff 생성.
- `notices-sync.ts`: CLI entrypoint.

**Step 6: 수동 실행 확인(로컬 DB 필요)**
- Run: `docker compose -f infra/docker-compose.yml up -d`
- Run: `pnpm --filter @aion2/db prisma:migrate` (또는 최소한 테이블 준비)
- Run: `pnpm --filter worker notices:sync`
- Expected: 콘솔에 fetched/updated counts 출력

---

### Task 2: API에 Feed/Detail/Diff 엔드포인트 추가

**Files:**
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/src/routes/notices.ts`

**Steps**
1. `GET /api/v1/notices` (query: `source?`, `q?`, `page?`, `pageSize?`)
2. `GET /api/v1/notices/:id`
3. `GET /api/v1/notices/:id/diff` (latest)

Verify:
- `pnpm --filter api build`

---

### Task 3: `@aion2/module-notices`에 Feed/Diff UI 구현

**Files:**
- Modify: `packages/modules/notices/manifest.ts`
- Modify: `packages/modules/notices/pages/feed.tsx`
- Create: `packages/modules/notices/pages/detail.tsx`
- Create: `packages/modules/notices/pages/diff.tsx`
- Modify: `packages/modules/notices/widgets/changes.tsx` (optional)

**Steps**
1. module pages에 `detail`, `diff` 추가하고, `feed`에서 링크 제공(`/m/notices/diff?id=...`).
2. Feed: source 필터 + 검색 + 페이지네이션 + “원문 보기”.
3. Diff: diffJson blocks 렌더(added/removed/same 구분, same은 접기).

Verify:
- `pnpm --filter @aion2/module-notices build`
- `pnpm --filter web build`

---

### Task 4: README 업데이트

**Files:**
- Modify: `README.md`

**Steps**
1. Notices 초기 데이터 수집 커맨드 추가: `pnpm --filter worker notices:sync`
2. “Feed가 비어있으면 sync 먼저” 안내

Verify:
- `pnpm -r build`

---

### Task 5: Final verification

Run:
- `pnpm -r lint`
- `pnpm -r typecheck`
- `pnpm -r test`
- `pnpm -r build`

