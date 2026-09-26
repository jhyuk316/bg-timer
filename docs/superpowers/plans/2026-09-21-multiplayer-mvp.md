# Multiplayer MVP Implementation Plan

> **Spec:** `docs/superpowers/specs/2026-09-21-multiplayer-mvp-design.md`
>
> **Execution:** Follow this plan task by task with test-driven development. Do not implement the Firebase history migration or the simple-timer follow-up while executing this plan.

## Goal

Add a Firebase Realtime Database multiplayer mode to the existing static board-game timer without regressing single-player mode. One to six players appear in one landscape row. Every connected host or guest can operate every player tile. The game never pauses: operational time starts with the game and covers every interval when no player's timer is active.

## Global Constraints

- Keep the application deployable as static files on GitHub Pages.
- Use Firebase JavaScript SDK `12.19.0` from the official `gstatic.com` module CDN at runtime.
- Use Anonymous Authentication and Realtime Database project `bg-timer-1b7ad`.
- Treat room codes as six-character numeric strings, including leading zeroes.
- Write to Firebase only for room/lobby mutations and game events, never for display ticks.
- Keep `js/timer.js` usable without Firebase.
- Host-only operations: room settings, game start, game end.
- Host and guests can operate every player tile and enter operational time.
- Remove pause/resume from single and multiplayer modes.
- Use ASCII in source identifiers and comments; Korean remains appropriate for visible UI text.
- Update `PRD.md`, `README.md`, and `sw.js` whenever behavior or cached files change.

## File Map

### New production files

- `js/multiplayer/constants.js`: multiplayer limits and storage keys.
- `js/multiplayer/room-code.js`: generate, display, and normalize six-digit room codes.
- `js/multiplayer/room-state.js`: pure lobby validation and permission-derived state.
- `js/multiplayer/game-state.js`: pure event transition and timer/stat derivation.
- `js/multiplayer/firebase-config.js`: supplied public Firebase web configuration.
- `js/multiplayer/firebase-client.js`: SDK initialization, anonymous auth, server clock, presence primitives.
- `js/multiplayer/room-service.js`: room creation, join, subscription, player assignment, readiness, reconnect.
- `js/multiplayer/game-service.js`: transactional game events and live game subscription.
- `js/multiplayer/multiplayer-ui.js`: multiplayer entry and lobby rendering.
- `js/multiplayer/qr-code.js`: small wrapper around the vendored QR generator.
- `vendor/qrcode.js`: pinned browser QR generator with its license header.
- `database.rules.json`: Realtime Database authorization and validation rules.
- `firebase.json`: Realtime Database rules configuration for later CLI use.

### New test files

- `tests/unit/room-code.test.js`
- `tests/unit/room-state.test.js`
- `tests/unit/timer.test.js`
- `tests/unit/game-state.test.js`
- `tests/rules/database-rules-cases.md`: Rules Playground RED/GREEN case log.

### Existing files changed

- `package.json`: ES module mode and Node unit-test script.
- `js/timer.js`: injectable clock, immediate operational-time start, no pause state.
- `js/app.js`: single/multi routing, multiplayer lifecycle, direct end action.
- `js/ui.js`: mode selector, six-player support, game status extensions.
- `js/settings.js`: six-player limit.
- `js/sound.js`: remove pause-only call sites; keep reusable sounds intact.
- `js/history.js`: no storage model change; accept host-only multiplayer save input.
- `css/style.css`: landscape entry/lobby, six-column game board, connection/status treatments.
- `sw.js`: cache new local modules and vendor asset; bump cache version.
- `README.md`, `PRD.md`: final behavior and setup instructions.

## Task 1: Add The Test Harness And Pure Room Rules

**Files:**

- Create `package.json`
- Create `js/multiplayer/constants.js`
- Create `js/multiplayer/room-code.js`
- Create `js/multiplayer/room-state.js`
- Create `tests/unit/room-code.test.js`
- Create `tests/unit/room-state.test.js`

