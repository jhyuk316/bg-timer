# 프로젝트 문서와 남은 작업

점검일: 2026-10-01. 기준 코드: main의 2f48a7b (PR #5).

## 현재 기능과 개발 기준

- [README](../README.md): 실행 방법과 주요 기능
- [PRD](../PRD.md): 현재 제품 요구사항과 구현 상태
- [용어](../CONTEXT.md): 방, 기기 참가자, 플레이어 말, 타이머 방식
- [개발 지침](../AGENTS.md): 변경 시 확인할 문서와 검증 방법
- [결정 지도](wayfinder/multiplayer-mvp/map.md): 결정 및 후속 작업의 연결

## 남은 작업

- [종료 후 게임 선택](todos/game-catalog-selection.md): codex/game-catalog-selection에서 구현·검증 중.

| 작업 | 상태 | 상세 |
|---|---|---|
| 플레이 기록에 이미지 등록 | 보류 | [이미지 업로드와 외부 저장소](todos/image-upload-storage.md) |
| 서로 다른 네트워크의 실제 휴대폰 2대 QA | 미검증 | [실기기 확인 목록](qa/multiplayer-mvp-acceptance-2026-09-24.md) |
| 시간 경고·TTS 요구사항과 현재 코드의 차이 | 검토 필요 | [방 기반 시간 알림](todos/time-alerts.md) |
| 이미지 저장소·업로드 주체·권한·삭제 정책 결정 | 이미지 등록 작업에 포함 | 위 이미지 TODO에서 관리 |

## 완료된 후속 작업

- [플레이 시간 누적 기본값](todos/simple-timer-default.md): PR #3 병합
- 방 기반 흐름 통일, 1인 방 시작: PR #4 병합
- 자리 이동 애니메이션 보정: PR #6 병합
- 게임 중 턴 수·평균 턴 시간: PR #7 병합
- 대기실 색상 추천 프리셋: PR #8 병합
- [참가자별 Firebase 기록과 로컬 기록 이전](wayfinder/multiplayer-mvp/tickets/005-migrate-history-to-firebase.md): PR #5 병합, Pages 배포 성공

Firebase 규칙의 최근 검증 기록은 [규칙 검사 문서](../tests/rules/database-rules-cases.md)를 참고한다. 코드 병합·사이트 배포·규칙 검증·실기기 QA는 각각 확인한다.

## 과거 설계와 검증 기록

- [최초 MVP 설계](superpowers/specs/2026-09-21-multiplayer-mvp-design.md)
- [최초 구현 계획](superpowers/plans/2026-09-21-multiplayer-mvp.md)
- [2026-09-24 인수테스트](qa/multiplayer-mvp-acceptance-2026-09-24.md)
- [2026-10-01 문서 점검 결과](qa/document-review-2026-10-01.md)

과거 기록은 작성 당시의 동작을 보존한다. 현재 요구사항은 PRD, 남은 작업은 이 문서와 연결된 TODO를 기준으로 한다.

## 로컬 조사·수집 작업

기존 작업 폴더의 docs/research 및 scripts 문서는 아직 커밋되지 않은 별도 조사·수집 작업이다. 이 점검에서는 수집 스크립트나 결과물을 변경하지 않았다. 저장소에 반영할 때 문서와 실행 파일을 함께 등록하고 데이터 연동 범위를 확정한다.
