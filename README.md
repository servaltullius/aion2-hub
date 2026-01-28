# AION2 HUB

안전한 올인원 동반자 허브(플래너 + 공지 diff + 레기온 운영) — **클라이언트 접근/자동화는 절대 하지 않습니다.**

## Prereqs

- Node.js 22+
- pnpm (권장: corepack)
- Docker (Postgres/Redis 로컬 구동용)

## Quickstart (Local)

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d
pnpm --filter @aion2/db prisma:migrate
pnpm --filter @aion2/db prisma:generate
```

### Run apps

```bash
# Web (Next.js)
pnpm --filter web dev

# API (Fastify)
pnpm --filter api dev

# Worker (BullMQ)
pnpm --filter worker dev

# Discord Bot
pnpm --filter bot-discord deploy:commands
pnpm --filter bot-discord dev
```

### Worker demo job enqueue

```bash
pnpm --filter worker enqueue:demo
```

## CI / Quality

```bash
pnpm -r lint
pnpm -r typecheck
pnpm -r test
pnpm -r build
```

## Safety (필수)

금지 영역(클라/패킷/후킹/자동입력/우회 등)은 `.codex/skills/SAFE_BOUNDARIES/README.md`를 참고하세요.

