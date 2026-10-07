import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleChangeGameType, handleStartGame, handleEndGame, handleGameAction, handlePlayAgain, handleReturnToLobby, broadcastGameState, registerGameHandlers } from './gameHandlers.js';
import { clearRooms, _addRoomForTest, getRoomById } from '../../state/rooms.js';
import { clearSessions, createPendingSession, createSession, clearPendingSessions } from '../../state/sessions.js';
import { setOtp, clearOtp } from '../../state/otp.js';
import { clearGames, getGame, createGame, setPaused } from '../../state/games.js';
import { registerEngine, clearEngines } from '../../games/engine.js';
import { stubEngine } from '../../games/stubEngine.js';
import { blackjackEngine } from '../../games/blackjack/index.js';
import { GameType } from '@cardpal/shared';
import type { Room } from '../../state/rooms.js';
import type { AppSocket, AppServer } from '../types.js';

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    name: 'Test Room',
    gameType: GameType.BLACKJACK,
    status: 'lobby',
    ownerId: 'owner-token',
    players: [
      { id: 'owner-token', username: 'Alice', isConnected: true },
      { id: 'player-2', username: 'Bob', isConnected: true },
    ],
    ...overrides,
  };
}

function createMockSocket(data: Partial<AppSocket['data']> = {}, id = 'socket-1') {
  return {
    id,
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    data: { ...data } as AppSocket['data'],
  } as unknown as AppSocket;
}

function createMockServer() {
  const emitsByTarget = new Map<string, ReturnType<typeof vi.fn>>();
  function getEmitForTarget(target: string) {
    if (!emitsByTarget.has(target)) {
      emitsByTarget.set(target, vi.fn());
    }
    return emitsByTarget.get(target)!;
  }
  return {
    emit: vi.fn(),
    to: vi.fn((target: string) => ({ emit: getEmitForTarget(target) })),
    /** Get the emit mock for a specific io.to(target) call */
    _emitFor(target: string) { return getEmitForTarget(target); },
  } as unknown as AppServer & { _emitFor: (target: string) => ReturnType<typeof vi.fn> };
}

function setupOwnerSession() {
  setOtp('A7X-K9M');
  const pending = createPendingSession('A7X-K9M');
  return createSession(pending.id, 'Alice', 'socket-1');
}

function setupPlayerSession(username: string, socketId: string) {
  setOtp('B8Y-L0N');
  const pending = createPendingSession('B8Y-L0N');
  return createSession(pending.id, username, socketId);
}

