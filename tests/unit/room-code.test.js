import test from 'node:test';
import assert from 'node:assert/strict';

import {
  claimAvailableRoomCode,
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

test('retries when a generated room code is already claimed', async () => {
  const randomValues = [0.123456, 0.654321];
  const attempts = [];
  const code = await claimAvailableRoomCode(async (candidate) => {
    attempts.push(candidate);
    return candidate === '654321';
  }, () => randomValues.shift());

  assert.equal(code, '654321');
  assert.deepEqual(attempts, ['123456', '654321']);
});
