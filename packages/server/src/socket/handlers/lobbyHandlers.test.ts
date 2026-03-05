import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendLobbyState, broadcastLobbyState, handleCreateRoom, handleJoinRoom, handleLeaveRoom, registerLobbyHandlers } from './lobbyHandlers.js';
import { clearRooms, _addRoomForTest, getRooms, getRoomById, GAME_MAX_PLAYERS } from '../../state/rooms.js';
import { createPendingSession, createSession, clearPendingSessions, clearSessions, getSessionByToken } from '../../state/sessions.js';
import { setOtp, clearOtp } from '../../state/otp.js';
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
    players: [{ id: 'owner-token', username: 'Alice', isConnected: true }],
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
  const toFn = vi.fn();
  return {
    emit: vi.fn(),
    to: vi.fn(() => ({ emit: toFn })),
    _toEmit: toFn,
  } as unknown as AppServer & { _toEmit: ReturnType<typeof vi.fn> };
}

describe('Lobby Handlers', () => {
  beforeEach(() => {
    clearRooms();
  });

  describe('sendLobbyState', () => {
    it('emits lobbyState with empty rooms to a single socket', () => {
      const socket = createMockSocket();
      sendLobbyState(socket);
      expect(socket.emit).toHaveBeenCalledWith('lobbyState', { rooms: [] });
    });

    it('emits lobbyState with room summaries to a single socket', () => {
      _addRoomForTest(makeRoom());
      const socket = createMockSocket();
      sendLobbyState(socket);
      expect(socket.emit).toHaveBeenCalledWith('lobbyState', {
        rooms: [
          {
            id: 'room-1',
            name: 'Test Room',
            gameType: GameType.BLACKJACK,
            playerCount: 1,
            maxPlayers: 4,
            status: 'lobby',
          },
        ],
      });
    });
  });

  describe('broadcastLobbyState', () => {
    it('emits lobbyState to all connected clients via io.emit', () => {
      _addRoomForTest(makeRoom());
      const io = createMockServer();
      broadcastLobbyState(io);
      expect(io.emit).toHaveBeenCalledWith('lobbyState', {
        rooms: [
          {
            id: 'room-1',
            name: 'Test Room',
            gameType: GameType.BLACKJACK,
            playerCount: 1,
            maxPlayers: 4,
            status: 'lobby',
          },
        ],
      });
    });

    it('emits empty rooms when no rooms exist', () => {
      const io = createMockServer();
      broadcastLobbyState(io);
      expect(io.emit).toHaveBeenCalledWith('lobbyState', { rooms: [] });
    });
  });
});

