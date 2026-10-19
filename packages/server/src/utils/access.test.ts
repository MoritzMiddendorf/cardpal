import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ACCESS_COOKIE, getAccessEdition, hasOtpAccess, isSessionValid, issueAccessToken, parseCookies } from './access.js';
import { setOtp, clearOtp } from '../state/otp.js';

const cookie = (token: string) => `${ACCESS_COOKIE}=${token}`;

describe('access tier', () => {
  beforeEach(() => {
    clearOtp();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('parses a cookie header', () => {
    expect(parseCookies('a=1; b=hello%20world;c')).toEqual({ a: '1', b: 'hello world' });
    expect(parseCookies(undefined)).toEqual({});
  });

  it('issues no token while there is no OTP', () => {
    expect(issueAccessToken()).toBeNull();
  });

  it('grants the original edition for a token of the current OTP', () => {
    setOtp('A7X-K9M');
    const { token } = issueAccessToken()!;
    expect(hasOtpAccess(cookie(token))).toBe(true);
    expect(getAccessEdition(cookie(token))).toBe('original');
  });

  it('stops granting access once the OTP is rotated or cleared', () => {
    setOtp('A7X-K9M');
    const { token } = issueAccessToken()!;
    setOtp('A7X-K9M'); // same code, new generation
    expect(getAccessEdition(cookie(token))).toBeNull();
    clearOtp();
    expect(getAccessEdition(cookie(token))).toBeNull();
  });

  it('stops granting access once the OTP expires', () => {
    vi.useFakeTimers();
    const otp = setOtp('A7X-K9M');
    const { token } = issueAccessToken()!;
    vi.setSystemTime(otp.expiresAt.getTime() + 1000);
    expect(getAccessEdition(cookie(token))).toBeNull();
  });

  it('grants nobody anything without a token while the app is private', () => {
    setOtp('A7X-K9M');
    expect(getAccessEdition(undefined)).toBeNull();
    expect(getAccessEdition('cardpal_access=not-a-token')).toBeNull();
  });

  it('grants the neutral edition without a token when public access is on', () => {
    vi.stubEnv('PUBLIC_ACCESS', 'true');
    expect(getAccessEdition(undefined)).toBe('neutral');
  });

  it('keeps sessions valid only while their access lasts', () => {
    setOtp('A7X-K9M');
    expect(isSessionValid({ edition: 'original', otpCode: 'A7X-K9M' })).toBe(true);
    expect(isSessionValid({ edition: 'original', otpCode: 'OLD-OTP' })).toBe(false);
    expect(isSessionValid({ edition: 'original', otpCode: null })).toBe(false);
    expect(isSessionValid({ edition: 'neutral', otpCode: null })).toBe(false);
    vi.stubEnv('PUBLIC_ACCESS', 'true');
    expect(isSessionValid({ edition: 'neutral', otpCode: null })).toBe(true);
  });
});
