# Multiplayer MVP Design

## Goal

기존 싱글 타이머를 그대로 유지하면서 여러 모바일 기기가 하나의 방에 접속해 플레이어 말을 나누어 맡고, 동일한 턴과 시간을 보며 한 게임을 끝낼 수 있게 한다. 기본 사용 환경은 iOS Safari와 Android Chrome의 가로 화면이며 서로 다른 Wi-Fi와 LTE에서도 동작해야 한다.

## MVP Scope

### Included

- 설정 화면의 `싱글 | 멀티` 모드 전환
- 방 생성과 6자리 방 코드 발급
- QR 코드 또는 방 코드로 참가
- 한 기기 참가자가 여러 플레이어 말을 선택
- 모든 기기를 합쳐 2~5개의 플레이어 말 사용
- 준비 완료와 방장 시작
- 전체 보드와 타이머 실시간 동기화
- 방장과 게스트 모두 모든 말 조작
- 방장 전용 게임 시작과 종료
- 일시정지 없이 플레이어 시간이 아닌 모든 구간을 운영시간으로 누적
- 연결 상태 표시와 같은 기기의 재접속 복구
- 모든 기기의 종료 통계 표시
- 방장 기기의 기존 로컬 히스토리에만 게임 결과 자동 저장

### Excluded

- Firebase 게임 기록 저장 및 기존 로컬 기록 이전
- 관전자, 공개 방 목록, 방장 이전
- Google·이메일 계정 로그인
- 종료된 방의 자동 삭제 작업
- 연결이 끊긴 게스트의 플레이어 말 소유권 이전
- 심플 타이머 기본값 전환과 고급 설정 재구성

## Terminology

도메인 용어는 프로젝트 루트의 `CONTEXT.md`를 따른다. Firebase Authentication의 익명 사용자 한 명은 기기 참가자 한 명으로 취급하고 `uid`를 기기 참가자의 식별자로 사용한다.

## Technical Approach

정적 GitHub Pages 앱에서 Firebase JavaScript SDK의 모듈 API를 사용한다. 별도 애플리케이션 서버는 두지 않는다.

Firebase 접근은 기존 `app.js`에 직접 섞지 않고 다음 경계로 분리한다.

- `firebase-config.js`: 공개 가능한 Firebase 웹 설정
- `firebase.js`: 앱 초기화, 익명 인증, 서버 시간 오프셋, 연결 상태
- `room-state.js`: Firebase와 무관한 방 상태 검증 및 파생 상태 계산
- `room.js`: 방 생성·참가·말 선택·준비·presence·재접속
- `multiplayer-game.js`: 원자적인 턴 이벤트, 운영시간 전환, 종료 및 시간 파생
- `multiplayer-ui.js`: 멀티 진입, 참가, 대기실, 오류·연결 상태 렌더링
- `app.js`: 싱글과 멀티 화면 흐름을 조정

Firebase가 초기화되지 않거나 연결에 실패해도 싱글 모드는 정상 동작한다. 멀티 모드는 연결 오류와 재시도 동작을 표시한다.

## Firebase Project

- Project ID: `bg-timer-1b7ad`
- Realtime Database region: `asia-southeast1`
- Authentication: Anonymous provider
- Database access: Firebase Realtime Database Security Rules로 제한

웹용 Firebase 설정은 공개 클라이언트 식별 정보이므로 저장소에 포함할 수 있다. 서비스 계정이나 Admin SDK 비공개 키는 사용하지 않는다.

## Room Data Model

```text
roomCodes/{CODE}
  roomId
  createdAt

rooms/{roomId}
  code
  hostUid
  status                 lobby | playing | ended
  createdAt
  config
    turnTimeMs
    mainTimeMs
    penaltyTimeMs
  participants/{uid}
    role                  host | guest
    ready
    connected
    joinedAt
    lastSeenAt
  players/{playerId}
    paletteIndex
    name
    ownerUid              uid | null
  game
    revision
    status                running | ended
    activeType            player | referee | null
    activePlayerId        playerId | null
    changedAt
    startedAt
    endedAt
    events/{eventId}
      revision
      type                start | switch | referee | end
      actorUid
      playerId
      at
```

