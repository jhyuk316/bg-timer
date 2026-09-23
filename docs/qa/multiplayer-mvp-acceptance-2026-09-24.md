# Multiplayer MVP Acceptance Check (2026-09-24)

## Result

Local two-browser acceptance and deployed Firebase rules checks passed. Release acceptance is **pending** a two-phone test on separate networks after the feature is published to the public GitHub Pages origin. Localhost QR links cannot serve that test.

## Passed

- Two-browser lobby: host created a six-digit room, guest joined, selected a player, and both became ready.
- Four-player game: host owned three players and guest owned one. Guest operated a host-owned tile; host operated a guest-owned tile. Tapping the active tile returned to operational time.
- Guest browser closed during play. Host continued operating tiles; guest reopened the same origin and recovered the current room, turn, and totals.
- Host ended the game. Both browsers showed matching four-player statistics; only host local history gained the record.
- Six-player game: all six player tiles remained in one row at emulated iPhone 16 (852x393) and Galaxy S24 (824x384) landscape viewports. Guest turn changes appeared on host. End statistics matched, and only host history gained the record.
- Lobby disconnect: a closed guest tab disappeared from the participant count and released its claimed player after the stale-presence window. Host exit closed the room; its code then returned "room not found" to a new guest.
- Firebase unavailable at startup: single-player game still started; multiplayer creation showed a network error.
- Deployed Realtime Database rules: 30/30 opt-in live REST checks passed, including unauthorized access, ownership, configuration, turn-event integrity, and host-only start/end.
- Automated tests: 22/22 unit tests passed. JavaScript syntax and `git diff --check` passed.
- Static checks: multiplayer timer display derives locally from saved events and server time, without a per-second turn write; no multiplayer pause control/state; service worker includes multiplayer assets.

## Pending Release Checks

- Publish the feature on the public GitHub Pages origin. It is currently on `codex/multiplayer-mvp`, not `main`.
- On an actual iPhone Safari and Android Chrome, use different Wi-Fi/LTE networks. Create a room, scan the QR code, join, claim players, ready/start, take turns from both devices, disconnect/reconnect one device, end, and compare both statistics screens.
- Check portrait guidance, safe areas, real touch targets, PWA update behavior, and phone sleep/background recovery on those devices. Landscape browser viewport emulation is not a substitute for these checks.
- Confirm the QR encodes the public origin and the six-digit room code. The local QR was not camera-scanned in this run.
- Simulate an in-game Firebase outage and restoration on a device to verify the reconnecting indicator and retained last confirmed view; only startup failure and browser close/reopen were exercised here.

The MVP is browser-tested, but these pending items keep the full acceptance test open.
