import { describe, it, expect } from 'vitest';
import { skipBoEngine, PLAY_FROM_STOCK, PLAY_FROM_HAND, PLAY_FROM_DISCARD, DISCARD } from './index.js';
import { GameType } from '@cardpal/shared';
import type { SkipBoGameState, SkipBoCard, SkipBoPile } from './types.js';

const twoPlayers = [
  { id: 'player-1', username: 'Alice' },
  { id: 'player-2', username: 'Bob' },
];

const fivePlayers = [
  { id: 'p1', username: 'A' },
  { id: 'p2', username: 'B' },
  { id: 'p3', username: 'C' },
  { id: 'p4', username: 'D' },
  { id: 'p5', username: 'E' },
];

function numbered(value: number, faceUp = true): SkipBoCard {
  return { value, isWild: false, faceUp };
}

function wild(faceUp = true): SkipBoCard {
  return { value: 0, isWild: true, faceUp };
}

/** Create a minimal test state with controlled cards for predictable tests. */
function createTestState(overrides?: Partial<SkipBoGameState>): SkipBoGameState {
  return {
    gameType: GameType.SKIPBO,
    players: ['player-1', 'player-2'],
    currentPlayerIndex: 0,
    status: 'playing',
    drawPile: Array.from({ length: 20 }, (_, i) => numbered((i % 12) + 1, false)),
    buildingPiles: [[], [], [], []] as [SkipBoPile, SkipBoPile, SkipBoPile, SkipBoPile],
    playerStates: [
      {
        playerId: 'player-1',
        stockPile: [numbered(3, false), numbered(1, true)],
        hand: [numbered(1), numbered(2), numbered(3), numbered(5), numbered(7)],
        discardPiles: [[], [], [], []] as [SkipBoPile, SkipBoPile, SkipBoPile, SkipBoPile],
      },
      {
        playerId: 'player-2',
        stockPile: [numbered(4, false), numbered(2, true)],
        hand: [numbered(2), numbered(4), numbered(6), numbered(8), numbered(10)],
        discardPiles: [[], [], [], []] as [SkipBoPile, SkipBoPile, SkipBoPile, SkipBoPile],
      },
    ],
    ...overrides,
  };
}

// =======================================================================
// getInitialState
// =======================================================================

describe('skipBoEngine.getInitialState', () => {
  it('sets gameType to SKIPBO', () => {
    const state = skipBoEngine.getInitialState(twoPlayers);
    expect(state.gameType).toBe(GameType.SKIPBO);
  });

  it('sets status to playing', () => {
    const state = skipBoEngine.getInitialState(twoPlayers);
    expect(state.status).toBe('playing');
  });

  it('sets currentPlayerIndex to 0', () => {
    const state = skipBoEngine.getInitialState(twoPlayers);
    expect(state.currentPlayerIndex).toBe(0);
  });

  it('creates correct player IDs', () => {
    const state = skipBoEngine.getInitialState(twoPlayers);
    expect(state.players).toEqual(['player-1', 'player-2']);
  });

  it('deals 30-card stock piles for 2 players', () => {
    const state = skipBoEngine.getInitialState(twoPlayers);
    for (const ps of state.playerStates) {
      expect(ps.stockPile).toHaveLength(30);
    }
  });

  it('deals 20-card stock piles for 5 players', () => {
    const state = skipBoEngine.getInitialState(fivePlayers);
    for (const ps of state.playerStates) {
      expect(ps.stockPile).toHaveLength(20);
    }
  });

  it('deals 5 hand cards per player', () => {
    const state = skipBoEngine.getInitialState(twoPlayers);
    for (const ps of state.playerStates) {
      expect(ps.hand).toHaveLength(5);
    }
  });

  it('hand cards are face-up', () => {
    const state = skipBoEngine.getInitialState(twoPlayers);
    for (const ps of state.playerStates) {
      expect(ps.hand.every((c) => c.faceUp)).toBe(true);
    }
  });

  it('only top card of stock pile is face-up', () => {
    const state = skipBoEngine.getInitialState(twoPlayers);
    for (const ps of state.playerStates) {
      const topIdx = ps.stockPile.length - 1;
      expect(ps.stockPile[topIdx]!.faceUp).toBe(true);
      for (let i = 0; i < topIdx; i++) {
        expect(ps.stockPile[i]!.faceUp).toBe(false);
      }
    }
  });

  it('initializes 4 empty building piles', () => {
    const state = skipBoEngine.getInitialState(twoPlayers);
    expect(state.buildingPiles).toHaveLength(4);
    for (const pile of state.buildingPiles) {
      expect(pile).toHaveLength(0);
    }
  });

  it('initializes 4 empty discard piles per player', () => {
    const state = skipBoEngine.getInitialState(twoPlayers);
    for (const ps of state.playerStates) {
      expect(ps.discardPiles).toHaveLength(4);
      for (const pile of ps.discardPiles) {
        expect(pile).toHaveLength(0);
      }
    }
  });

  it('draw pile has correct remaining cards (162 - dealt)', () => {
    const state = skipBoEngine.getInitialState(twoPlayers);
    expect(state.drawPile.length).toBe(162 - 70);
  });

  it('draw pile has correct remaining for 5 players', () => {
    const state = skipBoEngine.getInitialState(fivePlayers);
    expect(state.drawPile.length).toBe(162 - 125);
  });
});

