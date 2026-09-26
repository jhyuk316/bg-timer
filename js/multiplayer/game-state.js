function eventKey(revision) {
  return `r${revision}`;
}

function appendEvent(game, event, changes) {
  const revision = game.revision + 1;
  return {
    ...game,
    ...changes,
    revision,
    changedAt: event.at,
    events: {
      ...game.events,
      [eventKey(revision)]: { ...event, revision },
    },
  };
}

function assertTransition(game, at) {
  if (!game || game.status !== 'running') throw new Error('진행 중인 게임이 아닙니다.');
  if (!Number.isFinite(at) || at < game.changedAt) throw new Error('이벤트 시간이 이전 상태보다 빠릅니다.');
}

export function createInitialGame(startedAt, actorUid) {
  const event = {
    revision: 1,
    type: 'start',
    actorUid,
    at: startedAt,
  };
  return {
    revision: 1,
    status: 'running',
    activeType: 'referee',
    activePlayerId: null,
    changedAt: startedAt,
    startedAt,
    endedAt: null,
    events: { r1: event },
  };
}

export function createTurnEvent(game, playerId, actorUid, at) {
  assertTransition(game, at);
  if (game.activeType === 'player' && game.activePlayerId === playerId) {
    return createOperationalEvent(game, actorUid, at);
  }
  return appendEvent(game, {
    type: 'turn',
    actorUid,
    playerId,
    at,
  }, {
    activeType: 'player',
    activePlayerId: playerId,
  });
}

export function createOperationalEvent(game, actorUid, at) {
  assertTransition(game, at);
  return appendEvent(game, {
    type: 'referee',
    actorUid,
    at,
  }, {
    activeType: 'referee',
    activePlayerId: null,
  });
}

export function createEndEvent(game, actorUid, at) {
  assertTransition(game, at);
  return appendEvent(game, {
    type: 'end',
    actorUid,
    at,
  }, {
    status: 'ended',
    activeType: 'ended',
    activePlayerId: null,
    endedAt: at,
  });
}

function orderedEvents(game) {
  const byRevision = new Map();
  for (const event of Object.values(game?.events || {})) {
    if (!Number.isInteger(event?.revision) || byRevision.has(event.revision)) continue;
    byRevision.set(event.revision, event);
  }
  return [...byRevision.values()].sort((a, b) => a.revision - b.revision);
}

function selectedPlayers(room) {
  return Object.entries(room.players || {})
    .filter(([, player]) => Boolean(player.ownerUid))
    .sort(([, a], [, b]) => a.paletteIndex - b.paletteIndex);
}

function consumePlayerTime(state, duration, config) {
  state.totalTimeUsed += duration;
  const mainUsed = Math.max(0, duration - config.turnTimeMs);
  if (mainUsed === 0) return;

  state.mainTimeRemaining -= mainUsed;
  while (state.mainTimeRemaining <= 0) {
    state.penaltyCount++;
    state.mainTimeRemaining += config.penaltyTimeMs;
  }
}

export function deriveGameView(room, serverNow) {
  const game = room.game;
  const events = orderedEvents(game);
  const effectiveNow = game.status === 'ended' ? game.endedAt : Math.max(serverNow, game.changedAt);
  const config = room.config;
  const entries = selectedPlayers(room);
  const playerById = new Map();
  const players = entries.map(([id, player]) => {
    const state = {
      id,
      ...player,
      turnTimeRemaining: config.turnTimeMs,
      mainTimeRemaining: config.mainTimeMs,
      penaltyCount: 0,
      totalTimeUsed: 0,
      turnCount: 0,
      phase: 'turn',
    };
    playerById.set(id, state);
    return state;
  });

  const referee = { currentLapTime: 0, totalTime: 0, turnCount: 0 };
  const turnLog = [];

  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    if (event.type === 'end') break;
    const next = events[index + 1];
    const endAt = next ? next.at : effectiveNow;
    const duration = Math.max(0, endAt - event.at);

    if (event.type === 'turn') {
      const player = playerById.get(event.playerId);
      if (!player) continue;
      player.turnCount++;
      consumePlayerTime(player, duration, config);
      turnLog.push({ type: 'player', playerId: event.playerId, startAt: event.at, endAt });

      if (!next && game.status === 'running') {
        player.turnTimeRemaining = Math.max(0, config.turnTimeMs - duration);
        player.phase = duration < config.turnTimeMs ? 'turn' : 'main';
      }
    } else if (event.type === 'start' || event.type === 'referee') {
      referee.turnCount++;
      referee.totalTime += duration;
      if (!next && game.status === 'running') referee.currentLapTime = duration;
      turnLog.push({ type: 'referee', playerId: null, startAt: event.at, endAt });
    }
  }

  return {
    status: game.status,
    activeType: game.activeType,
    activePlayerId: game.activePlayerId,
    revision: game.revision,
    startedAt: game.startedAt,
    endedAt: game.endedAt,
    players,
    referee,
    turnLog,
    totalActiveTime: Math.max(0, effectiveNow - game.startedAt),
  };
}

export function buildMultiplayerStats(room) {
  const view = deriveGameView(room, room.game.endedAt);
  const indexById = new Map(view.players.map((player, index) => [player.id, index]));
  return {
    totalPlayTime: view.totalActiveTime,
    turnLog: view.turnLog.map((entry) => ({
      type: entry.type,
      player: entry.type === 'player' ? indexById.get(entry.playerId) : -1,
      startMs: entry.startAt - view.startedAt,
      endMs: entry.endAt - view.startedAt,
    })),
    players: view.players.map((player) => ({
      name: player.name,
      color: player.color,
      totalTime: player.totalTimeUsed,
      turnCount: player.turnCount,
      penaltyCount: player.penaltyCount,
    })),
    referee: {
      totalTime: view.referee.totalTime,
      turnCount: view.referee.turnCount,
    },
  };
}
