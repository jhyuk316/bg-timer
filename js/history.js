import { getClientUid, getFirebaseServices } from './multiplayer/firebase-client.js';

const HISTORY_KEY = 'bg-timer-history';

async function recordsRef(id = '') {
  const services = await getFirebaseServices();
  const uid = getClientUid();
  if (!uid) throw new Error('사용자 인증을 확인할 수 없습니다.');
  return { sdk: services.databaseSdk, ref: services.databaseSdk.ref(services.database, `gameRecords/${uid}${id ? `/${id}` : ''}`) };
}

async function migrateLocalHistory() {
  const local = loadAll();
  if (!local.length) return;
  const { sdk, ref } = await recordsRef();
  for (const game of local) {
    const child = sdk.child(ref, game.id);
    const existing = await sdk.get(child);
    if (!existing.exists()) await sdk.set(child, game);
  }
  localStorage.removeItem(HISTORY_KEY);
}

function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

export async function saveGame(gameData, id) {
  await migrateLocalHistory();
  const entry = {
    id: id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    gameName: gameData.gameName || defaultGameName(),
    date: new Date().toISOString(),
    players: gameData.players,
    timerConfig: gameData.timerConfig,
    stats: gameData.stats,
  };
  const { sdk, ref } = await recordsRef(entry.id);
  await sdk.set(ref, entry);
  return entry;
}

export async function updateGameName(id, gameName) {
  const name = (gameName || '').trim();
  if (!name) return null;

  const game = await getGame(id);
  if (!game) return null;

  game.gameName = name;
  const { sdk, ref } = await recordsRef(id);
  await sdk.update(ref, { gameName: name });
  return game;
}

export async function getHistory() {
  await migrateLocalHistory();
  const { sdk, ref } = await recordsRef();
  const snapshot = await sdk.get(ref);
  return Object.values(snapshot.val() || {}).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getGame(id) {
  await migrateLocalHistory();
  const { sdk, ref } = await recordsRef(id);
  return (await sdk.get(ref)).val();
}

export async function deleteGame(id) {
  const { sdk, ref } = await recordsRef(id);
  await sdk.remove(ref);
}

export async function getGameNames() {
  const names = (await getHistory()).map((g) => g.gameName);
  return [...new Set(names)];
}

function defaultGameName() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `Game - ${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
