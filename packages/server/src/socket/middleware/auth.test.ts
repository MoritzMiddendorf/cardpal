import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authMiddleware } from './auth.js';
import {
  createPendingSession,
  clearPendingSessions,
  createSession,
  clearSessions,
  getPendingSession,
} from '../../state/sessions.js';
import { setOtp, clearOtp } from '../../state/otp.js';
import { ACCESS_COOKIE, issueAccessToken } from '../../utils/access.js';

// Minimal mock socket for middleware testing
function createMockSocket(auth: Record<string, unknown> = {}, cookie?: string) {
  return {
    handshake: { auth, headers: cookie ? { cookie } : {} },
    data: {} as Record<string, unknown>,
  } as unknown as Parameters<typeof authMiddleware>[0];
}

describe('authMiddleware', () => {
  beforeEach(() => {
    clearPendingSessions();
    clearSessions();
    clearOtp();
    vi.unstubAllEnvs();
  });

  describe('token authentication', () => {
    it('allows connection with a valid token and valid OTP', () => {
      const otp = setOtp('A7X-K9M');
      const pending = createPendingSession(otp.code);
      const session = createSession(pending.id, 'Alice', 'old-socket');

      const socket = createMockSocket({ token: session.token });
      const next = vi.fn();

      authMiddleware(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.data.session).toBeDefined();
      expect(socket.data.session!.token).toBe(session.token);
      expect(socket.data.authType).toBe('token');
    });

    it('rejects connection with a non-existent token', () => {
      const socket = createMockSocket({ token: 'non-existent-token' });
      const next = vi.fn();

      authMiddleware(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect((next.mock.calls[0][0] as Error).message).toBe('AUTH_ERROR');
    });

    it('rejects connection with a valid token but expired/regenerated OTP', () => {
      const otp = setOtp('OLD-OTP');
      const pending = createPendingSession(otp.code);
      const session = createSession(pending.id, 'Alice', 'old-socket');

      // Regenerate OTP — old sessions become invalid
      setOtp('NEW-OTP');

      const socket = createMockSocket({ token: session.token });
      const next = vi.fn();

      authMiddleware(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect((next.mock.calls[0][0] as Error).message).toBe('AUTH_ERROR');
    });
  });

  describe('new visitors (no session token)', () => {
    function cookieFor(token: string): string {
      return `other=1; ${ACCESS_COOKIE}=${token}`;
    }

    it('creates an original-edition pending session for a valid OTP access cookie', () => {
      setOtp('A7X-K9M');
      const socket = createMockSocket({}, cookieFor(issueAccessToken()!.token));
      const next = vi.fn();

      authMiddleware(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.data.authType).toBe('pending');
      const pending = getPendingSession(socket.data.pendingSessionId as string);
      expect(pending).toMatchObject({ otpCode: 'A7X-K9M', edition: 'original' });
    });

    it('rejects an access cookie from a rotated OTP', () => {
      setOtp('OLD-OTP');
      const old = issueAccessToken()!.token;
      setOtp('NEW-OTP');
      const socket = createMockSocket({}, cookieFor(old));
      const next = vi.fn();

      authMiddleware(socket, next);

      expect((next.mock.calls[0][0] as Error).message).toBe('AUTH_ERROR');
    });

    it('rejects a tampered access cookie', () => {
      setOtp('A7X-K9M');
      const token = issueAccessToken()!.token;
      const socket = createMockSocket({}, cookieFor(`${token.slice(0, -2)}xx`));
      const next = vi.fn();

      authMiddleware(socket, next);

      expect((next.mock.calls[0][0] as Error).message).toBe('AUTH_ERROR');
    });

    it('ignores client-chosen handshake fields such as a pendingSessionId or edition', () => {
      setOtp('A7X-K9M');
      const pending = createPendingSession('A7X-K9M');
      const socket = createMockSocket({ pendingSessionId: pending.id, edition: 'original' });
      const next = vi.fn();

      authMiddleware(socket, next);

      expect((next.mock.calls[0][0] as Error).message).toBe('AUTH_ERROR');
    });

    it('creates a neutral-edition pending session without the OTP when public access is on', () => {
      vi.stubEnv('PUBLIC_ACCESS', 'true');
      setOtp('A7X-K9M');
      const socket = createMockSocket({});
      const next = vi.fn();

      authMiddleware(socket, next);

      expect(next).toHaveBeenCalledWith();
      const pending = getPendingSession(socket.data.pendingSessionId as string);
      expect(pending).toMatchObject({ otpCode: null, edition: 'neutral' });
    });

    it('still gives OTP visitors the original edition when public access is on', () => {
      vi.stubEnv('PUBLIC_ACCESS', 'true');
      setOtp('A7X-K9M');
      const socket = createMockSocket({}, cookieFor(issueAccessToken()!.token));
      const next = vi.fn();

      authMiddleware(socket, next);

      expect(getPendingSession(socket.data.pendingSessionId as string)?.edition).toBe('original');
    });

    it('rejects a visitor without access while the app is private', () => {
      const socket = createMockSocket({});
      const next = vi.fn();

      authMiddleware(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect((next.mock.calls[0][0] as Error).message).toBe('AUTH_ERROR');
    });
  });

  describe('session validity per edition', () => {
    it('drops public sessions once public access is switched off', () => {
      vi.stubEnv('PUBLIC_ACCESS', 'true');
      const pending = createPendingSession(null);
      const session = createSession(pending.id, 'Pat', 'old-socket');
      vi.stubEnv('PUBLIC_ACCESS', 'false');

      const socket = createMockSocket({ token: session.token });
      const next = vi.fn();
      authMiddleware(socket, next);

      expect((next.mock.calls[0][0] as Error).message).toBe('AUTH_ERROR');
    });
  });
});
