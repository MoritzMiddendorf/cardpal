import { describe, it, expect } from 'vitest';
import { blackjackEngine } from './index.js';
import { calculateHandValue } from './rules.js';
import type { BlackjackState } from './types.js';
import { GameType } from '@cardpal/shared';
import type { Card, GameAction } from '@cardpal/shared';

const PLAYERS = [
  { id: 'p1', username: 'Alice' },
  { id: 'p2', username: 'Bob' },
];

function card(rank: Card['rank'], suit: Card['suit'] = 'hearts', faceUp = true): Card {
  return { rank, suit, faceUp };
}

/** Build a BlackjackState with controlled hands for testing. */
function makeState(overrides: Partial<BlackjackState> = {}): BlackjackState {
  return {
    gameType: GameType.BLACKJACK,
    players: ['p1', 'p2'],
    currentPlayerIndex: 0,
    status: 'playing',
    deck: [
      card('5', 'clubs'),
      card('6', 'diamonds'),
      card('7', 'spades'),
      card('8', 'hearts'),
      card('9', 'clubs'),
      card('10', 'diamonds'),
    ],
    playerHands: [
      { playerId: 'p1', cards: [card('7'), card('8')], isBust: false, hasStood: false },
      { playerId: 'p2', cards: [card('9'), card('6')], isBust: false, hasStood: false },
    ],
    dealerCards: [card('K', 'spades', true), card('3', 'hearts', false)],
    dealerDone: false,
    ...overrides,
  };
}

describe('blackjackEngine.getInitialState', () => {
  it('creates state with correct player IDs', () => {
    const state = blackjackEngine.getInitialState(PLAYERS);
    expect(state.players).toEqual(['p1', 'p2']);
  });

  it('deals 2 cards to each player', () => {
    const state = blackjackEngine.getInitialState(PLAYERS);
    for (const hand of state.playerHands) {
      expect(hand.cards).toHaveLength(2);
    }
  });

  it('deals player cards face-up', () => {
    const state = blackjackEngine.getInitialState(PLAYERS);
    for (const hand of state.playerHands) {
      expect(hand.cards.every((c) => c.faceUp)).toBe(true);
    }
  });

  it('deals 2 dealer cards: first face-up, second face-down', () => {
    const state = blackjackEngine.getInitialState(PLAYERS);
    expect(state.dealerCards).toHaveLength(2);
    expect(state.dealerCards[0]!.faceUp).toBe(true);
    expect(state.dealerCards[1]!.faceUp).toBe(false);
  });

  it('sets status to playing', () => {
    const state = blackjackEngine.getInitialState(PLAYERS);
    expect(state.status).toBe('playing');
  });

  it('sets gameType to BLACKJACK', () => {
    const state = blackjackEngine.getInitialState(PLAYERS);
    expect(state.gameType).toBe(GameType.BLACKJACK);
  });

  it('sets currentPlayerIndex to 0', () => {
    const state = blackjackEngine.getInitialState(PLAYERS);
    expect(state.currentPlayerIndex).toBe(0);
  });

  it('has correct remaining deck size', () => {
    const state = blackjackEngine.getInitialState(PLAYERS);
    const dealtCards = PLAYERS.length * 2 + 2; // players + dealer
    expect(state.deck).toHaveLength(52 - dealtCards);
  });

  it('initializes player hands as not bust and not stood', () => {
    const state = blackjackEngine.getInitialState(PLAYERS);
    for (const hand of state.playerHands) {
      expect(hand.isBust).toBe(false);
      expect(hand.hasStood).toBe(false);
    }
  });

  it('sets dealerDone to false', () => {
    const state = blackjackEngine.getInitialState(PLAYERS);
    expect(state.dealerDone).toBe(false);
  });
});

