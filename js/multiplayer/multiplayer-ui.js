import { COLOR_PALETTE } from '../settings.js';
import { formatRoomCode } from './room-code.js';
import { canStartGame, getSelectedPlayers, isParticipantPresent } from './room-state.js';
import { renderQrCode } from './qr-code.js';

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderModeSwitch(mode, onChange) {
  const control = el('div', 'mode-switch');
  for (const [value, label] of [['single', '싱글'], ['multi', '멀티']]) {
    const button = el('button', `mode-switch-btn${mode === value ? ' active' : ''}`, label);
    button.type = 'button';
    button.addEventListener('click', () => onChange(value));
    control.appendChild(button);
  }
  return control;
}

export function renderMultiplayerEntryScreen(container, state, callbacks) {
  container.innerHTML = '';
  const wrap = el('div', 'multi-entry-wrap');
  const header = el('div', 'multi-entry-header');
  header.append(
    el('h1', 'settings-title', 'Board Game Timer'),
    renderModeSwitch('multi', callbacks.setMode),
  );
  wrap.appendChild(header);

  const actions = el('div', 'multi-entry-actions');
  const createSection = el('section', 'multi-entry-section');
  createSection.appendChild(el('h2', 'multi-entry-title', '새 게임'));
  createSection.appendChild(el('p', 'multi-entry-copy', '방을 만들고 QR 코드로 함께 접속하세요.'));
  const createButton = el('button', 'btn-primary', state.loading ? '방 만드는 중...' : '방 만들기');
  createButton.disabled = state.loading;
  createButton.addEventListener('click', callbacks.createRoom);
  createSection.appendChild(createButton);

  const joinSection = el('section', 'multi-entry-section');
  joinSection.appendChild(el('h2', 'multi-entry-title', '방 참가'));
  const input = el('input', 'room-code-input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.autocomplete = 'one-time-code';
  input.maxLength = 7;
  input.placeholder = '000 000';
  input.value = state.code || '';
  input.addEventListener('input', () => {
    const digits = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits;
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') callbacks.joinRoom(input.value);
  });
  const joinButton = el('button', 'btn-primary', state.loading ? '참가 중...' : '참가');
  joinButton.disabled = state.loading;
  joinButton.addEventListener('click', () => callbacks.joinRoom(input.value));
  joinSection.append(input, joinButton);

  actions.append(createSection, joinSection);
  wrap.appendChild(actions);
  if (state.error) wrap.appendChild(el('div', 'multi-error', state.error));
  container.appendChild(wrap);
}

function participantLabel(room, uid, selfUid) {
  if (uid === selfUid) return '나';
  if (uid === room.hostUid) return '방장';
  return `게스트 ${uid.slice(0, 4)}`;
}

function ownerLabel(room, ownerUid, selfUid) {
  if (!ownerUid) return '선택 가능';
  return participantLabel(room, ownerUid, selfUid);
}

export function renderLobbyScreen(container, room, context, callbacks) {
  container.innerHTML = '';
  const wrap = el('div', 'lobby-wrap');
  const left = el('section', 'lobby-side');
  const right = el('section', 'lobby-main');

  left.appendChild(el('div', 'lobby-kicker', '방 코드'));
  left.appendChild(el('div', 'lobby-code', formatRoomCode(room.code)));
  const qrTarget = el('div', 'lobby-qr');
  const joinUrl = new URL(location.href);
  joinUrl.search = '';
  joinUrl.searchParams.set('r', room.code);
  renderQrCode(qrTarget, joinUrl.toString());
  left.appendChild(qrTarget);

  const presentParticipants = Object.entries(room.participants || {})
    .filter(([, participant]) => isParticipantPresent(participant, context.now));
  left.appendChild(el('h2', 'lobby-heading', `접속 ${presentParticipants.length}대`));
  const participantList = el('div', 'participant-list');
  for (const [uid, participant] of presentParticipants) {
    const row = el('div', 'participant-row');
    row.appendChild(el('span', 'connection-dot online'));
    row.appendChild(el('span', 'participant-name', participantLabel(room, uid, context.uid)));
    row.appendChild(el('span', `ready-state${participant.ready ? ' ready' : ''}`, participant.ready ? '준비' : '선택 중'));
    participantList.appendChild(row);
  }
  left.appendChild(participantList);

  const titleRow = el('div', 'lobby-title-row');
  titleRow.appendChild(el('h1', 'lobby-title', `플레이어 ${getSelectedPlayers(room).length}/6`));
  if (context.error) titleRow.appendChild(el('span', 'multi-error inline', context.error));
  right.appendChild(titleRow);

  const playerGrid = el('div', 'lobby-player-grid');
  for (const [playerId, player] of Object.entries(room.players || {})) {
    const isMine = player.ownerUid === context.uid;
    const isSelected = Boolean(player.ownerUid);
    const ownerConnected = !player.ownerUid
      || isParticipantPresent(room.participants?.[player.ownerUid], context.now);
    const tile = el('div', `lobby-player${isSelected ? ' selected' : ''}${isMine ? ' mine' : ''}${ownerConnected ? '' : ' disconnected'}`);
    tile.style.setProperty('--player-color', player.color || COLOR_PALETTE[player.paletteIndex]?.hex);

    const selectButton = el('button', 'lobby-player-select');
    selectButton.type = 'button';
    selectButton.disabled = context.self?.ready || (isSelected && !isMine && !context.isHost);
    const meeple = el('span', 'lobby-meeple');
    meeple.innerHTML = '<svg viewBox="0 0 512 512"><path fill="currentColor" d="M256 55c-40 0-70 34-72 83-63 31-145 64-145 102 0 22 45 36 90 41-35 60-90 111-90 151 0 21 4 25 25 25h112c16 0 18-8 33-37 17-34 37-59 47-59s30 25 47 59c15 29 17 37 33 37h112c21 0 25-4 25-25 0-40-55-91-90-151 45-5 90-19 90-41 0-38-82-71-145-102-2-49-32-83-72-83z"/></svg>';
    selectButton.appendChild(meeple);
    selectButton.appendChild(el('span', 'lobby-owner', ownerLabel(room, player.ownerUid, context.uid)));
    selectButton.addEventListener('click', () => callbacks.togglePlayer(playerId, isMine ? null : context.uid));
    tile.appendChild(selectButton);

    const nameInput = el('input', 'lobby-player-name');
    nameInput.type = 'text';
    nameInput.maxLength = 24;
    nameInput.value = player.name;
    nameInput.disabled = !isSelected || context.self?.ready || (!isMine && !context.isHost);
    nameInput.addEventListener('change', () => callbacks.renamePlayer(playerId, nameInput.value));
    tile.appendChild(nameInput);
    playerGrid.appendChild(tile);
  }
  right.appendChild(playerGrid);

  const footer = el('div', 'lobby-footer');
  const config = el('div', 'lobby-config');
  config.appendChild(el('span', '', `메인 ${Math.round(room.config.mainTimeMs / 60000)}분`));
  config.appendChild(el('span', '', `딜레이 ${Math.round(room.config.turnTimeMs / 1000)}초`));
  config.appendChild(el('span', '', `추가 ${Math.round(room.config.penaltyTimeMs / 60000)}분`));
  footer.appendChild(config);

  const readyButton = el('button', 'btn-secondary', context.self?.ready ? '준비 취소' : '준비 완료');
  readyButton.addEventListener('click', () => callbacks.setReady(!context.self?.ready));
  footer.appendChild(readyButton);

  if (context.isHost) {
    const startButton = el('button', 'btn-primary', '게임 시작');
    startButton.disabled = !canStartGame(room, context.now);
    startButton.addEventListener('click', callbacks.startGame);
    footer.appendChild(startButton);
  }
  right.appendChild(footer);

  wrap.append(left, right);
  container.appendChild(wrap);
}
