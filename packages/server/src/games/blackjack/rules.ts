import type { Card, Suit, Rank } from '@cardpal/shared';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/**
 * Returns the base numeric value of a card rank.
 * Aces return 11 (caller handles soft/hard adjustment).
 */
export function cardValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (rank === 'K' || rank === 'Q' || rank === 'J') return 10;
  return parseInt(rank, 10);
}

/** Create a standard 52-card deck, all face-down. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, faceUp: false });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle — returns a new array. */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

/** Remove the top card from deck, set its faceUp flag, return both. */
export function dealCard(deck: Card[], faceUp: boolean): { card: Card; deck: Card[] } {
  if (deck.length === 0) throw new Error('Deck is empty');
  const card: Card = { ...deck[0]!, faceUp };
  return { card, deck: deck.slice(1) };
}

/**
 * Calculate the best hand value.
 * Number cards = face value, J/Q/K = 10, A = 11 (reduced to 1 as needed).
 */
export function calculateHandValue(cards: Card[]): number {
  let value = 0;
  let aces = 0;

  for (const card of cards) {
    const v = cardValue(card.rank);
    value += v;
    if (card.rank === 'A') aces++;
  }

  // Reduce Aces from 11 to 1 while busting
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
}

/** True when hand value exceeds 21. */
export function isBust(cards: Card[]): boolean {
  return calculateHandValue(cards) > 21;
}
