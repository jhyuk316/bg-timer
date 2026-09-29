export function seatOffsetForScreen(before, after, rotated) {
  const dx = before.left - after.left;
  const dy = before.top - after.top;
  return rotated ? [dy, dx === 0 ? 0 : -dx] : [dx, dy];
}
