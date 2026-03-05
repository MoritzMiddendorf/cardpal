import type { Card as CardType } from '@cardpal/shared';
import { Card } from './Card.js';
import './AnimatedCard.css';

interface AnimatedCardProps {
  card: CardType;
  isNew: boolean;
  animationDelay?: number;
  isRevealed?: boolean;
}

export function AnimatedCard({ card, isNew, animationDelay = 0, isRevealed = false }: AnimatedCardProps) {
  const className = [
    'animated-card',
    isNew ? 'card-entering' : '',
    isRevealed ? 'card-reveal' : '',
  ].filter(Boolean).join(' ');

  const style = animationDelay > 0 ? { animationDelay: `${animationDelay}ms` } : undefined;

  return (
    <div className={className} style={style}>
      <Card card={card} />
    </div>
  );
}
