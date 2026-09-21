import { ROOM_CODE_LENGTH } from './constants.js';

const ROOM_CODE_LIMIT = 10 ** ROOM_CODE_LENGTH;

export function generateRoomCode(random = Math.random) {
  const value = Math.min(Math.floor(random() * ROOM_CODE_LIMIT), ROOM_CODE_LIMIT - 1);
  return String(value).padStart(ROOM_CODE_LENGTH, '0');
}

export function normalizeRoomCode(input) {
  if (typeof input !== 'string') return null;
  const code = input.replace(/\s/g, '');
  return /^\d{6}$/.test(code) ? code : null;
}

export function formatRoomCode(code) {
  const normalized = normalizeRoomCode(code);
  return normalized ? `${normalized.slice(0, 3)} ${normalized.slice(3)}` : '';
}
