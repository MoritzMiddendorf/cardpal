import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BLANK_PAGE, choosePage, toEntryHtml } from './clientHtml.js';
import { ACCESS_COOKIE, issueAccessToken } from './access.js';
import { setOtp, clearOtp } from '../state/otp.js';
import { OTP_ENTRY_PATH, normalizeEntryPath } from '../config.js';

describe('choosePage', () => {
  beforeEach(() => {
    clearOtp();
    vi.unstubAllEnvs();
  });

  it('serves a blank page to strangers while the app is private', () => {
    expect(choosePage('/', undefined)).toBe('blank');
    expect(choosePage('/lobby', 'cardpal_access=forged')).toBe('blank');
  });

  it('serves the OTP entry page only at the entry path', () => {
    expect(choosePage(OTP_ENTRY_PATH, undefined)).toBe('entry');
    expect(choosePage(`${OTP_ENTRY_PATH}/`, undefined)).toBe('entry');
    expect(choosePage(`${OTP_ENTRY_PATH}x`, undefined)).toBe('blank');
  });

  it('serves the app to OTP users and sends them from the entry path to /', () => {
    setOtp('A7X-K9M');
    const cookie = `${ACCESS_COOKIE}=${issueAccessToken()!.token}`;
    expect(choosePage('/', cookie)).toBe('app');
    expect(choosePage(OTP_ENTRY_PATH, cookie)).toBe('toApp');
  });

  it('serves the app to everyone when public access is on, and still the OTP form at the entry path', () => {
    vi.stubEnv('PUBLIC_ACCESS', 'true');
    expect(choosePage('/', undefined)).toBe('app');
    expect(choosePage(OTP_ENTRY_PATH, undefined)).toBe('entry');
  });
});

describe('page html', () => {
  it('blank page has no app', () => {
    expect(BLANK_PAGE).not.toContain('root');
    expect(BLANK_PAGE).not.toContain('script');
  });

  it('marks the entry page without leaking the path', () => {
    const html = toEntryHtml('<html><head><title>cardpal</title></head><body></body></html>');
    expect(html).toContain('<meta name="cardpal-entry" content="otp">');
    expect(html).not.toContain(OTP_ENTRY_PATH);
  });
});

describe('normalizeEntryPath', () => {
  it('defaults and normalizes', () => {
    expect(normalizeEntryPath(undefined)).toBe('/table');
    expect(normalizeEntryPath('')).toBe('/table');
    expect(normalizeEntryPath('/')).toBe('/table');
    expect(normalizeEntryPath('secret-door/')).toBe('/secret-door');
    expect(normalizeEntryPath('/api/x')).toBe('/table');
    expect(normalizeEntryPath('/assets')).toBe('/table');
  });
});
