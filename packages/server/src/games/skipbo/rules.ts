import type { SkipBoCard, SkipBoPile } from './types.js';

/** Create a Skip-Bo deck: 12 copies each of values 1-12, plus 18 wild cards. 162 total. */
export function createSkipBoDeck(): SkipBoCard[] {
  const deck: SkipBoCard[] = [];

  // 12 copies of each value 1-12
  for (let value = 1; value <= 12; value++) {
    for (let i = 0; i < 12; i++) {
      deck.push({ value, isWild: false, faceUp: false });
    }
  }

  // 18 wild cards
  for (let i = 0; i < 18; i++) {
    deck.push({ value: 0, isWild: true, faceUp: false });
  }

  return deck;
}

/** Fisher-Yates shuffle — returns a new array. */
export function shuffleDeck(deck: SkipBoCard[]): SkipBoCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

/** Returns stock pile size: 30 for 2-4 players, 20 for 5-6 players. */
export function getStockPileSize(playerCount: number): number {
  return playerCount <= 4 ? 30 : 20;
}

/** Get the effective value of a card. Numbered cards return their value; wilds return targetValue or 0. */
export function getEffectiveValue(card: SkipBoCard, targetValue?: number): number {
  if (!card.isWild) return card.value;
  return targetValue ?? 0;
}

/** Check if a card can be played on a building pile. */
export function canPlayOnBuildingPile(pile: SkipBoPile, card: SkipBoCard): boolean {
  if (pile.length >= 12) return false;

  if (pile.length === 0) {
    // Empty pile requires value 1 or wild
    return card.value === 1 || card.isWild;
  }

  const topCard = pile[pile.length - 1]!;
  const topEffective = getEffectiveValue(topCard, topCard.isWild ? pile.length : undefined);
  const nextValue = topEffective + 1;

  if (card.isWild) return true;
  return card.value === nextValue;
}

/** Returns true if pile has 12 cards (completed 1-12 sequence). */
export function isBuildingPileComplete(pile: SkipBoPile): boolean {
  return pile.length === 12;
}

/** Returns the cards from a completed pile (to be shuffled back into draw pile). */
export function clearCompletedBuildingPile(pile: SkipBoPile): SkipBoCard[] {
  return pile.map((card) => ({ ...card, faceUp: false }));
}