describe('blackjackEngine.getValidActions', () => {
  it('returns hit and stand when hand < 21', () => {
    const state = makeState();
    const actions = blackjackEngine.getValidActions(state, 'p1');
    expect(actions).toEqual([
      { type: 'hit', playerId: 'p1' },
      { type: 'stand', playerId: 'p1' },
    ]);
  });

  it('returns stand only when hand === 21', () => {
    const state = makeState({
      playerHands: [
        { playerId: 'p1', cards: [card('A'), card('K')], isBust: false, hasStood: false },
        { playerId: 'p2', cards: [card('9'), card('6')], isBust: false, hasStood: false },
      ],
    });
    const actions = blackjackEngine.getValidActions(state, 'p1');
    expect(actions).toEqual([{ type: 'stand', playerId: 'p1' }]);
  });

  it('returns empty when player is bust', () => {
    const state = makeState({
      playerHands: [
        { playerId: 'p1', cards: [card('K'), card('Q'), card('5')], isBust: true, hasStood: false },
        { playerId: 'p2', cards: [card('9'), card('6')], isBust: false, hasStood: false },
      ],
    });
    const actions = blackjackEngine.getValidActions(state, 'p1');
    expect(actions).toEqual([]);
  });

  it('returns empty when player has stood', () => {
    const state = makeState({
      playerHands: [
        { playerId: 'p1', cards: [card('7'), card('8')], isBust: false, hasStood: true },
        { playerId: 'p2', cards: [card('9'), card('6')], isBust: false, hasStood: false },
      ],
    });
    const actions = blackjackEngine.getValidActions(state, 'p1');
    expect(actions).toEqual([]);
  });

  it('returns empty when it is not the player\'s turn', () => {
    const state = makeState();
    const actions = blackjackEngine.getValidActions(state, 'p2');
    expect(actions).toEqual([]);
  });

  it('returns empty when game is finished', () => {
    const state = makeState({ status: 'finished' });
    const actions = blackjackEngine.getValidActions(state, 'p1');
    expect(actions).toEqual([]);
  });
});

describe('blackjackEngine.applyAction - hit', () => {
  it('adds a card to the player\'s hand', () => {
    const state = makeState();
    const action: GameAction = { type: 'hit', playerId: 'p1' };
    const next = blackjackEngine.applyAction(state, action);
    const hand = next.playerHands.find((h) => h.playerId === 'p1')!;
    expect(hand.cards).toHaveLength(3);
  });

  it('deals card face-up', () => {
    const state = makeState();
    const action: GameAction = { type: 'hit', playerId: 'p1' };
    const next = blackjackEngine.applyAction(state, action);
    const hand = next.playerHands.find((h) => h.playerId === 'p1')!;
    expect(hand.cards[2]!.faceUp).toBe(true);
  });

  it('reduces deck size by 1', () => {
    const state = makeState();
    const action: GameAction = { type: 'hit', playerId: 'p1' };
    const next = blackjackEngine.applyAction(state, action);
    expect(next.deck).toHaveLength(state.deck.length - 1);
  });

  it('marks player as bust when hand exceeds 21', () => {
    const state = makeState({
      playerHands: [
        { playerId: 'p1', cards: [card('K'), card('Q')], isBust: false, hasStood: false },
        { playerId: 'p2', cards: [card('9'), card('6')], isBust: false, hasStood: false },
      ],
      // Top card is 5, so K+Q+5=25 -> bust
      deck: [card('5'), card('6'), card('7')],
    });
    const next = blackjackEngine.applyAction(state, { type: 'hit', playerId: 'p1' });
    const hand = next.playerHands.find((h) => h.playerId === 'p1')!;
    expect(hand.isBust).toBe(true);
  });

  it('auto-advances turn when player busts', () => {
    const state = makeState({
      playerHands: [
        { playerId: 'p1', cards: [card('K'), card('Q')], isBust: false, hasStood: false },
        { playerId: 'p2', cards: [card('9'), card('6')], isBust: false, hasStood: false },
      ],
      deck: [card('5'), card('6'), card('7'), card('8'), card('9'), card('10')],
    });
    const next = blackjackEngine.applyAction(state, { type: 'hit', playerId: 'p1' });
    expect(next.currentPlayerIndex).toBe(1);
  });

  it('does not auto-advance when hit results in exactly 21', () => {
    const state = makeState({
      playerHands: [
        { playerId: 'p1', cards: [card('K'), card('5')], isBust: false, hasStood: false },
        { playerId: 'p2', cards: [card('9'), card('6')], isBust: false, hasStood: false },
      ],
      // Top card is 6, so K+5+6=21 -> not bust, player keeps turn
      deck: [card('6'), card('7'), card('8'), card('9'), card('10'), card('J')],
    });
    const next = blackjackEngine.applyAction(state, { type: 'hit', playerId: 'p1' });
    const hand = next.playerHands.find((h) => h.playerId === 'p1')!;
    expect(hand.isBust).toBe(false);
    expect(hand.hasStood).toBe(false);
    // Player still has the turn
    expect(next.currentPlayerIndex).toBe(0);
    // Can only stand at 21
    const actions = blackjackEngine.getValidActions(next, 'p1');
    expect(actions).toEqual([{ type: 'stand', playerId: 'p1' }]);
  });

  it('does not change state on original object', () => {
    const state = makeState();
    const originalHandLength = state.playerHands[0]!.cards.length;
    blackjackEngine.applyAction(state, { type: 'hit', playerId: 'p1' });
    expect(state.playerHands[0]!.cards).toHaveLength(originalHandLength);
  });
});

