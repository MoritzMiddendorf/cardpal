import { describe, it, expect } from 'vitest';
import { filterGameState } from './filterGameState.js';
import { GameType } from '@cardpal/shared';
import type { Card, GameAction, GameState, PlayerResult, SkipBoCard, SkipBoPlayerState } from '@cardpal/shared';
import type { GameInstance, GameEngine } from '../games/engine.js';
import type { BlackjackState } from '../games/blackjack/types.js';
import type { SkipBoGameState } from '../games/skipbo/types.js';

function card(rank: Card['rank'], suit: Card['suit'] = 'hearts', faceUp = true): Card {
  return { rank, suit, faceUp };
}

function makeGameInstance(overrides: Partial<GameInstance> = {}): GameInstance {
  const usernames = new Map<string, string>();
  usernames.set('player-1', 'Alice');
  usernames.set('player-2', 'Bob');

  return {
    roomId: 'room-1',
    gameType: GameType.BLACKJACK,
    state: {
      gameType: GameType.BLACKJACK,
      players: ['player-1', 'player-2'],
      currentPlayerIndex: 0,
      status: 'playing',
    },
    engine: {
      getInitialState: () => ({} as GameState),
      getValidActions: () => [],
      applyAction: (s: GameState) => s,
      isGameOver: () => false,
      getWinner: () => null,
      getResults: () => [],
    } as GameEngine,
    playerUsernames: usernames,
    isPaused: false,
    pausedForPlayerId: null,
    ...overrides,
  };
}

function makeBlackjackInstance(overrides: Partial<BlackjackState> = {}): GameInstance {
  const usernames = new Map<string, string>();
  usernames.set('player-1', 'Alice');
  usernames.set('player-2', 'Bob');

  const bjState: BlackjackState = {
    gameType: GameType.BLACKJACK,
    players: ['player-1', 'player-2'],
    currentPlayerIndex: 0,
    status: 'playing',
    deck: [card('5', 'clubs')],
    playerHands: [
      { playerId: 'player-1', cards: [card('K'), card('7')], isBust: false, hasStood: false },
      { playerId: 'player-2', cards: [card('9'), card('6'), card('3')], isBust: false, hasStood: false },
    ],
    dealerCards: [card('J', 'spades', true), card('4', 'hearts', false)],
    dealerDone: false,
    ...overrides,
  };

  const mockEngine: GameEngine = {
    getInitialState: () => bjState,
    getValidActions: (_state: GameState, playerId: string): GameAction[] => {
      if (playerId === 'player-1') {
        return [
          { type: 'hit', playerId: 'player-1' },
          { type: 'stand', playerId: 'player-1' },
        ];
      }
      return [];
    },
    applyAction: (s: GameState) => s,
    isGameOver: () => false,
    getWinner: () => null,
    getResults: (_state: GameState, playerUsernames: Map<string, string>): PlayerResult[] => {
      return [
        { playerId: 'player-1', username: playerUsernames.get('player-1') ?? 'Unknown', result: 'win', handValue: 17 },
        { playerId: 'player-2', username: playerUsernames.get('player-2') ?? 'Unknown', result: 'lose', handValue: 18 },
      ];
    },
  };

  return {
    roomId: 'room-1',
    gameType: GameType.BLACKJACK,
    state: bjState,
    engine: mockEngine,
    playerUsernames: usernames,
    isPaused: false,
    pausedForPlayerId: null,
  };
}

