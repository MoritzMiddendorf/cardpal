import type { PileInfo } from '@cardpal/shared';
import { SkipBoCard } from './SkipBoCard.js';
import './SkipBoPile.css';

interface SkipBoPileProps {
  pile: PileInfo;
  label?: string;
  needsValue?: number | null;
  highlighted?: boolean;
  onClick?: () => void;
}

export function SkipBoPile({ pile, label, needsValue, highlighted, onClick }: SkipBoPileProps) {
  return (
    <div className={`skipbo-pile${highlighted ? ' skipbo-pile-highlighted' : ''}`} onClick={onClick}>
      <SkipBoCard card={pile.topCard} highlighted={highlighted} />
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
