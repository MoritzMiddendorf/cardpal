import type { PileInfo, GameAction } from '@cardpal/shared';

export type SourceSelection =
  | { type: 'hand'; handIndex: number }
  | { type: 'stock' }
  | { type: 'discard'; discardPileIndex: number };

export function getNextNeededValue(pile: PileInfo): number {
  if (!pile.topCard) return 1;
  if (pile.topCard.isWild) {
    return pile.count + 1;
  }
  return pile.topCard.value + 1;
}

export function getActionsForSource(validActions: GameAction[], source: SourceSelection): GameAction[] {
  return validActions.filter((a) => {
    if (source.type === 'hand') {
      return (
        (a.type === 'PLAY_FROM_HAND' && (a.payload as Record<string, number>)?.handIndex === source.handIndex) ||
        (a.type === 'DISCARD' && (a.payload as Record<string, number>)?.handIndex === source.handIndex)
      );
    }
    if (source.type === 'stock') {
      return a.type === 'PLAY_FROM_STOCK';
    }
    if (source.type === 'discard') {
      return (
        a.type === 'PLAY_FROM_DISCARD' &&
        (a.payload as Record<string, number>)?.discardPileIndex === source.discardPileIndex
      );
    }
    return false;
  });
}

export function isBuildingPileTarget(
  validActions: GameAction[],
  source: SourceSelection | null,
  buildingPileIndex: number,
): boolean {
  if (!source) return false;
  const actions = getActionsForSource(validActions, source);
  return actions.some(
    (a) =>
      (a.type === 'PLAY_FROM_HAND' || a.type === 'PLAY_FROM_STOCK' || a.type === 'PLAY_FROM_DISCARD') &&
      (a.payload as Record<string, number>)?.buildingPileIndex === buildingPileIndex,
  );
}

export function isDiscardPileTarget(
  validActions: GameAction[],
  source: SourceSelection | null,
  discardPileIndex: number,
): boolean {
  if (!source) return false;
  const actions = getActionsForSource(validActions, source);
  return actions.some(
    (a) =>
      a.type === 'DISCARD' &&
      (a.payload as Record<string, number>)?.discardPileIndex === discardPileIndex,
  );
}