// =======================================================================
// getValidActions
// =======================================================================

describe('skipBoEngine.getValidActions', () => {
  it('returns empty array for non-current player', () => {
    const state = createTestState();
    const actions = skipBoEngine.getValidActions(state, 'player-2');
    expect(actions).toEqual([]);
  });

  it('returns empty array when game is finished', () => {
    const state = createTestState({ status: 'finished' });
    const actions = skipBoEngine.getValidActions(state, 'player-1');
    expect(actions).toEqual([]);
  });

  // --- PLAY_FROM_STOCK ---
  it('generates PLAY_FROM_STOCK when stock top can play on empty building pile', () => {
    // Stock top is 1, empty building piles accept 1
    const state = createTestState();
    const actions = skipBoEngine.getValidActions(state, 'player-1');
    const stockActions = actions.filter((a) => a.type === PLAY_FROM_STOCK);
    // 1 can be played on any of the 4 empty building piles
    expect(stockActions).toHaveLength(4);
    expect(stockActions[0]!.payload).toEqual({ buildingPileIndex: 0 });
    expect(stockActions[3]!.payload).toEqual({ buildingPileIndex: 3 });
  });

  it('does not generate PLAY_FROM_STOCK when stock top cannot play on any pile', () => {
    const state = createTestState();
    // Stock top is 1, building pile 0 has [1], needs 2 — stock top (1) can't play there
    // But other piles are empty, so 1 can still play on them
    state.buildingPiles[0] = [numbered(1)];
    state.buildingPiles[1] = [numbered(1)];
    state.buildingPiles[2] = [numbered(1)];
    state.buildingPiles[3] = [numbered(1)];
    const actions = skipBoEngine.getValidActions(state, 'player-1');
    const stockActions = actions.filter((a) => a.type === PLAY_FROM_STOCK);
    expect(stockActions).toHaveLength(0);
  });

  it('does not generate PLAY_FROM_STOCK when stock pile is empty', () => {
    const state = createTestState();
    state.playerStates[0]!.stockPile = [];
    const actions = skipBoEngine.getValidActions(state, 'player-1');
    const stockActions = actions.filter((a) => a.type === PLAY_FROM_STOCK);
    expect(stockActions).toHaveLength(0);
  });

  // --- PLAY_FROM_HAND ---
  it('generates PLAY_FROM_HAND for hand cards that can play on building piles', () => {
    const state = createTestState();
    // Hand has [1, 2, 3, 5, 7], all piles empty → only 1s can play on empty piles
    const actions = skipBoEngine.getValidActions(state, 'player-1');
    const handActions = actions.filter((a) => a.type === PLAY_FROM_HAND);
    // hand[0] (value 1) can play on all 4 piles = 4 actions
    const hand0Actions = handActions.filter((a) => (a.payload as Record<string, number>).handIndex === 0);
    expect(hand0Actions).toHaveLength(4);
    // hand[1] (value 2) can't play on empty piles
    const hand1Actions = handActions.filter((a) => (a.payload as Record<string, number>).handIndex === 1);
    expect(hand1Actions).toHaveLength(0);
  });

  it('generates PLAY_FROM_HAND for wild cards on any non-full pile', () => {
    const state = createTestState();
    state.playerStates[0]!.hand = [wild(), numbered(5), numbered(6), numbered(7), numbered(8)];
    const actions = skipBoEngine.getValidActions(state, 'player-1');
    const wildHandActions = actions.filter(
      (a) => a.type === PLAY_FROM_HAND && (a.payload as Record<string, number>).handIndex === 0,
    );
    // Wild can play on all 4 empty piles
    expect(wildHandActions).toHaveLength(4);
  });

  // --- PLAY_FROM_DISCARD ---
  it('generates PLAY_FROM_DISCARD for discard pile tops that can play', () => {
    const state = createTestState();
    state.playerStates[0]!.discardPiles[0] = [numbered(1)];
    const actions = skipBoEngine.getValidActions(state, 'player-1');
    const discardActions = actions.filter((a) => a.type === PLAY_FROM_DISCARD);
    // discard[0] top is 1, can play on all 4 empty building piles
    const d0Actions = discardActions.filter((a) => (a.payload as Record<string, number>).discardPileIndex === 0);
    expect(d0Actions).toHaveLength(4);
  });

  it('does not generate PLAY_FROM_DISCARD for empty discard piles', () => {
    const state = createTestState();
    // All discard piles are empty
    const actions = skipBoEngine.getValidActions(state, 'player-1');
    const discardActions = actions.filter((a) => a.type === PLAY_FROM_DISCARD);
    expect(discardActions).toHaveLength(0);
  });

  // --- DISCARD ---
  it('generates DISCARD for each hand card to each discard pile', () => {
    const state = createTestState();
    // 5 hand cards * 4 discard piles = 20 discard actions
    const actions = skipBoEngine.getValidActions(state, 'player-1');
    const discardActions = actions.filter((a) => a.type === DISCARD);
    expect(discardActions).toHaveLength(20);
  });

  it('generates no DISCARD if hand is empty', () => {
    const state = createTestState();
    state.playerStates[0]!.hand = [];
    const actions = skipBoEngine.getValidActions(state, 'player-1');
    const discardActions = actions.filter((a) => a.type === DISCARD);
    expect(discardActions).toHaveLength(0);
  });
});

