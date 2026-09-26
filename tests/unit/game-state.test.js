import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMultiplayerStats,
  createEndEvent,
  createInitialGame,
  createOperationalEvent,
  createTurnEvent,
  deriveGameView,
} from '../../js/multiplayer/game-state.js';

function roomWithGame(game) {
  return {
    status: game.status === 'ended' ? 'ended' : 'playing',
    config: { turnTimeMs: 10_000, mainTimeMs: 60_000, penaltyTimeMs: 30_000 },
    participants: {
      host: { role: 'host', connected: true },
      guest: { role: 'guest', connected: true },
    },
    players: {
      p0: { name: 'Red', color: '#f00', paletteIndex: 0, ownerUid: 'host' },
      p1: { name: 'Blue', color: '#00f', paletteIndex: 1, ownerUid: 'guest' },
    },
    game,
  };
}

test('counts operational time from start until the first player', () => {
  let game = createInitialGame(1_000, 'host');
  game = createTurnEvent(game, 'p0', 'guest', 6_000);
  const view = deriveGameView(roomWithGame(game), 8_000);

  assert.equal(view.referee.totalTime, 5_000);
  assert.equal(view.players[0].totalTimeUsed, 2_000);
  assert.equal(view.activePlayerId, 'p0');
});

test('supports direct switches and active-player tap to operational time', () => {
  let game = createInitialGame(0, 'host');
  game = createTurnEvent(game, 'p0', 'guest', 1_000);
  game = createTurnEvent(game, 'p1', 'host', 4_000);
  game = createTurnEvent(game, 'p1', 'guest', 9_000);
  const view = deriveGameView(roomWithGame(game), 11_000);

  assert.equal(view.players[0].totalTimeUsed, 3_000);
  assert.equal(view.players[1].totalTimeUsed, 5_000);
  assert.equal(view.referee.totalTime, 3_000);
  assert.equal(view.activeType, 'referee');
});

test('derives turn delay, main time, penalties, and six selected players', () => {
  let game = createInitialGame(0, 'host');
  game = createTurnEvent(game, 'p0', 'guest', 1_000);
  game = createOperationalEvent(game, 'host', 76_000);
  const room = roomWithGame(game);
  for (let index = 2; index < 6; index++) {
    room.players[`p${index}`] = {
      name: `Player ${index}`,
      color: '#777',
      paletteIndex: index,
      ownerUid: 'guest',
    };
  }
  const view = deriveGameView(room, 80_000);

  assert.equal(view.players.length, 6);
  assert.equal(view.players[0].totalTimeUsed, 75_000);
  assert.equal(view.players[0].penaltyCount, 1);
  assert.equal(view.players[0].mainTimeRemaining, 25_000);
});

test('rejects stale timestamps and ignores duplicate revisions in derived stats', () => {
  let game = createInitialGame(1_000, 'host');
  assert.throws(() => createTurnEvent(game, 'p0', 'guest', 999), /시간/);

  game = createTurnEvent(game, 'p0', 'guest', 2_000);
  game.events.duplicate = { ...game.events.r2 };
  const view = deriveGameView(roomWithGame(game), 3_000);
  assert.equal(view.players[0].turnCount, 1);
});

test('end closes the active segment and freezes statistics', () => {
  let game = createInitialGame(0, 'host');
  game = createTurnEvent(game, 'p0', 'guest', 1_000);
  game = createEndEvent(game, 'host', 4_000);
  const room = roomWithGame(game);
  const view = deriveGameView(room, 10_000);
  const stats = buildMultiplayerStats(room);

  assert.equal(view.totalActiveTime, 4_000);
  assert.equal(stats.totalPlayTime, 4_000);
  assert.equal(stats.players[0].totalTime, 3_000);
  assert.equal(game.status, 'ended');
});
