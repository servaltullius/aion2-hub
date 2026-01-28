# ADD_MODULE

새 모듈 추가 체크리스트:

1. `packages/modules/<moduleId>/` 폴더 생성
2. `package.json`, `tsconfig.json`, `manifest.ts` 생성
3. `apps/web`에서 모듈 레지스트리에 등록(또는 자동 로딩 훅 추가)
4. `pnpm -r build` / `pnpm -r test` 통과 확인

