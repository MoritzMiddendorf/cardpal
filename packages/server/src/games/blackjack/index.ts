import { GameType } from '@cardpal/shared';
import type { GameAction, PlayerResult, GameResult } from '@cardpal/shared';
import type { GameEngine } from '../engine.js';
import type { BlackjackState, BlackjackPlayerHand } from './types.js';
import { createDeck, shuffleDeck, dealCard, calculateHandValue, isBust, isNatural } from './rules.js';

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

/** Outcome of one finished player hand against the dealer. A natural beats any other 21. */
function handResult(hand: BlackjackPlayerHand, dealerCards: BlackjackState['dealerCards']): GameResult {
  if (hand.isBust) return 'lose';
  const playerNatural = isNatural(hand.cards);
  const dealerNatural = isNatural(dealerCards);
  if (playerNatural || dealerNatural) {
    if (playerNatural && dealerNatural) return 'push';
    return playerNatural ? 'win' : 'lose';
  }
  const dealerValue = calculateHandValue(dealerCards);
  const playerValue = calculateHandValue(hand.cards);
  if (dealerValue > 21 || playerValue > dealerValue) return 'win';
  if (playerValue === dealerValue) return 'push';
  return 'lose';
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
    // First winning hand, or null when nobody beat the dealer
    const winner = state.playerHands.find((hand) => handResult(hand, state.dealerCards) === 'win');
    return winner?.playerId ?? null;
  },

  getResults(state: BlackjackState, playerUsernames: Map<string, string>): PlayerResult[] {
    if (state.status !== 'finished') return [];

    return state.playerHands.map((hand) => ({
      playerId: hand.playerId,
      username: playerUsernames.get(hand.playerId) ?? 'Unknown',
      result: handResult(hand, state.dealerCards),
      handValue: calculateHandValue(hand.cards),
    }));
  },
};
