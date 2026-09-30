---
title: 로컬 게임 기록을 Firebase로 이전
label: wayfinder:task
parent: ../map.md
status: done
---

## Question

현재 localStorage에 저장하는 게임 기록을 Firebase `gameRecords` 저장·조회 방식으로 이전한다.

## Notes

- 게임 종료 후 각 기기 참가자가 자기 익명 사용자 ID 아래에 기록을 저장한다.
- 기존 로컬 기록은 처음 기록을 읽을 때 같은 익명 사용자 계정으로 이전한다.
- 다른 익명 사용자의 기록은 읽거나 수정할 수 없다.
