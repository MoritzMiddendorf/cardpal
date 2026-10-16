import type { PointerEventHandler } from 'react';
import type { SkipBoCard as SkipBoCardType } from '@cardpal/shared';
import './SkipBoCard.css';

interface SkipBoCardProps {
  card: SkipBoCardType | null;
  highlighted?: boolean;
  selected?: boolean;
  className?: string;
  onClick?: () => void;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
}

function getCardColorClass(value: number, isWild: boolean): string {
  if (isWild) return 'skipbo-card-wild';
  if (value <= 3) return 'skipbo-card-blue';
  if (value <= 6) return 'skipbo-card-green';
  if (value <= 9) return 'skipbo-card-orange';
  return 'skipbo-card-red';
}

export function SkipBoCard({ card, highlighted, selected, className, onClick, onPointerDown }: SkipBoCardProps) {
  const variant = !card
    ? 'skipbo-card-empty'
    : !card.faceUp
      ? 'skipbo-card-back'
      : `skipbo-card-face ${getCardColorClass(card.value, card.isWild)}`;
  const classes = [
    'skipbo-card',
    variant,
    highlighted ? 'skipbo-card-highlighted' : '',
    selected && card ? 'skipbo-card-selected' : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick} onPointerDown={onPointerDown}>
      {card?.faceUp && (card.isWild ? (
        <>
          <span className="skipbo-card-label">SKIP</span>
          <span className="skipbo-card-label">BO</span>
        </>
      ) : (
        <span className="skipbo-card-value">{card.value}</span>
      ))}
    </div>
  );
}