// =======================================================================
// applyAction — PLAY_FROM_STOCK
// =======================================================================

describe('applyAction — PLAY_FROM_STOCK', () => {
  it('moves stock top card to building pile', () => {
    const state = createTestState();
    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_STOCK,
      playerId: 'player-1',
      payload: { buildingPileIndex: 0 },
    });
    expect(result.buildingPiles[0]).toHaveLength(1);
    expect(result.buildingPiles[0]![0]!.value).toBe(1);
    expect(result.playerStates[0]!.stockPile).toHaveLength(1);
  });

  it('reveals new stock top card after play', () => {
    const state = createTestState();
    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_STOCK,
      playerId: 'player-1',
      payload: { buildingPileIndex: 0 },
    });
    const newTop = result.playerStates[0]!.stockPile[result.playerStates[0]!.stockPile.length - 1]!;
    expect(newTop.faceUp).toBe(true);
  });

  it('does not end the turn', () => {
    const state = createTestState();
    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_STOCK,
      playerId: 'player-1',
      payload: { buildingPileIndex: 0 },
    });
    expect(result.currentPlayerIndex).toBe(0);
  });

  it('does not mutate original state', () => {
    const state = createTestState();
    const originalStockLen = state.playerStates[0]!.stockPile.length;
    skipBoEngine.applyAction(state, {
      type: PLAY_FROM_STOCK,
      playerId: 'player-1',
      payload: { buildingPileIndex: 0 },
    });
    expect(state.playerStates[0]!.stockPile).toHaveLength(originalStockLen);
    expect(state.buildingPiles[0]).toHaveLength(0);
  });
});

// =======================================================================
// applyAction — PLAY_FROM_HAND
// =======================================================================

