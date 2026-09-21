---
title: 멀티플레이 MVP 결정 지도
label: wayfinder:map
status: open
---

## Destination

기존 싱글 모드를 유지하면서, 여러 기기가 방에 모여 플레이어 말을 나누어 맡고 하나의 동기화된 타이머 게임을 끝낼 수 있는 MVP의 구현 가능한 화면·동작·Firebase 명세를 확정한다.

## Notes

- 계획 단계만 다룬다. 구현은 이 지도의 결정이 끝난 뒤 별도 작업으로 진행한다.
- UI 결정은 모바일 가로 화면을 기본으로 하고 현재 싱글 게임 화면 재사용을 우선한다.
- Firebase Realtime Database와 익명 인증을 사용하고 별도 백엔드는 두지 않는다.
- 용어는 [CONTEXT.md](../../../CONTEXT.md)를 따른다.

## Decisions so far

- [멀티플레이 MVP의 경계와 기본 화면 원칙](tickets/001-mvp-boundary.md): 한 게임을 생성·참가·배정·동기화·종료하는 흐름만 포함하고, 전체 보드와 싱글/멀티 모드 전환을 사용한다.
- [방 생성·참가·대기실 화면 흐름](tickets/002-room-and-lobby-flow.md): 방을 즉시 만들고 총 2~5개의 말을 나누어 맡은 뒤 모든 기기가 준비되면 시작한다.
- [멀티 게임 조작과 동기화 체감](tickets/003-in-game-control.md): 게스트는 담당 말만, 방장은 모든 말을 조작하며 게스트 연결이 끊겨도 게임을 계속한다.

## Not yet specified

- 모바일 세로 방향으로 접속했을 때 회전 안내만 표시할지, 축약 화면도 지원할지
- 방장 연결이 끊겼을 때의 안내와 종료 처리
- 실제 기기 QA 범위와 MVP 출시 판정 기준

## Follow-up TODO

- 기존 localStorage 게임 기록을 Firebase `gameRecords`로 이전하고 기록 화면도 Firebase 조회 방식으로 전환한다. 이번 결정 단계에서는 구현하지 않는다.

## Out of scope

- 관전자와 공개 방 목록
- 방장 권한 이전
- Google·이메일 등 사용자 계정 로그인
- 종료된 방의 자동 정리 시스템
