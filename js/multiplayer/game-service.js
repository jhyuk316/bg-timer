import { getClientUid, getFirebaseServices, getServerNow } from './firebase-client.js';
import {
  createEndEvent,
  createInitialGame,
  createOperationalEvent,
  createTurnEvent,
} from './game-state.js';
import { canStartGame } from './room-state.js';
import { swappedPlayerOrder } from './player-order.js';

async function loadRoom(services, roomId) {
  const roomRef = services.databaseSdk.ref(services.database, `rooms/${roomId}`);
  const snapshot = await services.databaseSdk.get(roomRef);
  const room = snapshot.val();
  if (!room) throw new Error('방을 찾을 수 없습니다.');
  return { roomRef, room };
}

export async function startMultiplayerGame(roomId) {
  const services = await getFirebaseServices();
  const uid = getClientUid();
  const { roomRef, room } = await loadRoom(services, roomId);
  if (room.hostUid !== uid) throw new Error('방장만 게임을 시작할 수 있습니다.');
  if (room.status !== 'lobby') throw new Error('이미 시작된 게임입니다.');
  if (!canStartGame(room, getServerNow())) throw new Error('플레이어 선택과 모든 참가자의 준비를 확인해주세요.');

  const game = createInitialGame(getServerNow(), uid);
  await services.databaseSdk.update(roomRef, { status: 'playing', game });
  return game;
}

async function updateGame(roomId, transition) {
  const services = await getFirebaseServices();
  const uid = getClientUid();
  const gameRef = services.databaseSdk.ref(services.database, `rooms/${roomId}/game`);
  const result = await services.databaseSdk.runTransaction(gameRef, (game) => {
    if (!game) return;
    return transition(game, uid, getServerNow());
  }, { applyLocally: false });
  if (!result.committed) throw new Error('게임 상태를 갱신하지 못했습니다.');
  return result.snapshot.val();
}

export async function selectMultiplayerPlayer(roomId, playerId) {
  const services = await getFirebaseServices();
  const player = await services.databaseSdk.get(
    services.databaseSdk.ref(services.database, `rooms/${roomId}/players/${playerId}`),
  );
  if (!player.val()?.ownerUid) throw new Error('선택되지 않은 플레이어입니다.');
  return updateGame(roomId, (game, uid, at) => createTurnEvent(game, playerId, uid, at));
}

export function enterOperationalTime(roomId) {
  return updateGame(roomId, (game, uid, at) => createOperationalEvent(game, uid, at));
}

export async function swapMultiplayerPlayerOrder(roomId, sourceId, targetId, room) {
  if (room.status !== 'playing') throw new Error('진행 중인 게임이 아닙니다.');
  const services = await getFirebaseServices();
  const orderRef = services.databaseSdk.ref(services.database, `rooms/${roomId}/playerOrder`);
  const result = await services.databaseSdk.runTransaction(orderRef, (current) => (
    swappedPlayerOrder({ ...room, playerOrder: current }, sourceId, targetId)
  ), { applyLocally: false });
  if (!result.committed) throw new Error('자리 순서를 변경하지 못했습니다.');
}

export async function endMultiplayerGame(roomId) {
  const services = await getFirebaseServices();
  const uid = getClientUid();
  const { roomRef, room } = await loadRoom(services, roomId);
  if (room.hostUid !== uid) throw new Error('방장만 게임을 종료할 수 있습니다.');

  const game = await updateGame(roomId, (current, actorUid, at) => (
    createEndEvent(current, actorUid, at)
  ));
  await services.databaseSdk.update(roomRef, { status: 'ended' });
  return game;
}

export function subscribeMultiplayerGame(roomId, callback, onError = () => {}) {
  let unsubscribe = () => {};
  let cancelled = false;

  getFirebaseServices().then((services) => {
    if (cancelled) return;
    const gameRef = services.databaseSdk.ref(services.database, `rooms/${roomId}/game`);
    unsubscribe = services.databaseSdk.onValue(gameRef, (snapshot) => callback(snapshot.val()), onError);
  }).catch(onError);

  return () => {
    cancelled = true;
    unsubscribe();
  };
}
