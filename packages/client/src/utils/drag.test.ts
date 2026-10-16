import { describe, it, expect } from 'vitest';
import { exceedsDragThreshold } from './drag.js';

describe('exceedsDragThreshold', () => {
  it('treats small movements as a click', () => {
    expect(exceedsDragThreshold(0, 0)).toBe(false);
    expect(exceedsDragThreshold(3, 4)).toBe(false);
  });

  it('treats larger movements as a drag', () => {
    expect(exceedsDragThreshold(6, 0)).toBe(true);
    expect(exceedsDragThreshold(-5, -5)).toBe(true);
  });
});
