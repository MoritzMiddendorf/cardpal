export enum GameType {
  BLACKJACK = 'blackjack',
  SKIPBO = 'skipbo',
}

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export interface GameAction {
  type: string;
  playerId: string;
  payload?: Record<string, unknown>;
}

export interface GameState {
  gameType: GameType;
  players: string[];
  currentPlayerIndex: number;
  status: 'waiting' | 'playing' | 'finished';
}

export interface PlayerPublicInfo {
  id: string;
  username: string;
  cardCount: number;
  isActive: boolean;
  isBust: boolean;
  hasStood: boolean;
  isConnected: boolean;
}

export interface OtherPlayerHand {
  playerId: string;
  cards: Card[];
  handValue: number;
}

export type GameResult = 'win' | 'lose' | 'push';

export interface PlayerResult {
  playerId: string;
  username: string;
  result: GameResult;
  handValue: number;
}

// --- Skip-Bo Types ---

export interface SkipBoCard {
  value: number;  // 1-12 for numbered, 0 for wild
  isWild: boolean;
  faceUp: boolean;
}

export type SkipBoPile = SkipBoCard[];

export interface SkipBoPlayerState {
  playerId: string;
  stockPile: SkipBoPile;
  hand: SkipBoCard[];
  discardPiles: [SkipBoPile, SkipBoPile, SkipBoPile, SkipBoPile];
}

export interface SkipBoGameState extends GameState {
  gameType: GameType.SKIPBO;
  drawPile: SkipBoPile;
  buildingPiles: [SkipBoPile, SkipBoPile, SkipBoPile, SkipBoPile];
  playerStates: SkipBoPlayerState[];
}

export interface PileInfo {
  topCard: SkipBoCard | null;
  count: number;
}

export interface FilteredSkipBoState {
  myHand: SkipBoCard[];
  myStockPile: PileInfo;
  myDiscardPiles: [PileInfo, PileInfo, PileInfo, PileInfo];
  buildingPiles: [PileInfo, PileInfo, PileInfo, PileInfo];
  otherPlayers: {
    playerId: string;
    username: string;
    stockPile: PileInfo;
    discardPiles: [PileInfo, PileInfo, PileInfo, PileInfo];
    handCount: number;
    isConnected: boolean;
  }[];
  drawPileCount: number;
}

// --- Filtered Game State ---

export interface PlayerGameState {
  gameType: GameType;
  currentPlayerIndex: number;
  status: GameState['status'];
  players: PlayerPublicInfo[];
  myPlayerId: string;
  hand: Card[];
  handValue: number;
  validActions: GameAction[];
  dealerCards: Card[];
  dealerHandValue: number | null;
  otherPlayerHands: OtherPlayerHand[];
  results?: PlayerResult[];
  isPaused: boolean;
  pausedForPlayer: string | null;
  skipBoState?: FilteredSkipBoState;
}

/** Server-filtered game state sent to each player (private cards removed). */
export type FilteredGameState = PlayerGameState;
