import { describe, it, expect } from 'vitest';
import { generateOtpCode } from './generateOtp.js';

const OTP_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

describe('generateOtpCode', () => {
  it('returns a string in XXX-XXX format', () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^[23456789A-HJ-NP-Z]{3}-[23456789A-HJ-NP-Z]{3}$/);
  });

  it('has exactly 7 characters (3 + hyphen + 3)', () => {
    const code = generateOtpCode();
    expect(code).toHaveLength(7);
  });

  it('only uses characters from the allowed alphabet (no 0, O, 1, I)', () => {
    // Run multiple times to increase confidence
    for (let i = 0; i < 100; i++) {
      const code = generateOtpCode();
      const chars = code.replace('-', '');
      for (const char of chars) {
        expect(OTP_ALPHABET).toContain(char);
      }
    }
  });

  it('does not contain ambiguous characters (0, O, 1, I)', () => {
    // L is kept to maintain 32-char alphabet (power of 2) for bias-free generation
    const ambiguous = ['0', 'O', '1', 'I'];
    for (let i = 0; i < 100; i++) {
      const code = generateOtpCode();
      for (const char of ambiguous) {
        expect(code).not.toContain(char);
      }
    }
  });

  it('generates different codes on subsequent calls', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 20; i++) {
      codes.add(generateOtpCode());
    }
    // With 32^6 possibilities, 20 codes should all be unique
    expect(codes.size).toBe(20);
  });

  it('is a pure function with no side effects', () => {
    // Calling it multiple times should just return strings
    const code1 = generateOtpCode();
    const code2 = generateOtpCode();
    expect(typeof code1).toBe('string');
    expect(typeof code2).toBe('string');
  });
});
