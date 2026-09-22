# Realtime Database Rules Cases

Run these cases in Firebase Console > Realtime Database > Rules Playground before publishing `database.rules.json`.

Status: First-turn case reproduced as denied against deployed rules on 2026-09-23. Revised rules and remaining cases pending console verification.

| Case | Auth | Path | Method | Expected |
|---|---|---|---|---|
| Anonymous user cannot read codes | none | `/roomCodes/123456` | get | deny |
| Authenticated user can resolve a valid code | guest UID | `/roomCodes/123456` | get | allow |
| Host UID must match room creator | guest UID | `/rooms/room_test` | set with another `hostUid` | deny |
| Host creates room | host UID | `/rooms/room_test` | set valid room | allow |
| Room rejects unknown player fields | host UID | `/rooms/room_test/players/p0` | add arbitrary field | deny |
| Guest joins self in lobby | guest UID | `/rooms/room_test/participants/guest` | set valid guest | allow |
| Guest cannot write another participant | guest UID | `/rooms/room_test/participants/other` | set | deny |
| Guest cannot change config | guest UID | `/rooms/room_test/config` | update | deny |
| Host changes config | host UID | `/rooms/room_test/config` | update valid values | allow |
| Guest claims an empty player | guest UID | `/rooms/room_test/players/p1` | update owner to guest | allow |
| Guest cannot take another guest's player | guest UID | `/rooms/room_test/players/p2` | update owner | deny |
| Joined guest switches any active player | guest UID | `/rooms/room_test/game` | transaction-shaped set, revision +1 | allow |
| Existing start event remains unchanged during first turn | guest UID | `/rooms/room_test/game` | append `r2` turn while preserving `r1` fields | allow |
| Guest can return an active player to operational time | guest UID | `/rooms/room_test/game` | append `referee`, revision +1 | allow |
| Existing event cannot be rewritten | joined UID | `/rooms/room_test/game/events/r1` | change timestamp or actor | deny |
| Game rejects unknown event fields | joined UID | `/rooms/room_test/game` | append event with arbitrary field | deny |
| Turn cannot target an unclaimed player | joined UID | `/rooms/room_test/game` | append `turn` for empty player | deny |
| Started time cannot change after start | host UID | `/rooms/room_test/game` | change `startedAt`, revision +1 | deny |
| Outsider cannot change game | outsider UID | `/rooms/room_test/game` | set | deny |
| Guest cannot end game | guest UID | `/rooms/room_test/game` | set status ended | deny |
| Host ends game | host UID | `/rooms/room_test/game` | set status ended, revision +1 | allow |
| Revision skip is rejected | host UID | `/rooms/room_test/game` | set revision +2 | deny |
