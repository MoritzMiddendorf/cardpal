import { describe, it, expect } from 'vitest';
import {
  cardSchema,
  gameActionSchema,
  gameStateSchema,
  playerPublicInfoSchema,
  playerGameStateSchema,
  suitSchema,
  rankSchema,
  skipBoCardSchema,
  skipBoGameStateSchema,
  filteredSkipBoStateSchema,
} from './game.js';

describe('suitSchema', () => {
  it('accepts valid suits', () => {
    for (const suit of ['hearts', 'diamonds', 'clubs', 'spades']) {
      expect(suitSchema.parse(suit)).toBe(suit);
    }
  });

  it('rejects invalid suit', () => {
    expect(() => suitSchema.parse('joker')).toThrow();
    expect(() => suitSchema.parse('')).toThrow();
    expect(() => suitSchema.parse(123)).toThrow();
  });
});

describe('rankSchema', () => {
  it('accepts valid ranks', () => {
    for (const rank of ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']) {
      expect(rankSchema.parse(rank)).toBe(rank);
    }
  });

  it('rejects invalid rank', () => {
    expect(() => rankSchema.parse('1')).toThrow();
    expect(() => rankSchema.parse('11')).toThrow();
    expect(() => rankSchema.parse('joker')).toThrow();
  });
});

describe('cardSchema', () => {
  it('parses a valid card', () => {
    const card = { suit: 'hearts', rank: 'A', faceUp: true };
    expect(cardSchema.parse(card)).toEqual(card);
  });

  it('rejects invalid suit', () => {
    expect(() => cardSchema.parse({ suit: 'invalid', rank: 'A', faceUp: true })).toThrow();
  });

  it('rejects invalid rank', () => {
    expect(() => cardSchema.parse({ suit: 'hearts', rank: '1', faceUp: true })).toThrow();
  });

  it('rejects missing faceUp', () => {
    expect(() => cardSchema.parse({ suit: 'hearts', rank: 'A' })).toThrow();
  });
});

describe('gameActionSchema', () => {
  it('parses valid action', () => {
    const action = { type: 'hit', playerId: 'p1' };
    expect(gameActionSchema.parse(action)).toEqual(action);
  });

  it('parses action with payload', () => {
    const action = { type: 'bet', playerId: 'p1', payload: { amount: 10 } };
    expect(gameActionSchema.parse(action)).toEqual(action);
  });

  it('rejects missing type', () => {
    expect(() => gameActionSchema.parse({ playerId: 'p1' })).toThrow();
  });

  it('rejects missing playerId', () => {
    expect(() => gameActionSchema.parse({ type: 'hit' })).toThrow();
  });
});

describe('gameStateSchema', () => {
  it('parses valid game state', () => {
    const state = {
      gameType: 'blackjack',
      players: ['p1', 'p2'],
      currentPlayerIndex: 0,
      status: 'playing',
    };
    expect(gameStateSchema.parse(state)).toEqual(state);
  });

  it('rejects invalid status', () => {
    expect(() =>
      gameStateSchema.parse({
        gameType: 'blackjack',
        players: ['p1'],
        currentPlayerIndex: 0,
        status: 'invalid',
      }),
    ).toThrow();
  });

  it('rejects invalid gameType', () => {
    expect(() =>
      gameStateSchema.parse({
        gameType: 'poker',
        players: ['p1'],
        currentPlayerIndex: 0,
        status: 'playing',
      }),
    ).toThrow();
  });

  it('rejects non-integer currentPlayerIndex', () => {
    expect(() =>
      gameStateSchema.parse({
        gameType: 'blackjack',
        players: ['p1'],
        currentPlayerIndex: 1.5,
        status: 'playing',
      }),
    ).toThrow();
  });
});