describe('applyAction — PLAY_FROM_HAND', () => {
  it('moves hand card to building pile', () => {
    const state = createTestState();
    // hand[0] is value 1, can play on empty building pile
    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_HAND,
      playerId: 'player-1',
      payload: { handIndex: 0, buildingPileIndex: 0 },
    });
    expect(result.buildingPiles[0]).toHaveLength(1);
    expect(result.buildingPiles[0]![0]!.value).toBe(1);
    expect(result.playerStates[0]!.hand).toHaveLength(4);
  });

  it('does not end the turn', () => {
    const state = createTestState();
    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_HAND,
      playerId: 'player-1',
      payload: { handIndex: 0, buildingPileIndex: 0 },
    });
    expect(result.currentPlayerIndex).toBe(0);
  });

  it('draws 5 new cards when hand becomes empty (AC #6)', () => {
    const state = createTestState();
    // Give player a hand of 1 card that can play
    state.playerStates[0]!.hand = [numbered(1)];
    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_HAND,
      playerId: 'player-1',
      payload: { handIndex: 0, buildingPileIndex: 0 },
    });
    // Hand should be refilled to 5
    expect(result.playerStates[0]!.hand).toHaveLength(5);
    // Turn should NOT end
    expect(result.currentPlayerIndex).toBe(0);
  });

  it('draws as many as possible if draw pile has fewer than 5 cards', () => {
    const state = createTestState();
    state.playerStates[0]!.hand = [numbered(1)];
    state.drawPile = [numbered(3, false), numbered(4, false)]; // Only 2 cards in draw pile
    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_HAND,
      playerId: 'player-1',
      payload: { handIndex: 0, buildingPileIndex: 0 },
    });
    expect(result.playerStates[0]!.hand).toHaveLength(2);
  });
});

// =======================================================================
// applyAction — PLAY_FROM_DISCARD
// =======================================================================

describe('applyAction — PLAY_FROM_DISCARD', () => {
  it('moves discard top card to building pile', () => {
    const state = createTestState();
    state.playerStates[0]!.discardPiles[0] = [numbered(1)];
    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_DISCARD,
      playerId: 'player-1',
      payload: { discardPileIndex: 0, buildingPileIndex: 0 },
    });
    expect(result.buildingPiles[0]).toHaveLength(1);
    expect(result.buildingPiles[0]![0]!.value).toBe(1);
    expect(result.playerStates[0]!.discardPiles[0]).toHaveLength(0);
  });

  it('does not end the turn', () => {
    const state = createTestState();
    state.playerStates[0]!.discardPiles[0] = [numbered(1)];
    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_DISCARD,
      playerId: 'player-1',
      payload: { discardPileIndex: 0, buildingPileIndex: 0 },
    });
    expect(result.currentPlayerIndex).toBe(0);
  });
});

// =======================================================================
// applyAction — DISCARD
// =======================================================================

describe('applyAction — DISCARD', () => {
  it('moves hand card to discard pile', () => {
    const state = createTestState();
    const result = skipBoEngine.applyAction(state, {
      type: DISCARD,
      playerId: 'player-1',
      payload: { handIndex: 0, discardPileIndex: 0 },
    });
    expect(result.playerStates[0]!.discardPiles[0]).toHaveLength(1);
    expect(result.playerStates[0]!.discardPiles[0]![0]!.value).toBe(1);
    expect(result.playerStates[0]!.hand).toHaveLength(4);
  });

  it('ends turn and advances to next player', () => {
    const state = createTestState();
    const result = skipBoEngine.applyAction(state, {
      type: DISCARD,
      playerId: 'player-1',
      payload: { handIndex: 0, discardPileIndex: 0 },
    });
    expect(result.currentPlayerIndex).toBe(1);
  });

  it('wraps turn around to player 0 after last player', () => {
    const state = createTestState({ currentPlayerIndex: 1 });
    const result = skipBoEngine.applyAction(state, {
      type: DISCARD,
      playerId: 'player-2',
      payload: { handIndex: 0, discardPileIndex: 0 },
    });
    expect(result.currentPlayerIndex).toBe(0);
  });

  it('draws cards for next player up to 5 on turn advance (AC #1)', () => {
    const state = createTestState();
    // Player 2 has only 3 cards
    state.playerStates[1]!.hand = [numbered(2), numbered(4), numbered(6)];
    const result = skipBoEngine.applyAction(state, {
      type: DISCARD,
      playerId: 'player-1',
      payload: { handIndex: 0, discardPileIndex: 0 },
    });
    // Player 2 should have been drawn up to 5
    expect(result.playerStates[1]!.hand).toHaveLength(5);
  });

  it('does not draw for next player if they already have 5 cards', () => {
    const state = createTestState();
    const drawPileBefore = state.drawPile.length;
    const result = skipBoEngine.applyAction(state, {
      type: DISCARD,
      playerId: 'player-1',
      payload: { handIndex: 0, discardPileIndex: 0 },
    });
    // Player 2 already had 5 cards, no draw needed
    expect(result.playerStates[1]!.hand).toHaveLength(5);
    expect(result.drawPile.length).toBe(drawPileBefore);
  });

  it('discard card is face-up on discard pile', () => {
    const state = createTestState();
    const result = skipBoEngine.applyAction(state, {
      type: DISCARD,
      playerId: 'player-1',
      payload: { handIndex: 0, discardPileIndex: 2 },
    });
    expect(result.playerStates[0]!.discardPiles[2]![0]!.faceUp).toBe(true);
  });
});

