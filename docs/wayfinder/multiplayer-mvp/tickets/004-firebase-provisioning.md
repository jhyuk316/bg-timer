---
title: Firebase 프로젝트 준비
label: wayfinder:task
parent: ../map.md
status: done
blocked_by: 002-room-and-lobby-flow.md
---

## Question

확정된 데이터와 권한 모델을 구현할 수 있도록 Firebase 웹 앱, Realtime Database, 익명 인증을 준비하고 연결 정보를 확보한다.

## 완료 상태

- 프로젝트 bg-timer-1b7ad의 익명 인증과 Realtime Database 연결을 구현했다.
- 규칙은 database.rules.json에서 관리하며 사이트 배포와 별도로 게시한다.
- 2026-10-01 기록 기능 작업에서 규칙 게시 후 실제 검사 41개 통과가 보고됐다. 상세 검증 범위는 [규칙 검사 문서](../../../../tests/rules/database-rules-cases.md)를 참고한다.
