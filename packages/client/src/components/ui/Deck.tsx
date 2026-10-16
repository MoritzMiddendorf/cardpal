import type { Ref } from 'react';
import './Deck.css';

interface DeckProps {
  /** Cards left; omit when the game doesn't reveal it. */
  count?: number;
  /** Card back class of the game's cards, so the deck matches their size and look. */
  cardClassName: string;
  label?: string;
  ref?: Ref<HTMLDivElement>;
}

/** A face-down stack that drawn cards fly out of. */
export function Deck({ count, cardClassName, label, ref }: DeckProps) {
  const layers = Math.min(count ?? 3, 3);
  return (
    <div className="deck" title={count === undefined ? 'Deck' : `${count} cards left`}>
      <div ref={ref} className="deck-stack">
        {layers === 0 && <div className={`${cardClassName} deck-empty`} />}
        {Array.from({ length: layers }, (_, i) => (
          <div
            key={i}
            className={`${cardClassName} deck-layer`}
            style={{ transform: `translate(${(layers - 1 - i) * -2}px, ${(layers - 1 - i) * -2}px)` }}
          />
        ))}
        {count !== undefined && <span className="deck-count">{count}</span>}
      </div>
      {label && <span className="deck-label">{label}</span>}
    </div>
  );
}