### Interfaces

```js
export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 6;

export function generateRoomCode(random = Math.random) {}
export function normalizeRoomCode(input) {}
export function formatRoomCode(code) {}

export function getSelectedPlayers(room) {}
export function canStartGame(room) {}
export function canEditPlayer(room, uid, playerId) {}
export function canOperatePlayer(room, uid, playerId) {}
```

`normalizeRoomCode` returns the unspaced six-digit string or `null`. `formatRoomCode('381204')` returns `381 204`. `canOperatePlayer` returns true for every participant in a playing room, regardless of player ownership.

### RED

Write tests covering:

- deterministic generation of `000000` and `999999`
- preservation of leading zeroes
- normalization of `381 204` and surrounding whitespace
- rejection of letters, punctuation, short, and long values
- one through six selected players are valid; seven is invalid
- game start requires every connected participant to be ready
- disconnected participants do not block start
- only host can start, but every joined participant can operate every tile

Run:

```powershell
node --test tests/unit/*.test.js
```

Expected: failure because the modules do not exist.

### GREEN

Implement the smallest pure modules that satisfy the tests. Use `node --test` and ES modules; do not add a test framework.

Run `node --test tests/unit/*.test.js` again.

Expected: all Task 1 tests pass.

### Commit

```powershell
git add package.json js/multiplayer/constants.js js/multiplayer/room-code.js js/multiplayer/room-state.js tests/unit/room-code.test.js tests/unit/room-state.test.js
git commit -m "test: define multiplayer room rules"
```

## Task 2: Simplify The Existing Single Timer And Add Six Players

**Files:**

- Create `tests/unit/timer.test.js`
- Modify `js/timer.js`
- Modify `js/app.js`
- Modify `js/ui.js`
- Modify `js/settings.js`
- Modify `css/style.css`
- Modify `PRD.md`

### Interfaces

Extend `createGame` with optional clock/scheduler dependencies so tests can advance time without real waits:

```js
createGame(settings, {
  now = Date.now,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
} = {})
```

Add `game.start()`. It sets the game start time, enters referee/operational state immediately, opens the first operational log segment, and starts ticking. Remove `game.pause()` and `game.resume()`.

### RED

Write timer tests proving:

- `start()` begins operational time before a player is tapped
- first player selection closes operational time and starts that player
- tapping the active player returns to operational time
- direct player-to-player switch preserves both segments
- `end()` closes the active segment and produces contiguous statistics
- no pause/resume methods are exposed
- six players initialize correctly

Run `node --test tests/unit/*.test.js`.

Expected: the new tests fail against the current timer.

### GREEN

- Inject the clock and scheduler.
- Start operational time when the game starts.
- Replace the pause/end two-step button with a direct `게임 종료` button and confirmation.
- Remove `pausedState`, pause/resume handlers, paused CSS, and pause sound call sites.
- Change the selection limit from five to six.
- Add `.players-6 { grid-template: 1fr / repeat(6, minmax(0, 1fr)); }`.
- Tighten meeple, name, timer, delay, and penalty sizing for six narrow columns without viewport-scaled font sizes.

Run:

```powershell
node --test tests/unit/*.test.js
```

Expected: all room and timer tests pass.

### Browser check

Run a local static server and verify one-player and six-player single games. Confirm operational time starts immediately and the only game control is end.

### Commit

```powershell
git add tests/unit/timer.test.js js/timer.js js/app.js js/ui.js js/settings.js css/style.css PRD.md
git commit -m "feat: simplify timer and support six players"
```

## Task 3: Add Firebase Bootstrap And Security Rules

**Files:**

- Modify `package.json`
- Create `js/multiplayer/firebase-config.js`
- Create `js/multiplayer/firebase-client.js`
- Create `database.rules.json`
- Create `firebase.json`
- Create `tests/rules/database-rules-cases.md`

### Runtime client

Pin browser imports to:

```text
https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js
https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js
https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js
```

Expose:

