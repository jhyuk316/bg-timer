import { LOBBY_STALE_MS, MAX_PLAYERS, MIN_PLAYERS } from './constants.js';

export function isParticipantPresent(participant, now = Date.now()) {
  return Boolean(participant && (!participant.lastSeenAt || now - participant.lastSeenAt < LOBBY_STALE_MS));
}

export function getStaleLobbyParticipantUids(room, now = Date.now()) {
  if (room?.status !== 'lobby') return [];
  return Object.entries(room.participants || {})
    .filter(([uid, participant]) => uid !== room.hostUid
      && participant.lastSeenAt
      && now - participant.lastSeenAt >= LOBBY_STALE_MS)
    .map(([uid]) => uid);
}

export function getSelectedPlayers(room) {
  return Object.entries(room?.players || {})
    .filter(([, player]) => Boolean(player?.ownerUid))
    .sort(([, a], [, b]) => a.paletteIndex - b.paletteIndex);
}

export function createInitialRoom({ hostUid, config, palette, createdAt }) {
  const players = {};
  palette.forEach((color, index) => {
    players[`p${index}`] = {
      name: color.name,
      color: color.hex,
      paletteIndex: index,
      ownerUid: null,
    };
  });

  return {
    hostUid,
    status: 'lobby',
    createdAt,
    config: { ...config },
    players,
  };
}

export function canStartGame(room, now = Date.now()) {
  if (!room || room.status !== 'lobby') return false;

  const selectedPlayers = getSelectedPlayers(room);
  const selectedCount = selectedPlayers.length;
  if (selectedCount < MIN_PLAYERS || selectedCount > MAX_PLAYERS) return false;

  const participants = Object.entries(room.participants || {})
    .filter(([, participant]) => isParticipantPresent(participant, now));
  const presentUids = new Set(participants.map(([uid]) => uid));
  return participants.length > 0
    && selectedPlayers.every(([, player]) => presentUids.has(player.ownerUid))
    && participants.every(([, participant]) => participant.ready === true);
}

export function canEditPlayer(room, uid, playerId) {
  if (!room || room.status !== 'lobby') return false;
  const participant = room.participants?.[uid];
  const player = room.players?.[playerId];
  if (!participant || !player) return false;
  if (uid === room.hostUid) return true;
  return participant.ready !== true && player.ownerUid === uid;
}

export function canAssignPlayer(room, uid, playerId) {
  if (!room || room.status !== 'lobby') return false;
  const participant = room.participants?.[uid];
  const player = room.players?.[playerId];
  if (!participant || !player || participant.ready) return false;
  if (uid !== room.hostUid && player.ownerUid && player.ownerUid !== uid) return false;

  const selectedCount = getSelectedPlayers(room).length;
  return Boolean(player.ownerUid) || selectedCount < MAX_PLAYERS;
}

export function canOperatePlayer(room, uid, playerId) {
  return room?.status === 'playing'
    && Boolean(room.participants?.[uid])
    && Boolean(room.players?.[playerId]?.ownerUid);
}
