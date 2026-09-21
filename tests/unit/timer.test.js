import test from 'node:test';
import assert from 'node:assert/strict';

import { createGame } from '../../js/timer.js';

function createHarness(playerCount = 2) {
  let nowMs = 1_000;
  let scheduledTick = null;

  const players = Array.from({ length: playerCount }, (_, index) => ({
    name: `Player ${index + 1}`,
    color: `#00000${index}`,
  }));

  const game = createGame({
    playerCount,
    players,
    turnTime: 10,
    mainTime: 60,
    penaltyTime: 30,
  }, {
    now: () => nowMs,
    setIntervalFn(callback) {
      scheduledTick = callback;
      return 1;
    },
    clearIntervalFn() {
      scheduledTick = null;
    },
  });

  return {
    game,
    advance(ms) {
      nowMs += ms;
      scheduledTick?.();
    },
  };
}

test('starts in operational time before a player is selected', () => {
  const { game, advance } = createHarness();

  game.start();
  advance(3_000);

  const state = game.getState();
  assert.equal(state.state, 'referee');
  assert.equal(state.referee.totalTime, 3_000);
  assert.equal(state.activePlayer, -1);
});

test('switches between operational and player segments', () => {
  const { game, advance } = createHarness();

  game.start();
  advance(3_000);
  game.tapPlayer(0);
  advance(2_000);
  game.tapPlayer(1);
  advance(4_000);
  game.tapPlayer(1);
  advance(1_000);

  const state = game.getState();
  assert.equal(state.state, 'referee');
  assert.equal(state.referee.totalTime, 4_000);
  assert.equal(state.playerStates[0].totalTimeUsed, 2_000);
  assert.equal(state.playerStates[1].totalTimeUsed, 4_000);
});

test('ends the active segment and returns contiguous statistics', () => {
  const { game, advance } = createHarness();

  game.start();
  advance(1_000);
  game.tapPlayer(0);
  advance(2_000);
  const stats = game.end();

  assert.equal(stats.totalPlayTime, 3_000);
  assert.deepEqual(
    stats.turnLog.map(({ type, startMs, endMs }) => ({ type, startMs, endMs })),
    [
      { type: 'referee', startMs: 0, endMs: 1_000 },
      { type: 'player', startMs: 1_000, endMs: 3_000 },
    ],
  );
});

test('does not expose pause or resume operations', () => {
  const { game } = createHarness();
  assert.equal(game.pause, undefined);
  assert.equal(game.resume, undefined);
});

test('initializes six players', () => {
  const { game } = createHarness(6);
  assert.equal(game.getState().playerStates.length, 6);
});
