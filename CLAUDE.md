# CLAUDE.md

## 프로젝트 개요

보드게임 플레이어별 턴 타이머 웹앱. Vanilla JS + CSS, 빌드 없음, GitHub Pages 배포.

## 핵심 문서

- **PRD.md**: 전체 요구사항 정의서. 기능 변경 시 PRD도 함께 업데이트할 것.

## 파일 구조

```
js/app.js        # 앱 초기화, 화면 전환
js/timer.js      # 타이머 코어 로직
js/settings.js   # 설정 관리, 색상 팔레트/프리셋, localStorage
js/ui.js         # DOM 렌더링 (설정/게임/통계/히스토리 화면)
js/sound.js      # Web Audio API 알림 사운드
js/history.js    # 히스토리 저장/조회
css/style.css    # 전체 스타일 (단일 파일)
```

## 개발 규칙

- 코드 변경 시 PRD.md와 이격이 없는지 확인하고, 이격이 있으면 PRD도 함께 수정
- 외부 의존성 없음 (Vanilla JS only)
- ES Modules 사용 (`file://` 불가, 로컬 서버 필요)
- localStorage로 설정/히스토리 저장

## 로컬 실행

```bash
npx live-server --port=8080
```

## 디자인 방향

- 테마: 뉴트럴 다크 톤 (파란기 없는 다크 그레이)
- 색상 팔레트: 채도를 낮춘 뮤트 톤 10색
- 색상 프리셋: 보드게임별 고유 색상 (팔레트와 독립)
- 가로 모드 강제 적용 (portrait → rotate 90deg)
- 설정 화면: 2열 그리드 레이아웃 (좌: 플레이어, 우: 타이머)
