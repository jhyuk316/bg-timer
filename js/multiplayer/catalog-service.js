import { getClientUid, getFirebaseServices } from './firebase-client.js';
export async function setPlayedGame(roomId, selection) {
  const { databaseSdk: sdk, database } = await getFirebaseServices();
  const roomRef = sdk.ref(database, `rooms/${roomId}`);
  const room = (await sdk.get(roomRef)).val();
  if (room?.hostUid !== getClientUid() || room.status !== 'ended') throw new Error('종료된 게임의 방장만 게임을 선택할 수 있습니다.');
  const playedGame = { id: String(selection.id || ''), nameKo: selection.nameKo.trim().slice(0, 100), nameEn: (selection.nameEn || '').slice(0, 200), year: String(selection.year || ''), updatedAt: Date.now() };
  if (!playedGame.nameKo) throw new Error('게임 제목을 입력해주세요.');
  await sdk.set(sdk.child(roomRef, 'playedGame'), playedGame);
  return playedGame;
}
export async function readPlayedGame(roomId) {
  const { databaseSdk: sdk, database } = await getFirebaseServices();
  return (await sdk.get(sdk.ref(database, `rooms/${roomId}/playedGame`))).val();
}
