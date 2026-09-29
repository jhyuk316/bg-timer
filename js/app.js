import { buildCountModeMultiplayerConfig, buildDefaultMultiplayerConfig, loadSettings, saveSettings, COLOR_PALETTE, COLOR_PRESETS } from './settings.js';
import { initSound, setSoundEnabled } from './sound.js';
import { saveGame as saveHistory, updateGameName, getHistory, getGame as getHistoryGame, deleteGame, getGameNames } from './history.js';
import { renderGameScreen, updateGameUI, renderStatsScreen, renderHistoryScreen, renderHistoryDetail, renderGlobalBar, updateGlobalBar } from './ui.js';
import { renderLobbyScreen, renderMultiplayerEntryScreen } from './multiplayer/multiplayer-ui.js';
import { formatRoomCode, normalizeRoomCode } from './multiplayer/room-code.js';
import {
  createRoom,
  cleanupStaleLobbyParticipants,
  forgetRoom,
  leaveRoom,
  joinRoom as joinMultiplayerRoom,
  restoreRoom,
  stopRoomPresence,
  setPlayerOwner,
  setReady as setMultiplayerReady,
  subscribeRoom,
  updateRoomConfig,
  updateRoomColorPreset,
  updatePlayerName,
} from './multiplayer/room-service.js';
import {
  endMultiplayerGame,
  enterOperationalTime,
  selectMultiplayerPlayer,
  swapMultiplayerPlayerOrder,
  startMultiplayerGame,
} from './multiplayer/game-service.js';
import { bindSeatDrag } from './multiplayer/seat-drag.js';
import { seatOffsetForScreen } from './multiplayer/seat-motion.js';
import { buildMultiplayerStats, deriveGameView } from './multiplayer/game-state.js';
import { isParticipantPresent } from './multiplayer/room-state.js';
import { getServerNow, subscribeConnection } from './multiplayer/firebase-client.js';

const appEl = document.getElementById('app');
let settings = loadSettings();
let currentScreen = 'settings';
let lastStats = null;
let lastSavedGame = null;
let multiplayerSession = null;
let multiplayerRoom = null;
let multiplayerError = '';
let multiplayerLoading = false;
let unsubscribeRoom = null;
let multiplayerFrame = null;
let lastHistoryBase = null;
let multiplayerLeaving = false;
let lastGameRenderKey = null;
let lastLobbyRenderKey = null;
let multiplayerConnected = true;
let multiplayerAdvancedSettingsOpen = false;
let unsubscribeConnection = null;

function updateGameConnection() {
  const connection = document.getElementById('game-connection');
  if (!connection) return;
  connection.textContent = multiplayerConnected ? '연결됨' : '재연결 중';
  connection.classList.toggle('offline', !multiplayerConnected);
}

function returnToMultiplayerEntry(message = '') {
  unsubscribeConnection?.();
  unsubscribeConnection = null;
  unsubscribeRoom?.();
  unsubscribeRoom = null;
  multiplayerSession = null;
  multiplayerRoom = null;
  multiplayerAdvancedSettingsOpen = false;
  multiplayerError = message;
  const url = new URL(location.href);
  url.searchParams.delete('r');
  url.searchParams.delete('room');
  history.replaceState(null, '', url);
  showScreen('settings');
}

function showScreen(name) {
  if (name !== 'game' && multiplayerFrame) {
    cancelAnimationFrame(multiplayerFrame);
    multiplayerFrame = null;
  }
  currentScreen = name;
  switch (name) {
    case 'settings': showSettings(); break;
    case 'stats': showStats(); break;
    case 'history': showHistory(); break;
    case 'lobby': showLobby(); break;
  }
}

function restoreGlobalBar() {
  renderGlobalBar({ toggleSound, toggleFullscreen });
  updateGlobalBar(settings.soundEnabled);
}

// --- Settings ---

function showSettings() {
  showMultiplayerEntry();
}

