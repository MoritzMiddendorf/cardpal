import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleSetUsername, handleAuthenticate, registerAuthHandlers } from './authHandlers.js';
import {
  createPendingSession,
  clearPendingSessions,
  getSessionByToken,
  clearSessions,
  updateSessionSocketId,
} from '../../state/sessions.js';
import { setOtp, clearOtp } from '../../state/otp.js';
import { clearRooms, _addRoomForTest, getRoomById } from '../../state/rooms.js';
import type { Room } from '../../state/rooms.js';
import { clearGames, _addGameForTest, getGame, setPaused } from '../../state/games.js';
import { GameType } from '@cardpal/shared';
import type { GameState, GameAction, PlayerResult } from '@cardpal/shared';
import type { GameEngine, GameInstance } from '../../games/engine.js';
import type { AppSocket, AppServer } from '../types.js';

// Create a mock socket with controllable data and event recording
function createMockSocket(data: Partial<AppSocket['data']> = {}, id = 'socket-1') {
  const listeners = new Map<string, Function>();
  return {
    id,
    data: { ...data } as AppSocket['data'],
    emit: vi.fn(),
    join: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      listeners.set(event, handler);
    }),
    _listeners: listeners,
  } as unknown as AppSocket & { _listeners: Map<string, Function> };
}

function createMockIo() {
  const emitFn = vi.fn();
  return {
    to: vi.fn(() => ({ emit: emitFn })),
    emit: vi.fn(),
    sockets: { sockets: new Map() },
    _roomEmit: emitFn,
  } as unknown as AppServer & { _roomEmit: ReturnType<typeof vi.fn> };
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    name: 'Test Room',
    gameType: GameType.BLACKJACK,
    status: 'lobby',
    ownerId: 'player-token',
    players: [{ id: 'player-token', username: 'Bob', isConnected: false }],
    ...overrides,
  };
}

function makeStubEngine(): GameEngine {
  return {
    getInitialState: () => ({} as GameState),
    getValidActions: () => [],
    applyAction: (s: GameState) => s,
    isGameOver: () => false,
    getWinner: () => null,
    getResults: () => [],
  };
}

describe('handleSetUsername', () => {
  beforeEach(() => {
    clearPendingSessions();
    clearSessions();
    clearOtp();
    clearRooms();
    clearGames();
  });

  it('creates a session and emits authenticated for valid username', () => {
    setOtp('A7X-K9M');
    const pending = createPendingSession('A7X-K9M');
    const socket = createMockSocket({ pendingSessionId: pending.id, authType: 'pending' });
    const io = createMockIo();

    handleSetUsername(socket, io, { username: 'Alice' });

    // Should emit authenticated with token and username
    const authCall = (socket.emit as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === 'authenticated'
    );
    expect(authCall).toBeDefined();
    expect(authCall![1]).toHaveProperty('token');
    expect(authCall![1]).toHaveProperty('username', 'Alice');

    // Session should be retrievable
    const session = getSessionByToken(authCall![1].token);
    expect(session).not.toBeNull();
    expect(session!.username).toBe('Alice');
  });

  it('emits VALIDATION_ERROR for invalid username (special chars)', () => {
    setOtp('A7X-K9M');
    const pending = createPendingSession('A7X-K9M');
    const socket = createMockSocket({ pendingSessionId: pending.id, authType: 'pending' });
    const io = createMockIo();

    handleSetUsername(socket, io, { username: 'Al!ce' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('Letters and numbers only'),
    });
  });

  it('emits VALIDATION_ERROR for empty username', () => {
    setOtp('A7X-K9M');
    const pending = createPendingSession('A7X-K9M');
    const socket = createMockSocket({ pendingSessionId: pending.id, authType: 'pending' });
    const io = createMockIo();

    handleSetUsername(socket, io, { username: '' });

    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
      code: 'VALIDATION_ERROR',
    }));
  });

  it('emits VALIDATION_ERROR for username exceeding 15 chars', () => {
    setOtp('A7X-K9M');
    const pending = createPendingSession('A7X-K9M');
    const socket = createMockSocket({ pendingSessionId: pending.id, authType: 'pending' });
    const io = createMockIo();

    handleSetUsername(socket, io, { username: 'AliceInWonderland' }); // 17 chars

    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
      code: 'VALIDATION_ERROR',
    }));
  });

  it('emits AUTH_ERROR when no pendingSessionId in socket data', () => {
    const socket = createMockSocket({});
    const io = createMockIo();

    handleSetUsername(socket, io, { username: 'Alice' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'AUTH_ERROR',
      message: 'No pending session',
    });
  });

  it('emits AUTH_ERROR when pending session does not exist', () => {
    const socket = createMockSocket({ pendingSessionId: 'non-existent', authType: 'pending' });
    const io = createMockIo();

    handleSetUsername(socket, io, { username: 'Alice' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'AUTH_ERROR',
      message: 'Session creation failed',
    });
  });
});

