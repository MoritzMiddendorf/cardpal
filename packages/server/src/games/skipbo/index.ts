import { GameType } from '@cardpal/shared';
import type { GameAction, PlayerResult, SkipBoPile, SkipBoPlayerState } from '@cardpal/shared';
import type { GameEngine } from '../engine.js';
import type { SkipBoGameState } from './types.js';
import {
  createSkipBoDeck,
  shuffleDeck,
  getStockPileSize,
  canPlayOnBuildingPile,
  isBuildingPileComplete,
  clearCompletedBuildingPile,
} from './rules.js';

// Skip-Bo action type constants
export const PLAY_FROM_STOCK = 'PLAY_FROM_STOCK';
export const PLAY_FROM_HAND = 'PLAY_FROM_HAND';
export const PLAY_FROM_DISCARD = 'PLAY_FROM_DISCARD';
export const DISCARD = 'DISCARD';

/** Deep copy state for immutability. */
function cloneState(state: SkipBoGameState): SkipBoGameState {
  return JSON.parse(JSON.stringify(state));
}

/** Draw cards from draw pile until player has 5 in hand. Mutates state in place. */
function drawToFive(state: SkipBoGameState, playerIndex: number): void {
  const ps = state.playerStates[playerIndex]!;
  while (ps.hand.length < 5 && state.drawPile.length > 0) {
    const card = state.drawPile.pop()!;
    ps.hand.push({ ...card, faceUp: true });
  }
}

/** Handle completed building pile: clear it and shuffle cards back into draw pile. Mutates state. */
function handleCompletedPile(state: SkipBoGameState, pileIndex: number): void {
  const pile = state.buildingPiles[pileIndex]!;
  if (isBuildingPileComplete(pile)) {
    const cleared = clearCompletedBuildingPile(pile);
    state.drawPile.push(...cleared);
    state.drawPile = shuffleDeck(state.drawPile);
    state.buildingPiles[pileIndex] = [] as SkipBoPile;
  }
}

/** Advance turn to next player and draw cards for them. Mutates state. */
function advanceTurn(state: SkipBoGameState): void {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  drawToFive(state, state.currentPlayerIndex);
}

/** Reveal top card of stock pile after a card was played from it. Mutates state. */
function revealStockTop(ps: SkipBoPlayerState): void {
  if (ps.stockPile.length > 0) {
    const top = ps.stockPile[ps.stockPile.length - 1]!;
    ps.stockPile[ps.stockPile.length - 1] = { ...top, faceUp: true };
  }
}

