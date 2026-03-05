import { describe, it, expect } from 'vitest';
import { detectNewCards } from './cardDiff.js';
import { GameType } from '@cardpal/shared';
import type { FilteredGameState, Card } from '@cardpal/shared';

function card(rank: Card['rank'], suit: Card['suit'] = 'hearts', faceUp = true): Card {
  return { rank, suit, faceUp };
}

function makeState(overrides: Partial<FilteredGameState> = {}): FilteredGameState {
  return {
    gameType: GameType.BLACKJACK,
    currentPlayerIndex: 0,
    status: 'playing',
    players: [],
    myPlayerId: 'p1',
    hand: [],
    handValue: 0,
    validActions: [],
    dealerCards: [],
    dealerHandValue: null,
    otherPlayerHands: [],
    isPaused: false,
    pausedForPlayer: null,
    ...overrides,
  };
}

describe('detectNewCards', () => {
  it('marks all cards as new when prev is null (initial deal)', () => {
    const next = makeState({
      hand: [card('K'), card('7')],
      dealerCards: [card('J', 'spades'), card('4', 'hearts', false)],
      otherPlayerHands: [
        { playerId: 'p2', cards: [card('9'), card('6')], handValue: 15 },
      ],
    });

    const result = detectNewCards(null, next);

    expect(result.myHand).toEqual([0, 1]);
    expect(result.dealerCards).toEqual([0, 1]);
    expect(result.otherPlayerHands.get('p2')).toEqual([0, 1]);
  });

  it('detects single new card in my hand (hit)', () => {
    const prev = makeState({
      hand: [card('K'), card('7')],
    });
    const next = makeState({
      hand: [card('K'), card('7'), card('5')],
    });

    const result = detectNewCards(prev, next);

    expect(result.myHand).toEqual([2]);
    expect(result.dealerCards).toEqual([]);
  });

  it('detects no new cards when state unchanged', () => {
    const prev = makeState({
      hand: [card('K'), card('7')],
      dealerCards: [card('J', 'spades'), card('4', 'hearts', false)],
    });
    const next = makeState({
      hand: [card('K'), card('7')],
      dealerCards: [card('J', 'spades'), card('4', 'hearts', false)],
    });

    const result = detectNewCards(prev, next);

    expect(result.myHand).toEqual([]);
    expect(result.dealerCards).toEqual([]);
    expect(result.dealerRevealed).toBe(false);
  });

  it('detects new dealer cards', () => {
    const prev = makeState({
      dealerCards: [card('J', 'spades'), card('4', 'hearts')],
    });
    const next = makeState({
      dealerCards: [card('J', 'spades'), card('4', 'hearts'), card('6', 'clubs')],
    });

    const result = detectNewCards(prev, next);

    expect(result.dealerCards).toEqual([2]);
  });

  it('detects dealer card reveal (faceUp change)', () => {
    const prev = makeState({
      dealerCards: [card('J', 'spades', true), card('4', 'hearts', false)],
    });
    const next = makeState({
      dealerCards: [card('J', 'spades', true), card('4', 'hearts', true)],
    });

    const result = detectNewCards(prev, next);

    expect(result.dealerRevealed).toBe(true);
    expect(result.dealerCards).toEqual([]); // no new cards, just revealed
  });

  it('detects new cards in other player hands', () => {
    const prev = makeState({
      otherPlayerHands: [
        { playerId: 'p2', cards: [card('9'), card('6')], handValue: 15 },
      ],
    });
    const next = makeState({
      otherPlayerHands: [
        { playerId: 'p2', cards: [card('9'), card('6'), card('3')], handValue: 18 },
      ],
    });

    const result = detectNewCards(prev, next);

    expect(result.otherPlayerHands.get('p2')).toEqual([2]);
  });

  it('handles new player appearing in other hands', () => {
    const prev = makeState({
      otherPlayerHands: [],
    });
    const next = makeState({
      otherPlayerHands: [
        { playerId: 'p2', cards: [card('9'), card('6')], handValue: 15 },
      ],
    });

    const result = detectNewCards(prev, next);

    expect(result.otherPlayerHands.get('p2')).toEqual([0, 1]);
  });

  it('handles multiple simultaneous new cards (initial deal)', () => {
    const prev = makeState({
      hand: [],
      dealerCards: [],
    });
    const next = makeState({
      hand: [card('K'), card('7')],
      dealerCards: [card('J', 'spades'), card('4', 'hearts', false)],
    });

    const result = detectNewCards(prev, next);

    expect(result.myHand).toEqual([0, 1]);
    expect(result.dealerCards).toEqual([0, 1]);
  });

  it('detects dealer reveal combined with new cards', () => {
    const prev = makeState({
      dealerCards: [card('J', 'spades', true), card('4', 'hearts', false)],
    });
    const next = makeState({
      dealerCards: [card('J', 'spades', true), card('4', 'hearts', true), card('6', 'clubs', true)],
    });

    const result = detectNewCards(prev, next);

    expect(result.dealerRevealed).toBe(true);
    expect(result.dealerCards).toEqual([2]);
  });
});