```js
export async function ensureAnonymousUser() {}
export function getClientUid() {}
export function getServerNow() {}
export function subscribeConnection(callback) {}
export function getRealtimeDatabase() {}
```

`getServerNow` uses `.info/serverTimeOffset`. Firebase initialization failure must reject with a user-safe error while leaving single mode untouched.

### RED: rules cases

The local environment has Node but no npm or Java runtime, so the Realtime Database emulator is not available without unrelated machine provisioning. Keep automated tests for pure application logic and use the official Firebase Console Rules Playground for the rule boundary. Add the Node script:

```json
{
  "type": "module",
  "scripts": {
    "test": "node --test tests/unit/*.test.js"
  }
}
```

Write a Rules Playground case table before writing the rules. Include exact auth UID, path, method, input JSON, and expected allow/deny result for:

- unauthenticated room-code and room access denied
- authenticated host room creation allowed only with matching `hostUid`
- participant self-join allowed only in a lobby
- guest cannot change settings, start, or end a game
- host can change settings, start, and end
- any joined host or guest can make a valid turn transition
- a non-participant cannot mutate game state
- revision skips and malformed status/time/player values denied

Run the cases against the current locked rules.

Expected: deny cases pass and intended allow cases fail, establishing RED.

### GREEN

Implement least-privilege rules for `roomCodes` and `rooms`. Use `auth.uid`, not a client-supplied identity field, for authorization. Validate string lengths, numeric bounds, status enums, player count, and exact revision increments.

Re-run every case in Rules Playground, then run `node --test tests/unit/*.test.js`.

Expected: every documented allow/deny case and all unit tests pass. Record the date and result beside each case.

### Commit

```powershell
git add package.json js/multiplayer/firebase-config.js js/multiplayer/firebase-client.js database.rules.json firebase.json tests/rules/database-rules-cases.md
git commit -m "feat: add Firebase client and database rules"
```

## Task 4: Implement Room Creation, Join, Lobby, And Reconnect

**Files:**

- Modify `js/multiplayer/room-state.js`
- Create `js/multiplayer/room-service.js`
- Extend `tests/unit/room-state.test.js`
- Extend `tests/rules/database-rules-cases.md`

### Interfaces

```js
export async function createRoom(config, players) {}
export async function joinRoom(code) {}
export function subscribeRoom(roomId, callback, onError) {}
export async function setPlayerOwner(roomId, playerId, ownerUid) {}
export async function updatePlayerName(roomId, playerId, name) {}
export async function setReady(roomId, ready) {}
export async function updateRoomConfig(roomId, config) {}
export async function restoreRoom() {}
export async function leaveRoom() {}
```

### RED

Add pure-state tests for:

- default room has six player slots and host participant
- room-code collision causes another generation attempt
- player assignment is allowed only in lobby
- ready participant cannot change assignment or names until unready
- host config edit resets all ready flags
- reconnect preserves participant UID and ownership

Add Rules Playground cases for the same writes from host, owner guest, other guest, and outsider.

Run `node --test tests/unit/*.test.js` and the new Rules Playground cases.

Expected: new cases fail.

### GREEN

- Create the room first, then claim `roomCodes/{code}` with a transaction. Retry a collision without creating another room.
- Store the successful room ID and code in localStorage.
- Join by normalized room code, then create only `participants/{auth.uid}`.
- Use `.info/connected` and `onDisconnect` for `connected` and `lastSeenAt`.
- Use transactions for player ownership to prevent two devices claiming one player.
- Make every unsubscribe/cleanup function explicit so screen changes do not accumulate listeners.

Run the unit tests and re-run the affected Rules Playground cases.

Expected: all tests pass.

### Commit

```powershell
git add js/multiplayer/room-state.js js/multiplayer/room-service.js tests/unit/room-state.test.js tests/rules/database-rules-cases.md
git commit -m "feat: add multiplayer room lifecycle"
```

## Task 5: Build Multiplayer Entry And Landscape Lobby UI

