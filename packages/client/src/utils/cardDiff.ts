import type { FilteredGameState } from '@cardpal/shared';

export interface NewCardInfo {
  myHand: number[];
  dealerCards: number[];
  otherPlayerHands: Map<string, number[]>;
  dealerRevealed: boolean;
}

/**
 * Detect which card indices are new by comparing previous and next game states.
 * Cards are always appended to the end of arrays, so new cards are at indices
 * >= previous array length.
 *
 * Also detects dealer card reveals (faceUp changed from false to true).
 */
export function detectNewCards(
  prev: FilteredGameState | null,
  next: FilteredGameState,
): NewCardInfo {
  const result: NewCardInfo = {
    myHand: [],
    dealerCards: [],
    otherPlayerHands: new Map(),
    dealerRevealed: false,
  };

  if (!prev) {
    // First state — all cards are new
    result.myHand = next.hand.map((_, i) => i);
    result.dealerCards = next.dealerCards.map((_, i) => i);
    for (const oh of next.otherPlayerHands) {
      result.otherPlayerHands.set(oh.playerId, oh.cards.map((_, i) => i));
    }
    return result;
  }

  // My hand: new cards are appended at the end
  if (next.hand.length > prev.hand.length) {
    for (let i = prev.hand.length; i < next.hand.length; i++) {
      result.myHand.push(i);
    }
  }

  // Dealer cards: new cards appended, or existing cards revealed
  if (next.dealerCards.length > prev.dealerCards.length) {
    for (let i = prev.dealerCards.length; i < next.dealerCards.length; i++) {
      result.dealerCards.push(i);
    }
  }

  // Check if dealer's face-down card was revealed (faceUp changed)
  for (let i = 0; i < Math.min(prev.dealerCards.length, next.dealerCards.length); i++) {
    const prevCard = prev.dealerCards[i]!;
    const nextCard = next.dealerCards[i]!;
    if (!prevCard.faceUp && nextCard.faceUp) {
      result.dealerRevealed = true;
      break;
    }
  }

  // Other player hands: compare by playerId
  for (const nextHand of next.otherPlayerHands) {
    const prevHand = prev.otherPlayerHands.find((h) => h.playerId === nextHand.playerId);
    const prevLen = prevHand?.cards.length ?? 0;
    if (nextHand.cards.length > prevLen) {
      const newIndices: number[] = [];
      for (let i = prevLen; i < nextHand.cards.length; i++) {
        newIndices.push(i);
      }
      result.otherPlayerHands.set(nextHand.playerId, newIndices);
    }
  }

  return result;
}
