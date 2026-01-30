# Foundation/Infra (Issues 1~8) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** `pnpm -r build`가 통과하는 모노레포 뼈대(웹/ API/ 워커/ 디스코드봇 + core/db 패키지)와 최소 테스트/CI를 세팅한다.

**Architecture:** TurboRepo 기반 모노레포. `apps/*`는 실행 앱(Next.js, Fastify, BullMQ worker), `packages/*`는 공용 라이브러리(core, db)와 모듈 스캐폴딩(modules/*)을 둔다. DB/Redis는 로컬은 docker-compose, CI는 GitHub Actions services로 제공한다.

**Tech Stack:** Node.js(>=22), pnpm, turbo, Next.js(App Router), Fastify, Prisma(Postgres), Redis + BullMQ, TypeScript, Vitest, ESLint, Prettier, GitHub Actions.

---

### Task 0: Prereqs (pnpm, git)

**Steps**
1. `corepack enable && corepack prepare pnpm@latest --activate`
2. `git init`

Expected:
- `pnpm -v` 출력
- `.git/` 생성

---

### Task 1: Root workspace scaffolding

**Files**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`

**Steps**
1. Root `package.json`에 `workspaces`, `scripts(build/test/lint/typecheck)` 추가
2. Turbo pipeline 정의 (`build`, `test`, `lint`, `typecheck`)
3. 공용 TS 옵션은 `tsconfig.base.json`에 정의하고, 각 패키지가 extend하도록 구성

Verify:
- `pnpm -r build` (초기엔 각 패키지 build stub라도 통과)

---

### Task 2: `apps/web` (Next.js) skeleton

**Files**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.mjs`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`

**Steps**
1. Next.js App Router 최소 페이지 구성
2. `pnpm --filter web dev` / `pnpm --filter web build` 가능하게 의존성/스크립트 세팅

Verify:
- `pnpm --filter web build` 성공

---

### Task 3: Infra docker-compose + env template

**Files**
- Create: `infra/docker-compose.yml`
- Create: `.env.example`

**Steps**
1. Postgres/Redis 서비스 + healthcheck
2. `.env.example`에 `DATABASE_URL`, `REDIS_URL` 등 환경변수 표기

Verify (docker 환경에서):
- `docker compose -f infra/docker-compose.yml up -d`

---

### Task 4: `packages/db` (Prisma) skeleton

**Files**
- Create: `packages/db/package.json`
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/src/index.ts`

**Steps**
1. 최소 모델(NoticeItem 등)은 “빈 껍데기”라도 정의
2. `prisma generate`가 DB 없이도 동작하게 스크립트 구성

Verify:
- `pnpm --filter @aion2/db prisma:generate`

---

### Task 5: `apps/api` (Fastify) skeleton + test

**Files**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/test/health.test.ts`

**Steps**
1. `/health` 200 + `{ ok: true }` 반환
2. Vitest + supertest(또는 Fastify inject)로 `/health` 테스트 1개 작성

Verify:
- `pnpm --filter api test`

---

### Task 6: `apps/worker` (BullMQ) skeleton + test

**Files**
- Create: `apps/worker/package.json`
- Create: `apps/worker/tsconfig.json`
- Create: `apps/worker/src/queues/demoQueue.ts`
- Create: `apps/worker/src/index.ts`
- Create: `apps/worker/test/demoQueue.test.ts`

**Steps**
1. Queue에 demo job을 넣으면 Worker가 처리하고 완료 이벤트를 남기는 최소 로직
2. Redis가 없으면 test skip, Redis가 있으면 실제 처리까지 확인

Verify:
- `pnpm --filter worker test`

---

### Task 8: `.codex/` config + SAFE_BOUNDARIES 문서화

**Files**
- Create: `.codex/config.toml`
- Create: `.codex/skills/SAFE_BOUNDARIES/README.md`

**Steps**
1. 승인 정책/샌드박스 기본값을 문서에 맞게 기록
2. “클라/패킷/후킹/자동입력/우회” 금지 체크리스트를 repo에 포함

---

### Task 9: CI (GitHub Actions)

**Files**
- Create: `.github/workflows/ci.yml`

**Steps**
1. Node+pnpm cache
2. `pnpm -r lint`, `pnpm -r test`, `pnpm -r build` 실행
3. (선택) Postgres/Redis service 컨테이너로 integration 테스트도 활성화

---

### Task 10: README

**Files**
- Create: `README.md`

**Steps**
1. 로컬 실행(설치/compose up/각 앱 dev)
2. env 설명
3. 금지 기능(SAFE_BOUNDARIES) 링크
