# AION2_HUB_CORE

Core(허브 프레임)는 모듈(플러그인) 레지스트리 기반으로 동작합니다.

## 규칙(요약)

- 모듈은 `packages/modules/<id>/manifest.ts`로 자신을 선언합니다.
- Web은 모듈의 `nav/pages/widgets`를 읽어 대시보드/라우팅을 렌더합니다.
- 새 기능 추가는 가급적 Core 변경이 아니라 **모듈 추가**로 진행합니다.

