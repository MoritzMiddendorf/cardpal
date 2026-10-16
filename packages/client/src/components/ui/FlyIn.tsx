import { useLayoutEffect, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { prefersReducedMotion } from '../../utils/motion.js';

/** How long a drawn card takes to travel from the deck to its spot. */
export const FLY_IN_DURATION_MS = 450;
/** Gap between consecutive cards drawn in the same update. */
export const FLY_IN_STAGGER_MS = 120;

interface FlyInProps {
  /** Play the flight. Changing `animationKey` while active replays it. */
  active: boolean;
  /** Element the card flies out of (usually a `Deck`). */
  from: RefObject<HTMLElement | null>;
  delay?: number;
  animationKey?: string | number;
  className?: string;
  children: ReactNode;
}

/**
 * Renders its children in place and, when `active`, animates them from the `from` element to
 * where they are laid out (Web Animations API, since the start point is only known at runtime).
 * `fill: backwards` keeps a staggered card hidden on the deck until its turn to fly.
 */
export function FlyIn({ active, from, delay = 0, animationKey, className, children }: FlyInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const flight = useRef<Animation | null>(null);

  // Only unmounting stops a flight: the next game state usually turns `active` off, and that must
  // not make a card that is still in the air jump to its spot.
  useLayoutEffect(() => () => flight.current?.cancel(), []);

  useLayoutEffect(() => {
    const el = ref.current;
    const source = from.current;
    if (!active || !el || !source || typeof el.animate !== 'function' || prefersReducedMotion()) return;

    const to = el.getBoundingClientRect();
    const start = source.getBoundingClientRect();
    if (to.width === 0 || start.width === 0) return;

    const dx = start.left + start.width / 2 - (to.left + to.width / 2);
    const dy = start.top + start.height / 2 - (to.top + to.height / 2);
    const scale = start.width / to.width;

    flight.current?.cancel();
    flight.current = el.animate(
      [
        // Hidden while it waits its turn on the deck, then it lifts off the deck and travels.
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0, offset: 0 },
        { transform: `translate(${dx * 0.9}px, ${dy * 0.9}px) scale(${scale}) rotate(-6deg)`, opacity: 1, offset: 0.15 },
        { transform: 'none', opacity: 1, offset: 1 },
      ],
      { duration: FLY_IN_DURATION_MS, delay, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'backwards' },
    );
    // `delay` and `from` only matter when a flight starts, so they don't retrigger it.
  }, [active, animationKey]);

  return (
    <div ref={ref} className={['fly-in', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
