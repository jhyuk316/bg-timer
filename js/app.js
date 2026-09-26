import { loadSettings, saveSettings, TIMER_PRESETS, COLOR_PRESETS, COLOR_PALETTE } from './settings.js';
import { createGame } from './timer.js';
import { initSound, setSoundEnabled, playTurnStart, playTurnEnd, playMainWarning, playPenaltyAlert } from './sound.js';
import { saveGame as saveHistory, updateGameName, getHistory, getGame as getHistoryGame, deleteGame, getGameNames } from './history.js';
import { renderSettingsScreen, renderGameScreen, updateGameUI, renderStatsScreen, renderHistoryScreen, renderHistoryDetail, flashScreen, renderGlobalBar, updateGlobalBar } from './ui.js';
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
  updatePlayerName,
} from './multiplayer/room-service.js';
import {
  endMultiplayerGame,
  enterOperationalTime,
  selectMultiplayerPlayer,
  startMultiplayerGame,
} from './multiplayer/game-service.js';
import { buildMultiplayerStats, deriveGameView } from './multiplayer/game-state.js';
import { isParticipantPresent } from './multiplayer/room-state.js';
import { getServerNow, subscribeConnection } from './multiplayer/firebase-client.js';

const appEl = document.getElementById('app');
let settings = loadSettings();
let game = null;
let currentScreen = 'settings';
let settingsPage = 1;
let lastStats = null;
let lastSavedGame = null;
let appMode = 'single';
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
    case 'game': showGame(); break;
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
  if (appMode === 'multi') {
    showMultiplayerEntry();
    return;
  }
  renderSettingsScreen(appEl, settings, settingsPage, {
    mode: appMode,
    setMode,
    toggleMeeple(index) {
      if (settings.activeMeeples[index]) {
        settings.activeMeeples[index] = false;
      } else {
        const activeCount = settings.activeMeeples.filter(Boolean).length;
        if (activeCount >= 6) return 'max';
        settings.activeMeeples[index] = true;
      }
      settings.playerCount = settings.activeMeeples.filter(Boolean).length;
      saveSettings(settings);
      showSettings();
    },
    setPlayerName(paletteIndex, name) {
      settings.players[paletteIndex].name = name || COLOR_PALETTE[paletteIndex].name;
      saveSettings(settings);
    },
    applyColorPreset(name) {
      const preset = COLOR_PRESETS[name];
      if (!preset) return;
      // Deactivate all, then activate only paletteMap indices
      settings.activeMeeples = new Array(10).fill(false);
      for (const idx of preset.paletteMap) {
        settings.activeMeeples[idx] = true;
      }
      settings.playerCount = settings.activeMeeples.filter(Boolean).length;
      saveSettings(settings);
      showSettings();
    },
    clearAllMeeples() {
      settings.activeMeeples = new Array(10).fill(false);
      settings.playerCount = 0;
      saveSettings(settings);
      showSettings();
    },
    goToPage2() {
      const activeCount = settings.activeMeeples.filter(Boolean).length;
      if (activeCount === 0) return 'empty';
      settingsPage = 2;
      showSettings();
    },
    goToPage1() {
      settingsPage = 1;
      showSettings();
    },
    setPreset(name) {
      const p = TIMER_PRESETS[name];
      if (!p) return;
      settings.presetName = name;
      settings.turnTime = p.turnTime;
      settings.mainTime = p.mainTime;
      settings.penaltyTime = p.penaltyTime;
      saveSettings(settings);
      showSettings();
    },
    setTimerValue(key, value) {
      settings[key] = value;
      settings.presetName = 'Custom';
      settings.customValues = {
        turnTime: settings.turnTime,
        mainTime: settings.mainTime,
        penaltyTime: settings.penaltyTime,
      };
      saveSettings(settings);
    },
    setCustomPreset() {
      if (!settings.customValues) return;
      settings.presetName = 'Custom';
      settings.turnTime = settings.customValues.turnTime;
      settings.mainTime = settings.customValues.mainTime;
      settings.penaltyTime = settings.customValues.penaltyTime;
      saveSettings(settings);
      showSettings();
    },
    openHistory() {
      showScreen('history');
    },
    startGame() {
      startNewGame();
    },
  });
  restoreGlobalBar();
}

function setMode(mode) {
  appMode = mode;
  multiplayerError = '';
  if (mode === 'single') {
    unsubscribeRoom?.();
    unsubscribeRoom = null;
  }
  showScreen('settings');
}

