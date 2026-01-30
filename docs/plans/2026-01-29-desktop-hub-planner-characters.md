# Desktop Hub (Planner/Characters/Links/Settings) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Windows 포터블 단일 EXE(Electron) 안에 문서 IA(`/characters`, `/m/planner/*`, `/m/links/official`, `/settings/*`)를 구현한다. 데이터는 **EXE 옆 `./data/aion2-hub.sqlite`**에 저장한다. (Discord/Legion 제외)

**Architecture:** 메인 프로세스는 sql.js(SQLite) + 스케줄러(Notices) + 백업(파일 export/import) + IPC를 담당한다. 렌더러(React)는 AppShell(TopBar/Sidebar) + 각 페이지 UI를 담당한다.

**Tech Stack:** Electron + `electron-vite`, React(렌더러), IPC(`contextBridge`), SQLite(sql.js)

---

### Task 1: DB 스키마 확장 (Characters/Planner/Settings/Backup)

**Files:**
- Modify: `apps/desktop/src/main/storage/schema.ts`
- Modify: `apps/desktop/src/main/storage/db.ts`

**Schema (요약):**
- `app_setting(key,value)`
- `character(id,name,server,class,created_at,updated_at)`
- `planner_settings(id,daily_reset_hhmm,weekly_reset_day,updated_at)`
- `planner_template(id,title,type,estimate_minutes,recharge_hours,max_stacks,created_at,updated_at)`
- `planner_assignment(character_id,template_id,enabled,target_count,...)`
- `planner_completion(character_id,template_id,period_key,completed_at)`
- `planner_charge_use(character_id,template_id,used_at)`
- `planner_duration(character_id,template_id?,started_at,ended_at,seconds)`

---

### Task 2: IPC API 확장 (CRUD + 백업)

**Files:**
- Modify: `apps/desktop/src/main/ipc.ts`
- Modify: `apps/desktop/src/preload/index.ts`
- Modify: `apps/desktop/src/renderer/src/types.d.ts`

**Channels (예):**
- `characters:list|create|update|delete`
- `app:setActiveCharacter|getActiveCharacter`
- `planner:getStatus|toggleComplete|useCharge|undoCharge`
- `planner:templates:list|create|update|delete`
- `settings:get|set`
- `backup:exportJson|importJson`

---

### Task 3: Renderer AppShell + 라우팅

**Files:**
- Modify: `apps/desktop/src/renderer/src/App.tsx`
- Create: `apps/desktop/src/renderer/src/pages/*`

**Routes (hash):**
- `#/` Dashboard
- `#/m/notices/feed`, `#/m/notices/diff?id=...`
- `#/characters`
- `#/m/planner/today|week|templates|stats`
- `#/m/links/official`
- `#/settings/modules|backup|notifications(stub)|safety`

---

### Task 4: Planner/Characters UI 연결 (MVP)

**MVP:**
- 캐릭터 등록/선택(활성 캐릭터 저장)
- 템플릿 CRUD + 캐릭터별 할당/체크(일일/주간)
- 충전형(티켓) 남은 스택/다음 충전 시간 + 사용/되돌리기
- 30/60분 타임버짓 추천(간단 greedy)

---

### Task 5: Backup (JSON 내보내기/가져오기)

**Export:** `AION2-HUB-backup-YYYYMMDD-HHmmss.json`을 baseDir에 생성  
**Import:** 파일 선택 → DB replace/merge(초기 버전은 replace)

---

### Task 6: 검증 + 포터블 EXE 빌드

Run:
- `pnpm --filter desktop typecheck`
- `pnpm --filter desktop test`
- `pnpm --filter desktop build`
- `pnpm --filter desktop package:portable`

