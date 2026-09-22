import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canAssignPlayer,
  canEditPlayer,
  canOperatePlayer,
  canStartGame,
  createInitialRoom,
  getStaleLobbyParticipantUids,
  getSelectedPlayers,
  isParticipantPresent,
} from '../../js/multiplayer/room-state.js';

function makeRoom({ playerCount = 1, guestReady = true, guestConnected = true } = {}) {
  const players = {};
  for (let i = 0; i < 6; i++) {
    players[`p${i}`] = {
      name: `Player ${i + 1}`,
      ownerUid: i < playerCount ? (i === 0 ? 'host' : 'guest') : null,
      paletteIndex: i,
    };
  }

  return {
    hostUid: 'host',
    status: 'lobby',
    participants: {
      host: { role: 'host', ready: true, connected: true },
      guest: { role: 'guest', ready: guestReady, connected: guestConnected },
    },
    players,
  };
}

test('accepts between one and six selected players', () => {
  for (let count = 1; count <= 6; count++) {
    assert.equal(canStartGame(makeRoom({ playerCount: count })), true);
  }

  assert.equal(canStartGame(makeRoom({ playerCount: 0 })), false);

  const invalid = makeRoom({ playerCount: 6 });
  invalid.players.p6 = { name: 'Player 7', ownerUid: 'guest', paletteIndex: 6 };
  assert.equal(canStartGame(invalid), false);
});

test('requires every connected participant to be ready', () => {
  assert.equal(canStartGame(makeRoom({ guestReady: false })), false);
  const room = makeRoom({ guestReady: false, guestConnected: false });
  room.participants.guest.lastSeenAt = 1_000;
  assert.equal(canStartGame(room, 16_000), true);
});

test('removes a lobby guest from presence after fifteen seconds', () => {
  const room = makeRoom({ playerCount: 2, guestReady: false });
  room.participants.host.lastSeenAt = 20_000;
  room.participants.guest.lastSeenAt = 1_000;

  assert.equal(isParticipantPresent(room.participants.guest, 15_999), true);
  assert.equal(isParticipantPresent(room.participants.guest, 16_000), false);
  assert.deepEqual(getStaleLobbyParticipantUids(room, 16_000), ['guest']);
  assert.equal(canStartGame(room, 16_000), false);

  room.players.p1.ownerUid = null;
  assert.equal(canStartGame(room, 16_000), true);
  room.status = 'playing';
  assert.deepEqual(getStaleLobbyParticipantUids(room, 100_000), []);
});

test('returns selected players in slot order', () => {
  assert.deepEqual(
    getSelectedPlayers(makeRoom({ playerCount: 2 })).map(([id]) => id),
    ['p0', 'p1'],
  );
});

test('host can edit every lobby player while guest can edit owned players', () => {
  const room = makeRoom({ playerCount: 2, guestReady: false });
  assert.equal(canEditPlayer(room, 'host', 'p1'), true);
  assert.equal(canEditPlayer(room, 'guest', 'p1'), true);
  assert.equal(canEditPlayer(room, 'guest', 'p0'), false);

  room.participants.guest.ready = true;
  assert.equal(canEditPlayer(room, 'guest', 'p1'), false);
});

test('every joined participant can operate every player during a game', () => {
  const room = makeRoom({ playerCount: 2 });
  room.status = 'playing';

  assert.equal(canOperatePlayer(room, 'host', 'p1'), true);
  assert.equal(canOperatePlayer(room, 'guest', 'p0'), true);
  assert.equal(canOperatePlayer(room, 'outsider', 'p0'), false);
});

test('creates ten color candidates while limiting selected players to six', () => {
  const room = createInitialRoom({
    hostUid: 'host',
    createdAt: 1_000,
    config: { turnTimeMs: 10_000, mainTimeMs: 60_000, penaltyTimeMs: 30_000 },
    palette: Array.from({ length: 10 }, (_, index) => ({
      name: `Color ${index}`,
      hex: `#00000${index}`,
    })),
  });

  assert.equal(Object.keys(room.players).length, 10);
  assert.equal(room.status, 'lobby');
  assert.equal(room.hostUid, 'host');
});

test('allows an unready participant to claim an empty color until six are selected', () => {
  const room = makeRoom({ playerCount: 5, guestReady: false });
  assert.equal(canAssignPlayer(room, 'guest', 'p5'), true);

  room.players.p5.ownerUid = 'guest';
  assert.equal(canAssignPlayer(room, 'guest', 'p6'), false);
});
