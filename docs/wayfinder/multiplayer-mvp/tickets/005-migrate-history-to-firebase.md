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

## 완료 및 제한

- PR #5는 2026-10-01 병합됐고 해당 커밋 2f48a7b의 Pages 배포가 성공했다.
- 기록 경로는 gameRecords/{uid}/{roomId}이며, 기존 로컬 기록은 기존 ID로 이전한다.
- 로컬 기록 이전은 저장 또는 조회 시 실행하고 모두 성공한 뒤 로컬 사본을 지운다.
- 익명 UID는 같은 브라우저에서 유지된다. 사이트 데이터 삭제나 다른 브라우저·기기에서 기존 기록을 복구하는 기능은 없다.
- [이미지 업로드와 외부 저장소 연동](../../../todos/image-upload-storage.md)은 보류한 별도 작업이다.