// =======================================================================
// applyAction — Invalid actions
// =======================================================================

describe('applyAction — invalid actions', () => {
  it('throws when not player\'s turn', () => {
    const state = createTestState();
    expect(() =>
      skipBoEngine.applyAction(state, {
        type: DISCARD,
        playerId: 'player-2',
        payload: { handIndex: 0, discardPileIndex: 0 },
      }),
    ).toThrow('Not your turn');
  });

  it('throws when game is finished', () => {
    const state = createTestState({ status: 'finished' });
    expect(() =>
      skipBoEngine.applyAction(state, {
        type: DISCARD,
        playerId: 'player-1',
        payload: { handIndex: 0, discardPileIndex: 0 },
      }),
    ).toThrow('Game is not in playing state');
  });

  it('throws for invalid PLAY_FROM_HAND (wrong card for pile)', () => {
    const state = createTestState();
    // hand[1] is value 2, can't play on empty pile (needs 1)
    expect(() =>
      skipBoEngine.applyAction(state, {
        type: PLAY_FROM_HAND,
        playerId: 'player-1',
        payload: { handIndex: 1, buildingPileIndex: 0 },
      }),
    ).toThrow('Invalid action');
  });

  it('throws for unknown action type', () => {
    const state = createTestState();
    expect(() =>
      skipBoEngine.applyAction(state, {
        type: 'UNKNOWN_ACTION',
        playerId: 'player-1',
        payload: {},
      }),
    ).toThrow('Invalid action');
  });
});

// =======================================================================
// Building pile completion
// =======================================================================

describe('building pile completion', () => {
  it('clears building pile when it reaches 12 and reshuffles into draw pile', () => {
    const state = createTestState();
    // Build a pile with 11 cards (1-11), next play of 12 completes it
    state.buildingPiles[0] = Array.from({ length: 11 }, (_, i) => numbered(i + 1));
    state.playerStates[0]!.hand = [numbered(12), numbered(2), numbered(3), numbered(4), numbered(5)];
    const drawPileBefore = state.drawPile.length;

    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_HAND,
      playerId: 'player-1',
      payload: { handIndex: 0, buildingPileIndex: 0 },
    });

    // Pile should be cleared (empty)
    expect(result.buildingPiles[0]).toHaveLength(0);
    // Draw pile should have 12 more cards
    expect(result.drawPile.length).toBe(drawPileBefore + 12);
  });

  it('completes pile with wild card playing as 12', () => {
    const state = createTestState();
    state.buildingPiles[0] = Array.from({ length: 11 }, (_, i) => numbered(i + 1));
    state.playerStates[0]!.hand = [wild(), numbered(2), numbered(3), numbered(4), numbered(5)];

    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_HAND,
      playerId: 'player-1',
      payload: { handIndex: 0, buildingPileIndex: 0 },
    });

    expect(result.buildingPiles[0]).toHaveLength(0);
  });

  it('completes pile from stock pile play', () => {
    const state = createTestState();
    state.buildingPiles[0] = Array.from({ length: 11 }, (_, i) => numbered(i + 1));
    // Stock top card is value 12
    state.playerStates[0]!.stockPile = [numbered(5, false), numbered(12, true)];

    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_STOCK,
      playerId: 'player-1',
      payload: { buildingPileIndex: 0 },
    });

    expect(result.buildingPiles[0]).toHaveLength(0);
    expect(result.playerStates[0]!.stockPile).toHaveLength(1);
  });

  it('completes pile from discard pile play', () => {
    const state = createTestState();
    state.buildingPiles[0] = Array.from({ length: 11 }, (_, i) => numbered(i + 1));
    state.playerStates[0]!.discardPiles[0] = [numbered(12)];

    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_DISCARD,
      playerId: 'player-1',
      payload: { discardPileIndex: 0, buildingPileIndex: 0 },
    });

    expect(result.buildingPiles[0]).toHaveLength(0);
    expect(result.playerStates[0]!.discardPiles[0]).toHaveLength(0);
  });

  it('completes pile with wild card from stock pile', () => {
    const state = createTestState();
    state.buildingPiles[0] = Array.from({ length: 11 }, (_, i) => numbered(i + 1));
    state.playerStates[0]!.stockPile = [numbered(5, false), wild(true)];

    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_STOCK,
      playerId: 'player-1',
      payload: { buildingPileIndex: 0 },
    });

    expect(result.buildingPiles[0]).toHaveLength(0);
  });
});