describe('filterGameState — generic (non-blackjack) state', () => {
  it('returns correct shape with proper playerId', () => {
    const instance = makeGameInstance();
    const result = filterGameState(instance, 'player-1');

    expect(result.myPlayerId).toBe('player-1');
    expect(result.gameType).toBe(GameType.BLACKJACK);
    expect(result.currentPlayerIndex).toBe(0);
    expect(result.status).toBe('playing');
    expect(result.handValue).toBe(0);
    expect(result.dealerCards).toEqual([]);
    expect(result.dealerHandValue).toBeNull();
    expect(result.otherPlayerHands).toEqual([]);
  });

  it('maps player usernames correctly with default bust/stood', () => {
    const instance = makeGameInstance();
    const result = filterGameState(instance, 'player-1');

    expect(result.players).toHaveLength(2);
    expect(result.players[0]).toEqual({
      id: 'player-1',
      username: 'Alice',
      cardCount: 0,
      isActive: true,
      isBust: false,
      hasStood: false,
      isConnected: true,
    });
    expect(result.players[1]).toEqual({
      id: 'player-2',
      username: 'Bob',
      cardCount: 0,
      isActive: false,
      isBust: false,
      hasStood: false,
      isConnected: true,
    });
  });

  it('sets isActive based on currentPlayerIndex', () => {
    const instance = makeGameInstance({
      state: {
        gameType: GameType.BLACKJACK,
        players: ['player-1', 'player-2'],
        currentPlayerIndex: 1,
        status: 'playing',
      },
    });
    const result = filterGameState(instance, 'player-2');

    expect(result.players[0]!.isActive).toBe(false);
    expect(result.players[1]!.isActive).toBe(true);
  });

  it('falls back to Unknown for missing usernames', () => {
    const usernames = new Map<string, string>();
    usernames.set('player-1', 'Alice');
    const instance = makeGameInstance({ playerUsernames: usernames });
    const result = filterGameState(instance, 'player-1');

    expect(result.players[1]!.username).toBe('Unknown');
  });
});

