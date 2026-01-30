# AION2 HUB (Desktop) Architecture Sprint — Design Notes

**Date:** 2026-01-29

**Scope:** “옵션 1” (타임박스) — 프로젝트 전체 코드 점검/리팩터링/디커플링 + 소규모 UX/버그픽스(B).

**Non-goals**
- Discord/레기온 기능은 **구현/확장하지 않는다**.
- 데이터 스키마 대수술/대규모 기능 추가는 하지 않는다(필요하면 별도 계획으로 분리).

---

## Current Architecture (as-is)

**Desktop app:** Electron + electron-vite
- **Main**: `apps/desktop/src/main/*`
  - `storage/db.ts` (sql.js 기반 로컬 DB + 마이그레이션/백업 포함)
  - `ipc.ts` (ipcMain 핸들러 전체)
  - `scheduler.ts` (공지 sync 스케줄러)
- **Preload**: `apps/desktop/src/preload/index.ts`
  - `window.aion2Hub` 브릿지에 IPC invoke 함수 노출
- **Renderer**: `apps/desktop/src/renderer/src/*`
  - `App.tsx` (라우팅 + sidebar)
  - `pages/*` (각 기능 페이지)

**Persistence 모델**
- 사용자 데이터는 Portable 디렉토리 기준 `data/aion2-hub.sqlite` 로 저장(sql.js)
- 내보내기/가져오기/백업(JSON) 지원

---

## Hotspots / Smells (why sprint)

vibe-kit doctor 기준 hotspot(LOC 큰 파일):
- `apps/desktop/src/main/storage/db.ts` (단일 파일에 모든 도메인 저장 로직 집중)
- `apps/desktop/src/main/ipc.ts` (모든 IPC 핸들러가 한 파일에 집중)
- `apps/desktop/src/renderer/src/pages/BuildScorePage.tsx`, `CollectiblesPage.tsx` (페이지가 과대해지고 재사용이 어려움)

리스크:
- 변경 시 충돌/리뷰 난이도 증가
- IPC 계약(채널명/페이로드 형태) 불일치로 런타임 오류 가능성
- 페이지 단위 파일이 커지며 성능/UX 개선 작업도 파편화

---

## Sprint Goals (to-be)

1) **디커플링**: Main IPC 핸들러를 도메인 단위 모듈로 분리해서 “변경 범위”를 줄인다.
2) **유지보수성**: Renderer의 대형 페이지에서 재사용 가능한 유틸/컴포넌트 분리.
3) **안전성/관측성**: 작은 UX/버그 픽스는 허용하되, 테스트/빌드로 회귀를 막는다.
4) **지속 가능한 속도**: 다음 기능(지도 데이터 확장/프리셋/리셋 UI 강화 등) 추가가 쉬워지는 구조로 정리한다.

---

## Proposed Changes (this sprint)

### A. Main: IPC handler modularization (high value, low risk)
- `apps/desktop/src/main/ipc.ts`는 “등록(entry)” 역할만 남기고,
- 실제 `ipcMain.handle(...)` 구현은 `apps/desktop/src/main/ipcHandlers/*` 로 분리한다.
- `resolveCharacterId` 같은 공통 유틸은 `ipcHandlers/util.ts` 로 이동.

Expected outcome:
- 도메인 단위로 파일이 분리되어 변경/리뷰가 쉬워짐
- 다음 기능 추가 시 `ipc.ts` 충돌 감소

### B. Renderer: lightweight extraction (medium value, low risk)
- 페이지 내부의 파서/유틸(예: token humanize, safe number, bounds 계산 등)을 파일로 분리
- 큰 컴포넌트(예: Collectibles Map canvas)는 기능 단위로 쪼개거나 별도 파일로 이동(과도하면 다음 스프린트로 미룸)

### C. Small UX/bug fixes (allowed)
- 기능과 무관한 대규모 UI 변경은 피하고, 안전한 범위의 UX 개선만 반영

---

## Verification

- `pnpm --filter desktop typecheck`
- `pnpm --filter desktop test`
- `pnpm --filter desktop build`
- (필요 시) `pnpm --filter desktop package:portable` + `G:\\aion2hub`로 복사

