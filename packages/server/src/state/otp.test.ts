import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setOtp, getOtp, isOtpValid, clearOtp } from './otp.js';
import { OTP_VALIDITY_HOURS } from '../config.js';

describe('OTP State Management', () => {
  beforeEach(() => {
    clearOtp();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('setOtp', () => {
    it('stores OTP with code, expiresAt, and createdAt', () => {
      const result = setOtp('A7X-K9M');

      expect(result.code).toBe('A7X-K9M');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('sets expiration based on OTP_VALIDITY_HOURS from creation', () => {
      const before = Date.now();
      const result = setOtp('A7X-K9M');
      const after = Date.now();

      const validityMs = OTP_VALIDITY_HOURS * 60 * 60 * 1000;
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + validityMs);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(after + validityMs);
    });

    it('invalidates previous OTP when new one is set', () => {
      setOtp('OLD-OTP');
      setOtp('NEW-OTP');

      const state = getOtp();
      expect(state?.code).toBe('NEW-OTP');
    });

    it('returns the new OTP state', () => {
      const result = setOtp('A7X-K9M');

      expect(result).toEqual({
        code: 'A7X-K9M',
        expiresAt: expect.any(Date),
        createdAt: expect.any(Date),
      });
    });
  });

  describe('getOtp', () => {
    it('returns null when no OTP has been set', () => {
      expect(getOtp()).toBeNull();
    });

    it('returns the current OTP state', () => {
      setOtp('A7X-K9M');
      const state = getOtp();

      expect(state).not.toBeNull();
      expect(state?.code).toBe('A7X-K9M');
    });
  });

  describe('isOtpValid', () => {
    it('returns false when no OTP exists', () => {
      expect(isOtpValid('A7X-K9M')).toBe(false);
    });

    it('returns false when code does not match', () => {
      setOtp('A7X-K9M');
      expect(isOtpValid('WRONG')).toBe(false);
    });

    it('returns true when code matches and not expired', () => {
      setOtp('A7X-K9M');
      expect(isOtpValid('A7X-K9M')).toBe(true);
    });

    it('returns false when OTP is expired', () => {
      const now = Date.now();
      vi.useFakeTimers({ now });
      setOtp('A7X-K9M');

      // Advance past OTP_VALIDITY_HOURS (afterEach restores real timers)
      vi.advanceTimersByTime((OTP_VALIDITY_HOURS + 1) * 60 * 60 * 1000);

      expect(isOtpValid('A7X-K9M')).toBe(false);
    });
  });

  describe('clearOtp', () => {
    it('sets OTP state to null', () => {
      setOtp('A7X-K9M');
      clearOtp();
      expect(getOtp()).toBeNull();
    });

    it('makes previously valid OTP invalid', () => {
      setOtp('A7X-K9M');
      clearOtp();
      expect(isOtpValid('A7X-K9M')).toBe(false);
    });
  });
});
