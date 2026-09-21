export function renderQrCode(container, value) {
  if (typeof globalThis.qrcode !== 'function') {
    container.textContent = value;
    return;
  }

  const qr = globalThis.qrcode(0, 'M');
  qr.addData(value);
  qr.make();
  container.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}
