import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Minimal HS256 JWT for the OTP access cookie. The signing key is random per process: all state
 * (including the OTP the token is bound to) lives in memory and dies with a restart anyway (D10).
 */

export interface AccessTokenPayload {
  /** OTP generation id (`OtpState.id`) the token was issued for. */
  gen: string;
  /** Expiry, seconds since epoch. */
  exp: number;
}

const signingKey = randomBytes(32);
const HEADER = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string): Buffer {
  return createHmac('sha256', signingKey).update(data).digest();
}

export function signAccessToken(gen: string, expiresAt: Date): string {
  const payload: AccessTokenPayload = { gen, exp: Math.floor(expiresAt.getTime() / 1000) };
  const body = `${HEADER}.${base64url(JSON.stringify(payload))}`;
  return `${body}.${sign(body).toString('base64url')}`;
}

/** Returns the payload of a correctly signed, unexpired token, otherwise null. */
export function verifyAccessToken(token: string, now = Date.now()): AccessTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts as [string, string, string];
  if (header !== HEADER) return null;

  const expected = sign(`${header}.${body}`);
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const { gen, exp } = (payload ?? {}) as Partial<AccessTokenPayload>;
  if (typeof gen !== 'string' || typeof exp !== 'number') return null;
  if (exp * 1000 <= now) return null;
  return { gen, exp };
}
