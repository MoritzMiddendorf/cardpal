import type { Card as CardType } from '@cardpal/shared';
import './Card.css';

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

interface CardProps {
  card: CardType;
}

export function Card({ card }: CardProps) {
  if (!card.faceUp) {
    return <div className="card card-back" />;
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const suitClass = isRed ? 'card-red' : 'card-black';

  return (
    <div className={`card card-face ${suitClass}`}>
      <span className="card-rank">{card.rank}</span>
      <span className="card-suit">{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}
