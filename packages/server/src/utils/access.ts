import type { Edition } from '@cardpal/shared';
import { isPublicAccess } from '../config.js';
import { getOtp, isOtpValid } from '../state/otp.js';
import type { UserSession } from '../state/sessions.js';
import { signAccessToken, verifyAccessToken } from './accessToken.js';

/** httpOnly cookie holding the signed proof that this browser entered the current OTP. */
export const ACCESS_COOKIE = 'cardpal_access';

export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!name || name in cookies) continue;
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

/** True when the cookie header carries a validly signed token for the current, unexpired OTP. */
export function hasOtpAccess(cookieHeader: string | undefined): boolean {
  const token = parseCookies(cookieHeader)[ACCESS_COOKIE];
  if (!token) return false;
  const payload = verifyAccessToken(token);
  const otp = getOtp();
  return !!payload && !!otp && payload.gen === otp.id && isOtpValid(otp.code);
}

/**
 * The edition a request is entitled to: `original` with OTP access, `neutral` when the app is
 * public, otherwise null (no access at all).
 */
export function getAccessEdition(cookieHeader: string | undefined): Edition | null {
  if (hasOtpAccess(cookieHeader)) return 'original';
  return isPublicAccess() ? 'neutral' : null;
}

/** Issue an access token for the current OTP, or null if there is none. */
export function issueAccessToken(): { token: string; expiresAt: Date } | null {
  const otp = getOtp();
  if (!otp) return null;
  return { token: signAccessToken(otp.id, otp.expiresAt), expiresAt: otp.expiresAt };
}

/** A session stays valid while the access it was created under does: its OTP, or public access. */
export function isSessionValid(session: Pick<UserSession, 'otpCode' | 'edition'>): boolean {
  if (session.edition === 'original') return session.otpCode !== null && isOtpValid(session.otpCode);
  return isPublicAccess();
}
