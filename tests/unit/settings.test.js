import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCountModeMultiplayerConfig,
  buildDefaultMultiplayerConfig,
  getDefaultSettings,
  loadSettings,
} from '../../js/settings.js';

test('new installs default to simple timer mode', () => {
  assert.equal(getDefaultSettings().timerMode, 'simple');
});

test('existing saved settings migrate to simple timer mode', () => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() {
      return JSON.stringify({ playerCount: 2, timerMode: undefined });
    },
  };

  try {
    assert.equal(loadSettings().timerMode, 'simple');
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
});

test('saved timer mode is restored', () => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() {
      return JSON.stringify({ timerMode: 'simple' });
    },
  };

  try {
    assert.equal(loadSettings().timerMode, 'simple');
  } finally {
    globalThis.localStorage = originalLocalStorage;
  }
});

test('rooms default to simple mode independently of saved timer settings', () => {
  const config = buildDefaultMultiplayerConfig({
    timerMode: 'advanced',
    turnTime: 20,
    mainTime: 2_400,
    penaltyTime: 300,
  });

  assert.deepEqual(config, {
    timerMode: 'simple',
    turnTimeMs: 20_000,
    mainTimeMs: 2_400_000,
    penaltyTimeMs: 300_000,
  });
});

test('advanced multiplayer config can return to count mode without losing values', () => {
  const config = buildCountModeMultiplayerConfig({
    timerMode: 'advanced',
    turnTimeMs: 20_000,
    mainTimeMs: 2_400_000,
    penaltyTimeMs: 300_000,
  });

  assert.deepEqual(config, {
    timerMode: 'simple',
    turnTimeMs: 20_000,
    mainTimeMs: 2_400_000,
    penaltyTimeMs: 300_000,
  });
});
