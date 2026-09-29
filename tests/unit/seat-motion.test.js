import test from 'node:test';
import assert from 'node:assert/strict';
import { seatOffsetForScreen } from '../../js/multiplayer/seat-motion.js';

test('seat animation converts viewport movement into the rotated game coordinates', () => {
  assert.deepEqual(seatOffsetForScreen({ left: 10, top: 20 }, { left: 110, top: 20 }, false), [-100, 0]);
  assert.deepEqual(seatOffsetForScreen({ left: 10, top: 20 }, { left: 110, top: 20 }, true), [0, 100]);
  assert.deepEqual(seatOffsetForScreen({ left: 10, top: 20 }, { left: 10, top: 120 }, true), [-100, 0]);
});
