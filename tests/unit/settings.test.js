import test from 'node:test';
import assert from 'node:assert/strict';

import { getDefaultSettings, loadSettings } from '../../js/settings.js';

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
