# Board Game Timer

보드게임 플레이 시 각 플레이어의 턴 시간을 관리하는 경량 웹앱.

## 주요 기능

- **1~6인 플레이어** 지원, 대기실에서 이름과 미플 색상 선택 (10색 팔레트)
- **방 기반 게임**: 혼자 방을 만들어 시작하거나 숫자 6자리 방 코드/QR로 여러 기기가 참가
- **대기실 접속 관리**: 1초 접속 신호, 5초 미응답 게스트 정리, 방장의 명시적 나가기 시 대기실 종료
- **기본 타이머**: 플레이어별 플레이 시간 누적. 선택적으로 남은 시간 차감과 패널티 사용
- **색상 프리셋**: 추천 색에 오라 표시, 실제 말 선택은 직접 조작
- **게임 중 통계**: 플레이어별 턴 수와 평균 턴 시간 표시
- **자유 선택 조작**: 아무 플레이어나 탭하여 턴 전환, 직접 전환 숏컷
- **운영 타이머**: 턴 사이 공백시간 자동 측정 (카운트업)
- **소리 설정**: 소리 켜기·끄기 제공. 시간 경고와 TTS는 현재 방 기반 흐름에서 별도 검증 필요
- **게임 통계**: 종료 후 플레이어별 소요시간·턴 수와 Gantt 차트. 패널티는 남은 시간 차감 방식에서 표시
- **히스토리**: 게임 결과 저장 및 과거 기록 열람
- **PWA**: 홈 화면 추가 가능 (게임 진행에는 네트워크 연결 필요)

## 기술 스택

- Vanilla JS (ES6 Modules), CSS, HTML
- Firebase Realtime Database + Anonymous Authentication (멀티플레이)
- 빌드 불필요, QR 생성 라이브러리는 저장소에 포함
- localStorage로 설정 저장
- Firebase Realtime Database에 기기 참가자별 게임 기록 저장 및 조회
- Service Worker는 Network First로 자산을 캐싱하며 게임 진행과 원격 기록 조회에는 네트워크 연결 필요

## 문서와 TODO

[프로젝트 문서 목록](docs/README.md)에서 현재 요구사항, 완료 항목과 남은 작업을 확인한다.

## 실행

```bash
# 로컬 서버로 실행 (ES Modules 사용으로 file:// 불가)
npx live-server --port=8080
```

브라우저에서 `http://localhost:8080` 접속.

첫 화면에서 `방 만들기`를 누른 뒤 플레이어를 1명 이상 선택하고 `준비 완료`를 누르면 혼자서도 시작할 수 있다. 다른 기기와 함께하려면 방 코드 또는 QR로 참가한다. 게임에는 Firebase 프로젝트 `bg-timer-1b7ad`의 익명 인증과 Realtime Database 연결이 필요하다. 브라우저는 실행 시 공식 Firebase CDN의 JS SDK `12.19.0`을 불러온다. 규칙은 `database.rules.json`에 보관하며, 배포 전 `tests/rules/database-rules-cases.md`의 허용/거부 사례를 확인한다.

## 배포

main 브랜치에 push하면 GitHub Pages가 자동 배포한다. Realtime Database 보안 규칙은 `database.rules.json`을 별도로 Firebase 프로젝트에 배포해야 한다.

## 파일 구조

```
bg-timer/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js          # 앱 초기화, 화면 전환
│   ├── settings.js     # 설정 관리, 색상 팔레트, localStorage
│   ├── ui.js           # DOM 렌더링 (게임/통계/히스토리 화면)
│   ├── sound.js        # 알림 사운드 (Web Audio API)
│   ├── history.js      # 히스토리 저장/조회
│   └── multiplayer/    # 방, Firebase, 게임 이벤트 동기화
├── database.rules.json # Realtime Database 보안 규칙
├── vendor/qrcode.js
├── manifest.json
├── sw.js
└── icons/
    └── meeple.svg
```

## 기록 접근 범위

각 기기 참가자는 자기 익명 UID 아래에 기록을 저장한다. 익명 인증은 같은 브라우저에 유지되지만 사이트 데이터 삭제나 기기·브라우저 변경 후 이전 기록 복구는 지원하지 않는다. 기존 로컬 기록은 저장·조회 시 Firebase로 이전하고, 이전이 모두 성공한 뒤 로컬 사본을 지운다.

## 아이콘 출처

- Meeple icon by [Delapouite](https://delapouite.com/) — [game-icons.net](https://game-icons.net/1x1/delapouite/meeple.html) ([CC BY 3.0](https://creativecommons.org/licenses/by/3.0/))
- Hourglass icon by [Bootstrap Icons](https://icons.getbootstrap.com/) — [GitHub](https://github.com/twbs/icons) ([MIT](https://opensource.org/licenses/MIT))

## 라이선스

MIT
