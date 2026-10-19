import { describe, it, expect } from 'vitest';
import { signAccessToken, verifyAccessToken } from './accessToken.js';

const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000);

describe('access token', () => {
  it('verifies a token it signed and returns its payload', () => {
    const expiresAt = inAnHour();
    const payload = verifyAccessToken(signAccessToken('gen-1', expiresAt));
    expect(payload).toEqual({ gen: 'gen-1', exp: Math.floor(expiresAt.getTime() / 1000) });
  });

  it('rejects an expired token', () => {
    const token = signAccessToken('gen-1', new Date(Date.now() + 1000));
    expect(verifyAccessToken(token, Date.now() + 2000)).toBeNull();
  });

  it('rejects a token whose payload was changed', () => {
    const [header, , signature] = signAccessToken('gen-1', inAnHour()).split('.');
    const forgedBody = Buffer.from(JSON.stringify({ gen: 'gen-2', exp: 9999999999 })).toString('base64url');
    expect(verifyAccessToken(`${header}.${forgedBody}.${signature}`)).toBeNull();
  });

  it('rejects an unsigned (alg none) token', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ gen: 'gen-1', exp: 9999999999 })).toString('base64url');
    expect(verifyAccessToken(`${header}.${body}.`)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(verifyAccessToken('')).toBeNull();
    expect(verifyAccessToken('a.b')).toBeNull();
    expect(verifyAccessToken('a.b.c')).toBeNull();
  });
});
