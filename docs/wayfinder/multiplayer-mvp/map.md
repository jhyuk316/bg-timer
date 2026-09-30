---
title: 멀티플레이 결정 지도
label: wayfinder:map
status: open
---

## 현재 방향

모든 게임은 방에서 시작하고 1~6명의 플레이어 말을 지원한다. 여러 기기는 같은 보드와 타이머를 공유하며, 혼자서도 방을 만들어 시작할 수 있다. 기본 타이머는 플레이 시간 누적이다.

- 현재 요구사항은 [PRD](../../../PRD.md), 용어는 [CONTEXT](../../../CONTEXT.md)를 따른다.
- 전체 문서와 남은 작업은 [문서 목록](../../README.md)에서 확인한다.
- Firebase Realtime Database와 익명 인증을 사용한다.
- 모바일 가로 화면을 기본으로 하며 세로 화면에는 가로 레이아웃을 회전해 표시한다.

## 결정과 구현

- [MVP 경계](tickets/001-mvp-boundary.md): 최초 결정과 방 기반 통일 이후 변경
- [방 생성·참가·대기실](tickets/002-room-and-lobby-flow.md): 1~6개 말 배정, 모든 접속 기기의 준비 후 시작
- [게임 조작과 동기화](tickets/003-in-game-control.md): 모든 참가자의 말 조작, 운영시간 누적, 방장 전용 종료
- [Firebase 준비](tickets/004-firebase-provisioning.md): 프로젝트 연결과 규칙 검증
- [기록 이전](tickets/005-migrate-history-to-firebase.md): 참가자별 기록 저장·조회와 기존 로컬 기록 이전 완료
- [기본 타이머 전환](../../todos/simple-timer-default.md): 완료

## 후속 TODO

- [플레이 기록 이미지 등록과 외부 저장소](../../todos/image-upload-storage.md): 이미지는 외부 저장소에 올리고 Firebase에는 경로나 URL만 저장한다. 구현 보류.
- [실기기 QA](../../qa/multiplayer-mvp-acceptance-2026-09-24.md): 서로 다른 네트워크의 휴대폰 2대, QR 참가, 연결 복구, 백그라운드 복귀 확인.

## 현재 범위 밖

- 관전자와 공개 방 목록
- 방장 권한 이전
- Google·이메일 등 계정 연동과 기기 간 기록 복구
- 종료된 방의 자동 정리
