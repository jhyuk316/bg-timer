# CLAUDE.md

## 프로젝트 개요

보드게임 플레이어별 턴 타이머 웹앱. Vanilla JS + CSS, 빌드 없음, GitHub Pages 배포.

## 핵심 문서

- **PRD.md**: 현재 요구사항. 기능 변경 시 함께 갱신한다.
- **docs/README.md**: 문서와 남은 작업 목록. TODO 조회·추가·완료 처리 시 연결된 원문과 현재 브랜치를 확인하고 목록도 갱신한다.
- **CONTEXT.md**: 제품 용어.
- **docs/superpowers/**: 최초 설계·계획의 보존 기록. 현재 구현은 PRD와 코드로 확인한다.

## 파일 구조

```
js/app.js        # 앱 초기화, 화면 전환
js/multiplayer/  # 방과 게임 상태, Firebase 동기화
js/settings.js   # 설정 관리, 색상 팔레트/프리셋, localStorage
js/ui.js         # DOM 렌더링 (게임/통계/히스토리 화면)
js/sound.js      # Web Audio API 알림 사운드
js/history.js    # 히스토리 저장/조회
css/style.css    # 전체 스타일 (단일 파일)
```

## 개발 규칙

- 코드 변경 시 PRD.md와 이격이 없는지 확인하고, 이격이 있으면 PRD도 함께 수정
- 빌드 없이 Vanilla JS를 사용한다. Firebase SDK는 공식 CDN, QR 라이브러리는 vendor에서 불러온다.
- ES Modules 사용 (`file://` 불가, 로컬 서버 필요)
- 설정과 방 복귀 정보는 localStorage, 게임 기록은 Firebase의 익명 UID별 경로에 저장한다.
- 정적 JS/CSS 변경 시 sw.js의 CACHE_NAME을 올린다.
- 코드 변경은 node --test tests/unit/*.test.js로 검증한다. 실제 규칙 검사와 실기기 QA의 완료 여부는 별도로 기록한다.

## 로컬 실행

```bash
npx live-server --port=8080
```

## 디자인 방향

- 테마: 뉴트럴 다크 톤 (파란기 없는 다크 그레이)
- 색상 팔레트: 채도를 낮춘 뮤트 톤 10색
- 색상 프리셋: 팔레트의 추천 색에 오라를 표시한다. 실제 말 배정은 사용자가 직접 선택한다.
- 가로 모드 강제 적용 (portrait → rotate 90deg)
- 첫 화면: 방 만들기, 방 참가, 지난 게임. 방장은 대기실에서 플레이어와 타이머를 설정
