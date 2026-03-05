import { GameType } from '@cardpal/shared';
import type { Card, FilteredGameState, FilteredSkipBoState, OtherPlayerHand, PileInfo, PlayerResult, SkipBoPile } from '@cardpal/shared';
import type { GameInstance } from '../games/engine.js';
import type { BlackjackState } from '../games/blackjack/types.js';
import type { SkipBoGameState } from '../games/skipbo/types.js';
import { calculateHandValue } from '../games/blackjack/rules.js';

/** Strip suit/rank from a face-down card for privacy (NFR6). */
function sanitizeFaceDownCard(card: Card): Card {
  if (card.faceUp) return card;
  return { suit: 'hearts', rank: '2', faceUp: false };
}

/**
 * Create a per-player filtered view of the game state.
 * Detects game type and populates hand, validActions, cardCount,
 * dealerCards, otherPlayerHands, and hand values accordingly.
 */
interface PauseInfo {
  isPaused: boolean;
  pausedForPlayerId: string | null;
}

export function filterGameState(instance: GameInstance, playerId: string, connectionMap?: Map<string, boolean>, pauseInfo?: PauseInfo): FilteredGameState {
  const state = instance.state;
  let hand: FilteredGameState['hand'] = [];
  let handValue = 0;
  let validActions: FilteredGameState['validActions'] = [];
  let dealerCards: Card[] = [];
  let dealerHandValue: number | null = null;
  const otherPlayerHands: OtherPlayerHand[] = [];
  let results: PlayerResult[] | undefined;
  const cardCounts: Map<string, number> = new Map();
  const bustMap: Map<string, boolean> = new Map();
  const stoodMap: Map<string, boolean> = new Map();
  let skipBoState: FilteredSkipBoState | undefined;

  if (state.gameType === GameType.SKIPBO && 'playerStates' in state) {
    const sbState = state as SkipBoGameState;
    const myState = sbState.playerStates.find((ps) => ps.playerId === playerId);

    validActions = instance.engine.getValidActions(state, playerId);

    // Build card counts (stock pile remaining) and maps
    for (const ps of sbState.playerStates) {
      cardCounts.set(ps.playerId, ps.stockPile.length);
      bustMap.set(ps.playerId, false);
      stoodMap.set(ps.playerId, false);
    }

    const pileInfo = (pile: SkipBoPile) => ({
      topCard: pile.length > 0 ? pile[pile.length - 1]! : null,
      count: pile.length,
    });

    skipBoState = {
      myHand: myState?.hand ?? [],
      myStockPile: myState ? pileInfo(myState.stockPile) : { topCard: null, count: 0 },
      myDiscardPiles: myState
        ? myState.discardPiles.map(pileInfo) as [PileInfo, PileInfo, PileInfo, PileInfo]
        : [{ topCard: null, count: 0 }, { topCard: null, count: 0 }, { topCard: null, count: 0 }, { topCard: null, count: 0 }],
      buildingPiles: sbState.buildingPiles.map(pileInfo) as [PileInfo, PileInfo, PileInfo, PileInfo],
      otherPlayers: sbState.playerStates
        .filter((ps) => ps.playerId !== playerId)
        .map((ps) => ({
          playerId: ps.playerId,
          username: instance.playerUsernames.get(ps.playerId) ?? 'Unknown',
          stockPile: pileInfo(ps.stockPile),
          discardPiles: ps.discardPiles.map(pileInfo) as [PileInfo, PileInfo, PileInfo, PileInfo],
          handCount: ps.hand.length,
          isConnected: connectionMap?.get(ps.playerId) ?? true,
        })),
      drawPileCount: sbState.drawPile.length,
    };

    if (state.status === 'finished') {
      results = instance.engine.getResults(state, instance.playerUsernames);
    }
  } else if (state.gameType === GameType.BLACKJACK && 'playerHands' in state) {
    const bjState = state as BlackjackState;

    // Get requesting player's cards and hand value
    const playerHand = bjState.playerHands.find((h) => h.playerId === playerId);
    if (playerHand) {
      hand = playerHand.cards;
      handValue = calculateHandValue(playerHand.cards);
    }

    // Get valid actions from engine
    validActions = instance.engine.getValidActions(state, playerId);

    // Build card counts and bust/stood maps
    for (const h of bjState.playerHands) {
      cardCounts.set(h.playerId, h.cards.length);
      bustMap.set(h.playerId, h.isBust);
      stoodMap.set(h.playerId, h.hasStood);
    }

    // Other players' hands (all face-up in Blackjack)
    for (const h of bjState.playerHands) {
      if (h.playerId !== playerId) {
        otherPlayerHands.push({
          playerId: h.playerId,
          cards: h.cards,
          handValue: calculateHandValue(h.cards),
        });
      }
    }

    // Dealer cards: strip face-down card data unless dealer is done
    if (bjState.dealerDone) {
      dealerCards = bjState.dealerCards;
      dealerHandValue = calculateHandValue(bjState.dealerCards);
    } else {
      dealerCards = bjState.dealerCards.map(sanitizeFaceDownCard);
      dealerHandValue = null;
    }

    // Include per-player results when game is finished
    if (state.status === 'finished') {
      results = instance.engine.getResults(state, instance.playerUsernames);
    }
  }

  const isPaused = pauseInfo?.isPaused ?? false;
  const pausedForPlayer = isPaused && pauseInfo?.pausedForPlayerId
    ? (instance.playerUsernames.get(pauseInfo.pausedForPlayerId) ?? 'Unknown')
    : null;

  return {
    gameType: state.gameType,
    currentPlayerIndex: state.currentPlayerIndex,
    status: state.status,
    players: state.players.map((pid, idx) => ({
      id: pid,
      username: instance.playerUsernames.get(pid) ?? 'Unknown',
      cardCount: cardCounts.get(pid) ?? 0,
      isActive: idx === state.currentPlayerIndex,
      isBust: bustMap.get(pid) ?? false,
      hasStood: stoodMap.get(pid) ?? false,
      isConnected: connectionMap?.get(pid) ?? true,
    })),
    myPlayerId: playerId,
    hand,
    handValue,
    validActions: isPaused ? [] : validActions,
    dealerCards,
    dealerHandValue,
    otherPlayerHands,
    results,
    isPaused,
    pausedForPlayer,
    skipBoState,
  };
}
