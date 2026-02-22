import { loadSettings, saveSettings, TIMER_PRESETS, COLOR_PRESETS, COLOR_PALETTE } from './settings.js';
import { createGame } from './timer.js';
import { initSound, setSoundEnabled, playTurnWarning, playReserveWarning, playPenaltyAlert, speakTTS } from './sound.js';
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
      settings.players[paletteIndex].name = name || `Player ${paletteIndex + 1}`;
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
      settings.reserveTime = p.reserveTime;
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
    reserveTime: settings.reserveTime,
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
      case 'enterReserve':
        playTurnWarning();
        break;
      case 'reserveFiveMin':
        speakTTS('5\uBD84 \uB0A8\uC558\uC2B5\uB2C8\uB2E4');
        break;
      case 'reserveWarning':
        playReserveWarning();
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
  // Player taps
  const areas = appEl.querySelectorAll('.player-area');
  areas.forEach((area) => {
    area.addEventListener('click', () => {
      const idx = parseInt(area.dataset.player, 10);
      if (pausedState) {
        game.resume(pausedState.prevState, pausedState.prevPlayer);
        return;
      }
      game.tapPlayer(idx);
    });
  });

  // Pause
  document.getElementById('btn-pause').addEventListener('click', () => {
    if (pausedState) {
      game.resume(pausedState.prevState, pausedState.prevPlayer);
    } else {
      game.pause();
    }
  });

  // Reset
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('\uAC8C\uC784\uC744 \uB9AC\uC14B\uD560\uAE4C\uC694?')) {
      game.reset();
      updateGameUI(game.getState());
    }
  });

  // End
  document.getElementById('btn-end').addEventListener('click', () => {
    if (confirm('\uAC8C\uC784\uC744 \uC885\uB8CC\uD560\uAE4C\uC694?')) {
      lastStats = game.end();
      showScreen('stats');
    }
  });
}

function updatePauseUI(isPaused) {
  const btn = document.getElementById('btn-pause');
  if (btn) {
    btn.textContent = isPaused ? '\u25B6 \uC7AC\uAC1C' : '\u23F8 \uC77C\uC2DC\uC815\uC9C0';
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
          reserveTime: settings.reserveTime,
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
