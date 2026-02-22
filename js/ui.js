import { COLOR_PALETTE, COLOR_PRESETS, TIMER_PRESETS } from './settings.js';

const REFEREE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1zm2-13v1c0 .537.12 1.045.337 1.5h6.326c.216-.455.337-.963.337-1.5V2zm3 6.35c0 .701-.478 1.236-1.011 1.492A3.5 3.5 0 0 0 4.5 13s.866-1.299 3-1.48zm1 0v3.17c2.134.181 3 1.48 3 1.48a3.5 3.5 0 0 0-1.989-3.158C8.978 9.586 8.5 9.052 8.5 8.351z"/></svg>`;

const MEEPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M256 54.99c-27 0-46.418 14.287-57.633 32.23-10.03 16.047-14.203 34.66-15.017 50.962-30.608 15.135-64.515 30.394-91.815 45.994-14.32 8.183-26.805 16.414-36.203 25.26C45.934 218.28 39 228.24 39 239.99c0 5 2.44 9.075 5.19 12.065 2.754 2.99 6.054 5.312 9.812 7.48 7.515 4.336 16.99 7.95 27.412 11.076 15.483 4.646 32.823 8.1 47.9 9.577-14.996 25.84-34.953 49.574-52.447 72.315C56.65 378.785 39 403.99 39 431.99c0 4-.044 7.123.31 10.26.355 3.137 1.256 7.053 4.41 10.156 3.155 3.104 7.017 3.938 10.163 4.28 3.146.345 6.315.304 10.38.304h111.542c8.097 0 14.026.492 20.125-3.43 6.1-3.92 8.324-9.275 12.67-17.275l.088-.16.08-.166s9.723-19.77 21.324-39.388c5.8-9.808 12.097-19.576 17.574-26.498 2.74-3.46 5.304-6.204 7.15-7.754.564-.472.82-.56 1.184-.76.363.2.62.288 1.184.76 1.846 1.55 4.41 4.294 7.15 7.754 5.477 6.922 11.774 16.69 17.574 26.498 11.6 19.618 21.324 39.387 21.324 39.387l.08.165.088.16c4.346 8 6.55 13.323 12.61 17.254 6.058 3.93 11.974 3.45 19.957 3.45H448c4 0 7.12.043 10.244-.304 3.123-.347 6.998-1.21 10.12-4.332 3.12-3.122 3.984-6.997 4.33-10.12.348-3.122.306-6.244.306-10.244 0-28-17.65-53.205-37.867-79.488-17.493-22.74-37.45-46.474-52.447-72.315 15.077-1.478 32.417-4.93 47.9-9.576 10.422-3.125 19.897-6.74 27.412-11.075 3.758-2.168 7.058-4.49 9.81-7.48 2.753-2.99 5.192-7.065 5.192-12.065 0-11.75-6.934-21.71-16.332-30.554-9.398-8.846-21.883-17.077-36.203-25.26-27.3-15.6-61.207-30.86-91.815-45.994-.814-16.3-4.988-34.915-15.017-50.96C302.418 69.276 283 54.99 256 54.99z"/></svg>`;

// --- Global Bar (sound + fullscreen icons) ---

export function renderGlobalBar(callbacks) {
  const appEl = document.getElementById('app');
  if (appEl.querySelector('.global-bar')) return;

  const bar = el('div', 'global-bar');

  const soundBtn = el('button', '', '🔊');
  soundBtn.id = 'btn-sound';
  soundBtn.addEventListener('click', callbacks.toggleSound);
  bar.appendChild(soundBtn);

  if (document.fullscreenEnabled) {
    const fsBtn = el('button', '', '⛶');
    fsBtn.id = 'btn-fullscreen';
    fsBtn.addEventListener('click', callbacks.toggleFullscreen);
    bar.appendChild(fsBtn);
  }

  appEl.insertBefore(bar, appEl.firstChild);
}