방 ID는 추측하기 어려운 Firebase push ID를 사용한다. 방 코드는 사람이 입력하기 쉬운 대문자·숫자 6자리로 만들고 혼동하기 쉬운 `0`, `O`, `1`, `I`는 제외한다. `roomCodes` 생성은 transaction으로 충돌을 확인한 뒤 확정한다.

플레이어 말은 최대 5개의 고정 슬롯을 사용한다. `paletteIndex`는 색상을 결정하며, `ownerUid`가 없으면 아직 선택되지 않은 말이다.

## Authentication And Authorization

앱은 화면에 로그인 절차를 노출하지 않고 Firebase Anonymous Authentication으로 기기 참가자를 식별한다. 인증 상태는 브라우저에 유지되며 새로고침 후 같은 `uid`로 방에 복귀한다.

Realtime Database 규칙은 다음 원칙을 강제한다.

- 인증된 사용자만 방 코드와 방 데이터를 읽는다.
- 방 생성 시 `hostUid`는 반드시 요청자의 `auth.uid`와 같다.
- 참가자는 로비 상태에서 자신의 `participants/{uid}`만 생성·수정한다.
- 게스트는 로비에서 비어 있는 말을 자신에게 배정하거나 자신의 배정을 해제할 수 있다.
- 게스트는 자신이 맡은 말의 이름만 수정한다.
- 방장은 모든 말의 배정과 이름, 게임 설정을 수정할 수 있다.
- 게임 시작과 종료는 방장만 수행한다.
- 방에 참가한 방장과 게스트는 실행 중 모든 플레이어 말로 턴을 변경하거나 운영시간을 시작할 수 있다.
- `revision`은 한 번의 확정된 이벤트마다 정확히 1씩 증가한다.
- 허용된 상태값, 최대 문자열 길이, 플레이어 수와 숫자 범위를 규칙에서 검증한다.

규칙은 `database.rules.json`으로 저장하고 Firebase Local Emulator 또는 Rules Playground로 주요 허용·거부 사례를 검증한 뒤 배포한다.

## Room Lifecycle

### Create

1. 멀티 모드에서 방장이 `방 만들기`를 누른다.
2. 익명 인증 완료 후 방과 방 코드 매핑을 생성한다.
3. 방장은 자동으로 참가자 목록에 들어가며 대기실로 이동한다.
4. 현재 URL에 `?room=CODE`를 붙여 QR 코드에 사용한다.

### Join

1. QR 링크는 방 코드를 자동 입력하고 참가 화면을 연다.
2. 수동 참가자는 6자리 코드를 입력한다.
3. 존재하며 로비 상태인 방만 참가할 수 있다.
4. 참가 성공 시 현재 방 ID와 코드를 localStorage에 저장한다.

### Lobby

- 모든 기기는 플레이어 말, 소유 기기, 참가자 연결·준비 상태를 실시간 구독한다.
- 각 기기는 여러 말을 선택할 수 있다.
- 총 선택 수가 2~5개일 때만 게임을 시작할 수 있다.
- 게스트는 자신의 준비 상태를 확정하거나 취소한다.
- 방장은 모든 연결 참가자가 준비된 경우에만 시작할 수 있다. 방장 자신도 준비 상태에 포함한다.
- 준비 완료 상태에서는 해당 참가자의 말 선택과 이름 입력을 잠근다.
- 방장이 설정을 변경하면 모든 참가자의 준비 상태를 해제한다.

### Reconnect

- `.info/connected`를 구독하고 `onDisconnect`로 자신의 `connected`를 `false`로 예약한다.
- 연결 시 `connected: true`와 `lastSeenAt`을 갱신한다.
- 저장된 방이 존재하면 새로고침 뒤 자동으로 같은 화면과 권한을 복원한다.
- 게스트 연결이 끊겨도 게임은 계속되고 해당 플레이어 말에 연결 끊김을 표시한다.
- 연결이 끊긴 게스트의 말도 남은 모든 기기 참가자가 계속 조작할 수 있다.
- 방장 연결이 끊기면 게스트 화면에 연결 끊김을 표시하지만 게임 시간 계산은 계속한다. 방장 전용 작업은 방장 재접속 전까지 사용할 수 없다.