describe('handleAuthenticate', () => {
  beforeEach(() => {
    clearPendingSessions();
    clearSessions();
    clearOtp();
    clearRooms();
    clearGames();
  });

  it('emits authenticated for a valid token with valid OTP', () => {
    const otp = setOtp('A7X-K9M');
    const pending = createPendingSession(otp.code);
    const session = createPendingSessionAndFullSession(pending.id, 'Bob', 'old-socket');
    const socket = createMockSocket({}, 'new-socket');
    const io = createMockIo();

    handleAuthenticate(socket, io, { token: session.token });

    expect(socket.emit).toHaveBeenCalledWith('authenticated', {
      token: session.token,
      playerId: session.playerId,
      username: 'Bob',
    });
    expect(socket.data.session).toBeDefined();
    expect(socket.data.authType).toBe('token');
  });

  it('emits AUTH_ERROR for non-existent token', () => {
    const socket = createMockSocket({}, 'new-socket');
    const io = createMockIo();

    handleAuthenticate(socket, io, { token: 'non-existent' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'AUTH_ERROR',
      message: 'Session expired',
    });
  });

  it('emits AUTH_ERROR when OTP has been regenerated', () => {
    const otp = setOtp('OLD-OTP');
    const pending = createPendingSession(otp.code);
    const session = createPendingSessionAndFullSession(pending.id, 'Bob', 'old-socket');

    // Regenerate OTP
    setOtp('NEW-OTP');

    const socket = createMockSocket({}, 'new-socket');
    const io = createMockIo();

    handleAuthenticate(socket, io, { token: session.token });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'AUTH_ERROR',
      message: 'Session expired',
    });
  });

  it('updates socketId on successful authenticate', () => {
    const otp = setOtp('A7X-K9M');
    const pending = createPendingSession(otp.code);
    const session = createPendingSessionAndFullSession(pending.id, 'Bob', 'old-socket');
    const socket = createMockSocket({}, 'new-socket-id');
    const io = createMockIo();

    handleAuthenticate(socket, io, { token: session.token });

    const updated = getSessionByToken(session.token);
    expect(updated!.socketId).toBe('new-socket-id');
  });
});

