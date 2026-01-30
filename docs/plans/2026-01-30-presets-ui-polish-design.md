# Presets UI Polish (Desktop)

Status: approved (2026-01-30)

Goal: improve “프리셋(세팅/숙제)” 관련 UI의 **정렬/간격/가독성**을 개선한다. 기능/동작/데이터는 변경하지 않는다.

Target: Desktop 앱( `apps/desktop` )의 다음 화면들

1) Build Score (세팅 점수)
- `BuildScorePage` 내 프리셋 관련 카드들:
  - 직업 프리셋(추천) (`ClassPresetCard`)
  - 내 프리셋 (`UserPresetsCard`)

2) Planner → Templates (숙제 템플릿/프리셋)
- 프리셋 적용 카드 (`PresetCard`)
- 리셋 설정 카드 (`ResetSettingsCard`)
- 리스트/편집 UI 중 “문구/버튼 라벨” 정리 (영문→한글)

## Design Principles

- **No behavior change**: 이벤트, API 호출, 상태 관리, 데이터 구조는 그대로 유지한다.
- **Density: balanced**: 스크롤/여백 균형(컴팩트도 과하지 않게, 여유도 과하지 않게).
- **Primary actions first**: “적용/저장” 버튼은 눈에 띄고, 위험(삭제/초기화)은 분리한다.
- **Korean copy consistency**: 한 화면에서 영문/한글이 섞이지 않도록 정리한다.

## Build Score UI Polish

### 1) 직업 프리셋(추천)
- 3컬럼 그리드로 정렬:
  - 좌: 모드 토글(PvE/PvP)
  - 중: 직업 Select
  - 우: 적용 버튼(Full width)
- 선택된 프리셋 설명은 하단에 얕은 배경+테두리 박스로 분리해 “설명 영역”으로 보이게 한다.

### 2) 내 프리셋
- 카드 내부를 **2개 섹션**으로 구분:
  - “저장”: 새 프리셋 이름 + 현재 가중치 저장 버튼
  - “불러오기/관리”: 저장된 프리셋 선택 + 적용/이름변경 + (복제/내보내기/가져오기/삭제)
- 버튼 정렬:
  - 자주 쓰는 버튼(적용/저장)은 `secondary`/기본 대비로 강조
  - 삭제는 하단/우측으로 분리(실수 방지)

## Planner Templates UI Polish

### 1) 프리셋 카드
- 프리셋 선택/구성(DAILY/WEEKLY/CHARGE) 정렬
- 적용 버튼 2개(추가/초기화)는 한 줄에서 균형 있게 배치(secondary + destructive)
- 결과 메시지는 버튼 영역 아래에 배치

### 2) 리셋 설정 카드
- 서버 선택/override 상태(기본값 vs override)를 더 명확히(뱃지 + 보조 문구)
- “다음 리셋” 정보는 2컬럼으로 정렬해 스캔 가능하게 유지
- Save/기본값으로 되돌리기 버튼 정렬 개선

### 3) Copy polish
- `Add/Edit/Delete/Clear/Reload/Save/Cancel` 등을 한글로 통일
- 라벨/설명 문구는 기존 의미를 유지한다.

## Out of scope

- 새 기능(미리보기/검색/필터/변경점 표시 등) 추가
- 데이터 모델 변경, API 변경, 저장 방식 변경
- 새 UI 라이브러리 도입

