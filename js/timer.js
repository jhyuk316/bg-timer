const State = { IDLE: 'idle', PLAYER: 'player', REFEREE: 'referee' };

export function createGame(settings, dependencies = {}) {
  const { playerCount, players, turnTime, mainTime, penaltyTime } = settings;
  const now = dependencies.now || Date.now;
  const setIntervalFn = dependencies.setIntervalFn || setInterval;
  const clearIntervalFn = dependencies.clearIntervalFn || clearInterval;

  const playerStates = [];
  for (let i = 0; i < playerCount; i++) {
    playerStates.push({
      name: players[i].name,
      color: players[i].color,
      turnTimeRemaining: turnTime * 1000,
      mainTimeRemaining: mainTime * 1000,
      penaltyCount: 0,
      totalTimeUsed: 0,
      turnCount: 0,
      phase: 'turn', // 'turn' | 'main'
    });
  }

  const game = {
    state: State.IDLE,
    activePlayer: -1,
    playerStates,
    referee: { currentLapTime: 0, totalTime: 0, turnCount: 0 },
    gameStartTime: null,
    gameEndTime: null,
    lastTickTime: null,
    intervalId: null,
    config: { turnTime: turnTime * 1000, mainTime: mainTime * 1000, penaltyTime: penaltyTime * 1000 },
    turnLog: [],
    _tickCallbacks: [],
    _eventCallbacks: [],
    _fiveMinWarned: new Set(),
  };

  game.onTick = (cb) => game._tickCallbacks.push(cb);
  game.onEvent = (cb) => game._eventCallbacks.push(cb);

  function emit(event, data) {
    for (const cb of game._eventCallbacks) cb(event, data);
  }

  function openTurn(type, player) {
    const elapsed = now() - game.gameStartTime;
    game.turnLog.push({ type, player, startMs: elapsed, endMs: null });
  }

  function closeTurn() {
    const last = game.turnLog[game.turnLog.length - 1];
    if (last && last.endMs === null) {
      last.endMs = now() - game.gameStartTime;
    }
  }

  function tick() {
    const currentTime = now();
    const elapsed = currentTime - game.lastTickTime;
    game.lastTickTime = currentTime;

    if (game.state === State.PLAYER) {
      const p = game.playerStates[game.activePlayer];
      p.totalTimeUsed += elapsed;

      if (p.phase === 'turn') {
        p.turnTimeRemaining -= elapsed;
        if (p.turnTimeRemaining <= 0) {
          const overflow = -p.turnTimeRemaining;
          p.turnTimeRemaining = 0;
          p.phase = 'main';
          p.mainTimeRemaining -= overflow;
          emit('enterMain', { player: game.activePlayer });
        }
      } else {
        p.mainTimeRemaining -= elapsed;

        // TTS warning at 5 min remaining
        if (!game._fiveMinWarned.has(game.activePlayer) && p.mainTimeRemaining <= 5 * 60 * 1000 && p.mainTimeRemaining > 0) {
          game._fiveMinWarned.add(game.activePlayer);
          emit('mainFiveMin', { player: game.activePlayer });
        }

        // 30% warning
        const threshold = game.config.mainTime * 0.3;
        if (p.mainTimeRemaining <= threshold && p.mainTimeRemaining + elapsed > threshold) {
          emit('mainWarning', { player: game.activePlayer });
        }

        if (p.mainTimeRemaining <= 0) {
          p.penaltyCount++;
          p.mainTimeRemaining = game.config.penaltyTime + p.mainTimeRemaining;
          emit('penalty', { player: game.activePlayer, count: p.penaltyCount });
        }
      }
    } else if (game.state === State.REFEREE) {
      game.referee.currentLapTime += elapsed;
      game.referee.totalTime += elapsed;
    }

    for (const cb of game._tickCallbacks) cb(game);
  }

  function startTicking() {
    if (game.intervalId) return;
    game.lastTickTime = now();
    game.intervalId = setIntervalFn(tick, 100);
  }

  function stopTicking() {
    if (game.intervalId) {
      clearIntervalFn(game.intervalId);
      game.intervalId = null;
    }
  }

  game.start = () => {
    if (game.gameStartTime) return;
    game.gameStartTime = now();
    game.state = State.REFEREE;
    game.activePlayer = -1;
    game.referee.currentLapTime = 0;
    game.referee.turnCount++;
    openTurn('referee', -1);
    startTicking();
    emit('refereeStart', {});
  };

  game.tapPlayer = (index) => {
    if (index < 0 || index >= playerCount) return;

    if (!game.gameStartTime) {
      game.start();
    }

    tick();

    if (game.state === State.PLAYER && game.activePlayer === index) {
      // Same player tap → stop player, start referee
      closeTurn();
      endPlayerTurn(game.activePlayer);
      game.state = State.REFEREE;
      game.activePlayer = -1;
      game.referee.currentLapTime = 0;
      game.referee.turnCount++;
      openTurn('referee', -1);
      emit('refereeStart', {});
    } else if (game.state === State.PLAYER && game.activePlayer !== index) {
      // Different player tap → direct switch
      closeTurn();
      const prev = game.activePlayer;
      endPlayerTurn(prev);
      game.activePlayer = index;
      game.playerStates[index].turnCount++;
      openTurn('player', index);
      emit('playerSwitch', { from: prev, to: index });
    } else if (game.state === State.REFEREE) {
      closeTurn();
      game.state = State.PLAYER;
      game.activePlayer = index;
      game.playerStates[index].turnCount++;
      openTurn('player', index);
      game.referee.currentLapTime = 0;
      emit('playerStart', { player: index });
    }
  };

  function endPlayerTurn(index) {
    const p = game.playerStates[index];
    p.turnTimeRemaining = game.config.turnTime;
    p.phase = 'turn';
  }

  game.reset = () => {
    stopTicking();
    game.state = State.IDLE;
    game.activePlayer = -1;
    game.gameStartTime = null;
    game.gameEndTime = null;
    game.turnLog = [];
    game._fiveMinWarned.clear();
    game.referee = { currentLapTime: 0, totalTime: 0, turnCount: 0 };
    for (const p of game.playerStates) {
      p.turnTimeRemaining = game.config.turnTime;
      p.mainTimeRemaining = game.config.mainTime;
      p.penaltyCount = 0;
      p.totalTimeUsed = 0;
      p.turnCount = 0;
      p.phase = 'turn';
    }
    emit('reset', {});
  };

  game.end = () => {
    if (game.state !== State.IDLE && game.intervalId) {
      tick();
    }
    closeTurn();
    stopTicking();
    game.gameEndTime = now();
    game.state = State.IDLE;

    const totalActiveTime = game.playerStates.reduce((sum, p) => sum + p.totalTimeUsed, 0) + game.referee.totalTime;
    // Compress turn log: remove pause gaps so entries are contiguous
    const compressedLog = [];
    let offset = 0;
    let prevEnd = 0;
    for (const e of game.turnLog) {
      if (e.endMs == null) continue;
      const gap = e.startMs - prevEnd;
      offset += gap;
      compressedLog.push({ ...e, startMs: e.startMs - offset, endMs: e.endMs - offset });
      prevEnd = e.endMs;
    }
    const stats = {
      totalPlayTime: totalActiveTime,
      turnLog: compressedLog,
      players: game.playerStates.map((p, i) => ({
        name: p.name,
        color: p.color,
        totalTime: p.totalTimeUsed,
        turnCount: p.turnCount,
        penaltyCount: p.penaltyCount,
      })),
      referee: {
        totalTime: game.referee.totalTime,
        turnCount: game.referee.turnCount,
      },
    };
    emit('gameEnd', stats);
    return stats;
  };

  game.getState = () => ({
    state: game.state,
    activePlayer: game.activePlayer,
    playerStates: game.playerStates,
    referee: game.referee,
    gameStartTime: game.gameStartTime,
    totalActiveTime: game.playerStates.reduce((sum, p) => sum + p.totalTimeUsed, 0) + game.referee.totalTime,
  });

  // Handle visibility change for background accuracy
  function onVisibilityChange() {
    if (document.hidden) return;
    if (game.intervalId) {
      // Tab came back - the next tick() will use Date.now() and catch up
      game.lastTickTime = game.lastTickTime; // no-op, tick() handles it
    }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  return game;
}