describe('filterGameState — blackjack state', () => {
  it('returns requesting player\'s actual cards', () => {
    const instance = makeBlackjackInstance();
    const result = filterGameState(instance, 'player-1');
    expect(result.hand).toHaveLength(2);
    expect(result.hand[0]!.rank).toBe('K');
    expect(result.hand[1]!.rank).toBe('7');
  });

  it('returns valid actions from engine for current player', () => {
    const instance = makeBlackjackInstance();
    const result = filterGameState(instance, 'player-1');
    expect(result.validActions).toEqual([
      { type: 'hit', playerId: 'player-1' },
      { type: 'stand', playerId: 'player-1' },
    ]);
  });

  it('returns empty valid actions for non-current player', () => {
    const instance = makeBlackjackInstance();
    const result = filterGameState(instance, 'player-2');
    expect(result.validActions).toEqual([]);
  });

  it('returns correct card counts per player', () => {
    const instance = makeBlackjackInstance();
    const result = filterGameState(instance, 'player-1');
    expect(result.players[0]!.cardCount).toBe(2); // player-1 has 2 cards
    expect(result.players[1]!.cardCount).toBe(3); // player-2 has 3 cards
  });

  it('returns player-2 hand when requesting as player-2', () => {
    const instance = makeBlackjackInstance();
    const result = filterGameState(instance, 'player-2');
    expect(result.hand).toHaveLength(3);
    expect(result.hand[0]!.rank).toBe('9');
  });

  it('calculates handValue for requesting player', () => {
    const instance = makeBlackjackInstance();
    const result = filterGameState(instance, 'player-1');
    // K=10, 7=7 → 17
    expect(result.handValue).toBe(17);
  });

  it('calculates handValue for player-2', () => {
    const instance = makeBlackjackInstance();
    const result = filterGameState(instance, 'player-2');
    // 9+6+3 = 18
    expect(result.handValue).toBe(18);
  });

  it('strips face-down dealer card data when dealerDone is false', () => {
    const instance = makeBlackjackInstance();
    const result = filterGameState(instance, 'player-1');

    expect(result.dealerCards).toHaveLength(2);
    // First card is face-up — sent as-is
    expect(result.dealerCards[0]).toEqual({ rank: 'J', suit: 'spades', faceUp: true });
    // Second card is face-down — suit/rank sanitized to dummy values
    expect(result.dealerCards[1]).toEqual({ suit: 'hearts', rank: '2', faceUp: false });
    // Original card was 4 of hearts — verify real rank is NOT leaked
    expect(result.dealerCards[1]!.rank).not.toBe('4');
  });

  it('sends all dealer cards face-up when dealerDone is true', () => {
    const instance = makeBlackjackInstance({
      dealerCards: [card('J', 'spades', true), card('4', 'hearts', true)],
      dealerDone: true,
    });
    const result = filterGameState(instance, 'player-1');

    expect(result.dealerCards).toHaveLength(2);
    expect(result.dealerCards[0]).toEqual({ rank: 'J', suit: 'spades', faceUp: true });
    expect(result.dealerCards[1]).toEqual({ rank: '4', suit: 'hearts', faceUp: true });
  });

  it('returns null dealerHandValue when dealer is not done', () => {
    const instance = makeBlackjackInstance();
    const result = filterGameState(instance, 'player-1');
    expect(result.dealerHandValue).toBeNull();
  });

  it('returns calculated dealerHandValue when dealer is done', () => {
    const instance = makeBlackjackInstance({
      dealerCards: [card('J', 'spades', true), card('7', 'hearts', true)],
      dealerDone: true,
    });
    const result = filterGameState(instance, 'player-1');
    // J=10, 7=7 → 17
    expect(result.dealerHandValue).toBe(17);
  });

  it('includes other players hands with hand values in otherPlayerHands', () => {
    const instance = makeBlackjackInstance();
    const result = filterGameState(instance, 'player-1');

    expect(result.otherPlayerHands).toHaveLength(1);
    expect(result.otherPlayerHands[0]!.playerId).toBe('player-2');
    expect(result.otherPlayerHands[0]!.cards).toHaveLength(3);
    expect(result.otherPlayerHands[0]!.cards[0]!.rank).toBe('9');
    // 9+6+3 = 18
    expect(result.otherPlayerHands[0]!.handValue).toBe(18);
  });

  it('excludes requesting player from otherPlayerHands', () => {
    const instance = makeBlackjackInstance();
    const result = filterGameState(instance, 'player-1');

    const myHand = result.otherPlayerHands.find((h) => h.playerId === 'player-1');
    expect(myHand).toBeUndefined();
  });

  it('passes isBust and hasStood through to PlayerPublicInfo', () => {
    const instance = makeBlackjackInstance({
      playerHands: [
        { playerId: 'player-1', cards: [card('K'), card('7'), card('8')], isBust: true, hasStood: false },
        { playerId: 'player-2', cards: [card('9'), card('6')], isBust: false, hasStood: true },
      ],
    });
    const result = filterGameState(instance, 'player-1');

    expect(result.players[0]!.isBust).toBe(true);
    expect(result.players[0]!.hasStood).toBe(false);
    expect(result.players[1]!.isBust).toBe(false);
    expect(result.players[1]!.hasStood).toBe(true);
  });

  it('includes results when game status is finished', () => {
    const instance = makeBlackjackInstance({
      status: 'finished',
      dealerDone: true,
      dealerCards: [card('J', 'spades', true), card('7', 'hearts', true)],
    });
    const result = filterGameState(instance, 'player-1');

    expect(result.results).toBeDefined();
    expect(result.results).toHaveLength(2);
    expect(result.results![0]!.playerId).toBe('player-1');
    expect(result.results![0]!.result).toBe('win');
    expect(result.results![1]!.playerId).toBe('player-2');
  });

  it('does not include results when game is still playing', () => {
    const instance = makeBlackjackInstance();
    const result = filterGameState(instance, 'player-1');
    expect(result.results).toBeUndefined();
  });

  it('passes isConnected from connectionMap to PlayerPublicInfo', () => {
    const instance = makeBlackjackInstance();
    const connectionMap = new Map<string, boolean>();
    connectionMap.set('player-1', true);
    connectionMap.set('player-2', false);
    const result = filterGameState(instance, 'player-1', connectionMap);

    expect(result.players[0]!.isConnected).toBe(true);
    expect(result.players[1]!.isConnected).toBe(false);
  });

  it('defaults isConnected to true when connectionMap is not provided', () => {
    const instance = makeBlackjackInstance();
    const result = filterGameState(instance, 'player-1');

    expect(result.players[0]!.isConnected).toBe(true);
    expect(result.players[1]!.isConnected).toBe(true);
  });

  it('defaults isConnected to true when player is missing from connectionMap', () => {
    const instance = makeBlackjackInstance();
    const connectionMap = new Map<string, boolean>();
    connectionMap.set('player-1', false);
    // player-2 not in map
    const result = filterGameState(instance, 'player-1', connectionMap);

    expect(result.players[0]!.isConnected).toBe(false);
    expect(result.players[1]!.isConnected).toBe(true);
  });
});

