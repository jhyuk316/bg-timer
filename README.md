# Board Game Timer

보드게임 플레이 시 각 플레이어의 턴 시간을 관리하는 경량 웹앱.

## 주요 기능

- **1~5인 플레이어** 지원, 이름/미플 색상 커스텀 (20색 팔레트 + 4종 프리셋)
- **하이브리드 타이머**: 턴 시간(Fischer) + 예비시간(Byoyomi) + 패널티(Scrabble)
- **자유 선택 조작**: 아무 플레이어나 탭하여 턴 전환, 직접 전환 숏컷
- **심판 타이머**: 턴 사이 공백시간 자동 측정 (카운트업)
- **알림**: 예비시간 진입 경고, 5분 TTS 음성 알림, 패널티 알림
- **게임 통계**: 종료 후 플레이어별 소요시간/턴수/패널티 표시
- **히스토리**: 게임 결과 저장 및 과거 기록 열람
- **PWA**: 오프라인 지원, 홈 화면 추가 가능

## 기술 스택

- Vanilla JS (ES6 Modules), CSS, HTML
- 외부 의존성 없음, 빌드 불필요
- localStorage로 설정/히스토리 저장
- Service Worker로 오프라인 캐싱

## 실행

```bash
# 로컬 서버로 실행 (ES Modules 사용으로 file:// 불가)
npx live-server --port=8080
```

브라우저에서 `http://localhost:8080` 접속.

## 배포

GitHub Pages에 push하면 자동 배포.

## 파일 구조

```
bg-timer/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js          # 앱 초기화, 화면 전환
│   ├── timer.js        # 타이머 로직 (코어)
│   ├── settings.js     # 설정 관리, localStorage
│   ├── ui.js           # DOM 조작, 렌더링
│   ├── sound.js        # 알림 사운드 (Web Audio API)
│   └── history.js      # 히스토리 저장/조회
├── manifest.json
├── sw.js
└── icons/
    └── meeple.svg
```

## 타이머 프리셋

| 프리셋 | 턴 시간 | 예비시간 | 패널티 추가시간 |
|--------|---------|---------|---------------|
| Filler | 20초 | 5분 | 2분 |
| Light | 30초 | 15분 | 3분 |
| Middle | 45초 | 30분 | 5분 |
| Heavy | 60초 | 50분 | 5분 |
| Epic | 90초 | 60분 | 10분 |

## 아이콘 출처

- Meeple icon by [Delapouite](https://delapouite.com/) — [game-icons.net](https://game-icons.net/1x1/delapouite/meeple.html) ([CC BY 3.0](https://creativecommons.org/licenses/by/3.0/))
- Hourglass icon by [Bootstrap Icons](https://icons.getbootstrap.com/) — [GitHub](https://github.com/twbs/icons) ([MIT](https://opensource.org/licenses/MIT))

## 라이선스

MIT
