# Realtime Database 보안 규칙 검사 항목

아래 항목은 Firebase Console > Realtime Database > Rules Playground에서 확인할 수 있다. 선택 실행 스크립트인 `live-rules.mjs`를 이용하면 익명 Firebase 사용자로 배포된 규칙을 직접 검사할 수도 있다.

검사 상태(2026-09-24): 수정한 규칙을 사용자 승인 후 배포했다. `BG_TIMER_LIVE_RULES=1 node tests/rules/live-rules.mjs`로 `bg-timer-1b7ad`의 실제 규칙을 검사한 결과 30개 중 30개가 통과했으며, 아래 항목을 모두 포함한다. 이는 실제 규칙에 대한 검사 결과이며 Rules Playground에서 실행한 결과는 아니다. 스크립트는 익명 테스트 사용자와 임시 방을 만든 뒤 방 코드를 삭제하고 방 상태를 종료로 바꾼다.

| 검사 항목 | 인증 주체 | 경로 | 작업 | 기대 결과 |
|---|---|---|---|---|
| 비로그인 사용자는 방 코드를 읽을 수 없음 | 없음 | `/roomCodes/123456` | 읽기 | 거부 |
| 인증된 게스트는 유효한 방 코드를 조회할 수 있음 | 게스트 UID | `/roomCodes/123456` | 읽기 | 허용 |
| 방 생성자와 다른 방장 UID를 지정할 수 없음 | 게스트 UID | `/rooms/room_test` | 다른 `hostUid`로 저장 | 거부 |
| 방장이 방을 만들 수 있음 | 방장 UID | `/rooms/room_test` | 유효한 방 저장 | 허용 |
| 정의되지 않은 말 필드를 추가할 수 없음 | 방장 UID | `/rooms/room_test/players/p0` | 임의 필드 추가 | 거부 |
| 게스트는 대기실 참가자 목록에 자신을 추가할 수 있음 | 게스트 UID | `/rooms/room_test/participants/guest` | 유효한 게스트 저장 | 허용 |
| 게스트는 다른 참가자의 정보를 수정할 수 없음 | 게스트 UID | `/rooms/room_test/participants/other` | 저장 | 거부 |
| 게스트는 게임 설정을 바꿀 수 없음 | 게스트 UID | `/rooms/room_test/config` | 수정 | 거부 |
| 방장은 유효한 게임 설정을 바꿀 수 있음 | 방장 UID | `/rooms/room_test/config` | 수정 | 허용 |
| 게스트는 비어 있는 말을 선택할 수 있음 | 게스트 UID | `/rooms/room_test/players/p1` | 소유자를 자신으로 수정 | 허용 |
| 게스트는 다른 게스트가 선택한 말을 빼앗을 수 없음 | 게스트 UID | `/rooms/room_test/players/p2` | 소유자 수정 | 거부 |
| 참가한 게스트는 어느 말로든 턴을 바꿀 수 있음 | 게스트 UID | `/rooms/room_test/game` | 리비전 1 증가와 함께 저장 | 허용 |
| 첫 턴 변경 때 기존 시작 이벤트가 유지됨 | 게스트 UID | `/rooms/room_test/game` | `r1`을 유지하고 `r2` 턴 추가 | 허용 |
| 게스트는 진행 중인 말을 운영 시간으로 돌릴 수 있음 | 게스트 UID | `/rooms/room_test/game` | `referee` 이벤트 추가, 리비전 1 증가 | 허용 |
| 기존 이벤트를 다시 쓸 수 없음 | 참가자 UID | `/rooms/room_test/game/events/r1` | 시각 또는 실행자 변경 | 거부 |
| 정의되지 않은 이벤트 필드를 추가할 수 없음 | 참가자 UID | `/rooms/room_test/game` | 임의 필드가 있는 이벤트 추가 | 거부 |
| 선택되지 않은 말로 턴을 바꿀 수 없음 | 참가자 UID | `/rooms/room_test/game` | 빈 말에 `turn` 추가 | 거부 |
| 게임 시작 시각을 변경할 수 없음 | 방장 UID | `/rooms/room_test/game` | `startedAt` 변경, 리비전 1 증가 | 거부 |
| 방에 참가하지 않은 사용자는 게임을 수정할 수 없음 | 외부인 UID | `/rooms/room_test/game` | 저장 | 거부 |
| 게스트는 게임을 종료할 수 없음 | 게스트 UID | `/rooms/room_test/game` | 종료 상태로 저장 | 거부 |
| 방장은 게임을 종료할 수 있음 | 방장 UID | `/rooms/room_test/game` | 종료 상태로 저장, 리비전 1 증가 | 허용 |
| 리비전을 건너뛸 수 없음 | 방장 UID | `/rooms/room_test/game` | 리비전 2 증가와 함께 저장 | 거부 |