// =======================================================================
// Hand refill (AC #6)
// =======================================================================

describe('hand refill when all cards played (AC #6)', () => {
  it('draws 5 new cards when hand becomes empty from PLAY_FROM_HAND', () => {
    const state = createTestState();
    state.playerStates[0]!.hand = [numbered(1)];

    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_HAND,
      playerId: 'player-1',
      payload: { handIndex: 0, buildingPileIndex: 0 },
    });

    expect(result.playerStates[0]!.hand).toHaveLength(5);
    expect(result.currentPlayerIndex).toBe(0); // Turn continues
  });

  it('player can continue playing after hand refill', () => {
    const state = createTestState();
    state.playerStates[0]!.hand = [numbered(1)];
    // Draw pile has card value 1 at the end (will be drawn first since we pop)
    state.drawPile = [numbered(5, false), numbered(4, false), numbered(3, false), numbered(2, false), numbered(1, false)];

    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_HAND,
      playerId: 'player-1',
      payload: { handIndex: 0, buildingPileIndex: 0 },
    });

    // Player got new hand, should have valid actions
    const actions = skipBoEngine.getValidActions(result, 'player-1');
    expect(actions.length).toBeGreaterThan(0);
  });
});

// =======================================================================
// Turn start draw (AC #1)
// =======================================================================

describe('turn start draw (AC #1)', () => {
  it('draws cards for next player when turn advances', () => {
    const state = createTestState();
    state.playerStates[1]!.hand = [numbered(2), numbered(4)]; // Only 2 cards

    const result = skipBoEngine.applyAction(state, {
      type: DISCARD,
      playerId: 'player-1',
      payload: { handIndex: 0, discardPileIndex: 0 },
    });

    // Player 2 should have 5 cards now
    expect(result.playerStates[1]!.hand).toHaveLength(5);
  });

  it('drawn cards are face-up', () => {
    const state = createTestState();
    state.playerStates[1]!.hand = [];

    const result = skipBoEngine.applyAction(state, {
      type: DISCARD,
      playerId: 'player-1',
      payload: { handIndex: 0, discardPileIndex: 0 },
    });

    for (const card of result.playerStates[1]!.hand) {
      expect(card.faceUp).toBe(true);
    }
  });
});

// =======================================================================
// Draw pile exhaustion
// =======================================================================

describe('draw pile exhaustion', () => {
  it('draws as many as available when draw pile is smaller than needed', () => {
    const state = createTestState();
    state.playerStates[1]!.hand = [];
    state.drawPile = [numbered(1, false), numbered(2, false)]; // Only 2 left

    const result = skipBoEngine.applyAction(state, {
      type: DISCARD,
      playerId: 'player-1',
      payload: { handIndex: 0, discardPileIndex: 0 },
    });

    expect(result.playerStates[1]!.hand).toHaveLength(2);
    expect(result.drawPile).toHaveLength(0);
  });

  it('handles empty draw pile gracefully', () => {
    const state = createTestState();
    state.playerStates[1]!.hand = [numbered(2), numbered(4), numbered(6), numbered(8), numbered(10)];
    state.drawPile = [];

    // Should not throw
    const result = skipBoEngine.applyAction(state, {
      type: DISCARD,
      playerId: 'player-1',
      payload: { handIndex: 0, discardPileIndex: 0 },
    });

    expect(result.playerStates[1]!.hand).toHaveLength(5);
  });
});

// =======================================================================
// isGameOver (Story 5.4)
// =======================================================================

describe('skipBoEngine.isGameOver', () => {
  it('returns false when all players have stock pile cards', () => {
    const state = createTestState();
    expect(skipBoEngine.isGameOver(state)).toBe(false);
  });

  it('returns true when one player has empty stock pile', () => {
    const state = createTestState();
    state.playerStates[0]!.stockPile = [];
    expect(skipBoEngine.isGameOver(state)).toBe(true);
  });

  it('returns false for fresh game', () => {
    const state = skipBoEngine.getInitialState(twoPlayers);
    expect(skipBoEngine.isGameOver(state)).toBe(false);
  });
});

