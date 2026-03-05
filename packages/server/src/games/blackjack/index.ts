import { GameType } from '@cardpal/shared';
import type { GameAction, PlayerResult, GameResult } from '@cardpal/shared';
import type { GameEngine } from '../engine.js';
import type { BlackjackState, BlackjackPlayerHand } from './types.js';
import { createDeck, shuffleDeck, dealCard, calculateHandValue, isBust } from './rules.js';

function deepCopy(state: BlackjackState): BlackjackState {
  return JSON.parse(JSON.stringify(state));
}

/** Find the index of the next player who hasn't bust or stood. Returns -1 if none. */
function findNextActivePlayer(hands: BlackjackPlayerHand[], afterIndex: number): number {
  const count = hands.length;
  for (let offset = 1; offset <= count; offset++) {
    const idx = (afterIndex + offset) % count;
    const hand = hands[idx]!;
    if (!hand.isBust && !hand.hasStood) return idx;
  }
  return -1;
}

/** Check if all players have finished (bust or stood). */
function allPlayersDone(hands: BlackjackPlayerHand[]): boolean {
  return hands.every((h) => h.isBust || h.hasStood);
}

/** Auto-play the dealer: reveal face-down card, hit on ≤16, stand on 17+. */
function playDealer(state: BlackjackState): void {
  // Reveal face-down cards
  for (const card of state.dealerCards) {
    card.faceUp = true;
  }

  // Dealer draws while value ≤ 16
  while (calculateHandValue(state.dealerCards) <= 16 && state.deck.length > 0) {
    const result = dealCard(state.deck, true);
    state.dealerCards.push(result.card);
    state.deck = result.deck;
  }

  state.dealerDone = true;
  state.status = 'finished';
}

export const blackjackEngine: GameEngine<BlackjackState> = {
  getInitialState(players: Array<{ id: string; username: string }>): BlackjackState {
    let deck = shuffleDeck(createDeck());

    const playerHands: BlackjackPlayerHand[] = [];

    // Deal 2 face-up cards to each player
    for (const player of players) {
      const hand: BlackjackPlayerHand = {
        playerId: player.id,
        cards: [],
        isBust: false,
        hasStood: false,
      };

      for (let i = 0; i < 2; i++) {
        const result = dealCard(deck, true);
        hand.cards.push(result.card);
        deck = result.deck;
      }

      playerHands.push(hand);
    }

    // Deal 2 cards to dealer: first face-up, second face-down
    const dealer1 = dealCard(deck, true);
    deck = dealer1.deck;
    const dealer2 = dealCard(deck, false);
    deck = dealer2.deck;

    return {
      gameType: GameType.BLACKJACK,
      players: players.map((p) => p.id),
      currentPlayerIndex: 0,
      status: 'playing',
      deck,
      playerHands,
      dealerCards: [dealer1.card, dealer2.card],
      dealerDone: false,
    };
  },

  getValidActions(state: BlackjackState, playerId: string): GameAction[] {
    if (state.status !== 'playing') return [];

    const currentPlayerId = state.players[state.currentPlayerIndex];
    if (playerId !== currentPlayerId) return [];

    const hand = state.playerHands.find((h) => h.playerId === playerId);
    if (!hand || hand.isBust || hand.hasStood) return [];

    const value = calculateHandValue(hand.cards);

    if (value >= 21) {
      // At exactly 21 can only stand; > 21 shouldn't happen (bust already set)
      return [{ type: 'stand', playerId }];
    }

    return [
      { type: 'hit', playerId },
      { type: 'stand', playerId },
    ];
  },

  applyAction(state: BlackjackState, action: GameAction): BlackjackState {
    const s = deepCopy(state);

    if (s.status !== 'playing') {
      throw new Error('Game is already finished');
    }

    const currentPlayerId = s.players[s.currentPlayerIndex];
    if (action.playerId !== currentPlayerId) {
      throw new Error('Not your turn');
    }

    const hand = s.playerHands.find((h) => h.playerId === action.playerId);
    if (!hand) {
      throw new Error('Player not found');
    }

    if (hand.isBust || hand.hasStood) {
      throw new Error('Player has already finished their turn');
    }

    switch (action.type) {
      case 'hit': {
        if (s.deck.length === 0) throw new Error('Deck is empty');
        const result = dealCard(s.deck, true);
        hand.cards.push(result.card);
        s.deck = result.deck;

        if (isBust(hand.cards)) {
          hand.isBust = true;
          // Auto-advance turn
          if (allPlayersDone(s.playerHands)) {
            playDealer(s);
          } else {
            const next = findNextActivePlayer(s.playerHands, s.currentPlayerIndex);
            if (next !== -1) s.currentPlayerIndex = next;
          }
        }
        break;
      }

      case 'stand': {
        hand.hasStood = true;
        if (allPlayersDone(s.playerHands)) {
          playDealer(s);
        } else {
          const next = findNextActivePlayer(s.playerHands, s.currentPlayerIndex);
          if (next !== -1) s.currentPlayerIndex = next;
        }
        break;
      }

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    return s;
  },

  isGameOver(state: BlackjackState): boolean {
    return state.status === 'finished';
  },

  getWinner(state: BlackjackState): string | null {
    if (state.status !== 'finished') return null;

    const dealerValue = calculateHandValue(state.dealerCards);
    const dealerBust = dealerValue > 21;

    let bestPlayer: string | null = null;
    let bestOutcome: 'win' | 'push' | 'lose' = 'lose';

    for (const hand of state.playerHands) {
      if (hand.isBust) continue;

      const playerValue = calculateHandValue(hand.cards);

      let outcome: 'win' | 'push' | 'lose';
      if (dealerBust) {
        outcome = 'win';
      } else if (playerValue > dealerValue) {
        outcome = 'win';
      } else if (playerValue === dealerValue) {
        outcome = 'push';
      } else {
        outcome = 'lose';
      }

      // Prefer win over push; first winner wins
      if (outcome === 'win' && bestOutcome !== 'win') {
        bestPlayer = hand.playerId;
        bestOutcome = outcome;
      } else if (outcome === 'push' && bestOutcome === 'lose') {
        bestPlayer = hand.playerId;
        bestOutcome = outcome;
      }
    }

    // Return winner only if someone actually won; null for all-push or all-lose
    return bestOutcome === 'win' ? bestPlayer : null;
  },

  getResults(state: BlackjackState, playerUsernames: Map<string, string>): PlayerResult[] {
    if (state.status !== 'finished') return [];

    const dealerValue = calculateHandValue(state.dealerCards);
    const dealerBust = dealerValue > 21;

    return state.playerHands.map((hand) => {
      const playerValue = calculateHandValue(hand.cards);

      let result: GameResult;
      if (hand.isBust) {
        result = 'lose';
      } else if (dealerBust) {
        result = 'win';
      } else if (playerValue > dealerValue) {
        result = 'win';
      } else if (playerValue === dealerValue) {
        result = 'push';
      } else {
        result = 'lose';
      }

      return {
        playerId: hand.playerId,
        username: playerUsernames.get(hand.playerId) ?? 'Unknown',
        result,
        handValue: playerValue,
      };
    });
  },
};
