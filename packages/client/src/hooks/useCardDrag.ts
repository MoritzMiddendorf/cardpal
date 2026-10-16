import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { exceedsDragThreshold } from '../utils/drag.js';
import { prefersReducedMotion } from '../utils/motion.js';

/** How long a cancelled drag takes to glide back to where it came from. */
export const DRAG_RETURN_MS = 200;

export interface CardDrag<S, T> {
  source: S;
  /** Top-left corner of the dragged card, in viewport coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Drop target under the pointer, if any. */
  over: T | null;
  /** Cancelled and gliding back to its origin. */
  returning: boolean;
}

interface Pending<S> {
  source: S;
  pointerId: number;
  startX: number;
  startY: number;
  /** Pointer position inside the card, so the card doesn't jump to the pointer. */
  offsetX: number;
  offsetY: number;
  rect: DOMRect;
  dragging: boolean;
}

interface Options<S, T> {
  canDrag: (source: S) => boolean;
  /** Turns the element under the pointer into a drop target (or null). */
  targetAt: (element: Element | null) => T | null;
  /** Fires when the drag starts moving. */
  onStart?: (source: S) => void;
  /** Called on release over a target; return true when the drop was accepted. */
  onDrop: (source: S, target: T) => boolean;
  /** Fires when a drag ends without a drop (released elsewhere, Escape, cancelled). */
  onCancel?: (source: S) => void;
}

/** Swallow the click the browser fires right after a drag ends, so it isn't read as click-to-move. */
function suppressNextClick() {
  const swallow = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };
  window.addEventListener('click', swallow, { capture: true, once: true });
  setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
}

/**
 * Pointer-events drag & drop (mouse, touch and pen). A press only becomes a drag after the pointer
 * moves past a small threshold, so plain clicks keep working. Drop targets are found with
 * `document.elementFromPoint`, which is why the dragged copy must have `pointer-events: none`.
 */
export function useCardDrag<S, T>(options: Options<S, T>) {
  const [drag, setDrag] = useState<CardDrag<S, T> | null>(null);
  const pending = useRef<Pending<S> | null>(null);
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const listenersRef = useRef<(() => void) | null>(null);

  const removeListeners = useCallback(() => {
    listenersRef.current?.();
    listenersRef.current = null;
  }, []);

  /** End the drag without a drop: the card glides back to where it was picked up. */
  const cancel = useCallback(() => {
    const p = pending.current;
    pending.current = null;
    removeListeners();
    if (!p?.dragging) return;
    optionsRef.current.onCancel?.(p.source);
    setDrag((d) => (d ? { ...d, x: p.rect.left, y: p.rect.top, over: null, returning: true } : d));
    if (returnTimer.current) clearTimeout(returnTimer.current);
    if (prefersReducedMotion()) {
      setDrag(null);
      return;
    }
    returnTimer.current = setTimeout(() => setDrag(null), DRAG_RETURN_MS);
  }, [removeListeners]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const p = pending.current;
    if (!p || e.pointerId !== p.pointerId) return;
    if (!p.dragging) {
      if (!exceedsDragThreshold(e.clientX - p.startX, e.clientY - p.startY)) return;
      if (!optionsRef.current.canDrag(p.source)) {
        pending.current = null;
        removeListeners();
        return;
      }
      p.dragging = true;
      if (returnTimer.current) clearTimeout(returnTimer.current);
      optionsRef.current.onStart?.(p.source);
    }
    e.preventDefault();
    const over = optionsRef.current.targetAt(document.elementFromPoint(e.clientX, e.clientY));
    setDrag({
      source: p.source,
      x: e.clientX - p.offsetX,
      y: e.clientY - p.offsetY,
      width: p.rect.width,
      height: p.rect.height,
      over,
      returning: false,
    });
  }, [removeListeners]);

  const onPointerUp = useCallback((e: PointerEvent) => {
    const p = pending.current;
    if (!p || e.pointerId !== p.pointerId) return;
    if (!p.dragging) {
      // A click: leave it to the normal click handlers.
      pending.current = null;
      removeListeners();
      return;
    }
    suppressNextClick();
    const target = optionsRef.current.targetAt(document.elementFromPoint(e.clientX, e.clientY));
    if (target !== null && optionsRef.current.onDrop(p.source, target)) {
      pending.current = null;
      removeListeners();
      setDrag(null);
      return;
    }
    cancel();
  }, [cancel, removeListeners]);

  const onPointerCancel = useCallback((e: PointerEvent) => {
    if (pending.current && e.pointerId === pending.current.pointerId) cancel();
  }, [cancel]);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') cancel();
  }, [cancel]);

  /** Spread onto a draggable element: `onPointerDown={startDrag(source)}`. */
  const startDrag = useCallback(
    (source: S) => (e: ReactPointerEvent<HTMLElement>) => {
      if (!e.isPrimary || e.button !== 0 || pending.current) return;
      if (!optionsRef.current.canDrag(source)) return;
      const rect = e.currentTarget.getBoundingClientRect();
      pending.current = {
        source,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        rect,
        dragging: false,
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerCancel);
      window.addEventListener('keydown', onKeyDown);
      listenersRef.current = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
        window.removeEventListener('keydown', onKeyDown);
      };
    },
    [onPointerMove, onPointerUp, onPointerCancel, onKeyDown],
  );

  useEffect(
    () => () => {
      removeListeners();
      if (returnTimer.current) clearTimeout(returnTimer.current);
    },
    [removeListeners],
  );

  /** Source of the drag in progress (read from a ref, so it is current inside effects). */
  const getActiveSource = useCallback((): S | null => (pending.current?.dragging ? pending.current.source : null), []);

  return { drag, startDrag, cancel, getActiveSource };
}