export function updateGlobalBar(soundEnabled) {
  const btn = document.getElementById('btn-sound');
  if (btn) btn.textContent = soundEnabled ? '🔊' : '🔇';

  const fsBtn = document.getElementById('btn-fullscreen');
  if (fsBtn) fsBtn.textContent = document.fullscreenElement ? '⛶' : '⛶';
}

export function formatTime(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatTimeLong(ms) {
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}시간 ${m}분 ${s}초`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

// --- Settings Screen ---

export function renderSettingsScreen(container, settings, page, callbacks) {
  if (page === 1) {
    renderSettingsPage1(container, settings, callbacks);
  } else {
    renderSettingsPage2(container, settings, callbacks);
  }
}

function renderSettingsPage1(container, settings, callbacks) {
  container.innerHTML = '';

  const wrap = el('div', 'settings-wrap');
  wrap.appendChild(el('h1', 'settings-title', 'Board Game Timer'));

  // Meeple selection section (hero)
  const meepleSection = el('div', 'settings-section');

  const meepleGrid = el('div', 'meeple-grid');
  for (let i = 0; i < COLOR_PALETTE.length; i++) {
    const color = COLOR_PALETTE[i];
    const isActive = settings.activeMeeples[i];

    const slot = el('div', `meeple-slot${isActive ? ' active' : ' dimmed'}`);
    slot.addEventListener('click', () => {
      const result = callbacks.toggleMeeple(i);
      if (result === 'max') {
        showMeepleError(container, '최대 5명까지 선택할 수 있습니다');
      }
    });

    const icon = el('div', 'meeple-icon');
    icon.innerHTML = MEEPLE_SVG;
    icon.style.color = color.hex;
    slot.appendChild(icon);

    if (isActive) {
      const nameInput = el('input', 'meeple-name');
      nameInput.type = 'text';
      nameInput.maxLength = 10;
      nameInput.value = settings.players[i].name;
      nameInput.placeholder = color.name;
      nameInput.addEventListener('click', (e) => e.stopPropagation());
      nameInput.addEventListener('change', (e) => callbacks.setPlayerName(i, e.target.value));
      slot.appendChild(nameInput);
    } else {
      const label = el('span', 'meeple-label', color.name);
      slot.appendChild(label);
    }

    meepleGrid.appendChild(slot);
  }
  meepleSection.appendChild(meepleGrid);

  const errorMsg = el('div', 'meeple-error');
  errorMsg.id = 'meeple-error';
  meepleSection.appendChild(errorMsg);

  wrap.appendChild(meepleSection);

  // Color presets section (auxiliary)
  const presetColorRow = el('div', 'preset-color-row');
  for (const [name] of Object.entries(COLOR_PRESETS)) {
    const btn = el('button', 'preset-color-btn', name);
    btn.addEventListener('click', () => callbacks.applyColorPreset(name));
    presetColorRow.appendChild(btn);
  }
  wrap.appendChild(presetColorRow);

  // Nav buttons
  const nav = el('div', 'settings-nav');
  const historyBtn = el('button', 'btn-secondary', '히스토리');
  historyBtn.addEventListener('click', callbacks.openHistory);
  nav.appendChild(historyBtn);

  const nextBtn = el('button', 'btn-primary', '다음 →');
  nextBtn.addEventListener('click', () => {
    const result = callbacks.goToPage2();
    if (result === 'empty') {
      showMeepleError(container, '플레이어를 1명 이상 선택해주세요');
    }
  });
  nav.appendChild(nextBtn);

  wrap.appendChild(nav);
  container.appendChild(wrap);
}

function showMeepleError(container, message) {
  const errorEl = container.querySelector('#meeple-error');
  if (errorEl) {
    errorEl.textContent = message;
    clearTimeout(errorEl._timeout);
    errorEl._timeout = setTimeout(() => { errorEl.textContent = ''; }, 2000);
  }
}

function renderSettingsPage2(container, settings, callbacks) {
  container.innerHTML = '';

  const wrap = el('div', 'settings-wrap');
  wrap.appendChild(el('h1', 'settings-title', 'Board Game Timer'));

  // 2-column timer layout
  const timerLayout = el('div', 'timer-layout');

  // Left: timer presets (vertical)
  const presetsCol = el('div', 'timer-presets-col');
  for (const [name, preset] of Object.entries(TIMER_PRESETS)) {
    const btn = el('button', `preset-btn${name === settings.presetName ? ' active' : ''}`);
    btn.appendChild(el('span', 'preset-name', name));
    btn.appendChild(el('span', 'preset-time', `${preset.targetMin}m/p`));
    btn.addEventListener('click', () => callbacks.setPreset(name));
    presetsCol.appendChild(btn);
  }
  timerLayout.appendChild(presetsCol);

  // Right: timer details
  const detailCol = el('div', 'timer-detail-col');

  const timerValues = el('div', 'timer-values');
  timerValues.appendChild(makeTimerInput('총 시간', Math.round(settings.reserveTime / 60), 1, 120, '분', (v) => callbacks.setTimerValue('reserveTime', v * 60)));
  timerValues.appendChild(makeTimerInput('턴 딜레이', settings.turnTime, 5, 300, '초', (v) => callbacks.setTimerValue('turnTime', v)));
  timerValues.appendChild(makeTimerInput('초과 시 추가 시간', Math.round(settings.penaltyTime / 60), 1, 30, '분', (v) => callbacks.setTimerValue('penaltyTime', v * 60)));

  const hint = el('div', 'timer-hint', '총 시간 소진 → 패널티 + 추가시간 부여');
  timerValues.appendChild(hint);

  detailCol.appendChild(timerValues);

  timerLayout.appendChild(detailCol);
  wrap.appendChild(timerLayout);

  // Nav buttons
  const nav = el('div', 'settings-nav');
  const prevBtn = el('button', 'btn-secondary', '← 이전');
  prevBtn.addEventListener('click', callbacks.goToPage1);
  nav.appendChild(prevBtn);

  const startBtn = el('button', 'btn-primary', '게임 시작');
  startBtn.addEventListener('click', callbacks.startGame);
  nav.appendChild(startBtn);

  wrap.appendChild(nav);
  container.appendChild(wrap);
}

function makeTimerInput(label, value, min, max, unit, onChange) {
  const row = el('div', 'timer-input-row');
  row.appendChild(el('span', 'timer-input-label', label));
  const inputWrap = el('div', 'timer-input-wrap');
  const input = el('input', 'timer-input');
  input.type = 'number';
  input.min = min;
  input.max = max;
  input.value = value;
  input.addEventListener('change', (e) => {
    let v = parseInt(e.target.value, 10);
    if (isNaN(v) || v < min) v = min;
    if (v > max) v = max;
    e.target.value = v;
    onChange(v);
  });
  inputWrap.appendChild(input);
  inputWrap.appendChild(el('span', 'timer-input-unit', unit));
  row.appendChild(inputWrap);
  return row;
}

// --- Game Screen ---

export function renderGameScreen(container, gameState, settings) {
  container.innerHTML = '';

  // Top bar
  const refBar = el('div', 'referee-bar');
  refBar.id = 'referee-bar';

  // Left: referee section (visible only when referee active)
  const refSection = el('div', 'referee-section');
  const refIconGame = el('span', 'referee-icon');
  refIconGame.innerHTML = REFEREE_SVG;
  refSection.append(refIconGame, el('span', 'referee-label', '운영'));
  const refTime = el('span', 'referee-time', '0:00');
  refTime.id = 'referee-time';
  refSection.appendChild(refTime);
  refBar.appendChild(refSection);

  // Center: total active time
  const totalTime = el('span', 'game-total-time', '0:00');
  totalTime.id = 'game-total-time';
  refBar.appendChild(totalTime);

  container.appendChild(refBar);

  // Start time (below referee bar, left corner)
  const startTime = el('div', 'game-start-time');
  startTime.id = 'game-start-time';
  container.appendChild(startTime);

  // Player grid
  const grid = el('div', `player-grid players-${settings.playerCount}`);
  grid.id = 'player-grid';

  for (let i = 0; i < settings.playerCount; i++) {
    const p = settings.players[i];
    const area = el('div', 'player-area');
    area.dataset.player = i;
    area.style.setProperty('--player-color', p.color);

    const meeple = el('div', 'game-meeple');
    meeple.innerHTML = MEEPLE_SVG;
    area.appendChild(meeple);

    area.appendChild(el('div', 'game-player-name', p.name));

    const timerEl = el('div', 'game-timer', formatTime(gameState.playerStates[i].reserveTimeRemaining));
    timerEl.id = `player-timer-${i}`;
    area.appendChild(timerEl);

    const delayEl = el('div', 'game-delay', '');
    delayEl.id = `player-delay-${i}`;
    area.appendChild(delayEl);

    const penaltyEl = el('div', 'game-penalty', '');
    penaltyEl.id = `player-penalty-${i}`;
    area.appendChild(penaltyEl);

    grid.appendChild(area);
  }
  container.appendChild(grid);

  // Control bar (single button)
  const controls = el('div', 'game-controls');
  const pauseBtn = el('button', 'ctrl-btn', '⏸ 일시정지');
  pauseBtn.id = 'btn-pause';
  controls.appendChild(pauseBtn);
  container.appendChild(controls);
}

export function updateGameUI(gameState) {
  const { state, activePlayer, playerStates, referee, gameStartTime, totalActiveTime } = gameState;

  // Top bar
  const refBar = document.getElementById('referee-bar');
  const refTime = document.getElementById('referee-time');
  if (refBar) {
    refBar.classList.toggle('active', state === 'referee');
    if (refTime) refTime.textContent = formatTime(referee.currentLapTime);
  }

  // Total active time (center)
  const totalTimeEl = document.getElementById('game-total-time');
  if (totalTimeEl) totalTimeEl.textContent = formatTime(totalActiveTime || 0);

  // Start time (HH:MM)
  const startTimeEl = document.getElementById('game-start-time');
  if (startTimeEl && gameStartTime) {
    const d = new Date(gameStartTime);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    startTimeEl.textContent = `시작 ${hh}:${mm}`;
  }

  // Players
  for (let i = 0; i < playerStates.length; i++) {
    const p = playerStates[i];
    const area = document.querySelector(`.player-area[data-player="${i}"]`);
    if (!area) continue;

    const isActive = state === 'player' && activePlayer === i;
    area.classList.toggle('active', isActive);
    area.classList.toggle('in-reserve', isActive && p.phase === 'reserve');

    const timerEl = document.getElementById(`player-timer-${i}`);
    if (timerEl) {
      timerEl.textContent = formatTime(p.reserveTimeRemaining);
    }

    const delayEl = document.getElementById(`player-delay-${i}`);
    if (delayEl) {
      delayEl.textContent = (isActive && p.phase === 'turn')
        ? `딜레이 ${formatTime(p.turnTimeRemaining)}`
        : '';
    }

    const penaltyEl = document.getElementById(`player-penalty-${i}`);
    if (penaltyEl) {
      penaltyEl.textContent = p.penaltyCount > 0 ? `패널티 ×${p.penaltyCount} (−${p.penaltyCount * 2}%)` : '';
    }
  }

}

// --- Stats Screen ---

export function renderStatsScreen(container, stats, savedNames, callbacks) {
  container.innerHTML = '';
  const wrap = el('div', 'stats-wrap');

  // Compact header with total time
  const header = el('div', 'stats-header');
  header.appendChild(el('h2', 'stats-title', '게임 결과'));
  header.appendChild(el('span', 'stats-total-inline', `전체 ${formatTimeLong(stats.totalPlayTime)}`));
  wrap.appendChild(header);

  // Unified stats + gantt
  wrap.appendChild(buildUnifiedStats(stats));

  // Save row: [input] [저장] [새 게임]
  const saveRow = el('div', 'stats-save-row');
  const nameInput = el('input', 'stats-name-input');
  nameInput.type = 'text';
  nameInput.id = 'game-name-input';
  nameInput.placeholder = '게임명';
  nameInput.setAttribute('list', 'game-name-list');

  const datalist = document.createElement('datalist');
  datalist.id = 'game-name-list';
  for (const n of savedNames) {
    const opt = document.createElement('option');
    opt.value = n;
    datalist.appendChild(opt);
  }

  const saveBtn = el('button', 'btn-primary', '저장');
  saveBtn.addEventListener('click', () => {
    const name = document.getElementById('game-name-input').value.trim();
    callbacks.save(name);
  });
  const newBtn = el('button', 'btn-secondary', '새 게임');
  newBtn.addEventListener('click', callbacks.newGame);
  saveRow.append(nameInput, datalist, saveBtn, newBtn);
  wrap.appendChild(saveRow);

  container.appendChild(wrap);
}

// --- History Screen ---

export function renderHistoryScreen(container, history, callbacks) {
  container.innerHTML = '';
  const wrap = el('div', 'history-wrap');

  const header = el('div', 'history-header');
  const backBtn = el('button', 'btn-back', '← 설정');
  backBtn.addEventListener('click', callbacks.back);
  header.appendChild(backBtn);
  header.appendChild(el('h2', 'history-title', '히스토리'));
  wrap.appendChild(header);

  if (history.length === 0) {
    wrap.appendChild(el('div', 'history-empty', '저장된 게임이 없습니다.'));
  } else {
    const list = el('div', 'history-list');
    for (const g of history) {
      const item = el('div', 'history-item');
      const info = el('div', 'history-info');
      info.appendChild(el('div', 'history-game-name', g.gameName));
      const dateStr = new Date(g.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const meta = `${dateStr} · ${g.stats.players.length}인 · ${formatTimeLong(g.stats.totalPlayTime)}`;
      info.appendChild(el('div', 'history-meta', meta));
      item.appendChild(info);

      const actions = el('div', 'history-actions');
      const viewBtn = el('button', 'btn-small', '보기');
      viewBtn.addEventListener('click', () => callbacks.view(g.id));
      const delBtn = el('button', 'btn-small btn-danger', '삭제');
      delBtn.addEventListener('click', () => {
        if (confirm('이 기록을 삭제할까요?')) callbacks.delete(g.id);
      });
      actions.append(viewBtn, delBtn);
      item.appendChild(actions);

      list.appendChild(item);
    }
    wrap.appendChild(list);
  }
  container.appendChild(wrap);
}

export function renderHistoryDetail(container, game, callbacks) {
  container.innerHTML = '';
  const wrap = el('div', 'stats-wrap');

  const hdr = el('div', 'history-header');
  const backBtn = el('button', 'btn-back', '← 히스토리');
  backBtn.addEventListener('click', callbacks.back);
  hdr.appendChild(backBtn);
  hdr.appendChild(el('h2', 'stats-title', game.gameName));
  wrap.appendChild(hdr);

  const dateStr = new Date(game.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateLine = el('div', 'history-date');
  dateLine.textContent = `${dateStr}  ·  전체 ${formatTimeLong(game.stats.totalPlayTime)}`;
  wrap.appendChild(dateLine);

  // Unified stats + gantt
  wrap.appendChild(buildUnifiedStats(game.stats));

  container.appendChild(wrap);
}

// --- Unified Stats + Gantt ---

function buildUnifiedStats(stats) {
  const turnLog = stats.turnLog;
  const totalMs = stats.totalPlayTime;
  const hasGantt = turnLog && turnLog.length > 0 && totalMs > 0;

  const section = el('div', 'stats-unified');
  const scrollWraps = [];
  let zoom = 1;

  // Zoom controls (will be appended to first player's info row)
  let ganttControls = null;
  if (hasGantt) {
    const controls = el('div', 'gantt-controls');
    const zoomOutBtn = el('button', 'gantt-zoom-btn', '−');
    const zoomInBtn = el('button', 'gantt-zoom-btn', '+');
    zoomOutBtn.disabled = true;

    // Tick marks row (synced scroll, no scrollbar)
    const ticksWrap = el('div', 'gantt-ticks-wrap gantt-scroll-wrap');
    scrollWraps.push(ticksWrap);
    const ticksInner = el('div', 'gantt-inner');
    const ticks = el('div', 'gantt-ticks');
    ticksInner.appendChild(ticks);
    ticksWrap.appendChild(ticksInner);

    function formatTickLabel(ms) {
      const totalSec = Math.round(ms / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      if (m === 0 && s === 0) return '0';
      if (s === 0) return `${m}m`;
      return `${m}:${String(s).padStart(2, '0')}`;
    }

    function buildTicks(z) {
      ticks.innerHTML = '';
      const totalMin = totalMs / 60000;
      // Pick interval so ~3-8 ticks are visible per screen width
      const visibleMin = totalMin / z;
      const candidates = [1, 2, 5, 10, 15, 20, 30, 60];
      let intervalMin = candidates.find(c => visibleMin / c <= 8) || 60;
      const intervalMs = intervalMin * 60000;

      // Always show start
      const startTick = el('div', 'gantt-tick');
      startTick.style.left = '0%';
      startTick.textContent = '0';
      ticks.appendChild(startTick);

      // Middle ticks
      for (let t = intervalMs; t < totalMs; t += intervalMs) {
        const tick = el('div', 'gantt-tick');
        tick.style.left = `${(t / totalMs) * 100}%`;
        tick.textContent = formatTickLabel(t);
        ticks.appendChild(tick);
      }

      // Always show end
      const endTick = el('div', 'gantt-tick gantt-tick-end');
      endTick.style.left = '100%';
      endTick.textContent = formatTickLabel(totalMs);
      ticks.appendChild(endTick);
    }

    buildTicks(zoom);

    function setZoom(newZoom) {
      zoom = Math.max(1, Math.min(5, newZoom));
      section.querySelectorAll('.gantt-inner').forEach(inner => {
        inner.style.width = `${zoom * 100}%`;
      });
      buildTicks(zoom);
      zoomOutBtn.disabled = (zoom <= 1);
      zoomInBtn.disabled = (zoom >= 5);
    }

    zoomOutBtn.addEventListener('click', () => setZoom(zoom - 1));
    zoomInBtn.addEventListener('click', () => setZoom(zoom + 1));
    controls.append(zoomOutBtn, zoomInBtn);
    ganttControls = controls;

    section.appendChild(ticksWrap);
  }

  // Player blocks (2 rows each: info + gantt)
  for (let i = 0; i < stats.players.length; i++) {
    const p = stats.players[i];
    const block = el('div', 'stats-player-block');
    block.style.borderLeft = `3px solid ${p.color}`;

    // Row 1: info
    const infoRow = el('div', 'stats-info-row');
    const label = el('div', 'stats-unified-label');
    const meeple = el('span', 'stats-meeple');
    meeple.innerHTML = MEEPLE_SVG;
    meeple.style.color = p.color;
    label.appendChild(meeple);
    label.appendChild(el('span', 'stats-unified-name', p.name));
    infoRow.appendChild(label);

    const pct = String(Math.round(p.totalTime / totalMs * 100)).padStart(2, '\u2007');
    infoRow.appendChild(uniCell('시간', `${formatTimeLong(p.totalTime)} (${pct}%)`));
    infoRow.appendChild(uniCell('턴', `${p.turnCount}턴`));
    infoRow.appendChild(uniCell('패널티',
      p.penaltyCount > 0 ? `${p.penaltyCount}회 (−${p.penaltyCount * 2}%)` : '-'
    ));
    if (i === 0 && ganttControls) {
      infoRow.appendChild(ganttControls);
    }
    block.appendChild(infoRow);

    // Row 2: gantt
    if (hasGantt) {
      const scrollWrap = el('div', 'gantt-scroll-wrap');
      scrollWraps.push(scrollWrap);
      const inner = el('div', 'gantt-inner');
      const timeline = el('div', 'gantt-timeline');
      for (const entry of turnLog) {
        if (entry.type === 'player' && entry.player === i && entry.endMs != null) {
          const bar = el('div', 'gantt-bar');
          bar.style.left = `${(entry.startMs / totalMs) * 100}%`;
          bar.style.width = `${((entry.endMs - entry.startMs) / totalMs) * 100}%`;
          bar.style.backgroundColor = p.color;
          timeline.appendChild(bar);
        }
      }
      inner.appendChild(timeline);
      scrollWrap.appendChild(inner);
      block.appendChild(scrollWrap);
    }

    section.appendChild(block);
  }

  // Referee block
  const refBlock = el('div', 'stats-player-block');
  refBlock.style.borderLeft = '3px solid #888';

  const refInfoRow = el('div', 'stats-info-row');
  const refLabel = el('div', 'stats-unified-label');
  const refIcon = el('span', 'stats-meeple');
  refIcon.innerHTML = REFEREE_SVG;
  refLabel.appendChild(refIcon);
  refLabel.appendChild(el('span', 'stats-unified-name', '운영'));
  refInfoRow.appendChild(refLabel);

  const refPct = Math.round(stats.referee.totalTime / totalMs * 100);
  refInfoRow.appendChild(uniCell('시간', `${formatTimeLong(stats.referee.totalTime)} (${refPct}%)`));
  refInfoRow.appendChild(uniCell('횟수', `${stats.referee.turnCount}회`));
  refInfoRow.appendChild(uniCell('패널티', '-'));
  refBlock.appendChild(refInfoRow);

  if (hasGantt) {
    const refScrollWrap = el('div', 'gantt-scroll-wrap');
    scrollWraps.push(refScrollWrap);
    const refInner = el('div', 'gantt-inner');
    const refTimeline = el('div', 'gantt-timeline');
    for (const entry of turnLog) {
      if (entry.type === 'referee' && entry.endMs != null) {
        const bar = el('div', 'gantt-bar');
        bar.style.left = `${(entry.startMs / totalMs) * 100}%`;
        bar.style.width = `${((entry.endMs - entry.startMs) / totalMs) * 100}%`;
        bar.style.backgroundColor = '#888';
        refTimeline.appendChild(bar);
      }
    }
    refInner.appendChild(refTimeline);
    refScrollWrap.appendChild(refInner);
    refBlock.appendChild(refScrollWrap);
  }

  section.appendChild(refBlock);

  // Scroll sync
  scrollWraps.forEach(wrap => {
    wrap.addEventListener('scroll', () => {
      scrollWraps.forEach(other => {
        if (other !== wrap) other.scrollLeft = wrap.scrollLeft;
      });
    });
  });

  return section;
}

function uniCell(label, value) {
  const cell = el('div', 'stats-unified-cell');
  const labelSpan = el('span', 'stats-cell-label', label);
  cell.appendChild(labelSpan);
  cell.appendChild(document.createTextNode(value));
  return cell;
}

// --- Helpers ---

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function flashScreen() {
  document.body.classList.add('flash');
  setTimeout(() => document.body.classList.remove('flash'), 400);
}
