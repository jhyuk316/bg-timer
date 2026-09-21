import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canEditPlayer,
  canOperatePlayer,
  canStartGame,
  getSelectedPlayers,
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
  assert.equal(canStartGame(makeRoom({ guestReady: false, guestConnected: false })), true);
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
