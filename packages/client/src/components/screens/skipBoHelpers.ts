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
  return !!source && !!findDropAction(validActions, source, { type: 'building', index: buildingPileIndex });
}

export function isDiscardPileTarget(
  validActions: GameAction[],
  source: SourceSelection | null,
  discardPileIndex: number,
): boolean {
  return !!source && !!findDropAction(validActions, source, { type: 'discard', index: discardPileIndex });
}

/** A pile a dragged card can be dropped on. */
export type DropTarget =
  | { type: 'building'; index: number }
  | { type: 'discard'; index: number };

/** Value of the `data-drop-target` attribute that marks a drop target in the DOM. */
export function dropTargetId(target: DropTarget): string {
  return `${target.type}:${target.index}`;
}

export function parseDropTargetId(id: string | null | undefined): DropTarget | null {
  const match = /^(building|discard):(\d+)$/.exec(id ?? '');
  if (!match) return null;
  return { type: match[1] as DropTarget['type'], index: Number(match[2]) };
}

/** The valid action that moves `source` onto `target`, or undefined when that move isn't allowed. */
export function findDropAction(
  validActions: GameAction[],
  source: SourceSelection,
  target: DropTarget,
): GameAction | undefined {
  return getActionsForSource(validActions, source).find((a) => {
    const payload = a.payload as Record<string, number> | undefined;
    if (target.type === 'building') {
      return (
        (a.type === 'PLAY_FROM_HAND' || a.type === 'PLAY_FROM_STOCK' || a.type === 'PLAY_FROM_DISCARD') &&
        payload?.buildingPileIndex === target.index
      );
    }
    return a.type === 'DISCARD' && payload?.discardPileIndex === target.index;
  });
}

export function isSameSource(a: SourceSelection | null, b: SourceSelection | null): boolean {
  if (!a || !b || a.type !== b.type) return false;
  if (a.type === 'hand' && b.type === 'hand') return a.handIndex === b.handIndex;
  if (a.type === 'discard' && b.type === 'discard') return a.discardPileIndex === b.discardPileIndex;
  return true;
}

/**
 * Hand indices of cards that were just drawn. Drawn cards are always appended, so they are the
 * last `nextDrawn - prevDrawn` cards of the hand. `prevDrawn` is null for the first state we see
 * (joining or reconnecting), which animates nothing. A counter that went backwards means a new game
 * started ("Play Again"), so its whole deal is new.
 */
export function newlyDrawnIndices(handLength: number, prevDrawn: number | null, nextDrawn: number): number[] {
  if (prevDrawn === null) return [];
  const drawn = nextDrawn < prevDrawn ? nextDrawn : nextDrawn - prevDrawn;
  const count = Math.min(drawn, handLength);
  return Array.from({ length: count }, (_, i) => handLength - count + i);
}