describe('blackjackEngine.applyAction - stand', () => {
  it('marks player as stood', () => {
    const state = makeState();
    const next = blackjackEngine.applyAction(state, { type: 'stand', playerId: 'p1' });
    const hand = next.playerHands.find((h) => h.playerId === 'p1')!;
    expect(hand.hasStood).toBe(true);
  });

  it('advances to next player', () => {
    const state = makeState();
    const next = blackjackEngine.applyAction(state, { type: 'stand', playerId: 'p1' });
    expect(next.currentPlayerIndex).toBe(1);
  });

  it('does not add cards', () => {
    const state = makeState();
    const next = blackjackEngine.applyAction(state, { type: 'stand', playerId: 'p1' });
    const hand = next.playerHands.find((h) => h.playerId === 'p1')!;
    expect(hand.cards).toHaveLength(2);
  });
});

describe('blackjackEngine.applyAction - invalid', () => {
  it('throws when wrong player attempts action', () => {
    const state = makeState();
    expect(() => blackjackEngine.applyAction(state, { type: 'hit', playerId: 'p2' }))
      .toThrow('Not your turn');
  });

  it('throws for unknown action type', () => {
    const state = makeState();
    expect(() => blackjackEngine.applyAction(state, { type: 'double', playerId: 'p1' }))
      .toThrow('Unknown action type: double');
  });

  it('throws when game is finished', () => {
    const state = makeState({ status: 'finished' });
    expect(() => blackjackEngine.applyAction(state, { type: 'hit', playerId: 'p1' }))
      .toThrow('Game is already finished');
  });

  it('throws when player has already stood', () => {
    const state = makeState({
      playerHands: [
        { playerId: 'p1', cards: [card('7'), card('8')], isBust: false, hasStood: true },
        { playerId: 'p2', cards: [card('9'), card('6')], isBust: false, hasStood: false },
      ],
      currentPlayerIndex: 0, // Force p1 as current despite hasStood
    });
    expect(() => blackjackEngine.applyAction(state, { type: 'hit', playerId: 'p1' }))
      .toThrow('Player has already finished their turn');
  });
});

describe('blackjackEngine - 3-player turn wrapping', () => {
  it('advances correctly through 3 players with bust and stand', () => {
    const state: BlackjackState = {
      gameType: GameType.BLACKJACK,
      players: ['p1', 'p2', 'p3'],
      currentPlayerIndex: 0,
      status: 'playing',
      deck: [card('5'), card('6'), card('7'), card('8'), card('9'), card('10')],
      playerHands: [
        { playerId: 'p1', cards: [card('K'), card('Q')], isBust: false, hasStood: false }, // 20
        { playerId: 'p2', cards: [card('9'), card('6')], isBust: false, hasStood: false }, // 15
        { playerId: 'p3', cards: [card('7'), card('8')], isBust: false, hasStood: false }, // 15
      ],
      dealerCards: [card('K', 'spades', true), card('7', 'hearts', false)],
      dealerDone: false,
    };

    // p1 hits -> K+Q+5=25 bust, advances to p2
    const after1 = blackjackEngine.applyAction(state, { type: 'hit', playerId: 'p1' });
    expect(after1.playerHands[0]!.isBust).toBe(true);
    expect(after1.currentPlayerIndex).toBe(1);

    // p2 stands, advances to p3
    const after2 = blackjackEngine.applyAction(after1, { type: 'stand', playerId: 'p2' });
    expect(after2.currentPlayerIndex).toBe(2);

    // p3 stands -> all done -> dealer plays
    const after3 = blackjackEngine.applyAction(after2, { type: 'stand', playerId: 'p3' });
    expect(after3.dealerDone).toBe(true);
    expect(after3.status).toBe('finished');
  });

  it('skips bust players during turn advancement', () => {
    const state: BlackjackState = {
      gameType: GameType.BLACKJACK,
      players: ['p1', 'p2', 'p3'],
      currentPlayerIndex: 0,
      status: 'playing',
      deck: [card('K'), card('6'), card('7'), card('8'), card('9'), card('10')],
      playerHands: [
        { playerId: 'p1', cards: [card('7'), card('8')], isBust: false, hasStood: false },
        { playerId: 'p2', cards: [card('K'), card('Q'), card('5')], isBust: true, hasStood: false }, // already bust
        { playerId: 'p3', cards: [card('9'), card('6')], isBust: false, hasStood: false },
      ],
      dealerCards: [card('K', 'spades', true), card('7', 'hearts', false)],
      dealerDone: false,
    };

    // p1 stands -> should skip bust p2 -> go to p3
    const next = blackjackEngine.applyAction(state, { type: 'stand', playerId: 'p1' });
    expect(next.currentPlayerIndex).toBe(2);
  });
});