**Files:**

- Create `js/multiplayer/multiplayer-ui.js`
- Create `js/multiplayer/qr-code.js`
- Create `vendor/qrcode.js`
- Modify `js/app.js`
- Modify `js/ui.js`
- Modify `css/style.css`
- Modify `index.html` only if the vendored library requires a script tag

### Dependency

Vendor a pinned, license-preserving browser build of `qrcode-generator` rather than sending room URLs to an external QR image service. Record its version and license in `README.md` during Task 8.

### UI contract

- Add a compact `싱글 | 멀티` segmented control at the top of settings.
- Multi entry shows `방 만들기`, a six-digit numeric field, and `참가`.
- Use `inputmode="numeric"`, six-character maximum, and grouped visual formatting.
- Lobby uses two landscape columns: room/participants on the left, players/settings/actions on the right.
- QR opens in a modal and encodes the current URL with `?room=NNNNNN`.
- Player tiles show owner and connection state; ownership does not disable game controls later.
- Ready locks that participant's lobby edits.
- Host sees settings and `게임 시작`; guests see ready controls.
- Portrait entry remains usable; lobby shows a rotate-device message.

### Verification

Use a local server with the production Firebase project after the tested rules are deployed:

1. Create a room.
2. Join from a browser with separate storage.
3. Select a combined one, four, and six players.
4. Confirm ready/start gating.
5. Reload the guest and confirm participant/ownership restoration.
6. Scan or decode the QR and confirm the room query parameter.

Run `node --test tests/unit/*.test.js` after the browser check.

### Commit

```powershell
git add vendor/qrcode.js js/multiplayer/multiplayer-ui.js js/multiplayer/qr-code.js js/app.js js/ui.js css/style.css index.html
git commit -m "feat: add multiplayer lobby experience"
```

## Task 6: Implement The Event-Based Multiplayer Timer

**Files:**

- Create `js/multiplayer/game-state.js`
- Create `js/multiplayer/game-service.js`
- Create `tests/unit/game-state.test.js`
- Extend `tests/rules/database-rules-cases.md`

### Pure interfaces

```js
export function createInitialGame(startedAt, actorUid) {}
export function createTurnEvent(game, playerId, actorUid, at) {}
export function createOperationalEvent(game, actorUid, at) {}
export function createEndEvent(game, actorUid, at) {}
export function deriveGameView(room, serverNow) {}
export function buildMultiplayerStats(room) {}
```

Each accepted event increments revision exactly once. Start creates an operational segment. Selecting the active player creates another operational segment. Selecting a different player closes the previous segment and begins that player. End closes the final segment. There is no pause event or paused state.

### RED

Write deterministic timestamp tests for:

- operational time from game start to first player
- player-to-player direct switch
- active player to operational time
- any participant operating any player
- stale revision rejection
- duplicate event/revision ignored in derived stats
- live display calculation without a Firebase write
- main-time, turn-delay, penalty, and six-player statistics parity with the single timer
- end closes the current segment and freezes totals

Run `node --test tests/unit/*.test.js`.

Expected: game-state tests fail.

### GREEN

Implement pure transitions first. Then use `runTransaction` in `game-service.js` to apply state and append one event under the same game transaction. Pass `getServerNow()` into transitions; do not call `Date.now()` inside pure state code.

Expose:

```js
export async function startMultiplayerGame(roomId) {}
export async function selectMultiplayerPlayer(roomId, playerId) {}
export async function enterOperationalTime(roomId) {}
export async function endMultiplayerGame(roomId) {}
export function subscribeMultiplayerGame(roomId, callback, onError) {}
```

Run the unit tests and the affected Rules Playground cases.

Expected: pure transition and security tests pass.

### Commit

```powershell
git add js/multiplayer/game-state.js js/multiplayer/game-service.js tests/unit/game-state.test.js tests/rules/database-rules-cases.md
git commit -m "feat: synchronize multiplayer game events"
```

## Task 7: Integrate Multiplayer Game, Statistics, And Recovery

