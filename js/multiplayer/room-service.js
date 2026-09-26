import { getClientUid, getFirebaseServices, getServerNow } from './firebase-client.js';
import { LOBBY_STALE_MS, MAX_PLAYERS, PRESENCE_HEARTBEAT_MS, ROOM_STORAGE_KEY } from './constants.js';
import { claimAvailableRoomCode, normalizeRoomCode } from './room-code.js';
import { canAssignPlayer, createInitialRoom, getSelectedPlayers, getStaleLobbyParticipantUids } from './room-state.js';

let presenceCleanup = null;
let staleCleanupInFlight = false;

function saveRoomSession(roomId, code) {
  globalThis.localStorage?.setItem(ROOM_STORAGE_KEY, JSON.stringify({ roomId, code }));
}

function loadRoomSession() {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(ROOM_STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

function clearRoomSession() {
  globalThis.localStorage?.removeItem(ROOM_STORAGE_KEY);
}

export async function forgetRoom(roomId) {
  await stopRoomPresence(roomId);
  clearRoomSession();
}

export async function stopRoomPresence(roomId) {
  presenceCleanup?.();
  try {
    const services = await getFirebaseServices();
    await services.databaseSdk.onDisconnect(
      services.databaseSdk.ref(services.database, `rooms/${roomId}/participants/${getClientUid()}`),
    ).cancel();
  } catch {
    // The room session remains available for a later reconnect.
  }
}

async function connectPresence(roomId) {
  presenceCleanup?.();
  const services = await getFirebaseServices();
  const uid = getClientUid();
  const participantRef = services.databaseSdk.ref(
    services.database,
    `rooms/${roomId}/participants/${uid}`,
  );
  const connectedRef = services.databaseSdk.ref(services.database, '.info/connected');
  let heartbeat = null;
  let active = true;

  const updatePresence = () => active && services.databaseSdk.update(participantRef, {
    connected: true,
    lastSeenAt: getServerNow(),
  });
  const markLeaving = () => {
    services.databaseSdk.update(participantRef, { connected: false }).catch(() => {});
  };

  const unsubscribe = services.databaseSdk.onValue(connectedRef, async (snapshot) => {
    if (!active) return;
    if (snapshot.val() !== true) {
      clearInterval(heartbeat);
      heartbeat = null;
      return;
    }
    const disconnected = services.databaseSdk.onDisconnect(participantRef);
    await disconnected.update({ connected: false });
    if (!active) return;
    await updatePresence();
    if (!active) return;
    clearInterval(heartbeat);
    heartbeat = setInterval(() => updatePresence().catch(() => {}), PRESENCE_HEARTBEAT_MS);
  });
  globalThis.addEventListener?.('pagehide', markLeaving);

  presenceCleanup = () => {
    active = false;
    unsubscribe();
    clearInterval(heartbeat);
    globalThis.removeEventListener?.('pagehide', markLeaving);
    presenceCleanup = null;
  };
  return presenceCleanup;
}

export async function cleanupStaleLobbyParticipants(roomId, room, now = getServerNow()) {
  if (staleCleanupInFlight || room?.hostUid !== getClientUid()) return;
  const staleUids = getStaleLobbyParticipantUids(room, now);
  if (staleUids.length === 0) return;

  staleCleanupInFlight = true;
  try {
    const services = await getFirebaseServices();
    for (const staleUid of staleUids) {
      const status = await services.databaseSdk.get(
        services.databaseSdk.ref(services.database, `rooms/${roomId}/status`),
      );
      if (status.val() !== 'lobby') break;

      const participantRef = services.databaseSdk.ref(
        services.database,
        `rooms/${roomId}/participants/${staleUid}`,
      );
      const removed = await services.databaseSdk.runTransaction(participantRef, (participant) => {
        if (!participant?.lastSeenAt || getServerNow() - participant.lastSeenAt < LOBBY_STALE_MS) return;
        return null;
      }, { applyLocally: false });
      if (!removed.committed) continue;

      for (const [playerId, player] of Object.entries(room.players || {})) {
        if (player.ownerUid !== staleUid) continue;
        const playerRef = services.databaseSdk.ref(
          services.database,
          `rooms/${roomId}/players/${playerId}`,
        );
        await services.databaseSdk.runTransaction(playerRef, (current) => {
          if (current?.ownerUid !== staleUid) return;
          return { ...current, ownerUid: null };
        }, { applyLocally: false });
      }
    }
  } finally {
    staleCleanupInFlight = false;
  }
}

export async function createRoom(config, palette) {
  const services = await getFirebaseServices();
  const uid = getClientUid();
  const roomRef = services.databaseSdk.push(
    services.databaseSdk.ref(services.database, 'rooms'),
  );
  const roomId = roomRef.key;
  const createdAt = getServerNow();
  const room = createInitialRoom({ hostUid: uid, config, palette, createdAt });

  await services.databaseSdk.set(roomRef, room);
  await services.databaseSdk.set(
    services.databaseSdk.ref(services.database, `rooms/${roomId}/participants/${uid}`),
    {
      role: 'host',
      ready: false,
      connected: true,
      joinedAt: createdAt,
      lastSeenAt: createdAt,
    },
  );

  const code = await claimAvailableRoomCode(async (candidate) => {
    const codeRef = services.databaseSdk.ref(services.database, `roomCodes/${candidate}`);
    const result = await services.databaseSdk.runTransaction(codeRef, (current) => {
      if (current !== null) return;
      return { roomId, createdAt };
    }, { applyLocally: false });
    return result.committed;
  });

  await services.databaseSdk.update(roomRef, { code });
  saveRoomSession(roomId, code);
  await connectPresence(roomId);
  return { roomId, code, uid };
}

export async function joinRoom(inputCode) {
  const code = normalizeRoomCode(inputCode);
  if (!code) throw new Error('방 코드는 숫자 6자리로 입력해주세요.');

  const services = await getFirebaseServices();
  const uid = getClientUid();
  const codeSnapshot = await services.databaseSdk.get(
    services.databaseSdk.ref(services.database, `roomCodes/${code}`),
  );
  const roomId = codeSnapshot.val()?.roomId;
  if (!roomId) throw new Error('방을 찾을 수 없습니다.');

  const participantRef = services.databaseSdk.ref(
    services.database,
    `rooms/${roomId}/participants/${uid}`,
  );
  const current = await services.databaseSdk.get(participantRef);
  const now = getServerNow();
  if (!current.exists()) {
    await services.databaseSdk.set(participantRef, {
      role: 'guest',
      ready: false,
      connected: true,
      joinedAt: now,
      lastSeenAt: now,
    });
  } else {
    await services.databaseSdk.update(participantRef, { connected: true, lastSeenAt: now });
  }

  saveRoomSession(roomId, code);
  await connectPresence(roomId);
  return { roomId, code, uid };
}

export function subscribeRoom(roomId, callback, onError = () => {}) {
  let unsubscribe = () => {};
  let cancelled = false;

  getFirebaseServices().then((services) => {
    if (cancelled) return;
    const roomRef = services.databaseSdk.ref(services.database, `rooms/${roomId}`);
    unsubscribe = services.databaseSdk.onValue(roomRef, (snapshot) => {
      callback(snapshot.val());
    }, onError);
  }).catch(onError);

  return () => {
    cancelled = true;
    unsubscribe();
  };
}

export async function setPlayerOwner(roomId, playerId, ownerUid) {
  const services = await getFirebaseServices();
  const uid = getClientUid();
  const roomRef = services.databaseSdk.ref(services.database, `rooms/${roomId}`);
  const playerRef = services.databaseSdk.ref(services.database, `rooms/${roomId}/players/${playerId}`);

  const result = await services.databaseSdk.runTransaction(playerRef, (player) => {
    if (!player) return;
    return { ...player, ownerUid: ownerUid || null };
  }, { applyLocally: false });
  if (!result.committed) throw new Error('다른 기기에서 먼저 선택했습니다.');

  const roomSnapshot = await services.databaseSdk.get(roomRef);
  const room = roomSnapshot.val();
  if (getSelectedPlayers(room).length > MAX_PLAYERS || !canAssignPlayer(room, uid, playerId)) {
    await services.databaseSdk.runTransaction(playerRef, (player) => {
      if (!player || player.ownerUid !== ownerUid) return player;
      return { ...player, ownerUid: null };
    }, { applyLocally: false });
    throw new Error('플레이어는 최대 6명까지 선택할 수 있습니다.');
  }
}

export async function updatePlayerName(roomId, playerId, name) {
  const trimmed = String(name || '').trim().slice(0, 24);
  if (!trimmed) throw new Error('플레이어 이름을 입력해주세요.');
  const services = await getFirebaseServices();
  const playerRef = services.databaseSdk.ref(services.database, `rooms/${roomId}/players/${playerId}`);
  await services.databaseSdk.update(playerRef, { name: trimmed });
}

export async function setReady(roomId, ready) {
  const services = await getFirebaseServices();
  const uid = getClientUid();
  const participantRef = services.databaseSdk.ref(
    services.database,
    `rooms/${roomId}/participants/${uid}`,
  );
  await services.databaseSdk.update(participantRef, { ready: Boolean(ready), lastSeenAt: getServerNow() });
}

export async function updateRoomConfig(roomId, config) {
  const services = await getFirebaseServices();
  const roomRef = services.databaseSdk.ref(services.database, `rooms/${roomId}`);
  const snapshot = await services.databaseSdk.get(roomRef);
  const room = snapshot.val();
  if (!room || room.hostUid !== getClientUid()) throw new Error('방장만 설정을 바꿀 수 있습니다.');

  const updates = { config };
  for (const uid of Object.keys(room.participants || {})) {
    updates[`participants/${uid}/ready`] = false;
  }
  await services.databaseSdk.update(roomRef, updates);
}

export async function restoreRoom() {
  const session = loadRoomSession();
  if (!session?.roomId || !session?.code) return null;

  const services = await getFirebaseServices();
  const uid = getClientUid();
  const participantRef = services.databaseSdk.ref(
    services.database,
    `rooms/${session.roomId}/participants/${uid}`,
  );
  const participant = await services.databaseSdk.get(participantRef);
  if (!participant.exists()) {
    clearRoomSession();
    return null;
  }

  const room = await services.databaseSdk.get(
    services.databaseSdk.ref(services.database, `rooms/${session.roomId}`),
  );
  if (room.val()?.status === 'ended' && !room.val()?.game) {
    clearRoomSession();
    return null;
  }

  await connectPresence(session.roomId);
  return { ...session, uid };
}

export async function leaveRoom(roomId) {
  const services = await getFirebaseServices();
  const uid = getClientUid();
  const roomRef = services.databaseSdk.ref(services.database, `rooms/${roomId}`);
  const snapshot = await services.databaseSdk.get(roomRef);
  const room = snapshot.val();
  if (room?.status !== 'lobby') throw new Error('게임 중에는 방에서 나갈 수 없습니다.');

  if (room.hostUid === uid) {
    await services.databaseSdk.update(roomRef, { status: 'ended' });
    await services.databaseSdk.remove(
      services.databaseSdk.ref(services.database, `roomCodes/${room.code}`),
    );
  } else {
    for (const [playerId, player] of Object.entries(room?.players || {})) {
      if (player.ownerUid === uid) {
        await services.databaseSdk.update(
          services.databaseSdk.ref(services.database, `rooms/${roomId}/players/${playerId}`),
          { ownerUid: null },
        );
      }
    }
    await services.databaseSdk.remove(
      services.databaseSdk.ref(services.database, `rooms/${roomId}/participants/${uid}`),
    );
  }
  await forgetRoom(roomId);
}