function showMultiplayerEntry() {
  const searchParams = new URLSearchParams(location.search);
  const queryCode = normalizeRoomCode(searchParams.get('r') || searchParams.get('room') || '');
  renderMultiplayerEntryScreen(appEl, {
    code: queryCode ? `${queryCode.slice(0, 3)} ${queryCode.slice(3)}` : '',
    error: multiplayerError,
    loading: multiplayerLoading,
  }, {
    openHistory() { showScreen('history'); },
    async createRoom() {
      await runMultiplayerAction(async () => {
        const config = buildDefaultMultiplayerConfig(settings);
        const session = await createRoom(config, COLOR_PALETTE);
        enterLobby(session);
      });
    },
    async joinRoom(code) {
      await runMultiplayerAction(async () => {
        const session = await joinMultiplayerRoom(code);
        enterLobby(session);
      });
    },
  });
  restoreGlobalBar();
}

async function runMultiplayerAction(action) {
  multiplayerLoading = true;
  multiplayerError = '';
  showMultiplayerEntry();
  try {
    await action();
  } catch (error) {
    multiplayerError = error.message || '요청을 처리하지 못했습니다.';
  } finally {
    multiplayerLoading = false;
    if (currentScreen !== 'lobby') showMultiplayerEntry();
  }
}

function enterLobby(session) {
  multiplayerSession = session;
  multiplayerRoom = null;
  multiplayerAdvancedSettingsOpen = false;
  multiplayerError = '';
  lastGameRenderKey = null;
  lastLobbyRenderKey = null;
  unsubscribeConnection?.();
  unsubscribeConnection = null;
  multiplayerConnected = true;
  subscribeConnection((connected) => {
    multiplayerConnected = connected;
    updateGameConnection();
  }).then((unsubscribe) => {
    if (multiplayerSession?.roomId === session.roomId) unsubscribeConnection = unsubscribe;
    else unsubscribe();
  }).catch(() => {
    multiplayerConnected = false;
    updateGameConnection();
  });
  unsubscribeRoom?.();
  unsubscribeRoom = subscribeRoom(session.roomId, (room) => {
    if (!room) {
      multiplayerError = '방을 찾을 수 없습니다.';
      showScreen('settings');
      return;
    }
    multiplayerRoom = room;
    if (room.status === 'ended' && !room.game) {
      if (!multiplayerLeaving) {
        forgetRoom(session.roomId).catch(() => {});
        returnToMultiplayerEntry('방장이 나가 대기실이 종료되었습니다.');
      }
      return;
    }
    if (room.status === 'lobby' && room.hostUid === session.uid) {
      cleanupStaleLobbyParticipants(session.roomId, room).catch(() => {});
    }
    if (room.status === 'playing' && room.game) {
      const renderKey = JSON.stringify({
        revision: room.game.revision,
        playerOrder: room.playerOrder,
        players: Object.values(room.players || {}).map((player) => player.ownerUid),
        connected: Object.entries(room.participants || {}).map(([uid, participant]) => [uid, participant.connected]),
      });
      if (currentScreen !== 'game' || renderKey !== lastGameRenderKey) {
        lastGameRenderKey = renderKey;
        showMultiplayerGame();
      }
    } else if (room.status === 'ended' && room.game) {
      finishMultiplayerGame();
    } else {
      const now = getServerNow();
      const renderKey = JSON.stringify({
        players: room.players,
        config: room.config,
        colorPreset: room.colorPreset || null,
        participants: Object.entries(room.participants || {}).map(([uid, participant]) => [
          uid,
          participant.role,
          participant.ready,
          participant.connected,
          isParticipantPresent(participant, now),
        ]),
        error: multiplayerError,
      });
      if (currentScreen !== 'lobby' || renderKey !== lastLobbyRenderKey) {
        lastLobbyRenderKey = renderKey;
        showScreen('lobby');
      }
    }
  }, (error) => {
    multiplayerError = error.message || '방 연결이 끊겼습니다.';
    if (currentScreen === 'lobby') showLobby();
    if (currentScreen === 'game') {
      multiplayerConnected = false;
      updateGameConnection();
    }
  });
  currentScreen = 'lobby';
  appEl.innerHTML = '<div class="multi-loading">방에 연결하는 중...</div>';
}

