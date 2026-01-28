# PRISMA_MIGRATION

Prisma 스키마 변경 시:

1. `packages/db/prisma/schema.prisma` 수정
2. `pnpm --filter @aion2/db prisma:validate`
3. (DB 준비 후) `pnpm --filter @aion2/db prisma:migrate`
4. `pnpm --filter @aion2/db prisma:generate`
5. `pnpm -r build` / `pnpm -r test`

