import { describe, it, expect } from 'vitest';
import type { GameAction, PileInfo, SkipBoCard } from '@cardpal/shared';
import {
  getNextNeededValue,
  getActionsForSource,
  isBuildingPileTarget,
  isDiscardPileTarget,
  findDropAction,
  dropTargetId,
  parseDropTargetId,
  isSameSource,
  newlyDrawnIndices,
} from './skipBoHelpers.js';

function card(value: number, isWild = false, faceUp = true): SkipBoCard {
  return { value, isWild, faceUp };
}

function pile(topCard: SkipBoCard | null, count: number): PileInfo {
  return { topCard, count };
}

function action(type: string, payload: Record<string, number>): GameAction {
  return { type, playerId: 'p1', payload };
}

describe('getNextNeededValue', () => {
  it('returns 1 for empty pile', () => {
    expect(getNextNeededValue(pile(null, 0))).toBe(1);
  });

  it('returns next sequential value after top card', () => {
    expect(getNextNeededValue(pile(card(5), 5))).toBe(6);
  });

  it('returns next value for pile topped by wild card', () => {
    // Wild on a pile of count 3 means pile has 3 cards (values 1,2,3)
    expect(getNextNeededValue(pile(card(0, true), 3))).toBe(4);
  });

  it('returns 2 after a 1', () => {
    expect(getNextNeededValue(pile(card(1), 1))).toBe(2);
  });

  it('returns 13 for a pile at 12 (completed)', () => {
    expect(getNextNeededValue(pile(card(12), 12))).toBe(13);
  });
});

