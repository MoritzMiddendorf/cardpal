import type { PointerEventHandler } from 'react';
import type { PileInfo } from '@cardpal/shared';
import { SkipBoCard } from './SkipBoCard.js';
import './SkipBoPile.css';

interface SkipBoPileProps {
  pile: PileInfo;
  label?: string;
  needsValue?: number | null;
  highlighted?: boolean;
  /** `data-drop-target` id when cards can be dropped here. */
  dropTarget?: string;
  /** A dragged card is hovering over this pile and may be dropped. */
  dropHover?: boolean;
  /** The top card can be picked up and dragged. */
  draggable?: boolean;
  /** Class for the top card while it is being moved (see SkipBoGameScreen `liftedClass`). */
  lifted?: string;
  onClick?: () => void;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
}

export function SkipBoPile({
  pile, label, needsValue, highlighted, dropTarget, dropHover, draggable, lifted, onClick, onPointerDown,
}: SkipBoPileProps) {
  const classes = [
    'skipbo-pile',
    highlighted ? 'skipbo-pile-highlighted' : '',
    dropHover ? 'skipbo-pile-drop-hover' : '',
  ].filter(Boolean).join(' ');
  const cardClasses = [
    draggable ? 'skipbo-card-draggable' : '',
    lifted ?? '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick} data-drop-target={dropTarget}>
      <SkipBoCard
        card={pile.topCard}
        highlighted={highlighted}
        className={cardClasses}
        onPointerDown={onPointerDown}
      />
      {pile.count > 0 && (
        <span className="skipbo-pile-count">{pile.count}</span>
      )}
      {needsValue != null && (
        <span className="skipbo-pile-needs">needs {needsValue}</span>
      )}
      {label && (
        <span className="skipbo-pile-label">{label}</span>
      )}
    </div>
  );
}
