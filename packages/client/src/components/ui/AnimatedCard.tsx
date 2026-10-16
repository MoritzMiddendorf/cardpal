import type { RefObject } from 'react';
import type { Card as CardType } from '@cardpal/shared';
import { Card } from './Card.js';
import { FlyIn } from './FlyIn.js';
import './AnimatedCard.css';

interface AnimatedCardProps {
  card: CardType;
  isNew: boolean;
  /** Deck that new cards fly out of. */
  deckRef: RefObject<HTMLElement | null>;
  animationDelay?: number;
  isRevealed?: boolean;
}

export function AnimatedCard({ card, isNew, deckRef, animationDelay = 0, isRevealed = false }: AnimatedCardProps) {
  return (
    <FlyIn from={deckRef} active={isNew} delay={animationDelay}>
      <div className={isRevealed ? 'animated-card card-reveal' : 'animated-card'}>
        <Card card={card} />
      </div>
    </FlyIn>
  );
}