export const skipBoEngine: GameEngine<SkipBoGameState> = {
  getInitialState(players: Array<{ id: string; username: string }>): SkipBoGameState {
    let deck = shuffleDeck(createSkipBoDeck());
    const stockPileSize = getStockPileSize(players.length);

    const playerStates = players.map((player) => {
      // Deal stock pile cards
      const stockCards = deck.slice(0, stockPileSize).map((card) => ({
        ...card,
        faceUp: false,
      }));
      deck = deck.slice(stockPileSize);

      // Top card of stock pile is face-up (top = last element)
      if (stockCards.length > 0) {
        stockCards[stockCards.length - 1] = { ...stockCards[stockCards.length - 1]!, faceUp: true };
      }

      // Deal 5 hand cards (all face-up since hand is private — visibility controlled by filtering)
      const handCards = deck.slice(0, 5).map((card) => ({ ...card, faceUp: true }));
      deck = deck.slice(5);

      return {
        playerId: player.id,
        stockPile: stockCards,
        hand: handCards,
        discardPiles: [[], [], [], []] as [SkipBoPile, SkipBoPile, SkipBoPile, SkipBoPile],
      };
    });

    return {
      gameType: GameType.SKIPBO,
      players: players.map((p) => p.id),
      currentPlayerIndex: 0,
      status: 'playing',
      drawPile: deck,
      buildingPiles: [[], [], [], []] as [SkipBoPile, SkipBoPile, SkipBoPile, SkipBoPile],
      playerStates,
    };
  },

  getValidActions(state: SkipBoGameState, playerId: string): GameAction[] {
    if (state.status !== 'playing') return [];
    if (playerId !== state.players[state.currentPlayerIndex]) return [];

    const actions: GameAction[] = [];
    const ps = state.playerStates.find((p) => p.playerId === playerId)!;

    // PLAY_FROM_STOCK: top card of stock pile → valid building pile
    if (ps.stockPile.length > 0) {
      const topCard = ps.stockPile[ps.stockPile.length - 1]!;
      for (let i = 0; i < 4; i++) {
        if (canPlayOnBuildingPile(state.buildingPiles[i]!, topCard)) {
          actions.push({
            type: PLAY_FROM_STOCK,
            playerId,
            payload: { buildingPileIndex: i },
          });
        }
      }
    }

    // PLAY_FROM_HAND: each hand card → valid building pile
    for (let h = 0; h < ps.hand.length; h++) {
      const card = ps.hand[h]!;
      for (let i = 0; i < 4; i++) {
        if (canPlayOnBuildingPile(state.buildingPiles[i]!, card)) {
          actions.push({
            type: PLAY_FROM_HAND,
            playerId,
            payload: { handIndex: h, buildingPileIndex: i },
          });
        }
      }
    }

    // PLAY_FROM_DISCARD: top card of each non-empty discard pile → valid building pile
    for (let d = 0; d < 4; d++) {
      const discardPile = ps.discardPiles[d]!;
      if (discardPile.length > 0) {
        const topCard = discardPile[discardPile.length - 1]!;
        for (let i = 0; i < 4; i++) {
          if (canPlayOnBuildingPile(state.buildingPiles[i]!, topCard)) {
            actions.push({
              type: PLAY_FROM_DISCARD,
              playerId,
              payload: { discardPileIndex: d, buildingPileIndex: i },
            });
          }
        }
      }
    }

    // DISCARD: each hand card → any of 4 discard piles (always valid, ends turn)
    for (let h = 0; h < ps.hand.length; h++) {
      for (let d = 0; d < 4; d++) {
        actions.push({
          type: DISCARD,
          playerId,
          payload: { handIndex: h, discardPileIndex: d },
        });
      }
    }

    return actions;
  },

  applyAction(state: SkipBoGameState, action: GameAction): SkipBoGameState {
    const newState = cloneState(state);
    const { type, playerId, payload } = action;

    // Validate it's the player's turn
    if (newState.status !== 'playing') {
      throw new Error('Game is not in playing state');
    }
    if (playerId !== newState.players[newState.currentPlayerIndex]) {
      throw new Error('Not your turn');
    }

    const playerIndex = newState.playerStates.findIndex((p) => p.playerId === playerId);
    if (playerIndex === -1) throw new Error('Player not found');
    const ps = newState.playerStates[playerIndex]!;

    // Validate action is in the set of valid actions
    const validActions = this.getValidActions(state, playerId);
    const isValid = validActions.some(
      (va) => va.type === type && JSON.stringify(va.payload) === JSON.stringify(payload),
    );
    if (!isValid) {
      throw new Error('Invalid action');
    }

    switch (type) {
      case PLAY_FROM_STOCK: {
        const { buildingPileIndex } = payload as { buildingPileIndex: number };
        const card = ps.stockPile.pop()!;
        newState.buildingPiles[buildingPileIndex]!.push({ ...card, faceUp: true });
        revealStockTop(ps);
        handleCompletedPile(newState, buildingPileIndex);
        break;
      }

      case PLAY_FROM_HAND: {
        const { handIndex, buildingPileIndex } = payload as { handIndex: number; buildingPileIndex: number };
        const card = ps.hand.splice(handIndex, 1)[0]!;
        newState.buildingPiles[buildingPileIndex]!.push({ ...card, faceUp: true });
        handleCompletedPile(newState, buildingPileIndex);
        // AC #6: If hand is empty after playing, draw 5 new cards
        if (ps.hand.length === 0) {
          drawToFive(newState, playerIndex);
        }
        break;
      }

      case PLAY_FROM_DISCARD: {
        const { discardPileIndex, buildingPileIndex } = payload as { discardPileIndex: number; buildingPileIndex: number };
        const card = ps.discardPiles[discardPileIndex]!.pop()!;
        newState.buildingPiles[buildingPileIndex]!.push({ ...card, faceUp: true });
        handleCompletedPile(newState, buildingPileIndex);
        break;
      }

      case DISCARD: {
        const { handIndex, discardPileIndex } = payload as { handIndex: number; discardPileIndex: number };
        const card = ps.hand.splice(handIndex, 1)[0]!;
        ps.discardPiles[discardPileIndex]!.push({ ...card, faceUp: true });
        // Discard ends turn — advance to next player
        advanceTurn(newState);
        break;
      }

      default:
        throw new Error(`Unknown action type: ${type}`);
    }

    // Check win condition: if any player's stock pile is empty, game is over
    if (this.isGameOver(newState)) {
      newState.status = 'finished';
    }

    return newState;
  },

  isGameOver(state: SkipBoGameState): boolean {
    return state.playerStates.some((ps) => ps.stockPile.length === 0);
  },

  getWinner(state: SkipBoGameState): string | null {
    const winner = state.playerStates.find((ps) => ps.stockPile.length === 0);
    return winner ? winner.playerId : null;
  },

  getResults(state: SkipBoGameState, playerUsernames: Map<string, string>): PlayerResult[] {
    if (state.status !== 'finished') return [];
    const winnerId = this.getWinner(state);
    return state.playerStates.map((ps) => ({
      playerId: ps.playerId,
      username: playerUsernames.get(ps.playerId) ?? 'Unknown',
      result: ps.playerId === winnerId ? ('win' as const) : ('lose' as const),
      handValue: ps.stockPile.length,
    }));
  },
};