describe('playerPublicInfoSchema', () => {
  it('parses valid player public info', () => {
    const info = { id: 'p1', username: 'Alice', cardCount: 5, isActive: true, isBust: false, hasStood: false, isConnected: true };
    expect(playerPublicInfoSchema.parse(info)).toEqual(info);
  });

  it('rejects negative cardCount', () => {
    expect(() =>
      playerPublicInfoSchema.parse({ id: 'p1', username: 'Alice', cardCount: -1, isActive: true, isBust: false, hasStood: false, isConnected: true }),
    ).toThrow();
  });

  it('parses player who has bust', () => {
    const info = { id: 'p1', username: 'Alice', cardCount: 3, isActive: false, isBust: true, hasStood: false, isConnected: true };
    expect(playerPublicInfoSchema.parse(info)).toEqual(info);
  });

  it('parses player who has stood', () => {
    const info = { id: 'p1', username: 'Alice', cardCount: 2, isActive: false, isBust: false, hasStood: true, isConnected: true };
    expect(playerPublicInfoSchema.parse(info)).toEqual(info);
  });
});

describe('playerGameStateSchema', () => {
  const validState = {
    gameType: 'blackjack',
    currentPlayerIndex: 0,
    status: 'playing',
    players: [
      { id: 'p1', username: 'Alice', cardCount: 2, isActive: true, isBust: false, hasStood: false, isConnected: true },
      { id: 'p2', username: 'Bob', cardCount: 3, isActive: false, isBust: false, hasStood: false, isConnected: true },
    ],
    myPlayerId: 'p1',
    hand: [{ suit: 'hearts', rank: 'A', faceUp: true }],
    handValue: 11,
    validActions: [{ type: 'hit', playerId: 'p1' }],
    dealerCards: [
      { suit: 'spades', rank: 'J', faceUp: true },
      { suit: 'hearts', rank: '2', faceUp: false },
    ],
    dealerHandValue: null,
    otherPlayerHands: [
      { playerId: 'p2', cards: [{ suit: 'clubs', rank: '9', faceUp: true }], handValue: 9 },
    ],
    isPaused: false,
    pausedForPlayer: null,
  };

  it('parses valid player game state with all fields', () => {
    expect(playerGameStateSchema.parse(validState)).toEqual(validState);
  });

  it('accepts dealerHandValue as number when dealer is done', () => {
    const state = { ...validState, dealerHandValue: 18 };
    expect(playerGameStateSchema.parse(state)).toEqual(state);
  });

  it('accepts empty otherPlayerHands', () => {
    const state = { ...validState, otherPlayerHands: [] };
    expect(playerGameStateSchema.parse(state)).toEqual(state);
  });

  it('rejects missing myPlayerId', () => {
    const { myPlayerId, ...rest } = validState;
    expect(() => playerGameStateSchema.parse(rest)).toThrow();
  });

  it('rejects missing dealerCards', () => {
    const { dealerCards, ...rest } = validState;
    expect(() => playerGameStateSchema.parse(rest)).toThrow();
  });

  it('rejects missing handValue', () => {
    const { handValue, ...rest } = validState;
    expect(() => playerGameStateSchema.parse(rest)).toThrow();
  });

  it('accepts optional skipBoState', () => {
    const state = {
      ...validState,
      skipBoState: {
        myHand: [{ value: 3, isWild: false, faceUp: true }],
        myStockPile: { topCard: { value: 5, isWild: false, faceUp: true }, count: 10 },
        myDiscardPiles: [
          { topCard: null, count: 0 },
          { topCard: null, count: 0 },
          { topCard: null, count: 0 },
          { topCard: null, count: 0 },
        ],
        buildingPiles: [
          { topCard: { value: 1, isWild: false, faceUp: true }, count: 1 },
          { topCard: null, count: 0 },
          { topCard: null, count: 0 },
          { topCard: null, count: 0 },
        ],
        otherPlayers: [],
        drawPileCount: 50,
      },
    };
    expect(() => playerGameStateSchema.parse(state)).not.toThrow();
  });
});