describe('registerAuthHandlers', () => {
  beforeEach(() => {
    clearPendingSessions();
    clearSessions();
    clearOtp();
    clearRooms();
    clearGames();
  });

  it('registers setUsername and authenticate event handlers', () => {
    const socket = createMockSocket({});
    const io = createMockIo();

    registerAuthHandlers(socket, io);

    expect(socket.on).toHaveBeenCalledWith('setUsername', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('authenticate', expect.any(Function));
  });

  it('auto-emits authenticated for returning users with valid session', () => {
    const otp = setOtp('A7X-K9M');
    const pending = createPendingSession(otp.code);
    const session = createPendingSessionAndFullSession(pending.id, 'Alice', 'old-socket');

    const socket = createMockSocket(
      { authType: 'token', session: { ...session } },
      'new-socket'
    );
    const io = createMockIo();

    registerAuthHandlers(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('authenticated', {
      token: session.token,
      playerId: session.playerId,
      username: 'Alice',
    });

    // socketId should be updated
    const updated = getSessionByToken(session.token);
    expect(updated!.socketId).toBe('new-socket');
  });

  it('does not auto-emit for pending auth users', () => {
    const socket = createMockSocket({ authType: 'pending', pendingSessionId: 'some-id' });
    const io = createMockIo();

    registerAuthHandlers(socket, io);

    const authCall = (socket.emit as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === 'authenticated'
    );
    expect(authCall).toBeUndefined();
  });
});

describe('restoreRoomConnection (via handleAuthenticate)', () => {
  beforeEach(() => {
    clearPendingSessions();
    clearSessions();
    clearOtp();
    clearRooms();
    clearGames();
  });

  it('joins socket to room and marks player connected on reconnect', () => {
    const otp = setOtp('A7X-K9M');
    const pending = createPendingSession(otp.code);
    const session = createPendingSessionAndFullSession(pending.id, 'Bob', 'old-socket');
    updateSessionRoomId(session.token, 'room-1');

    _addRoomForTest(makeRoom({
      players: [{ id: session.playerId, username: 'Bob', isConnected: false }],
      ownerId: session.playerId,
    }));

    const socket = createMockSocket({}, 'new-socket');
    const io = createMockIo();

    handleAuthenticate(socket, io, { token: session.token });

    // Socket should join the room
    expect(socket.join).toHaveBeenCalledWith('room-1');

    // Player should be marked connected in room state
    const room = getRoomById('room-1')!;
    expect(room.players[0]!.isConnected).toBe(true);
  });

  it('broadcasts roomState to the room on reconnect', () => {
    const otp = setOtp('A7X-K9M');
    const pending = createPendingSession(otp.code);
    const session = createPendingSessionAndFullSession(pending.id, 'Bob', 'old-socket');
    updateSessionRoomId(session.token, 'room-1');

    _addRoomForTest(makeRoom({
      players: [{ id: session.playerId, username: 'Bob', isConnected: false }],
      ownerId: session.playerId,
    }));

    const socket = createMockSocket({}, 'new-socket');
    const io = createMockIo();

    handleAuthenticate(socket, io, { token: session.token });

    // Should broadcast roomState to the room
    expect((io as unknown as { to: ReturnType<typeof vi.fn> }).to).toHaveBeenCalledWith('room-1');
    expect(io._roomEmit).toHaveBeenCalledWith('roomState', expect.objectContaining({
      id: 'room-1',
      players: expect.arrayContaining([
        expect.objectContaining({ id: session.playerId, isConnected: true }),
      ]),
    }));
  });

  it('sends gameState to reconnecting socket when game in progress', () => {
    const otp = setOtp('A7X-K9M');
    const pending = createPendingSession(otp.code);
    const session = createPendingSessionAndFullSession(pending.id, 'Bob', 'old-socket');
    updateSessionRoomId(session.token, 'room-1');

    _addRoomForTest(makeRoom({
      status: 'playing',
      players: [{ id: session.playerId, username: 'Bob', isConnected: false }],
      ownerId: session.playerId,
    }));

    const engine = makeStubEngine();
    const gameInstance: GameInstance = {
      roomId: 'room-1',
      gameType: GameType.BLACKJACK,
      state: {
        gameType: GameType.BLACKJACK,
        players: [session.playerId],
        currentPlayerIndex: 0,
        status: 'playing',
      },
      engine,
      playerUsernames: new Map([[session.playerId, 'Bob']]),
      isPaused: false,
      pausedForPlayerId: null,
    };
    _addGameForTest(gameInstance);

    const socket = createMockSocket({}, 'new-socket');
    const io = createMockIo();

    handleAuthenticate(socket, io, { token: session.token });

    // Reconnected socket should receive gameState (addressed by its new socket id)
    expect(io.to).toHaveBeenCalledWith('new-socket');
    expect(io._roomEmit).toHaveBeenCalledWith('gameState', expect.objectContaining({
      gameType: GameType.BLACKJACK,
      myPlayerId: session.playerId,
      status: 'playing',
    }));
  });

  it('unpauses game when paused player reconnects', () => {
    const otp = setOtp('A7X-K9M');
    const pending = createPendingSession(otp.code);
    const session = createPendingSessionAndFullSession(pending.id, 'Bob', 'old-socket');
    updateSessionRoomId(session.token, 'room-1');

    _addRoomForTest(makeRoom({
      status: 'playing',
      players: [{ id: session.playerId, username: 'Bob', isConnected: false }],
      ownerId: session.playerId,
    }));

    const engine = makeStubEngine();
    const gameInstance: GameInstance = {
      roomId: 'room-1',
      gameType: GameType.BLACKJACK,
      state: {
        gameType: GameType.BLACKJACK,
        players: [session.playerId],
        currentPlayerIndex: 0,
        status: 'playing',
      },
      engine,
      playerUsernames: new Map([[session.playerId, 'Bob']]),
      isPaused: true,
      pausedForPlayerId: session.playerId,
    };
    _addGameForTest(gameInstance);

    const socket = createMockSocket({}, 'new-socket');
    const io = createMockIo();

    handleAuthenticate(socket, io, { token: session.token });

    // Game should be unpaused
    const game = getGame('room-1')!;
    expect(game.isPaused).toBe(false);
    expect(game.pausedForPlayerId).toBeNull();
  });

  it('does not crash when player has no roomId', () => {
    const otp = setOtp('A7X-K9M');
    const pending = createPendingSession(otp.code);
    const session = createPendingSessionAndFullSession(pending.id, 'Bob', 'old-socket');
    // no roomId set — defaults to null

    const socket = createMockSocket({}, 'new-socket');
    const io = createMockIo();

    handleAuthenticate(socket, io, { token: session.token });

    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('authenticated', expect.any(Object));
  });
});

// Helper: create a pending session and immediately upgrade to a full session
import { createSession, updateSessionRoomId } from '../../state/sessions.js';

function createPendingSessionAndFullSession(
  pendingId: string,
  username: string,
  socketId: string,
) {
  return createSession(pendingId, username, socketId);
}