describe('filterGameState — pause state', () => {
  it('returns isPaused=false and pausedForPlayer=null by default', () => {
    const instance = makeBlackjackInstance();
    const result = filterGameState(instance, 'player-1');

    expect(result.isPaused).toBe(false);
    expect(result.pausedForPlayer).toBeNull();
  });

  it('returns isPaused=true and resolves pausedForPlayer to username', () => {
    const instance = makeBlackjackInstance();
    const pauseInfo = { isPaused: true, pausedForPlayerId: 'player-1' };
    const result = filterGameState(instance, 'player-2', undefined, pauseInfo);

    expect(result.isPaused).toBe(true);
    expect(result.pausedForPlayer).toBe('Alice');
  });

  it('returns empty validActions when game is paused', () => {
    const instance = makeBlackjackInstance();
    const pauseInfo = { isPaused: true, pausedForPlayerId: 'player-1' };

    // player-1 normally has valid actions (hit, stand)
    const normalResult = filterGameState(instance, 'player-1');
    expect(normalResult.validActions.length).toBeGreaterThan(0);

    // When paused, all players get empty validActions
    const pausedResult = filterGameState(instance, 'player-1', undefined, pauseInfo);
    expect(pausedResult.validActions).toEqual([]);
  });

  it('returns empty validActions for ALL players when paused', () => {
    const instance = makeBlackjackInstance();
    const pauseInfo = { isPaused: true, pausedForPlayerId: 'player-1' };

    const result1 = filterGameState(instance, 'player-1', undefined, pauseInfo);
    const result2 = filterGameState(instance, 'player-2', undefined, pauseInfo);

    expect(result1.validActions).toEqual([]);
    expect(result2.validActions).toEqual([]);
  });

  it('falls back to Unknown for unknown pausedForPlayerId', () => {
    const instance = makeBlackjackInstance();
    const pauseInfo = { isPaused: true, pausedForPlayerId: 'unknown-player' };
    const result = filterGameState(instance, 'player-1', undefined, pauseInfo);

    expect(result.isPaused).toBe(true);
    expect(result.pausedForPlayer).toBe('Unknown');
  });
});

// --- Skip-Bo filtering tests ---

function sbCard(value: number, isWild = false, faceUp = true): SkipBoCard {
  return { value, isWild, faceUp };
}

function makeSkipBoInstance(overrides: Partial<SkipBoGameState> = {}): GameInstance {
  const usernames = new Map<string, string>();
  usernames.set('player-1', 'Alice');
  usernames.set('player-2', 'Bob');

  const sbState: SkipBoGameState = {
    gameType: GameType.SKIPBO,
    players: ['player-1', 'player-2'],
    currentPlayerIndex: 0,
    status: 'playing',
    drawPile: [sbCard(5), sbCard(6), sbCard(7)],
    buildingPiles: [
      [sbCard(1), sbCard(2)],
      [sbCard(1)],
      [],
      [],
    ],
    playerStates: [
      {
        playerId: 'player-1',
        stockPile: [sbCard(3, false, false), sbCard(8, false, true)],
        hand: [sbCard(4), sbCard(5), sbCard(1, true), sbCard(9), sbCard(12)],
        discardPiles: [[sbCard(7)], [], [sbCard(3)], []],
      },
      {
        playerId: 'player-2',
        stockPile: [sbCard(6, false, false), sbCard(10, false, true)],
        hand: [sbCard(2), sbCard(11), sbCard(4)],
        discardPiles: [[], [sbCard(5)], [], []],
      },
    ],
    ...overrides,
  };

  const mockEngine: GameEngine = {
    getInitialState: () => sbState,
    getValidActions: () => [],
    applyAction: (s: GameState) => s,
    isGameOver: () => false,
    getWinner: () => null,
    getResults: () => [],
  };

  return {
    roomId: 'room-sb',
    gameType: GameType.SKIPBO,
    state: sbState,
    engine: mockEngine,
    playerUsernames: usernames,
    isPaused: false,
    pausedForPlayerId: null,
  };
}

