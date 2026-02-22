import { loadSettings, saveSettings, TIMER_PRESETS, COLOR_PRESETS, DEFAULT_COLORS } from './settings.js';
import { createGame } from './timer.js';
import { initSound, setSoundEnabled, playTurnWarning, playReserveWarning, playPenaltyAlert, speakTTS } from './sound.js';
import { saveGame as saveHistory, getHistory, getGame as getHistoryGame, deleteGame, getGameNames } from './history.js';
import { renderSettingsScreen, renderGameScreen, updateGameUI, renderStatsScreen, renderHistoryScreen, renderHistoryDetail, flashScreen } from './ui.js';

const appEl = document.getElementById('app');
let settings = loadSettings();
let game = null;
let pausedState = null; // { prevState, prevPlayer }
let currentScreen = 'settings';
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

// --- Settings ---

function showSettings() {
  renderSettingsScreen(appEl, settings, {
    setPlayerCount(n) {
      settings.playerCount = n;
      saveSettings(settings);
      showSettings();
    },
    setPlayerName(i, name) {
      settings.players[i].name = name || `Player ${i + 1}`;
      saveSettings(settings);
    },
    setPlayerColor(i, hex) {
      settings.players[i].color = hex;
      saveSettings(settings);
      showSettings();
    },
    applyColorPreset(name) {
      const preset = COLOR_PRESETS[name];
      if (!preset) return;
      for (let i = 0; i < settings.playerCount && i < preset.colors.length; i++) {
        settings.players[i].color = preset.colors[i];
      }
      saveSettings(settings);
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
    toggleCarryOver() {
      settings.carryOverTurnTime = !settings.carryOverTurnTime;
      saveSettings(settings);
      showSettings();
    },
    toggleSound() {
      settings.soundEnabled = !settings.soundEnabled;
      setSoundEnabled(settings.soundEnabled);
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
}

// --- Game ---

function startNewGame() {
  game = createGame(settings);
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
        speakTTS('5분 남았습니다');
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

  showScreen('game');
}

function showGame() {
  const state = game.getState();
  renderGameScreen(appEl, state, settings);
  updateGameUI(state);
  wireGameControls();
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
    if (confirm('게임을 리셋할까요?')) {
      game.reset();
      updateGameUI(game.getState());
    }
  });

  // End
  document.getElementById('btn-end').addEventListener('click', () => {
    if (confirm('게임을 종료할까요?')) {
      lastStats = game.end();
      showScreen('stats');
    }
  });
}

function updatePauseUI(isPaused) {
  const btn = document.getElementById('btn-pause');
  if (btn) {
    btn.textContent = isPaused ? '▶ 재개' : '⏸ 일시정지';
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
      alert('저장되었습니다!');
      showScreen('settings');
    },
    newGame() {
      showScreen('settings');
    },
  });
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
}

function showHistoryDetail(game) {
  renderHistoryDetail(appEl, game, {
    back() {
      showHistory();
    },
  });
}

// --- Init ---

function init() {
  initSound();
  setSoundEnabled(settings.soundEnabled);
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
