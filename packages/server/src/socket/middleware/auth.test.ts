import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authMiddleware } from './auth.js';
import {
  createPendingSession,
  clearPendingSessions,
  createSession,
  clearSessions,
} from '../../state/sessions.js';
import { setOtp, clearOtp } from '../../state/otp.js';

// Minimal mock socket for middleware testing
function createMockSocket(auth: Record<string, unknown> = {}) {
  return {
    handshake: { auth },
    data: {} as Record<string, unknown>,
  } as unknown as Parameters<typeof authMiddleware>[0];
}

describe('authMiddleware', () => {
  beforeEach(() => {
    clearPendingSessions();
    clearSessions();
    clearOtp();
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

  describe('pendingSessionId authentication', () => {
    it('allows connection with a valid pendingSessionId', () => {
      setOtp('A7X-K9M');
      const pending = createPendingSession('A7X-K9M');

      const socket = createMockSocket({ pendingSessionId: pending.id });
      const next = vi.fn();

      authMiddleware(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.data.pendingSessionId).toBe(pending.id);
      expect(socket.data.authType).toBe('pending');
    });

    it('rejects connection with a non-existent pendingSessionId', () => {
      const socket = createMockSocket({ pendingSessionId: 'non-existent' });
      const next = vi.fn();

      authMiddleware(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect((next.mock.calls[0][0] as Error).message).toBe('AUTH_ERROR');
    });
  });

  describe('no authentication', () => {
    it('rejects connection with no auth credentials', () => {
      const socket = createMockSocket({});
      const next = vi.fn();

      authMiddleware(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect((next.mock.calls[0][0] as Error).message).toBe('AUTH_ERROR');
    });
  });

  describe('token takes priority over pendingSessionId', () => {
    it('uses token auth when both token and pendingSessionId are provided', () => {
      const otp = setOtp('A7X-K9M');
      const pending = createPendingSession(otp.code);
      const session = createSession(pending.id, 'Alice', 'old-socket');

      const pending2 = createPendingSession(otp.code);
      const socket = createMockSocket({
        token: session.token,
        pendingSessionId: pending2.id,
      });
      const next = vi.fn();

      authMiddleware(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.data.authType).toBe('token');
      expect(socket.data.session).toBeDefined();
    });
  });
});
