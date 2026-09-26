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

export async function claimAvailableRoomCode(claim, random = Math.random, maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateRoomCode(random);
    if (await claim(code)) return code;
  }
  throw new Error('사용 가능한 방 코드를 만들지 못했습니다. 다시 시도해주세요.');
}
