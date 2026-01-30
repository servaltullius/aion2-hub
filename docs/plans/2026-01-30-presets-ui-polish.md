# Presets UI Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Desktop 앱의 “세팅 프리셋 / 숙제 프리셋” UI를 더 정돈되고 보기 좋게 다듬는다(동작 변경 없음).

**Architecture:** 기존 카드/컴포넌트 구조는 유지하고 Tailwind class 및 문구만 정리한다. 불필요한 기능 추가 없이 정렬/간격/버튼 그룹핑으로 가독성을 올린다.

**Tech Stack:** React + TailwindCSS(shadcn-style minimal UI components) + Electron renderer

---

### Task 1: Build Score - 직업 프리셋(추천) 카드 정돈

**Files:**
- Modify: `apps/desktop/src/renderer/src/pages/buildScore/ClassPresetCard.tsx`

**Step 1: 작은 레이아웃 개선(3열 정렬)**
- 모드/직업/적용을 3열로 정렬하고, 모바일에서는 자연스럽게 줄바꿈되도록 `grid`를 조정한다.

**Step 2: 프리셋 설명을 “설명 박스”로 분리**
- `selectedPreset.description`를 얕은 배경+테두리 박스에 넣어 “설명 영역”으로 보이게 한다.

**Step 3: 빠른 검증**
- Run: `pnpm --filter desktop lint`
- Expected: PASS

**Step 4: Commit**
```bash
git add apps/desktop/src/renderer/src/pages/buildScore/ClassPresetCard.tsx
git commit -m "style(desktop): polish build score class preset card"
```

---

### Task 2: Build Score - 내 프리셋 카드 정돈(섹션 분리/버튼 정렬)

**Files:**
- Modify: `apps/desktop/src/renderer/src/pages/buildScore/UserPresetsCard.tsx`

**Step 1: 카드 내부를 2개 섹션으로 분리**
- “저장” 섹션(새 이름 + 저장 버튼)과 “불러오기/관리” 섹션(선택 + 적용/이름변경 + 기타 버튼들)을 시각적으로 구분한다.

**Step 2: 버튼 그룹 정렬**
- 자주 쓰는 버튼(적용/저장)은 좌측/상단에, 파괴적 액션(삭제)은 하단에 두어 오클릭을 줄인다.

**Step 3: 빠른 검증**
- Run: `pnpm --filter desktop typecheck`
- Expected: PASS

**Step 4: Commit**
```bash
git add apps/desktop/src/renderer/src/pages/buildScore/UserPresetsCard.tsx
git commit -m "style(desktop): polish build score user presets card"
```

---

### Task 3: Planner Templates - 프리셋 카드 정돈

**Files:**
- Modify: `apps/desktop/src/renderer/src/pages/planner/templates/PresetCard.tsx`

**Step 1: 선택/구성/메시지/버튼 배치 정돈**
- 프리셋 선택과 구성(뱃지)을 정렬하고, 메시지를 버튼 아래로 일관되게 배치한다.

**Step 2: Copy 정리(필요 시)**
- 버튼 문구를 한글로 정리한다(의미 유지).

**Step 3: 빠른 검증**
- Run: `pnpm --filter desktop lint`
- Expected: PASS

**Step 4: Commit**
```bash
git add apps/desktop/src/renderer/src/pages/planner/templates/PresetCard.tsx
git commit -m "style(desktop): polish planner preset card"
```

---

### Task 4: Planner Templates - 리셋 설정 카드 정돈

**Files:**
- Modify: `apps/desktop/src/renderer/src/pages/planner/templates/ResetSettingsCard.tsx`

**Step 1: override 상태 표시 정돈**
- default/override 보조 문구와 뱃지 배치를 정리해 “현재 무엇이 적용 중인지”가 더 명확히 보이게 한다.

**Step 2: Save/되돌리기 버튼 정렬**
- 버튼 그룹을 같은 줄에서 자연스럽게 정렬한다.

**Step 3: 빠른 검증**
- Run: `pnpm --filter desktop typecheck`
- Expected: PASS

**Step 4: Commit**
```bash
git add apps/desktop/src/renderer/src/pages/planner/templates/ResetSettingsCard.tsx
git commit -m "style(desktop): polish planner reset settings card"
```

---

### Task 5: Planner Templates - 리스트/편집 Copy(영문→한글) 정리

**Files:**
- Modify: `apps/desktop/src/renderer/src/pages/PlannerTemplatesPage.tsx`
- Modify: `apps/desktop/src/renderer/src/pages/planner/templates/TemplatesList.tsx`
- Modify: `apps/desktop/src/renderer/src/pages/planner/templates/EditTemplateCard.tsx`

**Step 1: 버튼/제목 라벨 한글화**
- `Reload`, `Add`, `Edit`, `Delete`, `Clear`, `Save`, `Cancel` 등을 한글로 통일(의미 유지).

**Step 2: 빠른 검증**
- Run: `pnpm --filter desktop test`
- Expected: PASS

**Step 3: Commit**
```bash
git add apps/desktop/src/renderer/src/pages/PlannerTemplatesPage.tsx
git add apps/desktop/src/renderer/src/pages/planner/templates/TemplatesList.tsx
git add apps/desktop/src/renderer/src/pages/planner/templates/EditTemplateCard.tsx
git commit -m "style(desktop): polish planner templates copy"
```

---

### Task 6: Full verification + PR

**Step 1: Full check (CI parity)**
- Run: `pnpm -r lint && pnpm -r typecheck && pnpm -r test`
- Expected: PASS

**Step 2: Push + PR**
```bash
git push -u origin ui-presets-polish
gh pr create --title "style(desktop): polish presets UI" --body "UI-only polish for Build Score + Planner presets (no behavior change)."
```