describe('skipBoCardSchema', () => {
  it('parses valid numbered card', () => {
    const card = { value: 5, isWild: false, faceUp: true };
    expect(skipBoCardSchema.parse(card)).toEqual(card);
  });

  it('parses valid wild card', () => {
    const card = { value: 0, isWild: true, faceUp: false };
    expect(skipBoCardSchema.parse(card)).toEqual(card);
  });

  it('rejects value below 0', () => {
    expect(() => skipBoCardSchema.parse({ value: -1, isWild: false, faceUp: true })).toThrow();
  });

  it('rejects value above 12', () => {
    expect(() => skipBoCardSchema.parse({ value: 13, isWild: false, faceUp: true })).toThrow();
  });

  it('rejects non-integer value', () => {
    expect(() => skipBoCardSchema.parse({ value: 1.5, isWild: false, faceUp: true })).toThrow();
  });

  it('rejects missing faceUp', () => {
    expect(() => skipBoCardSchema.parse({ value: 1, isWild: false })).toThrow();
  });
});

describe('skipBoGameStateSchema', () => {
  const validSkipBoState = {
    gameType: 'skipbo',
    players: ['p1', 'p2'],
    currentPlayerIndex: 0,
    status: 'playing',
    drawPile: [{ value: 3, isWild: false, faceUp: false }],
    buildingPiles: [[], [], [], []],
    playerStates: [
      {
        playerId: 'p1',
        stockPile: [{ value: 5, isWild: false, faceUp: true }],
        hand: [{ value: 1, isWild: false, faceUp: true }],
        discardPiles: [[], [], [], []],
      },
    ],
  };

  it('parses valid Skip-Bo game state', () => {
    expect(() => skipBoGameStateSchema.parse(validSkipBoState)).not.toThrow();
  });

  it('rejects wrong gameType', () => {
    expect(() =>
      skipBoGameStateSchema.parse({ ...validSkipBoState, gameType: 'blackjack' }),
    ).toThrow();
  });

  it('rejects missing buildingPiles', () => {
    const { buildingPiles, ...rest } = validSkipBoState;
    expect(() => skipBoGameStateSchema.parse(rest)).toThrow();
  });
});

describe('filteredSkipBoStateSchema', () => {
  const validFiltered = {
    myHand: [{ value: 3, isWild: false, faceUp: true }],
    myStockPile: { topCard: { value: 5, isWild: false, faceUp: true }, count: 10 },
    myDiscardPiles: [
      { topCard: null, count: 0 },
      { topCard: { value: 2, isWild: false, faceUp: true }, count: 1 },
      { topCard: null, count: 0 },
      { topCard: null, count: 0 },
    ],
    buildingPiles: [
      { topCard: { value: 1, isWild: false, faceUp: true }, count: 1 },
      { topCard: null, count: 0 },
      { topCard: null, count: 0 },
      { topCard: null, count: 0 },
    ],
    otherPlayers: [
      {
        playerId: 'p2',
        username: 'Bob',
        stockPile: { topCard: { value: 7, isWild: false, faceUp: true }, count: 15 },
        discardPiles: [
          { topCard: null, count: 0 },
          { topCard: null, count: 0 },
          { topCard: null, count: 0 },
          { topCard: null, count: 0 },
        ],
        handCount: 5,
        isConnected: true,
      },
    ],
    drawPileCount: 50,
  };

  it('parses valid filtered Skip-Bo state', () => {
    expect(() => filteredSkipBoStateSchema.parse(validFiltered)).not.toThrow();
  });

  it('rejects negative drawPileCount', () => {
    expect(() =>
      filteredSkipBoStateSchema.parse({ ...validFiltered, drawPileCount: -1 }),
    ).toThrow();
  });

  it('rejects missing myHand', () => {
    const { myHand, ...rest } = validFiltered;
    expect(() => filteredSkipBoStateSchema.parse(rest)).toThrow();
  });
});