## Synchronized Timer Model

Firebase에는 매초 타이머 값을 쓰지 않는다. 게임 상태가 바뀌는 이벤트만 기록하며 각 기기는 이벤트 시각과 현재 서버 보정 시각으로 표시값을 계산한다.

- `.info/serverTimeOffset`을 구독해 `serverNow = Date.now() + offset`으로 계산한다.
- 게임 이벤트는 transaction으로 `revision`, 현재 상태와 이벤트를 함께 확정한다.
- transaction이 충돌하면 Firebase가 최신 상태로 다시 실행한다.
- 모든 시간 계산은 확정된 이벤트 목록과 현재 활성 구간의 `changedAt`을 기반으로 한다.
- 로컬 화면 tick은 `requestAnimationFrame` 또는 짧은 interval만 사용하며 Firebase 쓰기를 발생시키지 않는다.
- 백그라운드에서 복귀하면 최신 방 스냅샷과 서버 보정 시각으로 즉시 재계산한다.
- 같은 revision의 이벤트는 한 번만 통계에 반영한다.
- 게임 시작 이벤트는 운영시간을 즉시 시작한다. 종료 전까지 타이머가 멈추는 상태는 없다.

거의 동시에 두 기기가 턴을 바꾸면 먼저 commit된 transaction만 해당 revision을 차지한다. 뒤의 transaction은 갱신된 상태에서 권한과 전이를 다시 검증한다. 사용자가 누른 결과가 무효가 된 기기에만 짧은 충돌 안내를 표시한다.

## Existing Timer Semantics

멀티플레이 MVP는 현재 싱글 타이머의 의미를 유지한다.

- 플레이어 말 선택: 해당 플레이어의 턴 시작 또는 다른 플레이어로 직접 전환
- 활성 플레이어를 다시 선택: 운영 시간 시작
- 운영 중 플레이어 선택: 해당 플레이어 턴 시작
- 게임 시작 직후부터 첫 플레이어를 선택하기 전까지: 운영 시간
- 턴 딜레이가 끝나면 개인 메인 시간을 차감
- 메인 시간 소진 시 추가 시간과 패널티 적용

심플 타이머 기본값 전환은 별도 후속 작업이며 이번 구현에 포함하지 않는다.

## User Interface

### Entry

기존 설정 화면 상단에 `싱글 | 멀티` segmented control을 추가한다. 싱글 선택 시 현재 2페이지 설정 흐름을 그대로 유지한다. 멀티 선택 시 `방 만들기`와 `방 코드 참가`를 표시한다.

### Lobby

모바일 가로 화면에서 좌우 2단으로 구성한다.

- 왼쪽: 방 코드, QR 보기, 참가자 목록, 연결·준비 상태
- 오른쪽: 플레이어 말 선택, 담당자 표시, 이름 입력, 타이머 요약, 준비 또는 게임 시작 버튼
- QR은 modal로 크게 표시하고 닫으면 대기실로 돌아온다.
- 방장은 타이머 설정을 수정할 수 있다.

### Game

- 현재 전체 플레이어 보드 구조를 재사용한다.
- 상단의 얇은 상태 바에 방 코드와 연결 상태를 표시한다.
- 말의 담당 기기는 작은 소유 표시로만 구분한다.
- 방장과 게스트 모두 모든 말을 동일하게 활성 상태로 표시하고 조작할 수 있다.
- 연결이 끊긴 기기의 말에는 작은 연결 끊김 표시를 추가한다.
- 게임 종료 버튼은 방장에게만 표시한다. 일시정지 버튼은 표시하지 않는다.

### Orientation

- 참가 코드 입력과 QR 진입은 세로에서도 사용할 수 있다.
- 대기실과 게임 화면을 세로로 열면 `가로로 돌려주세요` 안내를 표시한다.
- CSS media query로 가로 레이아웃을 고정하되 브라우저 방향 잠금 API에는 의존하지 않는다.

### Errors