function showLobby() {
  if (!multiplayerSession || !multiplayerRoom) return;
  const uid = multiplayerSession.uid;
  renderLobbyScreen(appEl, multiplayerRoom, {
    uid,
    now: getServerNow(),
    self: multiplayerRoom.participants?.[uid],
    isHost: multiplayerRoom.hostUid === uid,
    error: multiplayerError,
    showAdvancedSettings: multiplayerAdvancedSettingsOpen,
  }, {
    async togglePlayer(playerId, ownerUid) {
      await runLobbyAction(() => setPlayerOwner(multiplayerSession.roomId, playerId, ownerUid));
    },
    async renamePlayer(playerId, name) {
      await runLobbyAction(() => updatePlayerName(multiplayerSession.roomId, playerId, name));
    },
    async selectColorPreset(name) {
      const nextName = name && COLOR_PRESETS[name] ? name : null;
      await runLobbyAction(() => updateRoomColorPreset(multiplayerSession.roomId, nextName));
    },
    async setReady(ready) {
      await runLobbyAction(() => setMultiplayerReady(multiplayerSession.roomId, ready));
    },
    toggleAdvancedSettings() {
      multiplayerAdvancedSettingsOpen = !multiplayerAdvancedSettingsOpen;
      showLobby();
    },
    async saveTimerSettings(config) {
      const nextConfig = config.timerMode === 'simple'
        ? buildCountModeMultiplayerConfig(config)
        : config;
      await runLobbyAction(() => updateRoomConfig(multiplayerSession.roomId, nextConfig));
      multiplayerAdvancedSettingsOpen = false;
    },
    async startGame() {
      await runLobbyAction(() => startMultiplayerGame(multiplayerSession.roomId));
    },
    async leaveRoom() {
      multiplayerLeaving = true;
      try {
        await leaveRoom(multiplayerSession.roomId);
        returnToMultiplayerEntry();
      } catch (error) {
        multiplayerError = error.message || '방에서 나가지 못했습니다.';
        showLobby();
      } finally {
        multiplayerLeaving = false;
      }
    },
  });
  restoreGlobalBar();
}

function multiplayerOwnerLabel(ownerUid) {
  if (ownerUid === multiplayerSession.uid) return '내 기기';
  if (ownerUid === multiplayerRoom.hostUid) return '방장 기기';
  return '게스트 기기';
}

function toMultiplayerUiState(view) {
  const activePlayer = view.players.findIndex((player) => player.id === view.activePlayerId);
  return {
    timerMode: view.timerMode,
    state: view.activeType === 'player' ? 'player' : 'referee',
    activePlayer,
    playerStates: view.players,
    referee: view.referee,
    gameStartTime: view.startedAt,
    totalActiveTime: view.totalActiveTime,
  };
}

function renderMultiplayerTick() {
  if (currentScreen !== 'game' || !multiplayerRoom?.game) return;
  const view = deriveGameView(multiplayerRoom, getServerNow());
  updateGameUI(toMultiplayerUiState(view));
  multiplayerFrame = requestAnimationFrame(renderMultiplayerTick);
}

