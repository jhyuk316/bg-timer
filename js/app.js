import { loadSettings, saveSettings, TIMER_PRESETS, COLOR_PRESETS, COLOR_PALETTE } from './settings.js';
import { createGame } from './timer.js';
import { initSound, setSoundEnabled, playTurnWarning, playMainWarning, playPenaltyAlert, speakTTS } from './sound.js';
import { saveGame as saveHistory, getHistory, getGame as getHistoryGame, deleteGame, getGameNames } from './history.js';
import { renderSettingsScreen, renderGameScreen, updateGameUI, renderStatsScreen, renderHistoryScreen, renderHistoryDetail, flashScreen, renderGlobalBar, updateGlobalBar } from './ui.js';

const appEl = document.getElementById('app');
let settings = loadSettings();
let game = null;
let pausedState = null; // { prevState, prevPlayer }
let currentScreen = 'settings';
let settingsPage = 1;
let lastStats = null;

function showScreen(name) {
  currentScreen = name;
  switch (name) {
    case 'settings': showSettings(); break;
    case 'game': showGame(); break;
    case 'stats': showStats(); break;
    case 'history': showHistory(); break;
  }
}

function restoreGlobalBar() {
  renderGlobalBar({ toggleSound, toggleFullscreen });
  updateGlobalBar(settings.soundEnabled);
}

// --- Settings ---

function showSettings() {
  renderSettingsScreen(appEl, settings, settingsPage, {
    toggleMeeple(index) {
      if (settings.activeMeeples[index]) {
        settings.activeMeeples[index] = false;
      } else {
        const activeCount = settings.activeMeeples.filter(Boolean).length;
        if (activeCount >= 5) return 'max';
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
      settings.presetName = '';
      saveSettings(settings);
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
  pausedState = null;
  lastStats = null;

  game.onTick(() => {
    updateGameUI(game.getState());
  });

  game.onEvent((event, data) => {
    switch (event) {
      case 'enterMain':
        playTurnWarning();
        break;
      case 'mainFiveMin':
        speakTTS('5\uBD84 \uB0A8\uC558\uC2B5\uB2C8\uB2E4');
        break;
      case 'mainWarning':
        playMainWarning();
        break;
      case 'penalty':
        playPenaltyAlert();
        flashScreen();
        break;
      case 'pause':
        pausedState = { prevState: data.prevState, prevPlayer: data.prevPlayer };
        updatePauseUI(true);
        updateGameUI(game.getState());
        break;
      case 'resume':
        pausedState = null;
        updatePauseUI(false);
        break;
      case 'reset':
        pausedState = null;
        updatePauseUI(false);
        updateGameUI(game.getState());
        break;
    }
  });

  // Reset settings page for next time
  settingsPage = 1;
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
    return pausedState || state === 'referee' || state === 'idle';
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
      if (pausedState) {
        game.resume(pausedState.prevState, pausedState.prevPlayer);
        return;
      }
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

  // Pause / End (unified button)
  document.getElementById('btn-pause').addEventListener('click', () => {
    if (pausedState) {
      // Paused → end game
      if (confirm('게임을 종료할까요?')) {
        lastStats = game.end();
        showScreen('stats');
      }
    } else {
      game.pause();
    }
  });
}

function updatePauseUI(isPaused) {
  const btn = document.getElementById('btn-pause');
  if (btn) {
    btn.textContent = isPaused ? '\u23F9 \uAC8C\uC784 \uC885\uB8CC' : '\u23F8 \uC77C\uC2DC\uC815\uC9C0';
  }
  const grid = document.getElementById('player-grid');
  if (grid) {
    grid.classList.toggle('paused', isPaused);
  }
}

// --- Stats ---

function showStats() {
  if (!lastStats) return showSettings();
  const names = getGameNames();
  renderStatsScreen(appEl, lastStats, names, {
    save(gameName) {
      saveHistory({
        gameName,
        players: lastStats.players,
        timerConfig: {
          presetName: settings.presetName,
          turnTime: settings.turnTime,
          mainTime: settings.mainTime,
          penaltyTime: settings.penaltyTime,
        },
        stats: lastStats,
      });
      alert('\uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4!');
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

  // Force landscape orientation
  try {
    screen.orientation.lock('landscape').catch(() => {});
  } catch (e) { /* unsupported */ }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();
