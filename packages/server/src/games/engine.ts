import type { GameType, GameAction, GameState, FilteredGameState, PlayerResult } from '@cardpal/shared';

/**
 * Generic game engine interface that all game implementations must fulfill.
 * Each game (Blackjack, Skip-Bo) provides its own implementation.
 *
 * @typeParam TState - Game-specific state extending the base GameState
 */
export interface GameEngine<TState extends GameState = GameState> {
  /**
   * Create the initial game state for a new game.
   * @param players - Players in the game with their IDs and usernames
   * @returns The initial game state ready for play
   */
  getInitialState(players: Array<{ id: string; username: string }>): TState;

  /**
   * Get the list of valid actions a player can take in the current state.
   * @param state - Current game state
   * @param playerId - The player requesting valid actions
   * @returns Array of valid actions (empty if not the player's turn or game is over)
   */
  getValidActions(state: TState, playerId: string): GameAction[];

  /**
   * Apply a player action to the current state, producing a new state.
   * @param state - Current game state
   * @param action - The action to apply
   * @returns New game state after the action
   * @throws Error if the action is invalid for the current state
   */
  applyAction(state: TState, action: GameAction): TState;

  /**
   * Check if the game has ended.
   * @param state - Current game state
   * @returns true if the game is over (status === 'finished')
   */
  isGameOver(state: TState): boolean;

  /**
   * Get the winner of a finished game.
   * @param state - Current game state
   * @returns Player ID of the winner, or null for a draw or if game is not finished
   */
  getWinner(state: TState): string | null;

  /**
   * Get per-player results for a finished game.
   * @param state - Current game state
   * @param playerUsernames - Map of player IDs to usernames
   * @returns Array of per-player results, or empty array if game is not finished
   */
  getResults(state: TState, playerUsernames: Map<string, string>): PlayerResult[];
}

/**
 * Runtime game instance combining state with the engine that manages it.
 * Stored in the games Map, keyed by roomId.
 */
export interface GameInstance {
  roomId: string;
  gameType: GameType;
  state: GameState;
  engine: GameEngine;
  playerUsernames: Map<string, string>;
  isPaused: boolean;
  pausedForPlayerId: string | null;
}

/**
 * Create a per-player filtered view of the game state.
 * Each player sees their own hand but only public info about opponents.
 * Actual implementation is game-specific (Story 3-5).
 *
 * @param instance - The game instance to filter
 * @param playerId - The player receiving the filtered state
 * @returns Filtered game state safe to send to the specific player
 */
export type FilterGameStateFn = (instance: GameInstance, playerId: string) => FilteredGameState;

// --- Game Engine Registry ---

const gameEngines = new Map<GameType, GameEngine>();

export function registerEngine(gameType: GameType, engine: GameEngine): void {
  gameEngines.set(gameType, engine);
}

export function getEngine(gameType: GameType): GameEngine | null {
  return gameEngines.get(gameType) ?? null;
}

/** @internal Test-only helper — clears all registered engines. */
export function clearEngines(): void {
  gameEngines.clear();
}