**Files:**

- Modify `js/app.js`
- Modify `js/ui.js`
- Modify `js/history.js` only if a mode marker is required by rendering
- Modify `css/style.css`
- Extend relevant pure tests

### Integration behavior

- Route a started room into the existing game board renderer with multiplayer callbacks.
- Render all one to six players in a single row.
- Show room code and connection status in the thin top bar.
- Show owner/disconnected badges without disabling any player tile.
- Every joined participant can tap every player tile.
- Tapping the active tile enters operational time.
- Only host sees the end button; no user sees pause.
- Re-render display time locally from the latest room snapshot and `getServerNow()`.
- Stop the render loop and Firebase listeners when leaving the screen.
- On end, show the same stats on every device; save to local history only on the host.
- Reloading a lobby, playing room, or ended room restores the correct screen.
- A Firebase failure shows a reconnecting state while preserving the last confirmed view.

### Verification

Run `node --test tests/unit/*.test.js`, then perform a two-client browser flow:

1. Host creates and guest joins.
2. Host selects three players; guest selects one.
3. Both ready; host starts.
4. Guest operates a host-owned tile and host operates a guest-owned tile.
5. Verify operational time starts immediately and after tapping the active tile.
6. Disconnect the guest; continue from host.
7. Reconnect guest; confirm current turn and totals converge.
8. End from host; confirm both see stats and only host history gains a record.
9. Repeat a six-player run at a representative landscape phone viewport.

### Commit

```powershell
git add js/app.js js/ui.js js/history.js css/style.css tests
git commit -m "feat: complete multiplayer game flow"
```

## Task 8: PWA, Documentation, Production Rules, And Final QA

**Files:**

- Modify `sw.js`
- Modify `README.md`
- Modify `PRD.md`
- Modify `docs/wayfinder/multiplayer-mvp/map.md`
- Modify `docs/wayfinder/multiplayer-mvp/tickets/004-firebase-provisioning.md`

### PWA and docs

- Add all local multiplayer modules and the QR vendor file to the service-worker asset list.
- Bump the cache name so installed PWAs receive the feature.
- Document Firebase Anonymous Authentication, Realtime Database, Rules Playground verification, and rules deployment.
- Document the runtime Firebase CDN dependency: offline single mode remains available, multiplayer requires connectivity.
- Update README player support from five to six and remove pause references.
- Mark Firebase provisioning complete in the wayfinder map only after anonymous auth and rules are confirmed.

### Verification before production changes

Run the unit suite:

```powershell
node --test tests/unit/*.test.js
```

Expected: every unit test passes. Re-run the complete Rules Playground matrix and record all cases as passing.

Check JavaScript syntax for all source modules and run the local static server. Exercise single, lobby, game, reconnect, end, stats, portrait guidance, and six-column landscape layout.

### Production Firebase step

After the Rules Playground matrix is green, confirm Anonymous Authentication is enabled in Firebase Console. Deploy `database.rules.json` to `bg-timer-1b7ad` only with explicit approval for that external change. Then test with two physical devices on separate networks.

### Final review focus

- No path permits unauthenticated database access.
- Guests cannot edit settings/start/end, but can operate every tile.
- There is no paused state, pause event, pause button, or uncounted post-start interval.
- Room code is always a six-character string and preserves leading zeroes.
- Game ticks do not write to Firebase.
- Subscriptions, intervals, and `onDisconnect` handlers do not leak across screens.
- Single mode works when Firebase CDN or database access fails.
- Six columns remain readable without overlap at mobile landscape sizes.

### Commit

```powershell
git add sw.js README.md PRD.md docs/wayfinder/multiplayer-mvp
git commit -m "docs: finish multiplayer MVP setup"
```

## Completion Commands

```powershell
node --test tests/unit/*.test.js
git diff --check
git status --short
```

The branch is complete only after automated tests pass, browser QA is recorded, and any production Firebase rule deployment has been separately approved and verified.
