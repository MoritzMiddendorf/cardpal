import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealCard, calculateHandValue, isBust, cardValue } from './rules.js';
import type { Card } from '@cardpal/shared';

function card(rank: Card['rank'], suit: Card['suit'] = 'hearts', faceUp = true): Card {
  return { rank, suit, faceUp };
}

describe('cardValue', () => {
  it('returns face value for number cards', () => {
    expect(cardValue('2')).toBe(2);
    expect(cardValue('5')).toBe(5);
    expect(cardValue('10')).toBe(10);
  });

  it('returns 10 for face cards', () => {
    expect(cardValue('J')).toBe(10);
    expect(cardValue('Q')).toBe(10);
    expect(cardValue('K')).toBe(10);
  });

  it('returns 11 for Ace', () => {
    expect(cardValue('A')).toBe(11);
  });
});

describe('createDeck', () => {
  it('returns 52 cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
  });

  it('contains all 4 suits', () => {
    const deck = createDeck();
    const suits = new Set(deck.map((c) => c.suit));
    expect(suits).toEqual(new Set(['hearts', 'diamonds', 'clubs', 'spades']));
  });

  it('contains all 13 ranks', () => {
    const deck = createDeck();
    const ranks = new Set(deck.map((c) => c.rank));
    expect(ranks).toEqual(new Set(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']));
  });

  it('has 4 cards of each rank', () => {
    const deck = createDeck();
    const rankCounts = new Map<string, number>();
    for (const c of deck) {
      rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1);
    }
    for (const count of rankCounts.values()) {
      expect(count).toBe(4);
    }
  });

  it('all cards start face-down', () => {
    const deck = createDeck();
    expect(deck.every((c) => !c.faceUp)).toBe(true);
  });

  it('contains 52 unique cards', () => {
    const deck = createDeck();
    const keys = deck.map((c) => `${c.suit}-${c.rank}`);
    expect(new Set(keys).size).toBe(52);
  });
});

describe('shuffleDeck', () => {
  it('returns array of same length', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(52);
  });

  it('contains the same cards', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    const deckKeys = deck.map((c) => `${c.suit}-${c.rank}`).sort();
    const shuffledKeys = shuffled.map((c) => `${c.suit}-${c.rank}`).sort();
    expect(shuffledKeys).toEqual(deckKeys);
  });

  it('does not mutate original deck', () => {
    const deck = createDeck();
    const original = [...deck];
    shuffleDeck(deck);
    expect(deck).toEqual(original);
  });

  it('produces a different order (statistically)', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    // Very unlikely all 52 positions stay the same
    const samePositions = deck.filter(
      (c, i) => c.suit === shuffled[i]!.suit && c.rank === shuffled[i]!.rank,
    ).length;
    expect(samePositions).toBeLessThan(52);
  });
});

describe('dealCard', () => {
  it('removes the top card from deck', () => {
    const deck = createDeck();
    const topCard = deck[0]!;
    const result = dealCard(deck, true);
    expect(result.card.suit).toBe(topCard.suit);
    expect(result.card.rank).toBe(topCard.rank);
    expect(result.deck).toHaveLength(51);
  });

  it('sets faceUp to true when requested', () => {
    const deck = createDeck();
    const result = dealCard(deck, true);
    expect(result.card.faceUp).toBe(true);
  });

  it('sets faceUp to false when requested', () => {
    const deck = createDeck();
    const result = dealCard(deck, false);
    expect(result.card.faceUp).toBe(false);
  });

  it('does not mutate original deck', () => {
    const deck = createDeck();
    const originalLength = deck.length;
    dealCard(deck, true);
    expect(deck).toHaveLength(originalLength);
  });

  it('throws when deck is empty', () => {
    expect(() => dealCard([], true)).toThrow('Deck is empty');
  });
});

describe('calculateHandValue', () => {
  it('sums number cards correctly', () => {
    expect(calculateHandValue([card('5'), card('7')])).toBe(12);
    expect(calculateHandValue([card('2'), card('3'), card('4')])).toBe(9);
  });

  it('counts face cards as 10', () => {
    expect(calculateHandValue([card('J'), card('Q')])).toBe(20);
    expect(calculateHandValue([card('K'), card('5')])).toBe(15);
  });

  it('counts single Ace as 11', () => {
    expect(calculateHandValue([card('A'), card('5')])).toBe(16);
  });

  it('reduces Ace to 1 when 11 would bust', () => {
    expect(calculateHandValue([card('A'), card('5'), card('10')])).toBe(16);
  });

  it('handles multiple Aces', () => {
    // A + A = 12 (one 11 + one 1)
    expect(calculateHandValue([card('A'), card('A')])).toBe(12);
    // A + A + 9 = 21 (one 11, one 1, 9)
    expect(calculateHandValue([card('A'), card('A'), card('9')])).toBe(21);
  });

  it('handles Blackjack (A + K)', () => {
    expect(calculateHandValue([card('A'), card('K')])).toBe(21);
  });

  it('handles bust hand correctly', () => {
    expect(calculateHandValue([card('K'), card('Q'), card('5')])).toBe(25);
  });

  it('handles triple Aces', () => {
    // A + A + A = 13 (one 11, two 1s)
    expect(calculateHandValue([card('A'), card('A'), card('A')])).toBe(13);
  });

  it('returns 0 for empty hand', () => {
    expect(calculateHandValue([])).toBe(0);
  });
});

describe('isBust', () => {
  it('returns true when hand value > 21', () => {
    expect(isBust([card('K'), card('Q'), card('5')])).toBe(true);
  });

  it('returns false when hand value <= 21', () => {
    expect(isBust([card('K'), card('Q')])).toBe(false);
    expect(isBust([card('A'), card('K')])).toBe(false);
  });

  it('returns false for exactly 21', () => {
    expect(isBust([card('A'), card('K')])).toBe(false);
  });
});
