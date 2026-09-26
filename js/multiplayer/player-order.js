export function orderedSelectedPlayers(room) {
  const selected = Object.entries(room.players || {})
    .filter(([, player]) => Boolean(player.ownerUid))
    .sort(([, a], [, b]) => a.paletteIndex - b.paletteIndex);
  const ids = String(room.playerOrder || '').split(',');
  const positions = new Map(ids.map((id, index) => [id, index]));
  if (ids.length !== selected.length || positions.size !== selected.length
    || selected.some(([id]) => !positions.has(id))) return selected;
  return selected.sort(([a], [b]) => positions.get(a) - positions.get(b));
}

export function swappedPlayerOrder(room, sourceId, targetId) {
  const ids = orderedSelectedPlayers(room).map(([id]) => id);
  const source = ids.indexOf(sourceId);
  const target = ids.indexOf(targetId);
  if (source < 0 || target < 0 || source === target) return null;
  [ids[source], ids[target]] = [ids[target], ids[source]];
  return ids.join(',');
}