describe('blackjackEngine - dealer auto-play', () => {
  it('triggers dealer when last player stands', () => {
    const state = makeState({
      currentPlayerIndex: 1,
      playerHands: [
        { playerId: 'p1', cards: [card('7'), card('8')], isBust: false, hasStood: true },
        { playerId: 'p2', cards: [card('9'), card('6')], isBust: false, hasStood: false },
      ],
    });
    const next = blackjackEngine.applyAction(state, { type: 'stand', playerId: 'p2' });
    expect(next.dealerDone).toBe(true);
    expect(next.status).toBe('finished');
  });

  it('triggers dealer when last player busts', () => {
    const state = makeState({
      currentPlayerIndex: 1,
      playerHands: [
        { playerId: 'p1', cards: [card('K'), card('Q')], isBust: true, hasStood: false },
        { playerId: 'p2', cards: [card('K'), card('9')], isBust: false, hasStood: false },
      ],
      deck: [card('5'), card('6'), card('7'), card('8'), card('9'), card('10')],
    });
    const next = blackjackEngine.applyAction(state, { type: 'hit', playerId: 'p2' });
    // p2 gets 5 -> K+9+5=24 -> bust -> all players done -> dealer plays
    expect(next.dealerDone).toBe(true);
    expect(next.status).toBe('finished');
  });

  it('reveals dealer face-down card', () => {
    const state = makeState({
      currentPlayerIndex: 0,
      players: ['p1'],
      playerHands: [
        { playerId: 'p1', cards: [card('7'), card('8')], isBust: false, hasStood: false },
      ],
      dealerCards: [card('K', 'spades', true), card('3', 'hearts', false)],
    });
    const next = blackjackEngine.applyAction(state, { type: 'stand', playerId: 'p1' });
    expect(next.dealerCards.every((c) => c.faceUp)).toBe(true);
  });

  it('dealer hits on 16 or less', () => {
    // Dealer has K(10) + 3 = 13, should draw cards
    const state = makeState({
      currentPlayerIndex: 0,
      players: ['p1'],
      playerHands: [
        { playerId: 'p1', cards: [card('7'), card('8')], isBust: false, hasStood: false },
      ],
      dealerCards: [card('K', 'spades', true), card('3', 'hearts', false)],
      deck: [card('2'), card('3'), card('4'), card('5'), card('6'), card('7')],
    });
    const next = blackjackEngine.applyAction(state, { type: 'stand', playerId: 'p1' });
    // Dealer starts at 13, draws 2(->15), draws 3(->18), stands
    expect(next.dealerCards.length).toBeGreaterThan(2);
    expect(calculateHandValue(next.dealerCards)).toBeGreaterThanOrEqual(17);
  });

  it('dealer stands on 17+', () => {
    const state = makeState({
      currentPlayerIndex: 0,
      players: ['p1'],
      playerHands: [
        { playerId: 'p1', cards: [card('7'), card('8')], isBust: false, hasStood: false },
      ],
      dealerCards: [card('K', 'spades', true), card('7', 'hearts', false)],
      deck: [card('2'), card('3')],
    });
    const next = blackjackEngine.applyAction(state, { type: 'stand', playerId: 'p1' });
    // Dealer has K+7=17, should stand immediately
    expect(next.dealerCards).toHaveLength(2);
    expect(calculateHandValue(next.dealerCards)).toBe(17);
  });
});

describe('blackjackEngine.isGameOver', () => {
  it('returns false during play', () => {
    const state = makeState({ status: 'playing' });
    expect(blackjackEngine.isGameOver(state)).toBe(false);
  });

  it('returns true when finished', () => {
    const state = makeState({ status: 'finished' });
    expect(blackjackEngine.isGameOver(state)).toBe(true);
  });
});

