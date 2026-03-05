import { describe, it, expect } from 'vitest';
import {
  createSkipBoDeck,
  shuffleDeck,
  getStockPileSize,
  canPlayOnBuildingPile,
  getEffectiveValue,
  isBuildingPileComplete,
  clearCompletedBuildingPile,
} from './rules.js';
import type { SkipBoCard, SkipBoPile } from './types.js';

function numbered(value: number, faceUp = false): SkipBoCard {
  return { value, isWild: false, faceUp };
}

function wild(faceUp = false): SkipBoCard {
  return { value: 0, isWild: true, faceUp };
}

describe('createSkipBoDeck', () => {
  it('creates 162 total cards', () => {
    const deck = createSkipBoDeck();
    expect(deck).toHaveLength(162);
  });

  it('has 12 copies of each numbered value 1-12', () => {
    const deck = createSkipBoDeck();
    for (let value = 1; value <= 12; value++) {
      const count = deck.filter((c) => c.value === value && !c.isWild).length;
      expect(count).toBe(12);
    }
  });

  it('has 18 wild cards', () => {
    const deck = createSkipBoDeck();
    const wildCount = deck.filter((c) => c.isWild).length;
    expect(wildCount).toBe(18);
  });

  it('wild cards have value 0', () => {
    const deck = createSkipBoDeck();
    const wilds = deck.filter((c) => c.isWild);
    expect(wilds.every((c) => c.value === 0)).toBe(true);
  });

  it('all cards start face-down', () => {
    const deck = createSkipBoDeck();
    expect(deck.every((c) => !c.faceUp)).toBe(true);
  });
});

describe('shuffleDeck', () => {
  it('returns a new array', () => {
    const deck = createSkipBoDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).not.toBe(deck);
  });

  it('returns same length', () => {
    const deck = createSkipBoDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(deck.length);
  });

  it('contains same cards (same value distribution)', () => {
    const deck = createSkipBoDeck();
    const shuffled = shuffleDeck(deck);
    const deckValues = deck.map((c) => `${c.value}-${c.isWild}`).sort();
    const shuffledValues = shuffled.map((c) => `${c.value}-${c.isWild}`).sort();
    expect(shuffledValues).toEqual(deckValues);
  });
});

describe('getStockPileSize', () => {
  it('returns 30 for 2 players', () => {
    expect(getStockPileSize(2)).toBe(30);
  });

  it('returns 30 for 3 players', () => {
    expect(getStockPileSize(3)).toBe(30);
  });

  it('returns 30 for 4 players', () => {
    expect(getStockPileSize(4)).toBe(30);
  });

  it('returns 20 for 5 players', () => {
    expect(getStockPileSize(5)).toBe(20);
  });

  it('returns 20 for 6 players', () => {
    expect(getStockPileSize(6)).toBe(20);
  });
});

describe('getEffectiveValue', () => {
  it('returns card value for numbered cards', () => {
    expect(getEffectiveValue(numbered(5))).toBe(5);
    expect(getEffectiveValue(numbered(12))).toBe(12);
  });

  it('returns targetValue for wild cards when provided', () => {
    expect(getEffectiveValue(wild(), 7)).toBe(7);
  });

  it('returns 0 for wild cards without targetValue', () => {
    expect(getEffectiveValue(wild())).toBe(0);
  });
});

describe('canPlayOnBuildingPile', () => {
  it('allows value 1 on empty pile', () => {
    expect(canPlayOnBuildingPile([], numbered(1))).toBe(true);
  });

  it('allows wild on empty pile', () => {
    expect(canPlayOnBuildingPile([], wild())).toBe(true);
  });

  it('rejects non-1 numbered card on empty pile', () => {
    expect(canPlayOnBuildingPile([], numbered(2))).toBe(false);
    expect(canPlayOnBuildingPile([], numbered(5))).toBe(false);
  });

  it('allows sequential play on non-empty pile', () => {
    const pile: SkipBoPile = [numbered(1)];
    expect(canPlayOnBuildingPile(pile, numbered(2))).toBe(true);
  });

  it('rejects wrong sequence on non-empty pile', () => {
    const pile: SkipBoPile = [numbered(1)];
    expect(canPlayOnBuildingPile(pile, numbered(3))).toBe(false);
  });

  it('allows wild on any non-empty pile', () => {
    const pile: SkipBoPile = [numbered(1), numbered(2), numbered(3)];
    expect(canPlayOnBuildingPile(pile, wild())).toBe(true);
  });

  it('allows correct value after wild card', () => {
    // Wild used as 1, so next should be 2
    const pile: SkipBoPile = [wild()]; // pile length = 1, so wild effective value = 1
    expect(canPlayOnBuildingPile(pile, numbered(2))).toBe(true);
  });

  it('rejects incorrect value after wild card', () => {
    const pile: SkipBoPile = [wild()]; // pile length = 1, effective value = 1
    expect(canPlayOnBuildingPile(pile, numbered(3))).toBe(false);
  });

  it('rejects play on a complete 12-card pile', () => {
    const pile: SkipBoPile = Array.from({ length: 12 }, (_, i) => numbered(i + 1));
    expect(canPlayOnBuildingPile(pile, numbered(1))).toBe(false);
    expect(canPlayOnBuildingPile(pile, wild())).toBe(false);
  });
});

describe('isBuildingPileComplete', () => {
  it('returns false for empty pile', () => {
    expect(isBuildingPileComplete([])).toBe(false);
  });

  it('returns false for partial pile', () => {
    const pile = Array.from({ length: 5 }, (_, i) => numbered(i + 1));
    expect(isBuildingPileComplete(pile)).toBe(false);
  });

  it('returns true for 12-card pile', () => {
    const pile = Array.from({ length: 12 }, (_, i) => numbered(i + 1));
    expect(isBuildingPileComplete(pile)).toBe(true);
  });
});

describe('clearCompletedBuildingPile', () => {
  it('returns cards with faceUp set to false', () => {
    const pile = Array.from({ length: 12 }, (_, i) => numbered(i + 1, true));
    const cleared = clearCompletedBuildingPile(pile);
    expect(cleared).toHaveLength(12);
    expect(cleared.every((c) => !c.faceUp)).toBe(true);
  });

  it('does not mutate original pile', () => {
    const pile = [numbered(1, true), numbered(2, true)];
    clearCompletedBuildingPile(pile);
    expect(pile[0]!.faceUp).toBe(true);
  });
});
