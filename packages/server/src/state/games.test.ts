import { describe, it, expect, beforeEach } from 'vitest';
import { createGame, getGame, updateGameState, removeGame, clearGames, _addGameForTest, setPaused } from './games.js';
import type { GameInstance } from '../games/engine.js';
import type { GameEngine } from '../games/engine.js';
import { GameType } from '@cardpal/shared';
import type { GameState } from '@cardpal/shared';

const mockEngine: GameEngine = {
  getInitialState(players) {
    return {
      gameType: GameType.BLACKJACK,
      players: players.map((p) => p.id),
      currentPlayerIndex: 0,
      status: 'playing',
    };
  },
  getValidActions(_state, _playerId) {
    return [];
  },
  applyAction(state, _action) {
    return state;
  },
  isGameOver(state) {
    return state.status === 'finished';
  },
  getWinner(_state) {
    return null;
  },
};

const testPlayers = [
  { id: 'p1', username: 'Alice' },
  { id: 'p2', username: 'Bob' },
];

describe('Game State Management', () => {
  beforeEach(() => {
    clearGames();
  });

  describe('createGame', () => {
    it('creates a game instance and stores it', () => {
      const instance = createGame('room-1', GameType.BLACKJACK, mockEngine, testPlayers);
      expect(instance.roomId).toBe('room-1');
      expect(instance.gameType).toBe(GameType.BLACKJACK);
      expect(instance.state.players).toEqual(['p1', 'p2']);
      expect(instance.state.status).toBe('playing');
      expect(instance.playerUsernames.get('p1')).toBe('Alice');
      expect(instance.playerUsernames.get('p2')).toBe('Bob');
    });

    it('makes game retrievable via getGame', () => {
      createGame('room-1', GameType.BLACKJACK, mockEngine, testPlayers);
      const retrieved = getGame('room-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.roomId).toBe('room-1');
    });

    it('returns a deep copy — mutating result does not affect internal state', () => {
      const instance = createGame('room-1', GameType.BLACKJACK, mockEngine, testPlayers);
      instance.state.players.push('hacker');
      instance.playerUsernames.set('hacker', 'Evil');

      const stored = getGame('room-1')!;
      expect(stored.state.players).toEqual(['p1', 'p2']);
      expect(stored.playerUsernames.has('hacker')).toBe(false);
    });

    it('calls engine.getInitialState with players', () => {
      const instance = createGame('room-1', GameType.BLACKJACK, mockEngine, testPlayers);
      expect(instance.state.currentPlayerIndex).toBe(0);
      expect(instance.state.gameType).toBe(GameType.BLACKJACK);
    });
  });

  describe('getGame', () => {
    it('returns null for non-existent game', () => {
      expect(getGame('non-existent')).toBeNull();
    });

    it('returns deep copy of existing game', () => {
      createGame('room-1', GameType.BLACKJACK, mockEngine, testPlayers);
      const game = getGame('room-1')!;
      expect(game.roomId).toBe('room-1');
      expect(game.state.players).toEqual(['p1', 'p2']);
    });

    it('deep-copies state — mutating returned state does not affect internal state', () => {
      createGame('room-1', GameType.BLACKJACK, mockEngine, testPlayers);
      const game = getGame('room-1')!;
      game.state.status = 'finished';
      game.state.players.push('extra');

      const stored = getGame('room-1')!;
      expect(stored.state.status).toBe('playing');
      expect(stored.state.players).toEqual(['p1', 'p2']);
    });

    it('deep-copies playerUsernames', () => {
      createGame('room-1', GameType.BLACKJACK, mockEngine, testPlayers);
      const game = getGame('room-1')!;
      game.playerUsernames.set('extra', 'Hacker');

      const stored = getGame('room-1')!;
      expect(stored.playerUsernames.has('extra')).toBe(false);
    });
  });

  describe('updateGameState', () => {
    it('updates the game state', () => {
      createGame('room-1', GameType.BLACKJACK, mockEngine, testPlayers);
      const newState: GameState = {
        gameType: GameType.BLACKJACK,
        players: ['p1', 'p2'],
        currentPlayerIndex: 1,
        status: 'finished',
      };
      const updated = updateGameState('room-1', newState);
      expect(updated).not.toBeNull();
      expect(updated!.state.currentPlayerIndex).toBe(1);
      expect(updated!.state.status).toBe('finished');
    });

    it('returns null for non-existent game', () => {
      expect(updateGameState('non-existent', {
        gameType: GameType.BLACKJACK,
        players: [],
        currentPlayerIndex: 0,
        status: 'playing',
      })).toBeNull();
    });

    it('returns a deep copy', () => {
      createGame('room-1', GameType.BLACKJACK, mockEngine, testPlayers);
      const newState: GameState = {
        gameType: GameType.BLACKJACK,
        players: ['p1', 'p2'],
        currentPlayerIndex: 1,
        status: 'playing',
      };
      const updated = updateGameState('room-1', newState)!;
      updated.state.status = 'finished';

      const stored = getGame('room-1')!;
      expect(stored.state.status).toBe('playing');
    });

    it('deep-copies input state — mutating input after call does not affect internal state', () => {
      createGame('room-1', GameType.BLACKJACK, mockEngine, testPlayers);
      const newState: GameState = {
        gameType: GameType.BLACKJACK,
        players: ['p1', 'p2'],
        currentPlayerIndex: 1,
        status: 'playing',
      };
      updateGameState('room-1', newState);
      newState.status = 'finished';
      newState.players.push('hacker');

      const stored = getGame('room-1')!;
      expect(stored.state.status).toBe('playing');
      expect(stored.state.players).toEqual(['p1', 'p2']);
    });
  });

  describe('removeGame', () => {
    it('removes existing game and returns true', () => {
      createGame('room-1', GameType.BLACKJACK, mockEngine, testPlayers);
      expect(removeGame('room-1')).toBe(true);
      expect(getGame('room-1')).toBeNull();
    });

    it('returns false for non-existent game', () => {
      expect(removeGame('non-existent')).toBe(false);
    });
  });

  describe('clearGames', () => {
    it('removes all games', () => {
      createGame('room-1', GameType.BLACKJACK, mockEngine, testPlayers);
      createGame('room-2', GameType.SKIPBO, mockEngine, testPlayers);
      clearGames();
      expect(getGame('room-1')).toBeNull();
      expect(getGame('room-2')).toBeNull();
    });

    it('can be called safely when no games exist', () => {
      expect(() => clearGames()).not.toThrow();
    });
  });

  describe('setPaused', () => {
    it('pauses a game for a specific player', () => {
      createGame('room-1', GameType.BLACKJACK, mockEngine, testPlayers);
      const result = setPaused('room-1', true, 'p1');
      expect(result).not.toBeNull();
      expect(result!.isPaused).toBe(true);
      expect(result!.pausedForPlayerId).toBe('p1');

      // Verify internal state updated
      const stored = getGame('room-1')!;
      expect(stored.isPaused).toBe(true);
      expect(stored.pausedForPlayerId).toBe('p1');
    });

    it('unpauses a game', () => {
      createGame('room-1', GameType.BLACKJACK, mockEngine, testPlayers);
      setPaused('room-1', true, 'p1');
      const result = setPaused('room-1', false, null);
      expect(result).not.toBeNull();
      expect(result!.isPaused).toBe(false);
      expect(result!.pausedForPlayerId).toBeNull();

      const stored = getGame('room-1')!;
      expect(stored.isPaused).toBe(false);
    });

    it('returns null for non-existent room', () => {
      expect(setPaused('non-existent', true, 'p1')).toBeNull();
    });

    it('newly created games are not paused', () => {
      const instance = createGame('room-1', GameType.BLACKJACK, mockEngine, testPlayers);
      expect(instance.isPaused).toBe(false);
      expect(instance.pausedForPlayerId).toBeNull();
    });
  });

  describe('_addGameForTest', () => {
    it('directly adds a game instance', () => {
      const instance: GameInstance = {
        roomId: 'test-room',
        gameType: GameType.BLACKJACK,
        state: {
          gameType: GameType.BLACKJACK,
          players: ['p1'],
          currentPlayerIndex: 0,
          status: 'playing',
        },
        engine: mockEngine,
        playerUsernames: new Map([['p1', 'Alice']]),
        isPaused: false,
        pausedForPlayerId: null,
      };
      _addGameForTest(instance);
      const retrieved = getGame('test-room');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.state.players).toEqual(['p1']);
    });
  });
});
