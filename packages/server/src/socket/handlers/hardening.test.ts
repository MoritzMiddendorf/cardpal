import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleGameAction, broadcastGameState, syncPauseState } from './gameHandlers.js';
import { handleCreateRoom, handleJoinRoom, handleLeaveRoom } from './lobbyHandlers.js';
import { handleAuthenticate } from './authHandlers.js';
import { safeHandler } from '../safeHandler.js';
import { clearRooms, _addRoomForTest, setPlayerConnected } from '../../state/rooms.js';
import { clearSessions, createPendingSession, createSession, clearPendingSessions } from '../../state/sessions.js';
import { setOtp, clearOtp } from '../../state/otp.js';
import { clearGames, getGame, createGame } from '../../state/games.js';
import { blackjackEngine } from '../../games/blackjack/index.js';
import { GameType } from '@cardpal/shared';
import type { AppSocket, AppServer } from '../types.js';

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
  const emits: Array<{ target: string | null; args: unknown[] }> = [];
  return {
    emit: vi.fn((...args: unknown[]) => emits.push({ target: null, args })),
    to: vi.fn((target: string) => ({ emit: (...args: unknown[]) => emits.push({ target, args }) })),
    _emits: emits,
  } as unknown as AppServer & { _emits: typeof emits };
}

function newSession(username: string, socketId: string) {
  setOtp('A7X-K9M');
  return createSession(createPendingSession('A7X-K9M').id, username, socketId);
}

beforeEach(() => {
  clearRooms();
  clearSessions();
  clearPendingSessions();
  clearOtp();
  clearGames();
});

describe('session token confidentiality', () => {
  it('never broadcasts a session token in room or game state', () => {
    const alice = newSession('Alice', 'socket-a');
    const bob = newSession('Bob', 'socket-b');
    const io = createMockServer();

    const aliceSocket = createMockSocket({ session: alice, authType: 'token' }, 'socket-a');
    handleCreateRoom(aliceSocket, io, { gameType: GameType.BLACKJACK });
    const roomId = (aliceSocket.emit as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[0] === 'roomState')![1].id;

    const bobSocket = createMockSocket({ session: bob, authType: 'token' }, 'socket-b');
    handleJoinRoom(bobSocket, io, { roomId });

    createGame(roomId, GameType.BLACKJACK, blackjackEngine, [
      { id: alice.playerId, username: 'Alice' },
      { id: bob.playerId, username: 'Bob' },
    ]);
    broadcastGameState(roomId, io);

    const everythingSent = JSON.stringify([
      (aliceSocket.emit as ReturnType<typeof vi.fn>).mock.calls,
      (bobSocket.emit as ReturnType<typeof vi.fn>).mock.calls,
      io._emits,
    ]);
    expect(everythingSent).toContain(alice.playerId);
    expect(everythingSent).not.toContain(alice.token);
    expect(everythingSent).not.toContain(bob.token);
  });
});

describe('malformed payloads', () => {
  it('rejects createRoom without a payload instead of throwing', () => {
    const socket = createMockSocket({ session: newSession('Alice', 'socket-1'), authType: 'token' });
    expect(() => handleCreateRoom(socket, createMockServer(), undefined as never)).not.toThrow();
    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'VALIDATION_ERROR' }));
  });

  it('rejects authenticate without a payload instead of throwing', () => {
    const socket = createMockSocket();
    expect(() => handleAuthenticate(socket, createMockServer(), undefined as never)).not.toThrow();
    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'AUTH_ERROR' }));
  });

  it('safeHandler turns a throwing handler into an error event', () => {
    const socket = createMockSocket();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapped = safeHandler(socket, 'startGame', () => {
      throw new Error('boom');
    });
    expect(() => wrapped()).not.toThrow();
    expect(socket.emit).toHaveBeenCalledWith('error', { code: 'UNKNOWN_ERROR', message: 'Something went wrong' });
    errorSpy.mockRestore();
  });
});

describe('leaving during a game', () => {
  it('refuses to leave a room while its game is in progress', () => {
    const alice = newSession('Alice', 'socket-a');
    _addRoomForTest({
      id: 'room-1', name: 'R', gameType: GameType.BLACKJACK, status: 'playing', ownerId: alice.playerId,
      players: [{ id: alice.playerId, username: 'Alice', isConnected: true }],
    });
    const socket = createMockSocket({ session: { ...alice, roomId: 'room-1' }, authType: 'token' });
    handleLeaveRoom(socket, createMockServer());
    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'GAME_IN_PROGRESS' }));
    expect(socket.leave).not.toHaveBeenCalled();
  });
});

describe('pause on disconnected active player', () => {
  function setupGame() {
    const alice = newSession('Alice', 'socket-a');
    const bob = newSession('Bob', 'socket-b');
    _addRoomForTest({
      id: 'room-1', name: 'R', gameType: GameType.BLACKJACK, status: 'playing', ownerId: alice.playerId,
      players: [
        { id: alice.playerId, username: 'Alice', isConnected: true },
        { id: bob.playerId, username: 'Bob', isConnected: true },
      ],
    });
    createGame('room-1', GameType.BLACKJACK, blackjackEngine, [
      { id: alice.playerId, username: 'Alice' },
      { id: bob.playerId, username: 'Bob' },
    ]);
    return { alice, bob };
  }

  it('pauses when the turn passes to a player who is already disconnected', () => {
    const { alice, bob } = setupGame();
    setPlayerConnected('room-1', bob.playerId, false);
    syncPauseState('room-1');
    expect(getGame('room-1')!.isPaused).toBe(false); // it's Alice's turn, nothing to wait for

    const socket = createMockSocket({ session: { ...alice, roomId: 'room-1' }, authType: 'token' }, 'socket-a');
    handleGameAction(socket, createMockServer(), { type: 'stand', playerId: alice.playerId });

    const game = getGame('room-1')!;
    expect(game.state.players[game.state.currentPlayerIndex]).toBe(bob.playerId);
    expect(game.isPaused).toBe(true);
    expect(game.pausedForPlayerId).toBe(bob.playerId);
  });

  it('resumes once the active player is connected again', () => {
    const { alice } = setupGame();
    setPlayerConnected('room-1', alice.playerId, false);
    syncPauseState('room-1');
    expect(getGame('room-1')!.isPaused).toBe(true);

    setPlayerConnected('room-1', alice.playerId, true);
    syncPauseState('room-1');
    expect(getGame('room-1')!.isPaused).toBe(false);
  });
});
