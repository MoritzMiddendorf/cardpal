import { describe, it, expect } from 'vitest';
import { generateRoomName } from './generateRoomName.js';

describe('generateRoomName', () => {
  it('returns a string in "Word-Word" format', () => {
    const name = generateRoomName();
    expect(name).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+$/);
  });

  it('returns non-empty name', () => {
    const name = generateRoomName();
    expect(name.length).toBeGreaterThan(0);
  });

  it('generates different names across multiple calls (probabilistic)', () => {
    const names = new Set<string>();
    for (let i = 0; i < 20; i++) {
      names.add(generateRoomName());
    }
    // With 400 combinations, 20 calls should produce at least 2 unique names
    expect(names.size).toBeGreaterThan(1);
  });
});
