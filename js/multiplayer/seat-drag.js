export function bindSeatDrag(grid, onSwap) {
  let pointerId = null;
  let source = null;
  let pressTimer = null;
  let startX = 0;
  let startY = 0;
  let suppressClick = false;

  const areaAt = (x, y) => document.elementsFromPoint(x, y)
    .find((element) => element.classList?.contains('player-area') && grid.contains(element));

  const clear = () => {
    clearTimeout(pressTimer);
    pressTimer = null;
    source?.classList.remove('dragging');
    grid.querySelector('.drag-over')?.classList.remove('drag-over');
    source = null;
    pointerId = null;
  };

  grid.addEventListener('click', (event) => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  grid.addEventListener('pointerdown', (event) => {
    if (pointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const area = event.target.closest('.player-area');
    if (!area) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    area.setPointerCapture(event.pointerId);
    pressTimer = setTimeout(() => {
      source = area;
      area.classList.add('dragging');
      try { navigator.vibrate?.(40); } catch { /* unsupported */ }
    }, 500);
  });

  grid.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    if (pressTimer && (Math.abs(event.clientX - startX) > 10 || Math.abs(event.clientY - startY) > 10)) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    if (!source) return;
    event.preventDefault();
    grid.querySelector('.drag-over')?.classList.remove('drag-over');
    const target = areaAt(event.clientX, event.clientY);
    if (target && target !== source) target.classList.add('drag-over');
  });

  grid.addEventListener('pointerup', (event) => {
    if (event.pointerId !== pointerId) return;
    if (source) {
      const target = areaAt(event.clientX, event.clientY);
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 700);
      if (target && target !== source) onSwap(source.dataset.player, target.dataset.player);
    }
    clear();
  });
  grid.addEventListener('pointercancel', clear);
}
