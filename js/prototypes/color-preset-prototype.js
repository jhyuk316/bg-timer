import { COLOR_PALETTE, COLOR_PRESETS } from '../settings.js';

// Throwaway UI prototype: three lobby button structures, switchable via ?variant=A|B|C.
const VARIANTS = {
  A: '바로 보이는 칩',
  B: '한 버튼 + 펼침 패널',
  C: '하단 순환 버튼',
};

const presetNames = Object.keys(COLOR_PRESETS);
let activePreset = '백로성';

function el(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function currentVariant() {
  const value = new URLSearchParams(location.search).get('variant')?.toUpperCase();
  return VARIANTS[value] ? value : 'A';
}

function setVariant(key) {
  const url = new URL(location.href);
  url.searchParams.set('variant', key);
  history.replaceState(null, '', url);
  renderColorPresetPrototype(document.getElementById('app'));
}

function presetButton(name, compact = false) {
  const button = el('button', `prototype-preset${compact ? ' compact' : ''}${activePreset === name ? ' active' : ''}`);
  button.type = 'button';
  button.setAttribute('aria-pressed', String(activePreset === name));
  button.appendChild(el('span', 'prototype-preset-name', name));
  button.addEventListener('click', () => {
    activePreset = activePreset === name ? null : name;
    renderColorPresetPrototype(document.getElementById('app'));
  });
  return button;
}

function buildPresetControls(variant) {
  const controls = el('div', `prototype-controls variant-${variant.toLowerCase()}`);
  if (variant === 'A') {
    controls.appendChild(el('span', 'prototype-controls-label', '색상 안내'));
    presetNames.forEach((name) => controls.appendChild(presetButton(name, true)));
    return controls;
  }

  if (variant === 'B') {
    const details = el('details', 'prototype-preset-details');
    const summary = el('summary', 'prototype-open-button');
    summary.append('색상 프리셋');
    if (activePreset) summary.appendChild(el('span', 'prototype-current-name', activePreset));
    details.appendChild(summary);
    const panel = el('div', 'prototype-preset-panel');
    panel.appendChild(el('p', 'prototype-panel-help', '누르면 해당 색상만 빛납니다. 플레이어는 직접 선택하세요.'));
    const list = el('div', 'prototype-preset-list');
    presetNames.forEach((name) => list.appendChild(presetButton(name)));
    panel.appendChild(list);
    details.appendChild(panel);
    controls.appendChild(details);
    return controls;
  }

  const index = Math.max(0, presetNames.indexOf(activePreset));
  const cycle = el('button', 'prototype-cycle-button');
  cycle.type = 'button';
  cycle.appendChild(el('span', 'prototype-cycle-label', '색상 강조'));
  cycle.appendChild(el('strong', '', activePreset || '없음'));
  cycle.appendChild(el('span', '', '›'));
  cycle.addEventListener('click', () => {
    activePreset = presetNames[(index + 1) % presetNames.length];
    renderColorPresetPrototype(document.getElementById('app'));
  });
  controls.appendChild(cycle);
  const clear = el('button', 'prototype-clear-button', '강조 끄기');
  clear.type = 'button';
  clear.disabled = !activePreset;
  clear.addEventListener('click', () => {
    activePreset = null;
    renderColorPresetPrototype(document.getElementById('app'));
  });
  controls.appendChild(clear);
  return controls;
}

function buildLobby(variant) {
  const wrap = el('div', 'lobby-wrap prototype-lobby');
  const side = el('section', 'lobby-side');
  side.append(el('div', 'lobby-kicker', '방 코드'), el('div', 'lobby-code', '142 857'));
  side.appendChild(el('div', 'prototype-qr', 'QR'));
  side.appendChild(el('h2', 'lobby-heading', '접속 2대'));
  ['나 · 선택 중', '게스트 8fd2 · 선택 중'].forEach((text) => side.appendChild(el('div', 'participant-row', text)));
  side.appendChild(el('button', 'btn-secondary lobby-leave', '방 나가기'));

  const main = el('section', 'lobby-main');
  const titleRow = el('div', 'lobby-title-row prototype-title-row');
  titleRow.appendChild(el('h1', 'lobby-title', '플레이어 2/6'));
  titleRow.appendChild(el('span', 'prototype-notice', activePreset ? `${activePreset} 색상만 강조 중 · 선택 인원은 그대로` : '색상 강조 꺼짐'));
  if (variant === 'B') titleRow.appendChild(buildPresetControls(variant));
  main.appendChild(titleRow);
  if (variant === 'A') main.appendChild(buildPresetControls(variant));

  const grid = el('div', 'lobby-player-grid prototype-player-grid');
  const highlightIndices = activePreset ? COLOR_PRESETS[activePreset].paletteMap : [];
  COLOR_PALETTE.forEach((color, index) => {
    const selected = index === 0 || index === 6;
    const highlighted = highlightIndices.includes(index);
    const tile = el('div', `lobby-player${selected ? ' selected mine' : ''}${highlighted ? ' preset-highlighted' : ''}`);
    tile.style.setProperty('--player-color', color.hex);
    const select = el('button', 'lobby-player-select');
    select.type = 'button';
    const meeple = el('span', 'lobby-meeple');
    meeple.innerHTML = '<svg viewBox="0 0 512 512"><path fill="currentColor" d="M256 55c-40 0-70 34-72 83-63 31-145 64-145 102 0 22 45 36 90 41-35 60-90 111-90 151 0 21 4 25 25 25h112c16 0 18-8 33-37 17-34 37-59 47-59s30 25 47 59c15 29 17 37 33 37h112c21 0 25-4 25-25 0-40-55-91-90-151 45-5 90-19 90-41 0-38-82-71-145-102-2-49-32-83-72-83z"/></svg>';
    select.append(meeple, el('span', 'lobby-owner', selected ? '나' : '선택 가능'));
    tile.append(select, Object.assign(el('input', 'lobby-player-name'), { value: color.name, disabled: !selected }));
    grid.appendChild(tile);
  });
  main.appendChild(grid);

  const footer = el('div', 'lobby-footer prototype-footer');
  footer.appendChild(el('div', 'lobby-config', '타이머 방식 · 플레이 시간 누적'));
  if (variant === 'C') footer.appendChild(buildPresetControls(variant));
  footer.append(el('button', 'btn-secondary', '준비 완료'), Object.assign(el('button', 'btn-primary', '게임 시작'), { disabled: true }));
  main.appendChild(footer);
  wrap.append(side, main);
  return wrap;
}

function buildGlobalBar() {
  const bar = el('div', 'global-bar prototype-global-bar');
  const sound = el('button', '', '🔊');
  sound.type = 'button';
  sound.setAttribute('aria-label', '음소거');
  const fullscreen = el('button', '', '⛶');
  fullscreen.type = 'button';
  fullscreen.setAttribute('aria-label', '전체 화면');
  bar.append(sound, fullscreen);
  return bar;
}

function buildSwitcher(variant) {
  const keys = Object.keys(VARIANTS);
  const index = keys.indexOf(variant);
  const bar = el('div', 'prototype-switcher');
  const previous = el('button', '', '←');
  previous.setAttribute('aria-label', '이전 시안');
  previous.addEventListener('click', () => setVariant(keys[(index - 1 + keys.length) % keys.length]));
  const label = el('span', '', `${variant} · ${VARIANTS[variant]}`);
  const next = el('button', '', '→');
  next.setAttribute('aria-label', '다음 시안');
  next.addEventListener('click', () => setVariant(keys[(index + 1) % keys.length]));
  bar.append(previous, label, next);
  return bar;
}

export function renderColorPresetPrototype(container) {
  const variant = currentVariant();
  container.innerHTML = '';
  container.append(buildLobby(variant), buildGlobalBar(), buildSwitcher(variant));
  document.onkeydown = (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.target.matches('input, textarea, [contenteditable]')) return;
    const keys = Object.keys(VARIANTS);
    const index = keys.indexOf(variant);
    setVariant(keys[(index + (event.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length]);
  };
}
