import { describe, it, expect } from 'vitest';
import { createRateLimiter } from './rateLimiter.js';

describe('createRateLimiter', () => {
  it('allows up to the limit within a window, then blocks', () => {
    const limiter = createRateLimiter(3, 1000, () => 0);
    expect([1, 2, 3, 4].map(() => limiter.attempt('ip'))).toEqual([true, true, true, false]);
  });

  it('tracks keys independently', () => {
    const limiter = createRateLimiter(1, 1000, () => 0);
    expect(limiter.attempt('a')).toBe(true);
    expect(limiter.attempt('b')).toBe(true);
    expect(limiter.attempt('a')).toBe(false);
  });

  it('resets after the window elapses', () => {
    let t = 0;
    const limiter = createRateLimiter(1, 1000, () => t);
    expect(limiter.attempt('ip')).toBe(true);
    expect(limiter.attempt('ip')).toBe(false);
    t = 1000;
    expect(limiter.attempt('ip')).toBe(true);
  });
});
