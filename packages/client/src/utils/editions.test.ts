import { describe, it, expect } from 'vitest';
import { GameType } from '@cardpal/shared';
import { gameName, gameTagline, wildCardLabel } from './editions.js';

describe('editions', () => {
  it('uses the original names only for the original edition', () => {
    expect(gameName(GameType.SKIPBO, 'original')).toBe('Skip-Bo');
    expect(gameName(GameType.SKIPBO, 'neutral')).toBe('Twelve Up');
    expect(gameName(GameType.BLACKJACK, 'neutral')).toBe('Blackjack');
  });

  it('falls back to neutral names while the edition is unknown', () => {
    expect(gameName(GameType.SKIPBO, null)).toBe('Twelve Up');
    expect(wildCardLabel(null)).toEqual(['★']);
  });

  it('never mentions the trademark in neutral texts', () => {
    const neutral = [
      ...Object.values(GameType).map((gt) => gameName(gt, 'neutral')),
      ...Object.values(GameType).map((gt) => gameTagline(gt)),
      ...wildCardLabel('neutral'),
    ].join(' ').toLowerCase();
    expect(neutral).not.toMatch(/skip|bo\b/);
  });

  it('keeps the original wild card label for OTP players', () => {
    expect(wildCardLabel('original')).toEqual(['SKIP', 'BO']);
  });
});