// =======================================================================
// getWinner (Story 5.4)
// =======================================================================

describe('skipBoEngine.getWinner', () => {
  it('returns null when no player has empty stock', () => {
    const state = createTestState();
    expect(skipBoEngine.getWinner(state)).toBeNull();
  });

  it('returns correct player ID when player 1 stock is empty', () => {
    const state = createTestState();
    state.playerStates[0]!.stockPile = [];
    expect(skipBoEngine.getWinner(state)).toBe('player-1');
  });

  it('returns correct player ID when player 2 stock is empty', () => {
    const state = createTestState();
    state.playerStates[1]!.stockPile = [];
    expect(skipBoEngine.getWinner(state)).toBe('player-2');
  });
});

// =======================================================================
// getResults (Story 5.4)
// =======================================================================

describe('skipBoEngine.getResults', () => {
  it('produces correct win/lose results with stock counts', () => {
    const state = createTestState({ status: 'finished' });
    state.playerStates[0]!.stockPile = [];
    state.playerStates[1]!.stockPile = [numbered(3), numbered(5)];
    const usernames = new Map([['player-1', 'Alice'], ['player-2', 'Bob']]);
    const results = skipBoEngine.getResults(state, usernames);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      playerId: 'player-1',
      username: 'Alice',
      result: 'win',
      handValue: 0,
    });
    expect(results[1]).toEqual({
      playerId: 'player-2',
      username: 'Bob',
      result: 'lose',
      handValue: 2,
    });
  });

  it('uses Unknown for missing usernames', () => {
    const state = createTestState();
    state.playerStates[0]!.stockPile = [];
    state.status = 'finished';
    const usernames = new Map<string, string>();
    const results = skipBoEngine.getResults(state, usernames);

    expect(results[0]!.username).toBe('Unknown');
  });

  it('returns empty array when game is not finished', () => {
    const state = createTestState();
    const usernames = new Map([['player-1', 'Alice'], ['player-2', 'Bob']]);
    const results = skipBoEngine.getResults(state, usernames);
    expect(results).toEqual([]);
  });

  it('produces correct results for 3+ players', () => {
    const state: SkipBoGameState = {
      gameType: GameType.SKIPBO,
      players: ['p1', 'p2', 'p3'],
      currentPlayerIndex: 0,
      status: 'finished',
      drawPile: [],
      buildingPiles: [[], [], [], []] as [SkipBoPile, SkipBoPile, SkipBoPile, SkipBoPile],
      playerStates: [
        { playerId: 'p1', stockPile: [], hand: [], discardPiles: [[], [], [], []] as [SkipBoPile, SkipBoPile, SkipBoPile, SkipBoPile] },
        { playerId: 'p2', stockPile: [numbered(3), numbered(5)], hand: [], discardPiles: [[], [], [], []] as [SkipBoPile, SkipBoPile, SkipBoPile, SkipBoPile] },
        { playerId: 'p3', stockPile: [numbered(1)], hand: [], discardPiles: [[], [], [], []] as [SkipBoPile, SkipBoPile, SkipBoPile, SkipBoPile] },
      ],
    };
    const usernames = new Map([['p1', 'Alice'], ['p2', 'Bob'], ['p3', 'Charlie']]);
    const results = skipBoEngine.getResults(state, usernames);

    expect(results).toHaveLength(3);
    expect(results[0]!.result).toBe('win');
    expect(results[0]!.handValue).toBe(0);
    expect(results[1]!.result).toBe('lose');
    expect(results[1]!.handValue).toBe(2);
    expect(results[2]!.result).toBe('lose');
    expect(results[2]!.handValue).toBe(1);
  });
});

// =======================================================================
// Win condition trigger in applyAction (Story 5.4)
// =======================================================================

