const State = { IDLE: 'idle', PLAYER: 'player', REFEREE: 'referee' };

export function createGame(settings) {
  const { playerCount, players, turnTime, reserveTime, penaltyTime } = settings;

  const playerStates = [];
  for (let i = 0; i < playerCount; i++) {
    playerStates.push({
      name: players[i].name,
      color: players[i].color,
      turnTimeRemaining: turnTime * 1000,
      reserveTimeRemaining: reserveTime * 1000,
      penaltyCount: 0,
      totalTimeUsed: 0,
      turnCount: 0,
      phase: 'turn', // 'turn' | 'reserve'
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
    config: { turnTime: turnTime * 1000, reserveTime: reserveTime * 1000, penaltyTime: penaltyTime * 1000 },
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
    const now = Date.now() - game.gameStartTime;
    game.turnLog.push({ type, player, startMs: now, endMs: null });
  }

  function closeTurn() {
    const last = game.turnLog[game.turnLog.length - 1];
    if (last && last.endMs === null) {
      last.endMs = Date.now() - game.gameStartTime;
    }
  }

  function tick() {
    const now = Date.now();
    const elapsed = now - game.lastTickTime;
    game.lastTickTime = now;

    if (game.state === State.PLAYER) {
      const p = game.playerStates[game.activePlayer];
      p.totalTimeUsed += elapsed;

      if (p.phase === 'turn') {
        p.turnTimeRemaining -= elapsed;
        if (p.turnTimeRemaining <= 0) {
          const overflow = -p.turnTimeRemaining;
          p.turnTimeRemaining = 0;
          p.phase = 'reserve';
          p.reserveTimeRemaining -= overflow;
          emit('enterReserve', { player: game.activePlayer });
        }
      } else {
        p.reserveTimeRemaining -= elapsed;

        // TTS warning at 5 min remaining
        if (!game._fiveMinWarned.has(game.activePlayer) && p.reserveTimeRemaining <= 5 * 60 * 1000 && p.reserveTimeRemaining > 0) {
          game._fiveMinWarned.add(game.activePlayer);
          emit('reserveFiveMin', { player: game.activePlayer });
        }

        // 30% warning
        const threshold = game.config.reserveTime * 0.3;
        if (p.reserveTimeRemaining <= threshold && p.reserveTimeRemaining + elapsed > threshold) {
          emit('reserveWarning', { player: game.activePlayer });
        }

        if (p.reserveTimeRemaining <= 0) {
          p.penaltyCount++;
          p.reserveTimeRemaining = game.config.penaltyTime + p.reserveTimeRemaining;
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
    game.lastTickTime = Date.now();
    game.intervalId = setInterval(tick, 100);
  }

  function stopTicking() {
    if (game.intervalId) {
      clearInterval(game.intervalId);
      game.intervalId = null;
    }
  }

  game.tapPlayer = (index) => {
    if (index < 0 || index >= playerCount) return;

    if (!game.gameStartTime) {
      game.gameStartTime = Date.now();
    }

    if (game.state === State.IDLE) {
      game.activePlayer = index;
      game.state = State.PLAYER;
      game.playerStates[index].turnCount++;
      openTurn('player', index);
      startTicking();
      emit('playerStart', { player: index });
    } else if (game.state === State.PLAYER && game.activePlayer === index) {
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

  game.pause = () => {
    if (game.state === State.IDLE) return;
    // do a final tick to capture time up to this moment
    tick();
    closeTurn();
    stopTicking();
    const prevState = game.state;
    const prevPlayer = game.activePlayer;
    game.state = State.IDLE;
    emit('pause', { prevState, prevPlayer });
  };

  game.resume = (prevState, prevPlayer) => {
    if (game.state !== State.IDLE || !game.gameStartTime) return;
    game.state = prevState;
    game.activePlayer = prevPlayer;
    openTurn(prevState, prevPlayer);
    startTicking();
    emit('resume', {});
  };

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
      p.reserveTimeRemaining = game.config.reserveTime;
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
    game.gameEndTime = Date.now();
    game.state = State.IDLE;

    const totalPlayTime = game.gameEndTime - (game.gameStartTime || game.gameEndTime);
    const stats = {
      totalPlayTime,
      turnLog: game.turnLog.map(e => ({ ...e })),
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
  document.addEventListener('visibilitychange', onVisibilityChange);

  return game;
}