function showMultiplayerEntry() {
  const searchParams = new URLSearchParams(location.search);
  const queryCode = normalizeRoomCode(searchParams.get('r') || searchParams.get('room') || '');
  renderMultiplayerEntryScreen(appEl, {
    code: queryCode ? `${queryCode.slice(0, 3)} ${queryCode.slice(3)}` : '',
    error: multiplayerError,
    loading: multiplayerLoading,
  }, {
    setMode,
    async createRoom() {
      await runMultiplayerAction(async () => {
        const config = {
          turnTimeMs: settings.turnTime * 1000,
          mainTimeMs: settings.mainTime * 1000,
          penaltyTimeMs: settings.penaltyTime * 1000,
        };
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
  }, {
    async togglePlayer(playerId, ownerUid) {
      await runLobbyAction(() => setPlayerOwner(multiplayerSession.roomId, playerId, ownerUid));
    },
    async renamePlayer(playerId, name) {
      await runLobbyAction(() => updatePlayerName(multiplayerSession.roomId, playerId, name));
    },
    async setReady(ready) {
      await runLobbyAction(() => setMultiplayerReady(multiplayerSession.roomId, ready));
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
    state: view.activeType === 'player' ? 'player' : 'referee',
    activePlayer,
    playerStates: view.players,
    referee: view.referee,
    gameStartTime: view.startedAt,
    totalActiveTime: view.totalActiveTime,
  };
}

function renderMultiplayerTick() {
  if (currentScreen !== 'game' || appMode !== 'multi' || !multiplayerRoom?.game) return;
  const view = deriveGameView(multiplayerRoom, getServerNow());
  updateGameUI(toMultiplayerUiState(view));
  multiplayerFrame = requestAnimationFrame(renderMultiplayerTick);
}

function showMultiplayerGame() {
  if (!multiplayerSession || !multiplayerRoom?.game) return;
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
    playerCount: players.length,
    players,
  }, {
    showEndControl: multiplayerRoom.hostUid === multiplayerSession.uid,
    roomCode: formatRoomCode(multiplayerRoom.code),
    connected: multiplayerConnected,
  });
  updateGameUI(toMultiplayerUiState(view));

  appEl.querySelectorAll('.player-area').forEach((area, index) => {
    area.addEventListener('click', () => runMultiplayerGameAction(
      () => selectMultiplayerPlayer(multiplayerSession.roomId, view.players[index].id),
    ));
  });
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

// --- Game ---

function startNewGame() {
  // Build game settings from activeMeeples
  const activePlayers = [];
  for (let i = 0; i < 10; i++) {
    if (settings.activeMeeples[i]) {
      activePlayers.push({
        name: settings.players[i].name,
        color: COLOR_PALETTE[i].hex,
      });
    }
  }

  const gameSettings = {
    playerCount: activePlayers.length,
    players: activePlayers,
    turnTime: settings.turnTime,
    mainTime: settings.mainTime,
    penaltyTime: settings.penaltyTime,
  };

  game = createGame(gameSettings);
  lastStats = null;
  lastSavedGame = null;
  lastHistoryBase = null;

  game.onTick(() => {
    updateGameUI(game.getState());
  });

  game.onEvent((event, data) => {
    switch (event) {
      case 'playerStart':
        playTurnStart();
        break;
      case 'playerSwitch':
        playTurnStart();
        break;
      case 'refereeStart':
        playTurnEnd();
        break;
      case 'mainWarning':
        playMainWarning();
        break;
      case 'penalty':
        playPenaltyAlert();
        flashScreen();
        break;
      case 'reset':
        updateGameUI(game.getState());
        break;
    }
  });

  // Reset settings page for next time
  settingsPage = 1;
  game.start();
  showScreen('game');
}

function showGame() {
  // Build active players for rendering
  const activePlayers = [];
  for (let i = 0; i < 10; i++) {
    if (settings.activeMeeples[i]) {
      activePlayers.push({
        name: settings.players[i].name,
        color: COLOR_PALETTE[i].hex,
      });
    }
  }

  const renderSettings = {
    playerCount: activePlayers.length,
    players: activePlayers,
  };

  const state = game.getState();
  renderGameScreen(appEl, state, renderSettings);
  updateGameUI(state);
  wireGameControls();
  restoreGlobalBar();
}

function wireGameControls() {
  const grid = document.getElementById('player-grid');
  const areas = appEl.querySelectorAll('.player-area');

  // --- Long press drag-to-swap state ---
  let longPressTimer = null;
  let isDragging = false;
  let dragSource = null;
  let startX = 0;
  let startY = 0;
  const LONG_PRESS_MS = 500;
  const MOVE_THRESHOLD = 10;

  function canDrag() {
    const state = game.getState().state;
    return state === 'referee' || state === 'idle';
  }

  function getPointerPos(e) {
    if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function getAreaAtPoint(x, y) {
    const els = document.elementsFromPoint(x, y);
    return els.find(el => el.classList && el.classList.contains('player-area')) || null;
  }

  function swapDOM(a, b) {
    if (a === b) return;
    const parent = a.parentNode;
    const aNext = a.nextSibling === b ? a : a.nextSibling;
    parent.insertBefore(a, b);
    parent.insertBefore(b, aNext);
  }

  function startDrag(area) {
    isDragging = true;
    dragSource = area;
    area.classList.add('dragging');
    try { navigator.vibrate(50); } catch (e) { /* unsupported */ }
  }

  function endDrag() {
    if (dragSource) dragSource.classList.remove('dragging');
    grid.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    isDragging = false;
    dragSource = null;
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  function handlePointerDown(e, area) {
    if (!canDrag()) return;
    const pos = getPointerPos(e);
    startX = pos.x;
    startY = pos.y;
    longPressTimer = setTimeout(() => startDrag(area), LONG_PRESS_MS);
  }

  function handlePointerMove(e) {
    const pos = getPointerPos(e);
    if (longPressTimer && !isDragging) {
      const dx = pos.x - startX;
      const dy = pos.y - startY;
      if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      return;
    }
    if (!isDragging) return;
    e.preventDefault();
    const target = getAreaAtPoint(pos.x, pos.y);
    grid.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    if (target && target !== dragSource && target.classList.contains('player-area')) {
      target.classList.add('drag-over');
    }
  }

  function handlePointerUp(e) {
    if (longPressTimer && !isDragging) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      return; // normal tap — let click handler fire
    }
    if (!isDragging) return;
    const pos = e.changedTouches
      ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
      : { x: e.clientX, y: e.clientY };
    const target = getAreaAtPoint(pos.x, pos.y);
    if (target && target !== dragSource && target.classList.contains('player-area')) {
      swapDOM(dragSource, target);
    }
    endDrag();
  }

  // Wire touch + mouse events on each player area
  areas.forEach((area) => {
    // Tap handler
    area.addEventListener('click', (e) => {
      if (isDragging) { e.preventDefault(); return; }
      const idx = parseInt(area.dataset.player, 10);
      game.tapPlayer(idx);
    });

    // Touch events
    area.addEventListener('touchstart', (e) => handlePointerDown(e, area), { passive: true });
    // Mouse events
    area.addEventListener('mousedown', (e) => { if (e.button === 0) handlePointerDown(e, area); });
  });

  // Move & up on grid (capture drag across areas)
  grid.addEventListener('touchmove', handlePointerMove, { passive: false });
  grid.addEventListener('touchend', handlePointerUp);
  grid.addEventListener('touchcancel', endDrag);
  grid.addEventListener('mousemove', handlePointerMove);
  grid.addEventListener('mouseup', handlePointerUp);
  grid.addEventListener('mouseleave', endDrag);

  document.getElementById('btn-end').addEventListener('click', () => {
    if (confirm('게임을 종료할까요?')) {
      finishGame();
      showScreen('stats');
    }
  });
}

function buildHistoryData(stats, gameName) {
  if (lastHistoryBase) return { ...lastHistoryBase, gameName, stats };
  return {
    gameName,
    players: stats.players,
    timerConfig: {
      presetName: settings.presetName,
      turnTime: settings.turnTime,
      mainTime: settings.mainTime,
      penaltyTime: settings.penaltyTime,
    },
    stats,
  };
}

function finishGame() {
  lastStats = game.end();
  lastSavedGame = saveHistory(buildHistoryData(lastStats));
}

// --- Stats ---

function showStats() {
  if (!lastStats) return showSettings();
  const names = getGameNames();
  const canSave = appMode !== 'multi' || multiplayerRoom?.hostUid === multiplayerSession?.uid;
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
    appMode = 'multi';
    showScreen('settings');
    await runMultiplayerAction(async () => enterLobby(await joinMultiplayerRoom(queryCode)));
    return;
  }

  try {
    const session = await restoreRoom();
    if (session) {
      appMode = 'multi';
      enterLobby(session);
    }
  } catch {
    // A stale or offline room should not prevent single mode startup.
  }
}

init();