describe('handleChangeGameType', () => {
  beforeEach(() => {
    clearRooms();
    clearSessions();
    clearPendingSessions();
    clearOtp();
    clearGames();
    clearEngines();
  });

  it('changes game type when called by owner', () => {
    const session = setupOwnerSession();
    _addRoomForTest(makeRoom({ ownerId: session.playerId, players: [{ id: session.playerId, username: 'Alice', isConnected: true }] }));

    const socket = createMockSocket({ session: { ...session, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    handleChangeGameType(socket, io, { gameType: 'skipbo' });

    // Room game type should be updated
    const room = getRoomById('room-1')!;
    expect(room.gameType).toBe(GameType.SKIPBO);

    // Should emit roomState to room
    expect(io.to).toHaveBeenCalledWith('room-1');
    expect(io._emitFor('room-1')).toHaveBeenCalledWith('roomState', expect.objectContaining({ gameType: 'skipbo' }));

    // Should broadcast lobbyState
    expect(io.emit).toHaveBeenCalledWith('lobbyState', expect.any(Object));
  });

  it('emits VALIDATION_ERROR when not in a room', () => {
    const session = setupOwnerSession();
    const socket = createMockSocket({ session: { ...session, roomId: null }, authType: 'token' });
    const io = createMockServer();

    handleChangeGameType(socket, io, { gameType: 'skipbo' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Not in a room',
    });
  });

  it('emits NOT_AUTHORIZED when non-owner tries to change', () => {
    const ownerSession = setupOwnerSession();
    const playerSession = setupPlayerSession('Bob', 'socket-2');
    _addRoomForTest(makeRoom({ ownerId: ownerSession.playerId }));

    const socket = createMockSocket({ session: { ...playerSession, roomId: 'room-1' }, authType: 'token' }, 'socket-2');
    const io = createMockServer();

    handleChangeGameType(socket, io, { gameType: 'skipbo' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'NOT_AUTHORIZED',
      message: 'Only the room owner can change the game type',
    });
  });

  it('emits GAME_IN_PROGRESS when room is playing', () => {
    const session = setupOwnerSession();
    _addRoomForTest(makeRoom({ ownerId: session.playerId, status: 'playing', players: [{ id: session.playerId, username: 'Alice', isConnected: true }] }));

    const socket = createMockSocket({ session: { ...session, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    handleChangeGameType(socket, io, { gameType: 'skipbo' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'GAME_IN_PROGRESS',
      message: 'Cannot change game type during a game',
    });
  });

  it('emits VALIDATION_ERROR for invalid game type', () => {
    const session = setupOwnerSession();
    _addRoomForTest(makeRoom({ ownerId: session.playerId, players: [{ id: session.playerId, username: 'Alice', isConnected: true }] }));

    const socket = createMockSocket({ session: { ...session, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    handleChangeGameType(socket, io, { gameType: 'invalid-game' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Invalid game type',
    });
  });

  it('emits AUTH_ERROR when not authenticated', () => {
    const socket = createMockSocket({});
    const io = createMockServer();

    handleChangeGameType(socket, io, { gameType: 'skipbo' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'AUTH_ERROR',
      message: 'Not authenticated',
    });
  });
});

describe('handleStartGame', () => {
  beforeEach(() => {
    clearRooms();
    clearSessions();
    clearPendingSessions();
    clearOtp();
    clearGames();
    clearEngines();
  });

  it('starts game successfully when all conditions met', () => {
    const ownerSession = setupOwnerSession();
    const playerSession = setupPlayerSession('Bob', 'socket-2');

    _addRoomForTest(makeRoom({
      ownerId: ownerSession.playerId,
      players: [
        { id: ownerSession.playerId, username: 'Alice', isConnected: true },
        { id: playerSession.playerId, username: 'Bob', isConnected: true },
      ],
    }));

    registerEngine(GameType.BLACKJACK, stubEngine);

    const socket = createMockSocket({ session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    handleStartGame(socket, io);

    // Room should be playing
    const room = getRoomById('room-1')!;
    expect(room.status).toBe('playing');

    // Game should be created
    const game = getGame('room-1');
    expect(game).not.toBeNull();
    expect(game!.gameType).toBe(GameType.BLACKJACK);
    expect(game!.state.status).toBe('playing');

    // Should emit gameState to each player individually with correct myPlayerId
    expect(io.to).toHaveBeenCalledWith('socket-1');
    expect(io._emitFor('socket-1')).toHaveBeenCalledWith('gameState', expect.objectContaining({
      myPlayerId: ownerSession.playerId,
      gameType: GameType.BLACKJACK,
      status: 'playing',
    }));
    expect(io.to).toHaveBeenCalledWith('socket-2');
    expect(io._emitFor('socket-2')).toHaveBeenCalledWith('gameState', expect.objectContaining({
      myPlayerId: playerSession.playerId,
      gameType: GameType.BLACKJACK,
      status: 'playing',
    }));

    // Should emit roomState to room
    expect(io.to).toHaveBeenCalledWith('room-1');
    expect(io._emitFor('room-1')).toHaveBeenCalledWith('roomState', expect.objectContaining({ status: 'playing' }));

    // Should broadcast lobbyState
    expect(io.emit).toHaveBeenCalledWith('lobbyState', expect.any(Object));
  });

  it('emits VALIDATION_ERROR when not in a room', () => {
    const session = setupOwnerSession();
    const socket = createMockSocket({ session: { ...session, roomId: null }, authType: 'token' });
    const io = createMockServer();

    handleStartGame(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Not in a room',
    });
  });

  it('emits NOT_AUTHORIZED when non-owner tries to start', () => {
    const ownerSession = setupOwnerSession();
    const playerSession = setupPlayerSession('Bob', 'socket-2');
    _addRoomForTest(makeRoom({ ownerId: ownerSession.playerId }));

    const socket = createMockSocket({ session: { ...playerSession, roomId: 'room-1' }, authType: 'token' }, 'socket-2');
    const io = createMockServer();

    handleStartGame(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'NOT_AUTHORIZED',
      message: 'Only the room owner can start the game',
    });
  });

  it('emits VALIDATION_ERROR when not enough players', () => {
    const session = setupOwnerSession();
    _addRoomForTest(makeRoom({
      ownerId: session.playerId,
      players: [{ id: session.playerId, username: 'Alice', isConnected: true }],
    }));
    registerEngine(GameType.BLACKJACK, stubEngine);

    const socket = createMockSocket({ session: { ...session, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    handleStartGame(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Need 2-4 players for blackjack',
    });
  });

  it('emits VALIDATION_ERROR when too many players', () => {
    const ownerSession = setupOwnerSession();
    const p2 = setupPlayerSession('Bob', 'socket-2');
    const p3 = setupPlayerSession('Charlie', 'socket-3');
    const p4 = setupPlayerSession('Dave', 'socket-4');
    const p5 = setupPlayerSession('Eve', 'socket-5');

    _addRoomForTest(makeRoom({
      ownerId: ownerSession.playerId,
      players: [
        { id: ownerSession.playerId, username: 'Alice', isConnected: true },
        { id: p2.playerId, username: 'Bob', isConnected: true },
        { id: p3.playerId, username: 'Charlie', isConnected: true },
        { id: p4.playerId, username: 'Dave', isConnected: true },
        { id: p5.playerId, username: 'Eve', isConnected: true },
      ],
    }));
    registerEngine(GameType.BLACKJACK, stubEngine);

    const socket = createMockSocket({ session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    handleStartGame(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Need 2-4 players for blackjack',
    });

    // No game should have been created
    expect(getGame('room-1')).toBeNull();
  });

  it('emits GAME_IN_PROGRESS when room already playing', () => {
    const session = setupOwnerSession();
    _addRoomForTest(makeRoom({ ownerId: session.playerId, status: 'playing' }));

    const socket = createMockSocket({ session: { ...session, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    handleStartGame(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'GAME_IN_PROGRESS',
      message: 'Game already in progress',
    });
  });

  it('emits error when no engine registered', () => {
    const ownerSession = setupOwnerSession();
    const playerSession = setupPlayerSession('Bob', 'socket-2');
    _addRoomForTest(makeRoom({
      ownerId: ownerSession.playerId,
      players: [
        { id: ownerSession.playerId, username: 'Alice', isConnected: true },
        { id: playerSession.playerId, username: 'Bob', isConnected: true },
      ],
    }));
    // Do NOT register engine

    const socket = createMockSocket({ session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    handleStartGame(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Game engine not available for blackjack',
    });
  });

  it('emits AUTH_ERROR when not authenticated', () => {
    const socket = createMockSocket({});
    const io = createMockServer();

    handleStartGame(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'AUTH_ERROR',
      message: 'Not authenticated',
    });
  });
});

describe('handleEndGame', () => {
  beforeEach(() => {
    clearRooms();
    clearSessions();
    clearPendingSessions();
    clearOtp();
    clearGames();
    clearEngines();
  });

  it('removes game, sets room to lobby, and emits null gameState', () => {
    const ownerSession = setupOwnerSession();
    const playerSession = setupPlayerSession('Bob', 'socket-2');

    _addRoomForTest(makeRoom({
      ownerId: ownerSession.playerId,
      status: 'playing',
      players: [
        { id: ownerSession.playerId, username: 'Alice', isConnected: true },
        { id: playerSession.playerId, username: 'Bob', isConnected: true },
      ],
    }));

    registerEngine(GameType.BLACKJACK, stubEngine);
    createGame('room-1', GameType.BLACKJACK, stubEngine, [
      { id: ownerSession.playerId, username: 'Alice' },
      { id: playerSession.playerId, username: 'Bob' },
    ]);

    const io = createMockServer();
    handleEndGame('room-1', io);

    // Game should be removed
    expect(getGame('room-1')).toBeNull();

    // Room should be back to lobby
    const room = getRoomById('room-1')!;
    expect(room.status).toBe('lobby');

    // Should emit roomState and null gameState to room
    expect(io.to).toHaveBeenCalledWith('room-1');
    expect(io._emitFor('room-1')).toHaveBeenCalledWith('roomState', expect.objectContaining({ status: 'lobby' }));
    expect(io._emitFor('room-1')).toHaveBeenCalledWith('gameState', null);

    // Should broadcast lobbyState
    expect(io.emit).toHaveBeenCalledWith('lobbyState', expect.any(Object));
  });
});

describe('handleGameAction', () => {
  beforeEach(() => {
    clearRooms();
    clearSessions();
    clearPendingSessions();
    clearOtp();
    clearGames();
    clearEngines();
  });

  function setupGameWithTwoPlayers() {
    const ownerSession = setupOwnerSession();
    const playerSession = setupPlayerSession('Bob', 'socket-2');

    _addRoomForTest(makeRoom({
      ownerId: ownerSession.playerId,
      status: 'playing',
      players: [
        { id: ownerSession.playerId, username: 'Alice', isConnected: true },
        { id: playerSession.playerId, username: 'Bob', isConnected: true },
      ],
    }));

    registerEngine(GameType.BLACKJACK, blackjackEngine);
    createGame('room-1', GameType.BLACKJACK, blackjackEngine, [
      { id: ownerSession.playerId, username: 'Alice' },
      { id: playerSession.playerId, username: 'Bob' },
    ]);

    return { ownerSession, playerSession };
  }

  it('processes hit action, deals a card, and broadcasts updated game state', () => {
    const { ownerSession } = setupGameWithTwoPlayers();

    // Verify initial hand size (2 cards dealt at start)
    const gameBefore = getGame('room-1')!;
    const handBefore = (gameBefore.state as any).playerHands[0].cards.length;
    expect(handBefore).toBe(2);

    const socket = createMockSocket({ session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    handleGameAction(socket, io, { type: 'hit', playerId: ownerSession.playerId });

    // Should not emit error
    expect(socket.emit).not.toHaveBeenCalled();

    // Player's hand should now have 3 cards (AC #1: one card dealt)
    const gameAfter = getGame('room-1')!;
    const handAfter = (gameAfter.state as any).playerHands[0].cards.length;
    expect(handAfter).toBe(3);

    // Should broadcast gameState to both players
    expect(io.to).toHaveBeenCalledWith('socket-1');
    expect(io.to).toHaveBeenCalledWith('socket-2');
    expect(io._emitFor('socket-1')).toHaveBeenCalledWith('gameState', expect.objectContaining({
      gameType: GameType.BLACKJACK,
      myPlayerId: ownerSession.playerId,
    }));
    expect(io._emitFor('socket-2')).toHaveBeenCalledWith('gameState', expect.objectContaining({
      gameType: GameType.BLACKJACK,
    }));
  });

  it('processes stand action and broadcasts updated game state', () => {
    const { ownerSession, playerSession } = setupGameWithTwoPlayers();

    const socket = createMockSocket({ session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    handleGameAction(socket, io, { type: 'stand', playerId: ownerSession.playerId });

    // Should not emit error
    expect(socket.emit).not.toHaveBeenCalled();

    // Should broadcast to both players
    expect(io._emitFor('socket-1')).toHaveBeenCalledWith('gameState', expect.objectContaining({
      myPlayerId: ownerSession.playerId,
    }));
    expect(io._emitFor('socket-2')).toHaveBeenCalledWith('gameState', expect.objectContaining({
      myPlayerId: playerSession.playerId,
    }));

    // After standing, current player should advance (game state updated)
    const game = getGame('room-1');
    expect(game).not.toBeNull();
    expect(game!.state.currentPlayerIndex).toBe(1);
  });

  it('detects game over when all players finish and dealer plays', () => {
    const { ownerSession, playerSession } = setupGameWithTwoPlayers();
    const io = createMockServer();

    // Player 1 stands
    const socket1 = createMockSocket({ session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' });
    handleGameAction(socket1, io, { type: 'stand', playerId: ownerSession.playerId });

    // Player 2 stands → dealer auto-plays, game finishes
    const socket2 = createMockSocket({ session: { ...playerSession, roomId: 'room-1' }, authType: 'token' }, 'socket-2');
    handleGameAction(socket2, io, { type: 'stand', playerId: playerSession.playerId });

    // Game should be finished
    const game = getGame('room-1');
    expect(game).not.toBeNull();
    expect(game!.state.status).toBe('finished');

    // Final state should have been broadcast (game is not removed — Story 3-6 handles that)
    expect(io._emitFor('socket-1')).toHaveBeenCalledWith('gameState', expect.objectContaining({
      status: 'finished',
    }));
  });

  it('emits AUTH_ERROR when not authenticated', () => {
    const socket = createMockSocket({});
    const io = createMockServer();

    handleGameAction(socket, io, { type: 'hit', playerId: 'any' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'AUTH_ERROR',
      message: 'Not authenticated',
    });
  });

  it('emits VALIDATION_ERROR when not in a room', () => {
    const session = setupOwnerSession();
    const socket = createMockSocket({ session: { ...session, roomId: null }, authType: 'token' });
    const io = createMockServer();

    handleGameAction(socket, io, { type: 'hit', playerId: session.playerId });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Not in a room',
    });
  });

  it('emits VALIDATION_ERROR when no active game', () => {
    const session = setupOwnerSession();
    _addRoomForTest(makeRoom({ ownerId: session.playerId, status: 'playing' }));
    // No game created

    const socket = createMockSocket({ session: { ...session, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    handleGameAction(socket, io, { type: 'hit', playerId: session.playerId });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'No active game',
    });
  });

  it('emits VALIDATION_ERROR for invalid action payload (Zod fails)', () => {
    const session = setupOwnerSession();
    const socket = createMockSocket({ session: { ...session, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    // Missing playerId — Zod should reject
    handleGameAction(socket, io, { type: 'hit' } as any);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Invalid action payload',
    });
  });

  it('emits INVALID_ACTION when engine throws (wrong player)', () => {
    const { playerSession } = setupGameWithTwoPlayers();

    // Player 2 tries to act when it's player 1's turn
    const socket = createMockSocket({ session: { ...playerSession, roomId: 'room-1' }, authType: 'token' }, 'socket-2');
    const io = createMockServer();

    handleGameAction(socket, io, { type: 'hit', playerId: playerSession.playerId });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'INVALID_ACTION',
      message: 'Not your turn',
    });
  });

  it('emits INVALID_ACTION for unknown action type', () => {
    const { ownerSession } = setupGameWithTwoPlayers();

    const socket = createMockSocket({ session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    handleGameAction(socket, io, { type: 'double-down', playerId: ownerSession.playerId });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'INVALID_ACTION',
      message: 'Unknown action type: double-down',
    });
  });

  it('emits INVALID_ACTION when game is already finished', () => {
    const { ownerSession, playerSession } = setupGameWithTwoPlayers();
    const io = createMockServer();

    // Both players stand → game finishes
    const socket1 = createMockSocket({ session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' });
    handleGameAction(socket1, io, { type: 'stand', playerId: ownerSession.playerId });
    const socket2 = createMockSocket({ session: { ...playerSession, roomId: 'room-1' }, authType: 'token' }, 'socket-2');
    handleGameAction(socket2, io, { type: 'stand', playerId: playerSession.playerId });

    // Verify game is finished
    expect(getGame('room-1')!.state.status).toBe('finished');

    // Attempt action on finished game
    const socket3 = createMockSocket({ session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' });
    handleGameAction(socket3, io, { type: 'hit', playerId: ownerSession.playerId });

    expect(socket3.emit).toHaveBeenCalledWith('error', {
      code: 'INVALID_ACTION',
      message: 'Game is already finished',
    });
  });

  it('overrides playerId with session token to prevent spoofing', () => {
    const { ownerSession } = setupGameWithTwoPlayers();

    const socket = createMockSocket({ session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    // Client sends spoofed playerId — server should override with session.playerId
    handleGameAction(socket, io, { type: 'hit', playerId: 'spoofed-player-id' });

    // Should not emit error (server uses ownerSession.playerId which IS the current player)
    expect(socket.emit).not.toHaveBeenCalled();

    // Game state should be updated
    expect(io._emitFor('socket-1')).toHaveBeenCalledWith('gameState', expect.any(Object));
  });

  it('rejects game action when game is paused', () => {
    const { ownerSession } = setupGameWithTwoPlayers();

    // Pause the game
    setPaused('room-1', true, ownerSession.playerId);

    const socket = createMockSocket({ session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    handleGameAction(socket, io, { type: 'hit', playerId: ownerSession.playerId });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'GAME_PAUSED',
      message: 'Game is paused - waiting for player to reconnect',
    });
  });
});

describe('broadcastGameState', () => {
  beforeEach(() => {
    clearRooms();
    clearSessions();
    clearPendingSessions();
    clearOtp();
    clearGames();
    clearEngines();
  });

  it('emits filtered state to each player individually', () => {
    const ownerSession = setupOwnerSession();
    const playerSession = setupPlayerSession('Bob', 'socket-2');

    _addRoomForTest(makeRoom({
      ownerId: ownerSession.playerId,
      status: 'playing',
      players: [
        { id: ownerSession.playerId, username: 'Alice', isConnected: true },
        { id: playerSession.playerId, username: 'Bob', isConnected: true },
      ],
    }));

    registerEngine(GameType.BLACKJACK, blackjackEngine);
    createGame('room-1', GameType.BLACKJACK, blackjackEngine, [
      { id: ownerSession.playerId, username: 'Alice' },
      { id: playerSession.playerId, username: 'Bob' },
    ]);

    const io = createMockServer();
    broadcastGameState('room-1', io);

    expect(io._emitFor('socket-1')).toHaveBeenCalledWith('gameState', expect.objectContaining({
      myPlayerId: ownerSession.playerId,
    }));
    expect(io._emitFor('socket-2')).toHaveBeenCalledWith('gameState', expect.objectContaining({
      myPlayerId: playerSession.playerId,
    }));
  });

  it('handles missing game gracefully', () => {
    const io = createMockServer();
    // No game exists — should not throw
    broadcastGameState('nonexistent-room', io);
    expect(io.to).not.toHaveBeenCalled();
  });

  it('handles missing sessions gracefully', () => {
    const ownerSession = setupOwnerSession();

    _addRoomForTest(makeRoom({
      ownerId: ownerSession.playerId,
      status: 'playing',
      players: [
        { id: ownerSession.playerId, username: 'Alice', isConnected: true },
        { id: 'disconnected-player', username: 'Bob', isConnected: false },
      ],
    }));

    registerEngine(GameType.BLACKJACK, stubEngine);
    createGame('room-1', GameType.BLACKJACK, stubEngine, [
      { id: ownerSession.playerId, username: 'Alice' },
      { id: 'disconnected-player', username: 'Bob' },
    ]);

    const io = createMockServer();
    broadcastGameState('room-1', io);

    // Should emit to the player who has a session
    expect(io._emitFor('socket-1')).toHaveBeenCalledWith('gameState', expect.any(Object));
    // Should not throw for missing session
  });
});

describe('handlePlayAgain', () => {
  beforeEach(() => {
    clearRooms();
    clearSessions();
    clearPendingSessions();
    clearOtp();
    clearGames();
    clearEngines();
  });

  function setupFinishedGame() {
    const ownerSession = setupOwnerSession();
    const playerSession = setupPlayerSession('Bob', 'socket-2');

    _addRoomForTest(makeRoom({
      ownerId: ownerSession.playerId,
      status: 'playing',
      players: [
        { id: ownerSession.playerId, username: 'Alice', isConnected: true },
        { id: playerSession.playerId, username: 'Bob', isConnected: true },
      ],
    }));

    registerEngine(GameType.BLACKJACK, blackjackEngine);
    createGame('room-1', GameType.BLACKJACK, blackjackEngine, [
      { id: ownerSession.playerId, username: 'Alice' },
      { id: playerSession.playerId, username: 'Bob' },
    ]);

    // Finish the game by having both players stand
    const io = createMockServer();
    const socket1 = createMockSocket({ session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' });
    handleGameAction(socket1, io, { type: 'stand', playerId: ownerSession.playerId });
    const socket2 = createMockSocket({ session: { ...playerSession, roomId: 'room-1' }, authType: 'token' }, 'socket-2');
    handleGameAction(socket2, io, { type: 'stand', playerId: playerSession.playerId });

    // Verify game is finished
    expect(getGame('room-1')!.state.status).toBe('finished');

    return { ownerSession, playerSession };
  }

  it('creates a new game when called by owner on finished game', () => {
    const { ownerSession } = setupFinishedGame();

    const socket = createMockSocket({ session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    handlePlayAgain(socket, io);

    // New game should be created
    const game = getGame('room-1');
    expect(game).not.toBeNull();
    expect(game!.state.status).toBe('playing');

    // Room should still be playing
    const room = getRoomById('room-1')!;
    expect(room.status).toBe('playing');

    // Should broadcast new game state
    expect(io.to).toHaveBeenCalledWith('socket-1');
    expect(io.to).toHaveBeenCalledWith('socket-2');
  });

  it('emits NOT_AUTHORIZED when non-owner tries to play again', () => {
    const { playerSession } = setupFinishedGame();

    const socket = createMockSocket({ session: { ...playerSession, roomId: 'room-1' }, authType: 'token' }, 'socket-2');
    const io = createMockServer();

    handlePlayAgain(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'NOT_AUTHORIZED',
      message: 'Only the room owner can start a new game',
    });
  });

  it('emits VALIDATION_ERROR when game is not finished', () => {
    const ownerSession = setupOwnerSession();
    const playerSession = setupPlayerSession('Bob', 'socket-2');

    _addRoomForTest(makeRoom({
      ownerId: ownerSession.playerId,
      status: 'playing',
      players: [
        { id: ownerSession.playerId, username: 'Alice', isConnected: true },
        { id: playerSession.playerId, username: 'Bob', isConnected: true },
      ],
    }));

    registerEngine(GameType.BLACKJACK, blackjackEngine);
    createGame('room-1', GameType.BLACKJACK, blackjackEngine, [
      { id: ownerSession.playerId, username: 'Alice' },
      { id: playerSession.playerId, username: 'Bob' },
    ]);

    const socket = createMockSocket({ session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    handlePlayAgain(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Game is not finished',
    });
  });

  it('emits AUTH_ERROR when not authenticated', () => {
    const socket = createMockSocket({});
    const io = createMockServer();

    handlePlayAgain(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'AUTH_ERROR',
      message: 'Not authenticated',
    });
  });

  it('emits VALIDATION_ERROR when not in a room', () => {
    const session = setupOwnerSession();
    const socket = createMockSocket({ session: { ...session, roomId: null }, authType: 'token' });
    const io = createMockServer();

    handlePlayAgain(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Not in a room',
    });
  });

  it('emits ROOM_NOT_FOUND when room does not exist', () => {
    const session = setupOwnerSession();
    // No room added
    const socket = createMockSocket({ session: { ...session, roomId: 'nonexistent' }, authType: 'token' });
    const io = createMockServer();

    handlePlayAgain(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'ROOM_NOT_FOUND',
      message: 'Room not found',
    });
  });
});

describe('handleReturnToLobby', () => {
  beforeEach(() => {
    clearRooms();
    clearSessions();
    clearPendingSessions();
    clearOtp();
    clearGames();
    clearEngines();
  });

  function setupFinishedGame() {
    const ownerSession = setupOwnerSession();
    const playerSession = setupPlayerSession('Bob', 'socket-2');

    _addRoomForTest(makeRoom({
      ownerId: ownerSession.playerId,
      status: 'playing',
      players: [
        { id: ownerSession.playerId, username: 'Alice', isConnected: true },
        { id: playerSession.playerId, username: 'Bob', isConnected: true },
      ],
    }));

    registerEngine(GameType.BLACKJACK, blackjackEngine);
    createGame('room-1', GameType.BLACKJACK, blackjackEngine, [
      { id: ownerSession.playerId, username: 'Alice' },
      { id: playerSession.playerId, username: 'Bob' },
    ]);

    const io = createMockServer();
    const socket1 = createMockSocket({ session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' });
    handleGameAction(socket1, io, { type: 'stand', playerId: ownerSession.playerId });
    const socket2 = createMockSocket({ session: { ...playerSession, roomId: 'room-1' }, authType: 'token' }, 'socket-2');
    handleGameAction(socket2, io, { type: 'stand', playerId: playerSession.playerId });

    expect(getGame('room-1')!.state.status).toBe('finished');

    return { ownerSession, playerSession };
  }

  it('ends game and returns room to lobby status', () => {
    const { playerSession } = setupFinishedGame();

    const socket = createMockSocket({ session: { ...playerSession, roomId: 'room-1' }, authType: 'token' }, 'socket-2');
    const io = createMockServer();

    handleReturnToLobby(socket, io);

    // Game should be removed
    expect(getGame('room-1')).toBeNull();

    // Room should be back to lobby
    const room = getRoomById('room-1')!;
    expect(room.status).toBe('lobby');

    // Should emit roomState and null gameState
    expect(io._emitFor('room-1')).toHaveBeenCalledWith('roomState', expect.objectContaining({ status: 'lobby' }));
    expect(io._emitFor('room-1')).toHaveBeenCalledWith('gameState', null);
  });

  it('emits VALIDATION_ERROR when game is not finished', () => {
    const ownerSession = setupOwnerSession();
    const playerSession = setupPlayerSession('Bob', 'socket-2');

    _addRoomForTest(makeRoom({
      ownerId: ownerSession.playerId,
      status: 'playing',
      players: [
        { id: ownerSession.playerId, username: 'Alice', isConnected: true },
        { id: playerSession.playerId, username: 'Bob', isConnected: true },
      ],
    }));

    registerEngine(GameType.BLACKJACK, blackjackEngine);
    createGame('room-1', GameType.BLACKJACK, blackjackEngine, [
      { id: ownerSession.playerId, username: 'Alice' },
      { id: playerSession.playerId, username: 'Bob' },
    ]);

    const socket = createMockSocket({ session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' });
    const io = createMockServer();

    handleReturnToLobby(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Game is not finished',
    });
  });

  it('emits AUTH_ERROR when not authenticated', () => {
    const socket = createMockSocket({});
    const io = createMockServer();

    handleReturnToLobby(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'AUTH_ERROR',
      message: 'Not authenticated',
    });
  });

  it('emits VALIDATION_ERROR when not in a room', () => {
    const session = setupOwnerSession();
    const socket = createMockSocket({ session: { ...session, roomId: null }, authType: 'token' });
    const io = createMockServer();

    handleReturnToLobby(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Not in a room',
    });
  });
});

describe('registerGameHandlers', () => {
  it('registers startGame, changeGameType, and gameAction event handlers', () => {
    const handlers = new Map<string, Function>();
    const socket = {
      ...createMockSocket(),
      on: vi.fn((event: string, handler: Function) => { handlers.set(event, handler); }),
    } as unknown as AppSocket;
    const io = createMockServer();

    registerGameHandlers(socket, io);

    expect(socket.on).toHaveBeenCalledWith('changeGameType', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('startGame', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('gameAction', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('playAgain', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('returnToLobby', expect.any(Function));
    expect(handlers.has('changeGameType')).toBe(true);
    expect(handlers.has('startGame')).toBe(true);
    expect(handlers.has('gameAction')).toBe(true);
    expect(handlers.has('playAgain')).toBe(true);
    expect(handlers.has('returnToLobby')).toBe(true);
  });
});
