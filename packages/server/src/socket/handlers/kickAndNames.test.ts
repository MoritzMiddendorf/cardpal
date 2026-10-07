import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleKickPlayer } from './lobbyHandlers.js';
import { handleSetUsername } from './authHandlers.js';
import { clearRooms, _addRoomForTest, getRoomById } from '../../state/rooms.js';
import { clearSessions, createPendingSession, createSession, clearPendingSessions, getSessionByToken, updateSessionRoomId } from '../../state/sessions.js';
import { setOtp, clearOtp } from '../../state/otp.js';
import { clearGames, getGame, createGame } from '../../state/games.js';
import { blackjackEngine } from '../../games/blackjack/index.js';
import { GameType } from '@cardpal/shared';
import type { AppSocket, AppServer } from '../types.js';

function createMockSocket(data: Partial<AppSocket['data']> = {}, id = 'socket-1') {
  return { id, emit: vi.fn(), join: vi.fn(), leave: vi.fn(), data: { ...data } as AppSocket['data'] } as unknown as AppSocket;
}

function createMockServer() {
  const emits: Array<{ target: string; event: string; payload: unknown }> = [];
  return {
    emit: vi.fn(),
    to: vi.fn((target: string) => ({ emit: (event: string, payload: unknown) => emits.push({ target, event, payload }) })),
    in: vi.fn(() => ({ socketsLeave: vi.fn() })),
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

describe('handleKickPlayer', () => {
  function setup(status: 'lobby' | 'playing', bobConnected = true) {
    const alice = newSession('Alice', 'socket-a');
    const bob = newSession('Bob', 'socket-b');
    _addRoomForTest({
      id: 'room-1', name: 'Brave-Fox', gameType: GameType.BLACKJACK, status, ownerId: alice.playerId,
      players: [
        { id: alice.playerId, username: 'Alice', isConnected: true },
        { id: bob.playerId, username: 'Bob', isConnected: bobConnected },
      ],
    });
    updateSessionRoomId(alice.token, 'room-1');
    updateSessionRoomId(bob.token, 'room-1');
    if (status === 'playing') {
      createGame('room-1', GameType.BLACKJACK, blackjackEngine, [
        { id: alice.playerId, username: 'Alice' },
        { id: bob.playerId, username: 'Bob' },
      ]);
    }
    const aliceSocket = createMockSocket({ session: { ...alice, roomId: 'room-1' }, authType: 'token' }, 'socket-a');
    return { alice, bob, aliceSocket };
  }

  it('lets the host remove a player from the lobby and notifies them', () => {
    const { bob, aliceSocket } = setup('lobby');
    const io = createMockServer();
    handleKickPlayer(aliceSocket, io, { playerId: bob.playerId });

    expect(getRoomById('room-1')!.players.map((p) => p.username)).toEqual(['Alice']);
    expect(getSessionByToken(bob.token)!.roomId).toBeNull();
    expect(io._emits).toContainEqual({ target: 'socket-b', event: 'kicked', payload: { roomName: 'Brave-Fox' } });
  });

  it('refuses non-hosts', () => {
    const { alice, bob } = setup('lobby');
    const bobSocket = createMockSocket({ session: { ...bob, roomId: 'room-1' }, authType: 'token' }, 'socket-b');
    handleKickPlayer(bobSocket, createMockServer(), { playerId: alice.playerId });
    expect(bobSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'NOT_AUTHORIZED' }));
    expect(getRoomById('room-1')!.players).toHaveLength(2);
  });

  it('refuses kicking yourself', () => {
    const { alice, aliceSocket } = setup('lobby');
    handleKickPlayer(aliceSocket, createMockServer(), { playerId: alice.playerId });
    expect(aliceSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'VALIDATION_ERROR' }));
  });

  it('refuses kicking a connected player mid-game', () => {
    const { bob, aliceSocket } = setup('playing', true);
    handleKickPlayer(aliceSocket, createMockServer(), { playerId: bob.playerId });
    expect(aliceSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'GAME_IN_PROGRESS' }));
    expect(getGame('room-1')).not.toBeNull();
  });

  it('removes a disconnected player mid-game, ending the game', () => {
    const { bob, aliceSocket } = setup('playing', false);
    const io = createMockServer();
    handleKickPlayer(aliceSocket, io, { playerId: bob.playerId });

    expect(getGame('room-1')).toBeNull();
    expect(getRoomById('room-1')!.status).toBe('lobby');
    expect(getRoomById('room-1')!.players).toHaveLength(1);
    expect(io._emits).toContainEqual({ target: 'room-1', event: 'gameState', payload: null });
  });
});

describe('duplicate usernames', () => {
  it('rejects a name already in use, case-insensitively', () => {
    newSession('Alice', 'socket-a');
    const socket = createMockSocket({ pendingSessionId: createPendingSession('A7X-K9M').id, authType: 'pending' }, 'socket-x');
    handleSetUsername(socket, createMockServer(), { username: 'ALICE' });
    expect(socket.emit).toHaveBeenCalledWith('error', { code: 'VALIDATION_ERROR', message: 'That name is already taken' });
    expect(socket.data.session).toBeUndefined();
  });
});