describe('handleCreateRoom', () => {
  beforeEach(() => {
    clearRooms();
    clearPendingSessions();
    clearSessions();
    clearOtp();
  });

  it('creates room and emits roomState for valid input', () => {
    setOtp('A7X-K9M');
    const pending = createPendingSession('A7X-K9M');
    const session = createSession(pending.id, 'Alice', 'socket-1');

    const socket = createMockSocket({ session: { ...session }, authType: 'token' }, 'socket-1');
    const io = createMockServer();

    handleCreateRoom(socket, io, { gameType: 'blackjack' });

    // Should emit roomState to creator
    const roomStateCall = (socket.emit as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === 'roomState'
    );
    expect(roomStateCall).toBeDefined();
    expect(roomStateCall![1]).toHaveProperty('id');
    expect(roomStateCall![1]).toHaveProperty('name');
    expect(roomStateCall![1].gameType).toBe('blackjack');
    expect(roomStateCall![1].status).toBe('lobby');
    expect(roomStateCall![1].ownerId).toBe(session.token);
    expect(roomStateCall![1].players).toHaveLength(1);
    expect(roomStateCall![1].players[0].isOwner).toBe(true);

    // Should join Socket.io room
    expect(socket.join).toHaveBeenCalled();

    // Should broadcast lobby state
    expect(io.emit).toHaveBeenCalledWith('lobbyState', expect.objectContaining({
      rooms: expect.arrayContaining([expect.objectContaining({ gameType: 'blackjack' })]),
    }));

    // Room should be in getRooms
    expect(getRooms()).toHaveLength(1);

    // Session roomId should be updated
    const updatedSession = getSessionByToken(session.token);
    expect(updatedSession!.roomId).not.toBeNull();

    // socket.data.session should be updated with roomId
    expect(socket.data.session).toBeDefined();
    expect(socket.data.session!.roomId).toBe(updatedSession!.roomId);
  });

  it('emits VALIDATION_ERROR for invalid game type', () => {
    setOtp('A7X-K9M');
    const pending = createPendingSession('A7X-K9M');
    const session = createSession(pending.id, 'Alice', 'socket-1');

    const socket = createMockSocket({ session: { ...session }, authType: 'token' }, 'socket-1');
    const io = createMockServer();

    handleCreateRoom(socket, io, { gameType: 'invalid-game' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Invalid game type',
    });
    expect(getRooms()).toHaveLength(0);
  });

  it('emits AUTH_ERROR when not authenticated', () => {
    const socket = createMockSocket({});
    const io = createMockServer();

    handleCreateRoom(socket, io, { gameType: 'blackjack' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'AUTH_ERROR',
      message: 'Not authenticated',
    });
  });

  it('emits VALIDATION_ERROR when already in a room', () => {
    setOtp('A7X-K9M');
    const pending = createPendingSession('A7X-K9M');
    const session = createSession(pending.id, 'Alice', 'socket-1');

    const socket = createMockSocket(
      { session: { ...session, roomId: 'existing-room' }, authType: 'token' },
      'socket-1'
    );
    const io = createMockServer();

    handleCreateRoom(socket, io, { gameType: 'blackjack' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Already in a room',
    });
    expect(getRooms()).toHaveLength(0);
  });

  it('creates Skip-Bo room correctly', () => {
    setOtp('A7X-K9M');
    const pending = createPendingSession('A7X-K9M');
    const session = createSession(pending.id, 'Alice', 'socket-1');

    const socket = createMockSocket({ session: { ...session }, authType: 'token' }, 'socket-1');
    const io = createMockServer();

    handleCreateRoom(socket, io, { gameType: 'skipbo' });

    const roomStateCall = (socket.emit as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === 'roomState'
    );
    expect(roomStateCall![1].gameType).toBe('skipbo');
  });
});

