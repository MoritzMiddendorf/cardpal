import { describe, it, expect, beforeEach } from 'vitest';
import { getRooms, getRoomById, clearRooms, GAME_MIN_PLAYERS, GAME_MAX_PLAYERS, _addRoomForTest, createRoom, toRoomState, addPlayerToRoom, removePlayerFromRoom, updateRoomGameType, setRoomStatus, setPlayerConnected } from './rooms.js';
import type { Room } from './rooms.js';
import { GameType } from '@cardpal/shared';

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

describe('Room State Management', () => {
  beforeEach(() => {
    clearRooms();
  });

  describe('getRooms', () => {
    it('returns empty array when no rooms exist', () => {
      expect(getRooms()).toEqual([]);
    });

    it('returns RoomInfo summaries for existing rooms', () => {
      _addRoomForTest(makeRoom());
      const rooms = getRooms();
      expect(rooms).toHaveLength(1);
      expect(rooms[0]).toEqual({
        id: 'room-1',
        name: 'Test Room',
        gameType: GameType.BLACKJACK,
        playerCount: 1,
        maxPlayers: 4,
        status: 'lobby',
      });
    });

    it('calculates playerCount from players array length', () => {
      _addRoomForTest(makeRoom({
        players: [
          { id: 'p1', username: 'Alice', isConnected: true },
          { id: 'p2', username: 'Bob', isConnected: true },
          { id: 'p3', username: 'Charlie', isConnected: false },
        ],
      }));
      const rooms = getRooms();
      expect(rooms[0]!.playerCount).toBe(3);
    });

    it('uses correct maxPlayers per game type', () => {
      _addRoomForTest(makeRoom({ id: 'bj', gameType: GameType.BLACKJACK }));
      _addRoomForTest(makeRoom({ id: 'sb', gameType: GameType.SKIPBO }));
      const rooms = getRooms();
      const bj = rooms.find((r) => r.id === 'bj');
      const sb = rooms.find((r) => r.id === 'sb');
      expect(bj!.maxPlayers).toBe(4);
      expect(sb!.maxPlayers).toBe(6);
    });

    it('returns multiple rooms', () => {
      _addRoomForTest(makeRoom({ id: 'r1', name: 'Room A' }));
      _addRoomForTest(makeRoom({ id: 'r2', name: 'Room B' }));
      expect(getRooms()).toHaveLength(2);
    });
  });

  describe('getRoomById', () => {
    it('returns null for non-existent room', () => {
      expect(getRoomById('non-existent')).toBeNull();
    });

    it('returns room data for existing room', () => {
      _addRoomForTest(makeRoom());
      const room = getRoomById('room-1');
      expect(room).not.toBeNull();
      expect(room!.id).toBe('room-1');
      expect(room!.name).toBe('Test Room');
      expect(room!.gameType).toBe(GameType.BLACKJACK);
      expect(room!.players).toHaveLength(1);
    });

    it('returns a copy — mutating result does not affect internal state', () => {
      _addRoomForTest(makeRoom());
      const room = getRoomById('room-1')!;
      room.name = 'Mutated';
      room.players.push({ id: 'extra', username: 'Hacker', isConnected: true });

      const original = getRoomById('room-1')!;
      expect(original.name).toBe('Test Room');
      expect(original.players).toHaveLength(1);
    });
  });

  describe('clearRooms', () => {
    it('can be called without throwing', () => {
      expect(() => clearRooms()).not.toThrow();
    });

    it('removes all rooms', () => {
      _addRoomForTest(makeRoom({ id: 'r1' }));
      _addRoomForTest(makeRoom({ id: 'r2' }));
      expect(getRooms()).toHaveLength(2);
      clearRooms();
      expect(getRooms()).toEqual([]);
    });
  });

  describe('createRoom', () => {
    it('returns a Room with valid UUID id', () => {
      const room = createRoom(GameType.BLACKJACK, 'owner-token', 'Alice');
      expect(room.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('generates a readable room name in Word-Word format', () => {
      const room = createRoom(GameType.BLACKJACK, 'owner-token', 'Alice');
      expect(room.name).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+$/);
    });

    it('sets status to lobby', () => {
      const room = createRoom(GameType.BLACKJACK, 'owner-token', 'Alice');
      expect(room.status).toBe('lobby');
    });

    it('sets ownerId to ownerToken', () => {
      const room = createRoom(GameType.BLACKJACK, 'owner-token', 'Alice');
      expect(room.ownerId).toBe('owner-token');
    });

    it('places owner as first player with isConnected=true', () => {
      const room = createRoom(GameType.BLACKJACK, 'owner-token', 'Alice');
      expect(room.players).toHaveLength(1);
      expect(room.players[0]).toEqual({
        id: 'owner-token',
        username: 'Alice',
        isConnected: true,
      });
    });

    it('stores the correct gameType', () => {
      const bj = createRoom(GameType.BLACKJACK, 'token', 'Alice');
      const sb = createRoom(GameType.SKIPBO, 'token2', 'Bob');
      expect(bj.gameType).toBe(GameType.BLACKJACK);
      expect(sb.gameType).toBe(GameType.SKIPBO);
    });

    it('returns a copy, not a reference to internal state', () => {
      const room = createRoom(GameType.BLACKJACK, 'owner-token', 'Alice');
      room.name = 'Mutated';
      room.players.push({ id: 'extra', username: 'Hacker', isConnected: true });

      const stored = getRoomById(room.id)!;
      expect(stored.name).not.toBe('Mutated');
      expect(stored.players).toHaveLength(1);
    });

    it('deep-copies player objects — mutating player properties does not affect internal state', () => {
      const room = createRoom(GameType.BLACKJACK, 'owner-token', 'Alice');
      room.players[0]!.username = 'Hacked';

      const stored = getRoomById(room.id)!;
      expect(stored.players[0]!.username).toBe('Alice');
    });

    it('makes room visible in getRooms()', () => {
      const room = createRoom(GameType.BLACKJACK, 'owner-token', 'Alice');
      const rooms = getRooms();
      expect(rooms).toHaveLength(1);
      expect(rooms[0]!.id).toBe(room.id);
    });
  });

  describe('toRoomState', () => {
    it('converts Room to RoomState with isOwner flag', () => {
      const room = makeRoom({
        players: [
          { id: 'owner-token', username: 'Alice', isConnected: true },
          { id: 'other-token', username: 'Bob', isConnected: true },
        ],
      });
      _addRoomForTest(room);

      const state = toRoomState(room);
      expect(state.players).toHaveLength(2);
      expect(state.players[0]).toEqual({
        id: 'owner-token',
        username: 'Alice',
        isOwner: true,
        isConnected: true,
      });
      expect(state.players[1]).toEqual({
        id: 'other-token',
        username: 'Bob',
        isOwner: false,
        isConnected: true,
      });
    });

    it('preserves all room fields', () => {
      const room = makeRoom();
      const state = toRoomState(room);
      expect(state.id).toBe(room.id);
      expect(state.name).toBe(room.name);
      expect(state.gameType).toBe(room.gameType);
      expect(state.status).toBe(room.status);
      expect(state.ownerId).toBe(room.ownerId);
    });

    it('handles disconnected players', () => {
      const room = makeRoom({
        players: [
          { id: 'owner-token', username: 'Alice', isConnected: true },
          { id: 'other-token', username: 'Bob', isConnected: false },
        ],
      });
      const state = toRoomState(room);
      expect(state.players[1]!.isConnected).toBe(false);
    });
  });

  describe('addPlayerToRoom', () => {
    it('adds a player to an existing room', () => {
      _addRoomForTest(makeRoom());
      const result = addPlayerToRoom('room-1', 'player-2', 'Bob');
      expect(result).not.toBeNull();
      expect(result!.players).toHaveLength(2);
      expect(result!.players[1]).toEqual({
        id: 'player-2',
        username: 'Bob',
        isConnected: true,
      });
    });

    it('returns null for non-existent room', () => {
      const result = addPlayerToRoom('non-existent', 'player-1', 'Alice');
      expect(result).toBeNull();
    });

    it('handles duplicate player (idempotent)', () => {
      _addRoomForTest(makeRoom());
      const result = addPlayerToRoom('room-1', 'owner-token', 'Alice');
      expect(result).not.toBeNull();
      expect(result!.players).toHaveLength(1);
    });

    it('returns a copy — mutating result does not affect internal state', () => {
      _addRoomForTest(makeRoom());
      const result = addPlayerToRoom('room-1', 'player-2', 'Bob')!;
      result.players.push({ id: 'extra', username: 'Hacker', isConnected: true });

      const stored = getRoomById('room-1')!;
      expect(stored.players).toHaveLength(2);
    });

    it('deep-copies player objects', () => {
      _addRoomForTest(makeRoom());
      const result = addPlayerToRoom('room-1', 'player-2', 'Bob')!;
      result.players[0]!.username = 'Hacked';

      const stored = getRoomById('room-1')!;
      expect(stored.players[0]!.username).toBe('Alice');
    });

    it('returns null when room is at max capacity', () => {
      const fullPlayers = Array.from({ length: GAME_MAX_PLAYERS[GameType.BLACKJACK] }, (_, i) => ({
        id: `player-${i}`,
        username: `Player${i}`,
        isConnected: true,
      }));
      _addRoomForTest(makeRoom({ players: fullPlayers, ownerId: 'player-0' }));
      const result = addPlayerToRoom('room-1', 'extra-player', 'Extra');
      expect(result).toBeNull();
    });
  });

  describe('removePlayerFromRoom', () => {
    it('removes a player from a room', () => {
      _addRoomForTest(makeRoom({
        players: [
          { id: 'owner-token', username: 'Alice', isConnected: true },
          { id: 'player-2', username: 'Bob', isConnected: true },
        ],
      }));
      const { room, deleted } = removePlayerFromRoom('room-1', 'player-2');
      expect(deleted).toBe(false);
      expect(room).not.toBeNull();
      expect(room!.players).toHaveLength(1);
      expect(room!.players[0]!.id).toBe('owner-token');
    });

    it('transfers ownership when owner leaves with remaining players', () => {
      _addRoomForTest(makeRoom({
        players: [
          { id: 'owner-token', username: 'Alice', isConnected: true },
          { id: 'player-2', username: 'Bob', isConnected: true },
          { id: 'player-3', username: 'Charlie', isConnected: true },
        ],
      }));
      const { room, deleted } = removePlayerFromRoom('room-1', 'owner-token');
      expect(deleted).toBe(false);
      expect(room).not.toBeNull();
      expect(room!.ownerId).toBe('player-2');
      expect(room!.players).toHaveLength(2);
    });

    it('deletes room when last player leaves', () => {
      _addRoomForTest(makeRoom());
      const { room, deleted } = removePlayerFromRoom('room-1', 'owner-token');
      expect(deleted).toBe(true);
      expect(room).toBeNull();
      expect(getRoomById('room-1')).toBeNull();
    });

    it('returns null room and deleted=false for non-existent room', () => {
      const { room, deleted } = removePlayerFromRoom('non-existent', 'player-1');
      expect(room).toBeNull();
      expect(deleted).toBe(false);
    });

    it('returns a copy — mutating result does not affect internal state', () => {
      _addRoomForTest(makeRoom({
        players: [
          { id: 'owner-token', username: 'Alice', isConnected: true },
          { id: 'player-2', username: 'Bob', isConnected: true },
        ],
      }));
      const { room } = removePlayerFromRoom('room-1', 'player-2');
      room!.players.push({ id: 'extra', username: 'Hacker', isConnected: true });

      const stored = getRoomById('room-1')!;
      expect(stored.players).toHaveLength(1);
    });

    it('deep-copies player objects', () => {
      _addRoomForTest(makeRoom({
        players: [
          { id: 'owner-token', username: 'Alice', isConnected: true },
          { id: 'player-2', username: 'Bob', isConnected: true },
        ],
      }));
      const { room } = removePlayerFromRoom('room-1', 'player-2');
      room!.players[0]!.username = 'Hacked';

      const stored = getRoomById('room-1')!;
      expect(stored.players[0]!.username).toBe('Alice');
    });
  });

  describe('GAME_MIN_PLAYERS', () => {
    it('has 2 min players for Blackjack', () => {
      expect(GAME_MIN_PLAYERS[GameType.BLACKJACK]).toBe(2);
    });

    it('has 2 min players for Skip-Bo', () => {
      expect(GAME_MIN_PLAYERS[GameType.SKIPBO]).toBe(2);
    });
  });

  describe('GAME_MAX_PLAYERS', () => {
    it('has 4 max players for Blackjack', () => {
      expect(GAME_MAX_PLAYERS[GameType.BLACKJACK]).toBe(4);
    });

    it('has 6 max players for Skip-Bo', () => {
      expect(GAME_MAX_PLAYERS[GameType.SKIPBO]).toBe(6);
    });
  });

  describe('updateRoomGameType', () => {
    it('updates game type for lobby room and returns deep copy', () => {
      _addRoomForTest(makeRoom({ gameType: GameType.BLACKJACK }));
      const result = updateRoomGameType('room-1', GameType.SKIPBO);
      expect(result).not.toBeNull();
      expect(result!.gameType).toBe(GameType.SKIPBO);

      // Verify internal state updated
      const stored = getRoomById('room-1')!;
      expect(stored.gameType).toBe(GameType.SKIPBO);
    });

    it('returns null for non-existent room', () => {
      expect(updateRoomGameType('non-existent', GameType.SKIPBO)).toBeNull();
    });

    it('returns null when room is in playing status', () => {
      _addRoomForTest(makeRoom({ status: 'playing' }));
      expect(updateRoomGameType('room-1', GameType.SKIPBO)).toBeNull();

      // Verify game type unchanged
      const stored = getRoomById('room-1')!;
      expect(stored.gameType).toBe(GameType.BLACKJACK);
    });

    it('returns a copy — mutating result does not affect internal state', () => {
      _addRoomForTest(makeRoom());
      const result = updateRoomGameType('room-1', GameType.SKIPBO)!;
      result.name = 'Mutated';
      const stored = getRoomById('room-1')!;
      expect(stored.name).toBe('Test Room');
    });
  });

  describe('setRoomStatus', () => {
    it('changes status from lobby to playing', () => {
      _addRoomForTest(makeRoom({ status: 'lobby' }));
      const result = setRoomStatus('room-1', 'playing');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('playing');

      const stored = getRoomById('room-1')!;
      expect(stored.status).toBe('playing');
    });

    it('changes status from playing to lobby', () => {
      _addRoomForTest(makeRoom({ status: 'playing' }));
      const result = setRoomStatus('room-1', 'lobby');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('lobby');
    });

    it('returns null for non-existent room', () => {
      expect(setRoomStatus('non-existent', 'playing')).toBeNull();
    });

    it('returns a copy — mutating result does not affect internal state', () => {
      _addRoomForTest(makeRoom());
      const result = setRoomStatus('room-1', 'playing')!;
      result.name = 'Mutated';
      const stored = getRoomById('room-1')!;
      expect(stored.name).toBe('Test Room');
    });
  });

  describe('setPlayerConnected', () => {
    it('marks a player as disconnected', () => {
      _addRoomForTest(makeRoom({
        players: [
          { id: 'owner-token', username: 'Alice', isConnected: true },
          { id: 'player-2', username: 'Bob', isConnected: true },
        ],
      }));

      const result = setPlayerConnected('room-1', 'player-2', false);
      expect(result).not.toBeNull();
      expect(result!.players.find((p) => p.id === 'player-2')!.isConnected).toBe(false);
      expect(result!.players.find((p) => p.id === 'owner-token')!.isConnected).toBe(true);

      // Verify internal state updated
      const stored = getRoomById('room-1')!;
      expect(stored.players.find((p) => p.id === 'player-2')!.isConnected).toBe(false);
    });

    it('marks a player as connected', () => {
      _addRoomForTest(makeRoom({
        players: [
          { id: 'owner-token', username: 'Alice', isConnected: true },
          { id: 'player-2', username: 'Bob', isConnected: false },
        ],
      }));

      const result = setPlayerConnected('room-1', 'player-2', true);
      expect(result).not.toBeNull();
      expect(result!.players.find((p) => p.id === 'player-2')!.isConnected).toBe(true);
    });

    it('returns null for non-existent room', () => {
      expect(setPlayerConnected('non-existent', 'player-1', false)).toBeNull();
    });

    it('returns null for non-existent player', () => {
      _addRoomForTest(makeRoom());
      expect(setPlayerConnected('room-1', 'non-existent', false)).toBeNull();
    });
  });
});
