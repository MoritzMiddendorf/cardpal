export enum GameType {
  BLACKJACK = 'blackjack',
  SKIPBO = 'skipbo',
}

export interface Card {
  suit: string;
  rank: string;
  faceUp: boolean;
}

export interface GameAction {
  type: string;
  playerId: string;
  payload?: Record<string, unknown>;
}

export interface GameState {
  players: string[];
  currentPlayerIndex: number;
  status: 'waiting' | 'playing' | 'finished';
}

export interface PlayerGameState {
  gameState: GameState;
  hand: Card[];
  validActions: GameAction[];
}

/** Server-filtered game state sent to each player (private cards removed). */
export type FilteredGameState = PlayerGameState;