describe('handleJoinRoom', () => {
  beforeEach(() => {
    clearRooms();
    clearPendingSessions();
    clearSessions();
    clearOtp();
  });

  it('joins room and emits roomState for valid input', () => {
    _addRoomForTest(makeRoom());
    setOtp('A7X-K9M');
    const pending = createPendingSession('A7X-K9M');
    const session = createSession(pending.id, 'Bob', 'socket-2');

    const socket = createMockSocket({ session: { ...session }, authType: 'token' }, 'socket-2');
    const io = createMockServer();

    handleJoinRoom(socket, io, { roomId: 'room-1' });

    // Should join Socket.io room
    expect(socket.join).toHaveBeenCalledWith('room-1');

    // Should emit roomState to room via io.to()
    expect((io as any).to).toHaveBeenCalledWith('room-1');
    expect((io as any)._toEmit).toHaveBeenCalledWith('roomState', expect.objectContaining({
      id: 'room-1',
      players: expect.arrayContaining([
        expect.objectContaining({ username: 'Bob' }),
      ]),
    }));

    // Should broadcast lobby state
    expect(io.emit).toHaveBeenCalledWith('lobbyState', expect.any(Object));

    // Session roomId should be updated
    const updatedSession = getSessionByToken(session.token);
    expect(updatedSession!.roomId).toBe('room-1');

    // socket.data.session should be updated
    expect(socket.data.session!.roomId).toBe('room-1');
  });

  it('emits VALIDATION_ERROR for invalid roomId', () => {
    setOtp('A7X-K9M');
    const pending = createPendingSession('A7X-K9M');
    const session = createSession(pending.id, 'Bob', 'socket-2');

    const socket = createMockSocket({ session: { ...session }, authType: 'token' }, 'socket-2');
    const io = createMockServer();

    handleJoinRoom(socket, io, { roomId: '' } as any);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Invalid roomId',
    });
  });

  it('emits VALIDATION_ERROR for missing roomId', () => {
    setOtp('A7X-K9N');
    const pending = createPendingSession('A7X-K9N');
    const session = createSession(pending.id, 'Bob', 'socket-2');

    const socket = createMockSocket({ session: { ...session }, authType: 'token' }, 'socket-2');
    const io = createMockServer();

    handleJoinRoom(socket, io, {} as any);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Invalid roomId',
    });
  });

  it('emits AUTH_ERROR when not authenticated', () => {
    const socket = createMockSocket({});
    const io = createMockServer();

    handleJoinRoom(socket, io, { roomId: 'room-1' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'AUTH_ERROR',
      message: 'Not authenticated',
    });
  });

  it('emits VALIDATION_ERROR when already in a room', () => {
    setOtp('A7X-K9M');
    const pending = createPendingSession('A7X-K9M');
    const session = createSession(pending.id, 'Bob', 'socket-2');

    const socket = createMockSocket(
      { session: { ...session, roomId: 'existing-room' }, authType: 'token' },
      'socket-2',
    );
    const io = createMockServer();

    handleJoinRoom(socket, io, { roomId: 'room-1' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Already in a room',
    });
  });

  it('emits ROOM_NOT_FOUND for non-existent room', () => {
    setOtp('A7X-K9M');
    const pending = createPendingSession('A7X-K9M');
    const session = createSession(pending.id, 'Bob', 'socket-2');

    const socket = createMockSocket({ session: { ...session }, authType: 'token' }, 'socket-2');
    const io = createMockServer();

    handleJoinRoom(socket, io, { roomId: 'non-existent' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'ROOM_NOT_FOUND',
      message: 'Room not found',
    });
  });

  it('emits GAME_IN_PROGRESS for playing room', () => {
    _addRoomForTest(makeRoom({ status: 'playing' }));
    setOtp('A7X-K9M');
    const pending = createPendingSession('A7X-K9M');
    const session = createSession(pending.id, 'Bob', 'socket-2');

    const socket = createMockSocket({ session: { ...session }, authType: 'token' }, 'socket-2');
    const io = createMockServer();

    handleJoinRoom(socket, io, { roomId: 'room-1' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'GAME_IN_PROGRESS',
      message: 'Game in progress',
    });
  });

  it('emits ROOM_FULL when at max capacity', () => {
    const fullPlayers = Array.from({ length: GAME_MAX_PLAYERS[GameType.BLACKJACK] }, (_, i) => ({
      id: `player-${i}`,
      username: `Player${i}`,
      isConnected: true,
    }));
    _addRoomForTest(makeRoom({ players: fullPlayers, ownerId: 'player-0' }));

    setOtp('A7X-K9M');
    const pending = createPendingSession('A7X-K9M');
    const session = createSession(pending.id, 'Extra', 'socket-extra');

    const socket = createMockSocket({ session: { ...session }, authType: 'token' }, 'socket-extra');
    const io = createMockServer();

    handleJoinRoom(socket, io, { roomId: 'room-1' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'ROOM_FULL',
      message: 'Room is full',
    });
  });
});

