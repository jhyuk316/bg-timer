import { firebaseConfig } from '../../js/multiplayer/firebase-config.js';

if (process.env.BG_TIMER_LIVE_RULES !== '1') {
  throw new Error('Set BG_TIMER_LIVE_RULES=1 to run against the configured Firebase project.');
}

const databaseUrl = firebaseConfig.databaseURL.replace(/\/$/, '');
const roomId = `qa_${Date.now()}_rules`;
const code = String(Math.floor(100000 + Math.random() * 900000));
const results = [];

async function anonymousUser() {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    },
  );
  const user = await response.json();
  if (!response.ok) throw new Error(`Anonymous sign-in failed: ${JSON.stringify(user)}`);
  return { uid: user.localId, token: user.idToken };
}

async function databaseRequest(path, method = 'GET', user = null, value) {
  const url = new URL(`${databaseUrl}/${path}.json`);
  if (user) url.searchParams.set('auth', user.token);
  const response = await fetch(url, {
    method,
    headers: value === undefined ? undefined : { 'content-type': 'application/json' },
    body: value === undefined ? undefined : JSON.stringify(value),
  });
  return { ok: response.ok, status: response.status, body: await response.text() };
}

async function check(name, expected, path, method, user, value) {
  const result = await databaseRequest(path, method, user, value);
  const passed = result.ok === expected;
  results.push({ name, passed, status: result.status });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name} (${result.status})`);
  if (!passed) throw new Error(`${name}: ${result.body.slice(0, 300)}`);
}

function participant(role) {
  const at = Date.now();
  return { role, ready: false, connected: true, joinedAt: at, lastSeenAt: at };
}

function appendEvent(game, { type, actorUid, playerId, activeType, status = 'running' }) {
  const revision = game.revision + 1;
  const at = Date.now();
  const event = { revision, type, actorUid, at };
  if (playerId) event.playerId = playerId;
  const next = {
    ...game,
    revision,
    status,
    activeType,
    changedAt: at,
    events: { ...game.events, [`r${revision}`]: event },
  };
  if (activeType === 'player') next.activePlayerId = playerId;
  else delete next.activePlayerId;
  if (status === 'ended') next.endedAt = at;
  return next;
}

let host;
let roomCreated = false;
let codeCreated = false;

try {
  const [h, guest, otherGuest, outsider] = await Promise.all([
    anonymousUser(), anonymousUser(), anonymousUser(), anonymousUser(),
  ]);
  host = h;

  const config = { turnTimeMs: 20000, mainTimeMs: 2400000, penaltyTimeMs: 300000 };
  const colors = ['#d95656', '#db9554', '#d4af54', '#58a571', '#57a4a1', '#65a8c2'];
  const players = Object.fromEntries(colors.map((color, index) => [
    `p${index}`,
    { name: `Player ${index + 1}`, color, paletteIndex: index },
  ]));
  const roomPath = `rooms/${roomId}`;
  const gamePath = `${roomPath}/game`;

  await check('anonymous cannot read room code', false, `roomCodes/${code}`, 'GET');
  await check('host UID must match room creator', false, `rooms/${roomId}_bad`, 'PUT', guest, {
    hostUid: host.uid, status: 'lobby', createdAt: Date.now(), config, players,
  });
  await check('host creates room', true, roomPath, 'PUT', host, {
    hostUid: host.uid, status: 'lobby', createdAt: Date.now(), config, players,
  });
  roomCreated = true;
  await check('host joins own room', true, `${roomPath}/participants/${host.uid}`, 'PUT', host, participant('host'));
  await check('host claims room code', true, `roomCodes/${code}`, 'PUT', host, {
    roomId, createdAt: Date.now(),
  });
  codeCreated = true;
  await check('authenticated guest resolves room code', true, `roomCodes/${code}`, 'GET', guest);
  await check('unknown player field is rejected', false, `${roomPath}/players/p0`, 'PATCH', host, { unexpected: true });
  await check('guest joins self in lobby', true, `${roomPath}/participants/${guest.uid}`, 'PUT', guest, participant('guest'));
  await check('guest cannot write another participant', false, `${roomPath}/participants/${outsider.uid}`, 'PUT', guest, participant('guest'));
  await check('outsider cannot read room', false, roomPath, 'GET', outsider);
  await check('guest cannot change config', false, `${roomPath}/config`, 'PATCH', guest, { mainTimeMs: 120000 });
  await check('host changes config', true, `${roomPath}/config`, 'PATCH', host, { mainTimeMs: 1800000 });
  await check('host claims player', true, `${roomPath}/players/p0`, 'PATCH', host, { ownerUid: host.uid });
  await check('guest claims empty player', true, `${roomPath}/players/p1`, 'PATCH', guest, { ownerUid: guest.uid });
  await check('second guest joins', true, `${roomPath}/participants/${otherGuest.uid}`, 'PUT', otherGuest, participant('guest'));
  await check('second guest claims player', true, `${roomPath}/players/p2`, 'PATCH', otherGuest, { ownerUid: otherGuest.uid });
  await check('guest cannot take another guest player', false, `${roomPath}/players/p2`, 'PATCH', guest, { ownerUid: guest.uid });
  await check('guest cannot start room', false, `${roomPath}/status`, 'PUT', guest, 'playing');

  const startedAt = Date.now();
  const game1 = {
    revision: 1,
    status: 'running',
    activeType: 'referee',
    changedAt: startedAt,
    startedAt,
    events: { r1: { revision: 1, type: 'start', actorUid: host.uid, at: startedAt } },
  };
  await check('host starts game', true, roomPath, 'PATCH', host, { status: 'playing', game: game1 });
  const game2 = appendEvent(game1, { type: 'turn', actorUid: guest.uid, playerId: 'p0', activeType: 'player' });
  await check('guest switches host-owned player and preserves start event', true, gamePath, 'PUT', guest, game2);
  const game3 = appendEvent(game2, { type: 'referee', actorUid: guest.uid, activeType: 'referee' });
  await check('guest returns to operational time', true, gamePath, 'PUT', guest, game3);

  const nextTurn = () => appendEvent(game3, {
    type: 'turn', actorUid: host.uid, playerId: 'p0', activeType: 'player',
  });
  const rewritten = nextTurn();
  rewritten.events.r1 = { ...rewritten.events.r1, at: rewritten.events.r1.at + 1 };
  await check('existing event cannot be rewritten', false, gamePath, 'PUT', host, rewritten);
  const unknownField = nextTurn();
  unknownField.events.r4.unexpected = true;
  await check('unknown event field is rejected', false, gamePath, 'PUT', host, unknownField);
  const unclaimed = appendEvent(game3, {
    type: 'turn', actorUid: host.uid, playerId: 'p5', activeType: 'player',
  });
  await check('turn cannot target unclaimed player', false, gamePath, 'PUT', host, unclaimed);
  const changedStart = nextTurn();
  changedStart.startedAt += 1;
  await check('started time cannot change', false, gamePath, 'PUT', host, changedStart);
  const skipped = nextTurn();
  skipped.revision = 5;
  await check('revision skip is rejected', false, gamePath, 'PUT', host, skipped);
  await check('outsider cannot change game', false, gamePath, 'PUT', outsider, nextTurn());
  const guestEnd = appendEvent(game3, {
    type: 'end', actorUid: guest.uid, activeType: 'ended', status: 'ended',
  });
  await check('guest cannot end game', false, gamePath, 'PUT', guest, guestEnd);
  const hostEnd = appendEvent(game3, {
    type: 'end', actorUid: host.uid, activeType: 'ended', status: 'ended',
  });
  await check('host ends game', true, gamePath, 'PUT', host, hostEnd);
  await check('host closes room', true, `${roomPath}/status`, 'PUT', host, 'ended');
} finally {
  if (host && codeCreated) {
    await databaseRequest(`roomCodes/${code}`, 'DELETE', host).catch(() => {});
  }
  if (host && roomCreated) {
    await databaseRequest(`rooms/${roomId}/status`, 'PUT', host, 'ended').catch(() => {});
  }
  console.log(`Verified ${results.filter((result) => result.passed).length}/${results.length} live rule cases.`);
}
