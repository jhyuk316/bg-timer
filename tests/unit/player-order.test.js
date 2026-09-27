import test from 'node:test';
import assert from 'node:assert/strict';
import { orderedSelectedPlayers, swappedPlayerOrder } from '../../js/multiplayer/player-order.js';

const room = {
  players: {
    p0: { paletteIndex: 0, ownerUid: 'host' },
    p1: { paletteIndex: 1, ownerUid: 'guest' },
    p2: { paletteIndex: 2, ownerUid: 'host' },
    p3: { paletteIndex: 3, ownerUid: null },
  },
};

test('uses selected palette order until players are moved', () => {
  assert.deepEqual(orderedSelectedPlayers(room).map(([id]) => id), ['p0', 'p1', 'p2']);
  assert.equal(swappedPlayerOrder(room, 'p0', 'p2'), 'p2,p1,p0');
});

test('uses shared order and swaps current positions', () => {
  const moved = { ...room, playerOrder: 'p2,p1,p0' };
  assert.deepEqual(orderedSelectedPlayers(moved).map(([id]) => id), ['p2', 'p1', 'p0']);
  assert.equal(swappedPlayerOrder(moved, 'p2', 'p1'), 'p1,p2,p0');
  assert.equal(swappedPlayerOrder(moved, 'p2', 'p3'), null);
});

test('falls back when stored order is incomplete or duplicated', () => {
  assert.deepEqual(orderedSelectedPlayers({ ...room, playerOrder: 'p0,p0,p2' }).map(([id]) => id), ['p0', 'p1', 'p2']);
});