describe('win condition in applyAction', () => {
  it('sets status to finished when PLAY_FROM_STOCK empties stock pile', () => {
    const state = createTestState();
    // Player 1 has only 1 card in stock pile (top card value 1)
    state.playerStates[0]!.stockPile = [numbered(1, true)];

    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_STOCK,
      playerId: 'player-1',
      payload: { buildingPileIndex: 0 },
    });

    expect(result.status).toBe('finished');
    expect(result.playerStates[0]!.stockPile).toHaveLength(0);
  });

  it('does not set status to finished when stock pile still has cards', () => {
    const state = createTestState();
    // Player 1 has 2 cards in stock pile
    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_STOCK,
      playerId: 'player-1',
      payload: { buildingPileIndex: 0 },
    });

    expect(result.status).toBe('playing');
    expect(result.playerStates[0]!.stockPile).toHaveLength(1);
  });

  it('returns empty valid actions when game is finished', () => {
    const state = createTestState();
    state.playerStates[0]!.stockPile = [numbered(1, true)];

    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_STOCK,
      playerId: 'player-1',
      payload: { buildingPileIndex: 0 },
    });

    expect(result.status).toBe('finished');
    const actions = skipBoEngine.getValidActions(result, 'player-1');
    expect(actions).toEqual([]);
  });

  it('does not finish game on DISCARD (stock not affected)', () => {
    const state = createTestState();
    const result = skipBoEngine.applyAction(state, {
      type: DISCARD,
      playerId: 'player-1',
      payload: { handIndex: 0, discardPileIndex: 0 },
    });

    expect(result.status).toBe('playing');
  });

  it('does not finish game on PLAY_FROM_HAND', () => {
    const state = createTestState();
    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_HAND,
      playerId: 'player-1',
      payload: { handIndex: 0, buildingPileIndex: 0 },
    });

    expect(result.status).toBe('playing');
  });

  it('sets status to finished when PLAY_FROM_STOCK completes a building pile AND empties stock', () => {
    const state = createTestState();
    // Building pile 0 has 11 cards (1-11), stock top is 12 (last card in stock)
    state.buildingPiles[0] = Array.from({ length: 11 }, (_, i) => numbered(i + 1));
    state.playerStates[0]!.stockPile = [numbered(12, true)];

    const result = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_STOCK,
      playerId: 'player-1',
      payload: { buildingPileIndex: 0 },
    });

    expect(result.status).toBe('finished');
    expect(result.playerStates[0]!.stockPile).toHaveLength(0);
    // Building pile should be cleared (completed pile reshuffled)
    expect(result.buildingPiles[0]).toHaveLength(0);
  });
});

// =======================================================================
// Robustness: payload key order, stuck turns, stalemate
// =======================================================================

describe('skipBoEngine robustness', () => {
  it('accepts a valid action regardless of payload key order', () => {
    const state = createTestState();
    const next = skipBoEngine.applyAction(state, {
      type: PLAY_FROM_HAND,
      playerId: 'player-1',
      payload: { buildingPileIndex: 0, handIndex: 0 },
    });
    expect(next.buildingPiles[0]).toHaveLength(1);
  });

  it('skips a player who has no possible move once the draw pile is empty', () => {
    const state = createTestState({
      players: ['player-1', 'player-2', 'player-3'],
      drawPile: [],
      playerStates: [
        { ...createTestState().playerStates[0]!, hand: [numbered(9)] },
        // player-2: empty hand, nothing playable from stock -> must be skipped
        { playerId: 'player-2', stockPile: [numbered(12)], hand: [], discardPiles: [[], [], [], []] },
        { playerId: 'player-3', stockPile: [numbered(12)], hand: [numbered(11)], discardPiles: [[], [], [], []] },
      ],
    });
    const next = skipBoEngine.applyAction(state, {
      type: DISCARD,
      playerId: 'player-1',
      payload: { handIndex: 0, discardPileIndex: 0 },
    });
    expect(next.status).toBe('playing');
    expect(next.players[next.currentPlayerIndex]).toBe('player-3');
  });

  it('ends in a stalemate when nobody can move, awarding the smallest stock pile', () => {
    const state = createTestState({
      drawPile: [],
      playerStates: [
        { playerId: 'player-1', stockPile: [numbered(12), numbered(12)], hand: [numbered(9)], discardPiles: [[], [], [], []] },
        { playerId: 'player-2', stockPile: [numbered(12)], hand: [], discardPiles: [[], [], [], []] },
      ],
    });
    const next = skipBoEngine.applyAction(state, {
      type: DISCARD,
      playerId: 'player-1',
      payload: { handIndex: 0, discardPileIndex: 0 },
    });
    expect(next.status).toBe('finished');
    expect(skipBoEngine.getWinner(next)).toBe('player-2');
  });
});
