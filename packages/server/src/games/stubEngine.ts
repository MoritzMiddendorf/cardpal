import { GameType } from '@cardpal/shared';
import type { GameState, GameAction, PlayerResult } from '@cardpal/shared';
import type { GameEngine } from './engine.js';

/**
 * Stub game engine for testing the startGame flow.
 * NOT used in production — only imported in test files.
 */
export const stubEngine: GameEngine = {
  getInitialState(players: Array<{ id: string; username: string }>): GameState {
    return {
      gameType: GameType.BLACKJACK,
      players: players.map((p) => p.id),
      currentPlayerIndex: 0,
      status: 'playing',
    };
  },

  getValidActions(_state: GameState, _playerId: string): GameAction[] {
    return [];
  },

  applyAction(state: GameState, _action: GameAction): GameState {
    return state;
  },

  isGameOver(_state: GameState): boolean {
    return false;
  },

  getWinner(_state: GameState): string | null {
    return null;
  },

  getResults(_state: GameState, _playerUsernames: Map<string, string>): PlayerResult[] {
    return [];
  },
};
