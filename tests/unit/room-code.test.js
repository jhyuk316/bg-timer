import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatRoomCode,
  generateRoomCode,
  normalizeRoomCode,
} from '../../js/multiplayer/room-code.js';

test('generates deterministic six digit room codes', () => {
  assert.equal(generateRoomCode(() => 0), '000000');
  assert.equal(generateRoomCode(() => 0.9999999), '999999');
});

test('normalizes display spacing while preserving leading zeroes', () => {
  assert.equal(normalizeRoomCode(' 012 345 '), '012345');
  assert.equal(formatRoomCode('012345'), '012 345');
});

test('rejects malformed room codes', () => {
  for (const value of ['12345', '1234567', '12A456', '12-456', '', null]) {
    assert.equal(normalizeRoomCode(value), null);
  }
});