describe('getActionsForSource', () => {
  const actions: GameAction[] = [
    action('PLAY_FROM_HAND', { handIndex: 0, buildingPileIndex: 0 }),
    action('PLAY_FROM_HAND', { handIndex: 0, buildingPileIndex: 1 }),
    action('PLAY_FROM_HAND', { handIndex: 2, buildingPileIndex: 0 }),
    action('PLAY_FROM_STOCK', { buildingPileIndex: 0 }),
    action('PLAY_FROM_DISCARD', { discardPileIndex: 1, buildingPileIndex: 2 }),
    action('DISCARD', { handIndex: 0, discardPileIndex: 0 }),
    action('DISCARD', { handIndex: 0, discardPileIndex: 1 }),
    action('DISCARD', { handIndex: 2, discardPileIndex: 0 }),
  ];

  it('returns hand actions for hand source', () => {
    const result = getActionsForSource(actions, { type: 'hand', handIndex: 0 });
    expect(result).toHaveLength(4); // 2 PLAY_FROM_HAND + 2 DISCARD
    expect(result.every((a) => {
      const p = a.payload as Record<string, number>;
      return p.handIndex === 0;
    })).toBe(true);
  });

  it('returns stock actions for stock source', () => {
    const result = getActionsForSource(actions, { type: 'stock' });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('PLAY_FROM_STOCK');
  });

  it('returns discard actions for discard source', () => {
    const result = getActionsForSource(actions, { type: 'discard', discardPileIndex: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('PLAY_FROM_DISCARD');
  });

  it('returns empty for hand index with no actions', () => {
    const result = getActionsForSource(actions, { type: 'hand', handIndex: 4 });
    expect(result).toHaveLength(0);
  });

  it('returns empty for discard index with no actions', () => {
    const result = getActionsForSource(actions, { type: 'discard', discardPileIndex: 3 });
    expect(result).toHaveLength(0);
  });

  it('returns empty for any source when validActions is empty', () => {
    expect(getActionsForSource([], { type: 'hand', handIndex: 0 })).toHaveLength(0);
    expect(getActionsForSource([], { type: 'stock' })).toHaveLength(0);
    expect(getActionsForSource([], { type: 'discard', discardPileIndex: 0 })).toHaveLength(0);
  });
});

describe('isBuildingPileTarget', () => {
  const actions: GameAction[] = [
    action('PLAY_FROM_HAND', { handIndex: 0, buildingPileIndex: 1 }),
    action('PLAY_FROM_STOCK', { buildingPileIndex: 2 }),
    action('DISCARD', { handIndex: 0, discardPileIndex: 0 }),
  ];

  it('returns false when no source selected', () => {
    expect(isBuildingPileTarget(actions, null, 1)).toBe(false);
  });

  it('returns true for valid building pile target from hand', () => {
    expect(isBuildingPileTarget(actions, { type: 'hand', handIndex: 0 }, 1)).toBe(true);
  });

  it('returns false for invalid building pile target from hand', () => {
    expect(isBuildingPileTarget(actions, { type: 'hand', handIndex: 0 }, 0)).toBe(false);
  });

  it('returns true for valid building pile target from stock', () => {
    expect(isBuildingPileTarget(actions, { type: 'stock' }, 2)).toBe(true);
  });

  it('returns false for invalid building pile target from stock', () => {
    expect(isBuildingPileTarget(actions, { type: 'stock' }, 0)).toBe(false);
  });
});

describe('isDiscardPileTarget', () => {
  const actions: GameAction[] = [
    action('DISCARD', { handIndex: 0, discardPileIndex: 0 }),
    action('DISCARD', { handIndex: 0, discardPileIndex: 2 }),
    action('PLAY_FROM_HAND', { handIndex: 0, buildingPileIndex: 1 }),
  ];

  it('returns false when no source selected', () => {
    expect(isDiscardPileTarget(actions, null, 0)).toBe(false);
  });

  it('returns true for valid discard target from hand', () => {
    expect(isDiscardPileTarget(actions, { type: 'hand', handIndex: 0 }, 0)).toBe(true);
  });

  it('returns true for another valid discard target', () => {
    expect(isDiscardPileTarget(actions, { type: 'hand', handIndex: 0 }, 2)).toBe(true);
  });

  it('returns false for invalid discard target from hand', () => {
    expect(isDiscardPileTarget(actions, { type: 'hand', handIndex: 0 }, 3)).toBe(false);
  });

  it('returns false for discard target from stock source', () => {
    expect(isDiscardPileTarget(actions, { type: 'stock' }, 0)).toBe(false);
  });
});

describe('findDropAction', () => {
  const actions: GameAction[] = [
    action('PLAY_FROM_HAND', { handIndex: 1, buildingPileIndex: 2 }),
    action('PLAY_FROM_STOCK', { buildingPileIndex: 0 }),
    action('PLAY_FROM_DISCARD', { discardPileIndex: 3, buildingPileIndex: 1 }),
    action('DISCARD', { handIndex: 1, discardPileIndex: 0 }),
  ];

  it('finds the hand-to-building action', () => {
    expect(findDropAction(actions, { type: 'hand', handIndex: 1 }, { type: 'building', index: 2 })).toBe(actions[0]);
  });

  it('finds the stock and discard-pile plays', () => {
    expect(findDropAction(actions, { type: 'stock' }, { type: 'building', index: 0 })).toBe(actions[1]);
    expect(findDropAction(actions, { type: 'discard', discardPileIndex: 3 }, { type: 'building', index: 1 })).toBe(actions[2]);
  });

  it('finds a discard of a hand card', () => {
    expect(findDropAction(actions, { type: 'hand', handIndex: 1 }, { type: 'discard', index: 0 })).toBe(actions[3]);
  });

  it('returns undefined for moves that are not valid', () => {
    expect(findDropAction(actions, { type: 'hand', handIndex: 1 }, { type: 'building', index: 0 })).toBeUndefined();
    expect(findDropAction(actions, { type: 'stock' }, { type: 'discard', index: 0 })).toBeUndefined();
    expect(findDropAction(actions, { type: 'discard', discardPileIndex: 3 }, { type: 'discard', index: 0 })).toBeUndefined();
    expect(findDropAction([], { type: 'hand', handIndex: 0 }, { type: 'building', index: 0 })).toBeUndefined();
  });
});

describe('drop target ids', () => {
  it('round-trips', () => {
    expect(parseDropTargetId(dropTargetId({ type: 'building', index: 3 }))).toEqual({ type: 'building', index: 3 });
    expect(parseDropTargetId(dropTargetId({ type: 'discard', index: 0 }))).toEqual({ type: 'discard', index: 0 });
  });

  it('rejects anything else', () => {
    expect(parseDropTargetId(null)).toBeNull();
    expect(parseDropTargetId('stock:1')).toBeNull();
    expect(parseDropTargetId('building:x')).toBeNull();
  });
});

describe('isSameSource', () => {
  it('compares by type and index', () => {
    expect(isSameSource({ type: 'stock' }, { type: 'stock' })).toBe(true);
    expect(isSameSource({ type: 'hand', handIndex: 1 }, { type: 'hand', handIndex: 1 })).toBe(true);
    expect(isSameSource({ type: 'hand', handIndex: 1 }, { type: 'hand', handIndex: 2 })).toBe(false);
    expect(isSameSource({ type: 'discard', discardPileIndex: 0 }, { type: 'hand', handIndex: 0 })).toBe(false);
    expect(isSameSource(null, { type: 'stock' })).toBe(false);
  });
});

describe('newlyDrawnIndices', () => {
  it('animates nothing on the first state', () => {
    expect(newlyDrawnIndices(5, null, 5)).toEqual([]);
  });

  it('returns the appended cards after a turn-start refill', () => {
    // 3 cards left, 2 drawn
    expect(newlyDrawnIndices(5, 10, 12)).toEqual([3, 4]);
  });

  it('returns the whole hand when the last card was played and 5 were drawn in one update', () => {
    expect(newlyDrawnIndices(5, 10, 15)).toEqual([0, 1, 2, 3, 4]);
  });

  it('returns nothing when nothing was drawn', () => {
    expect(newlyDrawnIndices(4, 10, 10)).toEqual([]);
  });

  it('treats a counter that went back as a new game and animates its deal', () => {
    expect(newlyDrawnIndices(5, 30, 5)).toEqual([0, 1, 2, 3, 4]);
  });

  it('never returns more indices than cards in hand', () => {
    expect(newlyDrawnIndices(2, 0, 9)).toEqual([0, 1]);
  });
});