describe('blackjackEngine.getWinner', () => {
  it('returns null when game is not finished', () => {
    const state = makeState({ status: 'playing' });
    expect(blackjackEngine.getWinner(state)).toBeNull();
  });

  it('returns player who beats dealer', () => {
    const state = makeState({
      status: 'finished',
      dealerDone: true,
      dealerCards: [card('K', 'spades'), card('7', 'hearts')], // 17
      playerHands: [
        { playerId: 'p1', cards: [card('K'), card('9')], isBust: false, hasStood: true }, // 19 - wins
        { playerId: 'p2', cards: [card('5'), card('6')], isBust: false, hasStood: true }, // 11 - loses
      ],
    });
    expect(blackjackEngine.getWinner(state)).toBe('p1');
  });

  it('returns null when all players bust', () => {
    const state = makeState({
      status: 'finished',
      dealerDone: true,
      dealerCards: [card('K', 'spades'), card('7', 'hearts')],
      playerHands: [
        { playerId: 'p1', cards: [card('K'), card('Q'), card('5')], isBust: true, hasStood: false },
        { playerId: 'p2', cards: [card('K'), card('J'), card('3')], isBust: true, hasStood: false },
      ],
    });
    expect(blackjackEngine.getWinner(state)).toBeNull();
  });

  it('returns player who wins when dealer busts', () => {
    const state = makeState({
      status: 'finished',
      dealerDone: true,
      dealerCards: [card('K', 'spades'), card('8', 'hearts'), card('5', 'diamonds')], // 23 bust
      playerHands: [
        { playerId: 'p1', cards: [card('7'), card('8')], isBust: false, hasStood: true }, // 15 - wins
        { playerId: 'p2', cards: [card('K'), card('Q'), card('5')], isBust: true, hasStood: false }, // bust
      ],
    });
    expect(blackjackEngine.getWinner(state)).toBe('p1');
  });

  it('returns null for push (tie with dealer)', () => {
    const state = makeState({
      status: 'finished',
      dealerDone: true,
      players: ['p1'],
      dealerCards: [card('K', 'spades'), card('8', 'hearts')], // 18
      playerHands: [
        { playerId: 'p1', cards: [card('K'), card('8')], isBust: false, hasStood: true }, // 18 - push
      ],
    });
    expect(blackjackEngine.getWinner(state)).toBeNull();
  });

  it('returns player who loses to dealer (lower hand)', () => {
    const state = makeState({
      status: 'finished',
      dealerDone: true,
      players: ['p1'],
      dealerCards: [card('K', 'spades'), card('9', 'hearts')], // 19
      playerHands: [
        { playerId: 'p1', cards: [card('K'), card('8')], isBust: false, hasStood: true }, // 18 - loses
      ],
    });
    expect(blackjackEngine.getWinner(state)).toBeNull();
  });
});

