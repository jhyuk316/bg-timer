export function bindSeatDrag(grid, onSwap) {
  let pointerId = null;
  let source = null;
  let pressTimer = null;
  let startX = 0;
  let startY = 0;
  let suppressClick = false;
  let preview = null;
  let portrait = false;

  const movePreview = (x, y) => {
    if (!preview) return;
    preview.style.transform = `translate3d(${x - startX}px, ${y - startY}px, 0)${portrait ? ' rotate(90deg)' : ''}`;
  };

  const areaAt = (x, y) => document.elementsFromPoint(x, y)
    .find((element) => element.classList?.contains('player-area') && grid.contains(element));

  const clear = () => {
    clearTimeout(pressTimer);
    pressTimer = null;
    source?.classList.remove('dragging');
    grid.querySelector('.drag-over')?.classList.remove('drag-over');
    preview?.remove();
    preview = null;
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
      const previewRect = area.getBoundingClientRect();
      portrait = window.matchMedia('(orientation: portrait)').matches;
      preview = area.cloneNode(true);
      preview.removeAttribute('id');
      preview.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      preview.classList.add('seat-drag-preview');
      preview.style.left = `${portrait ? previewRect.right : previewRect.left}px`;
      preview.style.top = `${previewRect.top}px`;
      preview.style.width = `${portrait ? previewRect.height : previewRect.width}px`;
      preview.style.height = `${portrait ? previewRect.width : previewRect.height}px`;
      movePreview(startX, startY);
      document.body.appendChild(preview);
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
    movePreview(event.clientX, event.clientY);
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
