import type { Card, GameState } from '@cardpal/shared';
import { GameType } from '@cardpal/shared';

export interface BlackjackPlayerHand {
  playerId: string;
  cards: Card[];
  isBust: boolean;
  hasStood: boolean;
}

export interface BlackjackState extends GameState {
  gameType: GameType.BLACKJACK;
  deck: Card[];
  playerHands: BlackjackPlayerHand[];
  dealerCards: Card[];
  dealerDone: boolean;
}