describe('filterGameState — Skip-Bo state', () => {
  it('returns skipBoState with player hand', () => {
    const instance = makeSkipBoInstance();
    const result = filterGameState(instance, 'player-1');

    expect(result.skipBoState).toBeDefined();
    expect(result.skipBoState!.myHand).toHaveLength(5);
    expect(result.skipBoState!.myHand[0]!.value).toBe(4);
  });

  it('does not expose player-1 hand to player-2', () => {
    const instance = makeSkipBoInstance();
    const result = filterGameState(instance, 'player-2');

    // player-2 should see own hand
    expect(result.skipBoState!.myHand).toHaveLength(3);
    expect(result.skipBoState!.myHand[0]!.value).toBe(2);

    // player-1 should appear in otherPlayers with only handCount
    const other = result.skipBoState!.otherPlayers.find((p) => p.playerId === 'player-1');
    expect(other).toBeDefined();
    expect(other!.handCount).toBe(5);
    // No hand cards exposed
    expect((other as any).hand).toBeUndefined();
  });

  it('shows stock pile top card and count', () => {
    const instance = makeSkipBoInstance();
    const result = filterGameState(instance, 'player-1');

    expect(result.skipBoState!.myStockPile.count).toBe(2);
    expect(result.skipBoState!.myStockPile.topCard!.value).toBe(8);
  });

  it('shows building piles top card and count', () => {
    const instance = makeSkipBoInstance();
    const result = filterGameState(instance, 'player-1');

    expect(result.skipBoState!.buildingPiles).toHaveLength(4);
    expect(result.skipBoState!.buildingPiles[0]!.topCard!.value).toBe(2);
    expect(result.skipBoState!.buildingPiles[0]!.count).toBe(2);
    expect(result.skipBoState!.buildingPiles[2]!.topCard).toBeNull();
    expect(result.skipBoState!.buildingPiles[2]!.count).toBe(0);
  });

  it('shows discard piles for requesting player', () => {
    const instance = makeSkipBoInstance();
    const result = filterGameState(instance, 'player-1');

    expect(result.skipBoState!.myDiscardPiles).toHaveLength(4);
    expect(result.skipBoState!.myDiscardPiles[0]!.topCard!.value).toBe(7);
    expect(result.skipBoState!.myDiscardPiles[1]!.topCard).toBeNull();
  });

  it('shows other players stock and discard piles', () => {
    const instance = makeSkipBoInstance();
    const result = filterGameState(instance, 'player-1');

    const other = result.skipBoState!.otherPlayers[0]!;
    expect(other.playerId).toBe('player-2');
    expect(other.username).toBe('Bob');
    expect(other.stockPile.topCard!.value).toBe(10);
    expect(other.stockPile.count).toBe(2);
    expect(other.discardPiles[1]!.topCard!.value).toBe(5);
  });

  it('includes draw pile count', () => {
    const instance = makeSkipBoInstance();
    const result = filterGameState(instance, 'player-1');
    expect(result.skipBoState!.drawPileCount).toBe(3);
  });

  it('sets generic blackjack fields to defaults', () => {
    const instance = makeSkipBoInstance();
    const result = filterGameState(instance, 'player-1');

    expect(result.hand).toEqual([]);
    expect(result.handValue).toBe(0);
    expect(result.dealerCards).toEqual([]);
    expect(result.dealerHandValue).toBeNull();
    expect(result.otherPlayerHands).toEqual([]);
  });

  it('uses stock pile count for cardCount in PlayerPublicInfo', () => {
    const instance = makeSkipBoInstance();
    const result = filterGameState(instance, 'player-1');

    expect(result.players[0]!.cardCount).toBe(2); // player-1 stock pile size
    expect(result.players[1]!.cardCount).toBe(2); // player-2 stock pile size
  });

  it('passes connection map to other players', () => {
    const instance = makeSkipBoInstance();
    const connectionMap = new Map([['player-1', true], ['player-2', false]]);
    const result = filterGameState(instance, 'player-1', connectionMap);

    const other = result.skipBoState!.otherPlayers[0]!;
    expect(other.isConnected).toBe(false);
  });
});
