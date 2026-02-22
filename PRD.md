# PRD: Board Game Timer

## 개요

보드게임 플레이 시 각 플레이어의 턴 시간을 관리하는 경량 웹앱.
GitHub Pages로 배포하며, 설치 없이 모바일/데스크톱 브라우저에서 바로 사용 가능.

## 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| 언어 | Vanilla JS (ES6+) | 의존성 제로, 빠른 로딩 |
| 스타일 | CSS (단일 파일) | 빌드 불필요 |
| 저장 | localStorage | 설정 영속화 |
| 배포 | GitHub Pages | 무료, 간편 |
| PWA | Service Worker + manifest.json | 오프라인 사용, 홈화면 추가 |

## 핵심 요구사항

### 1. 플레이어 설정
- 플레이어 수: 1~5명
- 각 플레이어 이름 설정 (기본값: "Player 1", "Player 2", ...)
- 각 플레이어 미플 색상을 20색 팔레트에서 개별 선택
- 설정값은 localStorage에 저장하여 다음 접속 시 복원

#### 미플 색상 팔레트 (20색)

> 모티브: Ian O'Toole(뮤트 톤), SETI(우주 기관), 백로성(일본 전통), Endeavor Deep Sea(심해)

| # | 이름 | HEX |
|---|------|---------|
| 1 | Crimson | `#C94040` |
| 2 | Coral | `#E07060` |
| 3 | Dusty Rose | `#C4727A` |
| 4 | Magenta | `#B8456B` |
| 5 | Sienna | `#D47F52` |
| 6 | Orange | `#E08840` |
| 7 | Amber | `#D4A24E` |
| 8 | Gold | `#E0C850` |
| 9 | Sage | `#8BAF6E` |
| 10 | Emerald | `#4CAF7A` |
| 11 | Teal | `#4E9E8E` |
| 12 | Turquoise | `#50C4C4` |
| 13 | Sky | `#7CAFC4` |
| 14 | Cobalt | `#4477B0` |
| 15 | Navy | `#2B5278` |
| 16 | Lavender | `#8E7BB5` |
| 17 | Purple | `#7B5EA7` |
| 18 | Ivory | `#E8E4DF` |
| 19 | Stone | `#A89088` |
| 20 | Espresso | `#6B4E3D` |

기본 배정: Player 1~5 → Crimson, Cobalt, Amber, Emerald, Lavender

#### 미플 색상 프리셋

**Ian O'Toole ** — 채도를 낮춘 세련된 톤. On Mars / Lisboa / Weather Machine 분위기.

| # | 이름 | HEX |
|---|------|---------|
| 1 | Powder Blue | `#7CAFC4` |
| 2 | Amber | `#D4A24E` |
| 3 | Dusty Rose | `#C4727A` |
| 4 | Teal | `#4E9E8E` |
| 5 | Soft Purple | `#8E7BB5` |
| 6 | Burnt Sienna | `#D47F52` |
| 7 | Sage | `#8BAF6E` |
| 8 | Warm Gray | `#A89088` |

**SETI** — 우주 기관 테마. 4인용.

| # | 이름 | HEX |
|---|------|---------|
| 1 | White | `#E8E4DF` |
| 2 | Green | `#4CAF7A` |
| 3 | Orange | `#E08840` |
| 4 | Purple | `#7B5EA7` |

**백로성 (The White Castle)** — 일본 전통 톤. 4인용.

| # | 이름 | HEX |
|---|------|---------|
| 1 | Red | `#C94040` |
| 2 | Blue | `#4477B0` |
| 3 | Yellow | `#D4B84E` |
| 4 | Green | `#5A9E64` |

**Endeavor Deep Sea** — 심해 탐사 테마. 5인용.

| # | 이름 | HEX |
|---|------|---------|
| 1 | Ivory | `#E8E4DF` |
| 2 | Mint | `#50C4A8` |
| 3 | Yellow | `#E0C850` |
| 4 | Purple | `#7B5EA7` |
| 5 | Red | `#C94040` |

### 2. 타이머 모드
- **카운트업**: 턴 시간 누적 측정 (제한 없음)
- **카운트다운**: 플레이어별 제한 시간 설정 (체스 클럭 방식)
- 모드는 게임 시작 전에 선택

### 3. 타이머 동작
- 현재 턴 플레이어의 타이머만 진행
- 턴 넘기기: 화면 탭 또는 "다음" 버튼
- 일시정지 / 재개 기능
- 게임 리셋 기능
- **백그라운드 동작**: 탭이 비활성화되어도 타이머 정확히 유지
  - `Date.now()` 기반 경과 시간 계산 (setInterval 드리프트 방지)
  - `visibilitychange` 이벤트로 복귀 시 시간 보정

### 4. 카운트다운 알림
- 시간 종료 시 시각적 경고 (화면 깜빡임 / 색상 변화)
- 시간 종료 시 소리 알림 (짧은 비프음, Web Audio API)
- 소리 on/off 토글

### 5. UI/UX

#### 테마
- 단일 테마: 약간 어두운 톤 (다크 그레이 배경, 밝은 텍스트)
- 배경: `#1a1a2e` ~ `#16213e` 계열
- 강조: 플레이어 색상 활용
- 텍스트: `#e0e0e0`

#### 화면 구성
- **설정 화면**: 플레이어 수, 이름, 색상, 타이머 모드/시간 설정
- **게임 화면**: 현재 플레이어 강조 표시, 전체 플레이어 타이머 목록, 컨트롤 버튼
- 화면 전환은 JS로 DOM 토글 (SPA 방식, 라우터 불필요)

#### 반응형
- 모바일 우선 설계 (보드게임은 테이블 위 스마트폰 사용이 주 시나리오)
- 데스크톱에서도 정상 동작

### 6. PWA
- `manifest.json`: 앱 이름, 아이콘, 테마 색상
- Service Worker: 오프라인 캐싱 (Cache First 전략)
- 홈 화면 추가 가능

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
│   └── sound.js        # 알림 사운드 (Web Audio API)
├── manifest.json
├── sw.js               # Service Worker
├── icons/              # PWA 아이콘
└── PRD.md
```

## 설계 원칙

1. **빌드 없음**: HTML/CSS/JS 파일을 그대로 서빙
2. **의존성 제로**: 외부 라이브러리 없음
3. **모듈 분리**: 기능별 JS 파일 분리 (ES Modules)
4. **과하지 않게**: 필요한 기능만, 최소한의 추상화

## 향후 확장 가능 (현재 스코프 아님)

- 게임 히스토리 / 통계
- 턴 순서 랜덤화
- 커스텀 효과음
- 다국어 지원