function showMultiplayerGame() {
  if (!multiplayerSession || !multiplayerRoom?.game) return;
  const previousSeats = new Map([...appEl.querySelectorAll('.multiplayer-seats .player-area[data-player-id]')]
    .map((area) => [area.dataset.playerId, area.getBoundingClientRect()]));
  currentScreen = 'game';
  if (multiplayerFrame) cancelAnimationFrame(multiplayerFrame);

  const view = deriveGameView(multiplayerRoom, getServerNow());
  const players = view.players.map((player) => ({
    name: player.name,
    color: player.color,
    ownerLabel: multiplayerOwnerLabel(player.ownerUid),
    connected: multiplayerRoom.participants?.[player.ownerUid]?.connected !== false,
  }));
  renderGameScreen(appEl, toMultiplayerUiState(view), {
    timerMode: view.timerMode,
    playerCount: players.length,
    players,
  }, {
    showEndControl: multiplayerRoom.hostUid === multiplayerSession.uid,
    roomCode: formatRoomCode(multiplayerRoom.code),
    connected: multiplayerConnected,
  });
  updateGameUI(toMultiplayerUiState(view));

  appEl.querySelectorAll('.player-area').forEach((area, index) => {
    area.dataset.playerId = view.players[index].id;
    area.addEventListener('click', () => runMultiplayerGameAction(
      () => selectMultiplayerPlayer(multiplayerSession.roomId, view.players[index].id),
    ));
  });
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const rotated = window.matchMedia('(orientation: portrait)').matches;
    appEl.querySelectorAll('.multiplayer-seats .player-area').forEach((area) => {
      const before = previousSeats.get(area.dataset.playerId);
      if (!before) return;
      const after = area.getBoundingClientRect();
      const [dx, dy] = seatOffsetForScreen(before, after, rotated);
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      area.animate([
        { transform: `translate3d(${dx}px, ${dy}px, 0)`, zIndex: 2 },
        { transform: 'translate3d(0, 0, 0)', zIndex: 2 },
      ], { duration: 260, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    });
  }
  bindSeatDrag(document.getElementById('player-grid'), (sourceIndex, targetIndex) => (
    runMultiplayerGameAction(() => swapMultiplayerPlayerOrder(
      multiplayerSession.roomId,
      view.players[Number(sourceIndex)].id,
      view.players[Number(targetIndex)].id,
      multiplayerRoom,
    ))
  ));
  document.getElementById('referee-bar')?.addEventListener('click', () => runMultiplayerGameAction(
    () => enterOperationalTime(multiplayerSession.roomId),
  ));
  document.getElementById('btn-end')?.addEventListener('click', () => showMultiplayerEndConfirmation());
  restoreGlobalBar();
  multiplayerFrame = requestAnimationFrame(renderMultiplayerTick);
}

function showMultiplayerEndConfirmation() {
  if (document.getElementById('multi-end-confirm')) return;
  const overlay = document.createElement('div');
  overlay.id = 'multi-end-confirm';
  overlay.className = 'multi-confirm-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '게임 종료 확인');
  const panel = document.createElement('div');
  panel.className = 'multi-confirm-panel';
  const question = document.createElement('p');
  question.textContent = '게임을 종료할까요?';
  const actions = document.createElement('div');
  actions.className = 'multi-confirm-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn-secondary';
  cancel.textContent = '취소';
  const confirmEnd = document.createElement('button');
  confirmEnd.type = 'button';
  confirmEnd.className = 'btn-primary';
  confirmEnd.textContent = '게임 종료';
  const dismiss = () => overlay.remove();
  cancel.addEventListener('click', dismiss);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) dismiss();
  });
  confirmEnd.addEventListener('click', async () => {
    confirmEnd.disabled = true;
    cancel.disabled = true;
    await runMultiplayerGameAction(() => endMultiplayerGame(multiplayerSession.roomId));
    dismiss();
  });
  actions.append(cancel, confirmEnd);
  panel.append(question, actions);
  overlay.appendChild(panel);
  appEl.appendChild(overlay);
  cancel.focus();
}

async function runMultiplayerGameAction(action) {
  try {
    await action();
    multiplayerError = '';
    document.getElementById('multi-game-error')?.remove();
  } catch (error) {
    multiplayerError = error.code === 'PERMISSION_DENIED' || error.message?.includes('permission_denied')
      ? '턴을 저장하지 못했습니다. 방 연결 또는 Firebase 권한을 확인해주세요.'
      : error.message || '게임 상태를 갱신하지 못했습니다.';
    let errorEl = document.getElementById('multi-game-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.id = 'multi-game-error';
      errorEl.className = 'multi-error multi-game-error';
      appEl.appendChild(errorEl);
    }
    errorEl.textContent = multiplayerError;
  }
}