다음 오류는 화면을 잃지 않는 inline message 또는 짧은 toast로 표시한다.

- 존재하지 않거나 이미 시작된 방
- Firebase 연결 실패와 재시도 중
- 선택 가능한 말 수 초과
- 다른 기기가 먼저 선택한 말
- 준비되지 않은 참가자가 있어 시작할 수 없음
- 동시 턴 조작으로 로컬 입력이 반영되지 않음
- 권한 없는 조작

## QR Generation

QR 코드는 외부 이미지 API를 사용하지 않고 저장소에 포함한 정적 JavaScript 라이브러리로 브라우저에서 생성한다. QR 내용은 현재 GitHub Pages URL에 `?room=CODE`를 추가한 참가 링크다.

## Local History At Game End

게임 종료 시 모든 기기에 동일한 통계를 표시한다. 방장 기기만 기존 `history.js`를 통해 localStorage에 자동 저장한다. 게스트는 통계를 볼 수 있지만 로컬 히스토리를 만들지 않는다.

Firebase 기록 저장과 기존 localStorage 기록 이전은 `docs/wayfinder/multiplayer-mvp/tickets/005-migrate-history-to-firebase.md`에 기록한 별도 후속 작업이며 이 MVP의 완료 조건이 아니다. 심플 타이머 전환 역시 `docs/todos/simple-timer-default.md`의 독립 작업으로 남긴다.

## Testing Strategy

### Pure Unit Tests

Node 내장 test runner로 Firebase 없이 다음을 검증한다.

- 방 코드 생성 문자와 길이
- 시작 가능 조건: 2~5개 말, 모든 연결 참가자 준비
- 모든 방 참가자의 말 조작 권한
- 이벤트 revision과 상태 전이
- 이벤트 기반 누적 시간과 현재 표시 시간
- 게임 시작부터 첫 턴 전까지와 플레이어 턴 사이의 구간이 운영시간에 포함됨
- 재수신한 같은 revision이 중복 반영되지 않음

### Firebase Rules Tests

에뮬레이터 또는 Rules Playground에서 다음을 확인한다.

- 인증되지 않은 읽기·쓰기 거부
- 게스트의 다른 참가자 및 다른 소유 말 수정 거부
- 게스트의 게임 시작·종료와 설정 변경 거부
- 모든 참가자의 모든 말 턴 변경과 운영시간 전환 허용
- 방장의 게임 시작·종료와 설정 변경 허용
- 잘못된 revision, 상태값과 범위 거부

### Browser QA

- 싱글 모드 회귀 확인
- 방장과 게스트가 서로 다른 브라우저 저장소로 방 생성·참가
- 방장 3개, 게스트 1개 말로 총 4명 시작
- 턴 변경, 운영 시간과 종료 동기화
- 게스트 네트워크 차단 후 남은 기기 참가자의 계속 진행
- 게스트 재접속 후 기존 말과 화면 복구
- 가로 모바일 크기에서 텍스트 겹침과 버튼 오조작 여부 확인
- 세로 방향 회전 안내 확인

실제 서로 다른 Wi-Fi와 LTE 기기 검증은 배포 후 최종 MVP 승인 단계에서 수행한다.

## Completion Criteria

- 기존 싱글 타이머와 로컬 히스토리가 계속 동작한다.
- 방장과 게스트가 QR 또는 코드로 같은 방에 들어간다.
- 여러 기기가 총 2~5개의 말을 충돌 없이 나누어 맡는다.
- 방장 3개, 게스트 1개 말의 4인 게임을 시작하고 끝낼 수 있다.
- 방장과 게스트 모두 모든 말을 조작한다.
- 게스트 연결이 끊겨도 남은 기기 참가자가 게임을 진행하고 재접속이 복구된다.
- 모든 기기의 현재 턴, 플레이어 시간, 운영시간과 종료 상태가 수렴한다.
- 정상 게임 중 Firebase에 초당 쓰기가 발생하지 않는다.
- 데이터베이스 규칙 테스트와 핵심 상태 단위 테스트가 통과한다.
- iOS Safari와 Android Chrome에서 가로 화면 실제 기기 QA를 통과한다.