describe('handleLeaveRoom', () => {
  beforeEach(() => {
    clearRooms();
    clearPendingSessions();
    clearSessions();
    clearOtp();
  });

  it('leaves room, updates session, and broadcasts lobby', () => {
    setOtp('B1B-K9M');
    const pending = createPendingSession('B1B-K9M');
    const session = createSession(pending.id, 'Bob', 'socket-2');

    _addRoomForTest(makeRoom({
      players: [
        { id: 'owner-token', username: 'Alice', isConnected: true },
        { id: session.token, username: 'Bob', isConnected: true },
      ],
    }));

    const socket = createMockSocket(
      { session: { ...session, roomId: 'room-1' }, authType: 'token' },
      'socket-2',
    );
    const io = createMockServer();

    handleLeaveRoom(socket, io);

    // Should leave Socket.io room
    expect(socket.leave).toHaveBeenCalledWith('room-1');

    // Should emit roomState to remaining players
    expect((io as any).to).toHaveBeenCalledWith('room-1');
    expect((io as any)._toEmit).toHaveBeenCalledWith('roomState', expect.objectContaining({
      id: 'room-1',
      players: expect.arrayContaining([
        expect.objectContaining({ username: 'Alice' }),
      ]),
    }));

    // Should broadcast lobby state
    expect(io.emit).toHaveBeenCalledWith('lobbyState', expect.any(Object));

    // Should send lobby state directly to leaving socket
    expect(socket.emit).toHaveBeenCalledWith('lobbyState', expect.any(Object));

    // Session roomId should be null
    const updatedSession = getSessionByToken(session.token);
    expect(updatedSession!.roomId).toBeNull();

    // socket.data.session should be updated
    expect(socket.data.session!.roomId).toBeNull();
  });

  it('transfers ownership when owner leaves with remaining players', () => {
    setOtp('C1C-K9M');
    const pending = createPendingSession('C1C-K9M');
    const ownerSession = createSession(pending.id, 'Alice', 'socket-1');

    _addRoomForTest(makeRoom({
      ownerId: ownerSession.token,
      players: [
        { id: ownerSession.token, username: 'Alice', isConnected: true },
        { id: 'player-2', username: 'Bob', isConnected: true },
      ],
    }));

    const socket = createMockSocket(
      { session: { ...ownerSession, roomId: 'room-1' }, authType: 'token' },
      'socket-1',
    );
    const io = createMockServer();

    handleLeaveRoom(socket, io);

    // Room should still exist with new owner
    const room = getRoomById('room-1');
    expect(room).not.toBeNull();
    expect(room!.ownerId).toBe('player-2');
    expect(room!.players).toHaveLength(1);
  });

  it('deletes room when last player leaves', () => {
    setOtp('D1D-K9M');
    const pending = createPendingSession('D1D-K9M');
    const session = createSession(pending.id, 'Alice', 'socket-1');

    _addRoomForTest(makeRoom({
      ownerId: session.token,
      players: [{ id: session.token, username: 'Alice', isConnected: true }],
    }));

    const socket = createMockSocket(
      { session: { ...session, roomId: 'room-1' }, authType: 'token' },
      'socket-1',
    );
    const io = createMockServer();

    handleLeaveRoom(socket, io);

    // Room should be deleted
    expect(getRoomById('room-1')).toBeNull();
    expect(getRooms()).toHaveLength(0);

    // Should NOT emit roomState to room (no one left)
    expect((io as any).to).not.toHaveBeenCalled();

    // Should still broadcast lobby state (room disappeared)
    expect(io.emit).toHaveBeenCalledWith('lobbyState', expect.any(Object));
  });

  it('emits VALIDATION_ERROR when not in a room', () => {
    setOtp('E1E-K9M');
    const pending = createPendingSession('E1E-K9M');
    const session = createSession(pending.id, 'Alice', 'socket-1');

    const socket = createMockSocket(
      { session: { ...session }, authType: 'token' },
      'socket-1',
    );
    const io = createMockServer();

    handleLeaveRoom(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'VALIDATION_ERROR',
      message: 'Not in a room',
    });
  });

  it('emits AUTH_ERROR when not authenticated', () => {
    const socket = createMockSocket({});
    const io = createMockServer();

    handleLeaveRoom(socket, io);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      code: 'AUTH_ERROR',
      message: 'Not authenticated',
    });
  });
});

describe('registerLobbyHandlers', () => {
  it('registers createRoom, joinRoom, and leaveRoom event handlers', () => {
    const handlers = new Map<string, Function>();
    const socket = {
      ...createMockSocket(),
      on: vi.fn((event: string, handler: Function) => { handlers.set(event, handler); }),
    } as unknown as AppSocket;
    const io = createMockServer();

    registerLobbyHandlers(socket, io);

    expect(socket.on).toHaveBeenCalledWith('createRoom', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('joinRoom', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('leaveRoom', expect.any(Function));
    expect(handlers.has('createRoom')).toBe(true);
    expect(handlers.has('joinRoom')).toBe(true);
    expect(handlers.has('leaveRoom')).toBe(true);
  });
});
