import test from 'node:test';
import assert from 'node:assert/strict';
import { bindSeatDrag } from '../../js/multiplayer/seat-drag.js';

function area(index) {
  const classes = new Set(['player-area']);
  return {
    dataset: { player: String(index) },
    classList: {
      contains: (name) => classes.has(name),
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
    },
    closest: () => null,
    setPointerCapture: () => {},
  };
}

test('long press moves a seat and suppresses the following turn click', async () => {
  const source = area(0);
  const target = area(1);
  source.closest = () => source;
  const listeners = new Map();
  const grid = {
    addEventListener: (name, handler) => listeners.set(name, handler),
    contains: (element) => element === source || element === target,
    querySelector: () => null,
  };
  const originalDocument = globalThis.document;
  globalThis.document = { elementsFromPoint: (x) => [x > 100 ? target : source] };
  try {
    const swaps = [];
    bindSeatDrag(grid, (...indices) => swaps.push(indices));
    listeners.get('pointerdown')({ pointerId: 1, pointerType: 'touch', target: source, clientX: 20, clientY: 20 });
    await new Promise((resolve) => setTimeout(resolve, 520));
    listeners.get('pointermove')({ pointerId: 1, clientX: 200, clientY: 20, preventDefault() {} });
    listeners.get('pointerup')({ pointerId: 1, clientX: 200, clientY: 20 });
    assert.deepEqual(swaps, [['0', '1']]);
    let blocked = false;
    listeners.get('click')({ preventDefault() { blocked = true; }, stopImmediatePropagation() {} });
    assert.equal(blocked, true);
  } finally {
    globalThis.document = originalDocument;
  }
});
