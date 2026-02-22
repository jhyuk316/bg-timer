const HISTORY_KEY = 'bg-timer-history';

function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveAll(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

export function saveGame(gameData) {
  const list = loadAll();
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    gameName: gameData.gameName || defaultGameName(),
    date: new Date().toISOString(),
    players: gameData.players,
    timerConfig: gameData.timerConfig,
    stats: gameData.stats,
  };
  list.unshift(entry);
  saveAll(list);
  return entry;
}

export function getHistory() {
  return loadAll();
}

export function getGame(id) {
  return loadAll().find((g) => g.id === id) || null;
}

export function deleteGame(id) {
  const list = loadAll().filter((g) => g.id !== id);
  saveAll(list);
}

export function getGameNames() {
  const names = loadAll().map((g) => g.gameName);
  return [...new Set(names)];
}

function defaultGameName() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `Game - ${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