describe('blackjackEngine.getResults', () => {
  const usernames = new Map([['p1', 'Alice'], ['p2', 'Bob']]);

  it('returns empty array when game is not finished', () => {
    const state = makeState({ status: 'playing' });
    expect(blackjackEngine.getResults(state, usernames)).toEqual([]);
  });

  it('returns win when player beats dealer', () => {
    const state = makeState({
      status: 'finished',
      dealerDone: true,
      dealerCards: [card('K', 'spades'), card('7', 'hearts')], // 17
      playerHands: [
        { playerId: 'p1', cards: [card('K'), card('9')], isBust: false, hasStood: true }, // 19
        { playerId: 'p2', cards: [card('5'), card('6')], isBust: false, hasStood: true }, // 11
      ],
    });
    const results = blackjackEngine.getResults(state, usernames);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ playerId: 'p1', username: 'Alice', result: 'win', handValue: 19 });
    expect(results[1]).toEqual({ playerId: 'p2', username: 'Bob', result: 'lose', handValue: 11 });
  });

  it('returns lose for bust player', () => {
    const state = makeState({
      status: 'finished',
      dealerDone: true,
      dealerCards: [card('K', 'spades'), card('7', 'hearts')], // 17
      playerHands: [
        { playerId: 'p1', cards: [card('K'), card('Q'), card('5')], isBust: true, hasStood: false }, // 25 bust
        { playerId: 'p2', cards: [card('K'), card('9')], isBust: false, hasStood: true }, // 19
      ],
    });
    const results = blackjackEngine.getResults(state, usernames);
    expect(results[0]!.result).toBe('lose');
    expect(results[0]!.handValue).toBe(25);
    expect(results[1]!.result).toBe('win');
  });

  it('returns push when player ties with dealer', () => {
    const state = makeState({
      status: 'finished',
      dealerDone: true,
      players: ['p1'],
      dealerCards: [card('K', 'spades'), card('8', 'hearts')], // 18
      playerHands: [
        { playerId: 'p1', cards: [card('K'), card('8')], isBust: false, hasStood: true }, // 18
      ],
    });
    const results = blackjackEngine.getResults(state, usernames);
    expect(results[0]).toEqual({ playerId: 'p1', username: 'Alice', result: 'push', handValue: 18 });
  });

  it('returns win for all non-bust players when dealer busts', () => {
    const state = makeState({
      status: 'finished',
      dealerDone: true,
      dealerCards: [card('K', 'spades'), card('8', 'hearts'), card('5', 'diamonds')], // 23 bust
      playerHands: [
        { playerId: 'p1', cards: [card('7'), card('8')], isBust: false, hasStood: true }, // 15
        { playerId: 'p2', cards: [card('K'), card('Q'), card('5')], isBust: true, hasStood: false }, // bust
      ],
    });
    const results = blackjackEngine.getResults(state, usernames);
    expect(results[0]!.result).toBe('win');
    expect(results[1]!.result).toBe('lose'); // bust player still loses
  });

  it('handles multiple players with mixed results', () => {
    const threeUsernames = new Map([['p1', 'Alice'], ['p2', 'Bob'], ['p3', 'Charlie']]);
    const state: BlackjackState = {
      gameType: GameType.BLACKJACK,
      players: ['p1', 'p2', 'p3'],
      currentPlayerIndex: 0,
      status: 'finished',
      deck: [],
      dealerCards: [card('K', 'spades'), card('8', 'hearts')], // 18
      playerHands: [
        { playerId: 'p1', cards: [card('K'), card('9')], isBust: false, hasStood: true }, // 19 - win
        { playerId: 'p2', cards: [card('K'), card('8')], isBust: false, hasStood: true }, // 18 - push
        { playerId: 'p3', cards: [card('K'), card('Q'), card('5')], isBust: true, hasStood: false }, // bust - lose
      ],
      dealerDone: true,
    };
    const results = blackjackEngine.getResults(state, threeUsernames);
    expect(results[0]!.result).toBe('win');
    expect(results[1]!.result).toBe('push');
    expect(results[2]!.result).toBe('lose');
  });

  it('uses Unknown for missing username', () => {
    const partial = new Map([['p1', 'Alice']]);
    const state = makeState({
      status: 'finished',
      dealerDone: true,
      dealerCards: [card('K', 'spades'), card('7', 'hearts')],
      playerHands: [
        { playerId: 'p1', cards: [card('K'), card('9')], isBust: false, hasStood: true },
        { playerId: 'p2', cards: [card('5'), card('6')], isBust: false, hasStood: true },
      ],
    });
    const results = blackjackEngine.getResults(state, partial);
    expect(results[1]!.username).toBe('Unknown');
  });
});

describe('blackjackEngine.getResults - naturals', () => {
  const names = new Map([['p1', 'Alice'], ['p2', 'Bob']]);
  const finished = (p1: Card[], p2: Card[], dealer: Card[]) =>
    makeState({
      status: 'finished',
      dealerDone: true,
      playerHands: [
        { playerId: 'p1', cards: p1, isBust: false, hasStood: true },
        { playerId: 'p2', cards: p2, isBust: false, hasStood: true },
      ],
      dealerCards: dealer,
    });

  it('a natural beats a dealer 21 made of three cards', () => {
    const results = blackjackEngine.getResults(finished([card('A'), card('K')], [card('9'), card('9')], [card('7'), card('7'), card('7')]), names);
    expect(results.find((r) => r.playerId === 'p1')!.result).toBe('win');
  });

  it('a dealer natural beats a player 21 made of three cards', () => {
    const results = blackjackEngine.getResults(finished([card('7'), card('7'), card('7')], [card('A'), card('Q')], [card('A'), card('J')]), names);
    expect(results.find((r) => r.playerId === 'p1')!.result).toBe('lose');
    expect(results.find((r) => r.playerId === 'p2')!.result).toBe('push');
  });

  it('getWinner agrees with getResults for naturals', () => {
    expect(blackjackEngine.getWinner(finished([card('7'), card('7'), card('7')], [card('A'), card('Q')], [card('7'), card('7'), card('7')]))).toBe('p2');
  });
});
