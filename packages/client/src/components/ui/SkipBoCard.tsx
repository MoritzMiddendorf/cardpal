import type { SkipBoCard as SkipBoCardType } from '@cardpal/shared';
import './SkipBoCard.css';

interface SkipBoCardProps {
  card: SkipBoCardType | null;
  highlighted?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

function getCardColorClass(value: number, isWild: boolean): string {
  if (isWild) return 'skipbo-card-wild';
  if (value <= 3) return 'skipbo-card-blue';
  if (value <= 6) return 'skipbo-card-green';
  if (value <= 9) return 'skipbo-card-orange';
  return 'skipbo-card-red';
}

export function SkipBoCard({ card, highlighted, selected, onClick }: SkipBoCardProps) {
  if (!card) {
    return (
      <div
        className={`skipbo-card skipbo-card-empty${highlighted ? ' skipbo-card-highlighted' : ''}`}
        onClick={onClick}
      />
    );
  }

  if (!card.faceUp) {
    return (
      <div
        className={`skipbo-card skipbo-card-back${highlighted ? ' skipbo-card-highlighted' : ''}${selected ? ' skipbo-card-selected' : ''}`}
        onClick={onClick}
      />
    );
  }

  const colorClass = getCardColorClass(card.value, card.isWild);

  return (
    <div
      className={`skipbo-card skipbo-card-face ${colorClass}${highlighted ? ' skipbo-card-highlighted' : ''}${selected ? ' skipbo-card-selected' : ''}`}
      onClick={onClick}
    >
      {card.isWild ? (
        <>
          <span className="skipbo-card-label">SKIP</span>
          <span className="skipbo-card-label">BO</span>
        </>
      ) : (
        <span className="skipbo-card-value">{card.value}</span>
      )}
    </div>
  );
}