function finishMultiplayerGame() {
  if (!multiplayerRoom?.game?.endedAt) return;
  unsubscribeRoom?.();
  unsubscribeRoom = null;
  stopRoomPresence(multiplayerSession.roomId).catch(() => {});
  if (multiplayerFrame) cancelAnimationFrame(multiplayerFrame);
  multiplayerFrame = null;
  unsubscribeConnection?.();
  unsubscribeConnection = null;
  lastStats = buildMultiplayerStats(multiplayerRoom);
  lastHistoryBase = {
    players: lastStats.players,
    timerConfig: {
      timerMode: multiplayerRoom.config.timerMode || 'advanced',
      presetName: 'Multiplayer',
      turnTime: multiplayerRoom.config.turnTimeMs / 1000,
      mainTime: multiplayerRoom.config.mainTimeMs / 1000,
      penaltyTime: multiplayerRoom.config.penaltyTimeMs / 1000,
    },
  };

  const markerKey = `bg-timer-saved-room:${multiplayerSession.roomId}`;
  const savedId = localStorage.getItem(markerKey);
  lastSavedGame = savedId ? getHistoryGame(savedId) : null;
  if (multiplayerRoom.hostUid === multiplayerSession.uid && !lastSavedGame) {
    lastSavedGame = saveHistory(buildHistoryData(lastStats));
    localStorage.setItem(markerKey, lastSavedGame.id);
  }
  showScreen('stats');
}

async function runLobbyAction(action) {
  multiplayerError = '';
  try {
    await action();
  } catch (error) {
    multiplayerError = error.message || '요청을 처리하지 못했습니다.';
    showLobby();
  }
}

function buildHistoryData(stats, gameName) {
  if (lastHistoryBase) return { ...lastHistoryBase, gameName, stats };
  return {
    gameName,
    players: stats.players,
    timerConfig: {
      timerMode: settings.timerMode,
      presetName: settings.presetName,
      turnTime: settings.turnTime,
      mainTime: settings.mainTime,
      penaltyTime: settings.penaltyTime,
    },
    stats,
  };
}

// --- Stats ---

function showStats() {
  if (!lastStats) return showSettings();
  const names = getGameNames();
  const canSave = multiplayerRoom?.hostUid === multiplayerSession?.uid;
  renderStatsScreen(appEl, lastStats, names, {
    canSave,
    gameName: lastSavedGame?.gameName,
    save(gameName) {
      if (lastSavedGame) {
        const updated = updateGameName(lastSavedGame.id, gameName);
        if (updated) lastSavedGame = updated;
      } else {
        lastSavedGame = saveHistory(buildHistoryData(lastStats, gameName));
      }
      showScreen('settings');
    },
    newGame() {
      showScreen('settings');
    },
  });
  restoreGlobalBar();
}

// --- History ---

function showHistory() {
  const list = getHistory();
  renderHistoryScreen(appEl, list, {
    back() {
      showScreen('settings');
    },
    view(id) {
      const g = getHistoryGame(id);
      if (g) showHistoryDetail(g);
    },
    delete(id) {
      deleteGame(id);
      showHistory();
    },
  });
  restoreGlobalBar();
}

function showHistoryDetail(game) {
  renderHistoryDetail(appEl, game, {
    back() {
      showHistory();
    },
  });
  restoreGlobalBar();
}

// --- Global Actions ---

function toggleSound() {
  settings.soundEnabled = !settings.soundEnabled;
  setSoundEnabled(settings.soundEnabled);
  saveSettings(settings);
  updateGlobalBar(settings.soundEnabled);
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

// --- Init ---

function init() {
  initSound();
  setSoundEnabled(settings.soundEnabled);

  document.addEventListener('fullscreenchange', () => {
    updateGlobalBar(settings.soundEnabled);
  });

  showScreen('settings');
  resumeMultiplayerIfNeeded();

  // Force landscape orientation
  try {
    screen.orientation.lock('landscape').catch(() => {});
  } catch (e) { /* unsupported */ }

  if ('serviceWorker' in navigator) {
    let refreshing = false;

    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .catch(() => {});

    // SW가 교체되면 한 번만 새로고침
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        location.reload();
      }
    });
  }
}

async function resumeMultiplayerIfNeeded() {
  const searchParams = new URLSearchParams(location.search);
  const queryCode = normalizeRoomCode(searchParams.get('r') || searchParams.get('room') || '');
  if (queryCode) {
    showScreen('settings');
    await runMultiplayerAction(async () => enterLobby(await joinMultiplayerRoom(queryCode)));
    return;
  }

  try {
    const session = await restoreRoom();
    if (session) {
      enterLobby(session);
    }
  } catch {
    // A stale room should not prevent opening the room entry screen.
  }
}

init();
