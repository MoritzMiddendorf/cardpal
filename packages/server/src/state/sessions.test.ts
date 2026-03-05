import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createPendingSession,
  getPendingSession,
  removePendingSession,
  clearPendingSessions,
  createSession,
  getSessionByToken,
  updateSessionSocketId,
  updateSessionRoomId,
  removeSession,
  clearSessions,
  PENDING_SESSION_TTL_MS,
} from './sessions.js';

describe('Pending Session State Management', () => {
  beforeEach(() => {
    clearPendingSessions();
  });

  describe('createPendingSession', () => {
    it('returns a PendingSession with a valid UUID', () => {
      const session = createPendingSession('A7X-K9M');

      expect(session.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('returns a PendingSession with a validatedAt timestamp', () => {
      const before = new Date();
      const session = createPendingSession('A7X-K9M');
      const after = new Date();

      expect(session.validatedAt).toBeInstanceOf(Date);
      expect(session.validatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(session.validatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('generates unique IDs for each session', () => {
      const session1 = createPendingSession('A7X-K9M');
      const session2 = createPendingSession('A7X-K9M');

      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe('getPendingSession', () => {
    it('retrieves a stored session by ID', () => {
      const created = createPendingSession('A7X-K9M');
      const retrieved = getPendingSession(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.validatedAt.getTime()).toBe(created.validatedAt.getTime());
    });

    it('returns null for non-existent ID', () => {
      expect(getPendingSession('non-existent-id')).toBeNull();
    });

    it('returns a copy, not the original reference', () => {
      const created = createPendingSession('A7X-K9M');
      const retrieved = getPendingSession(created.id);

      expect(retrieved).toEqual(created);
      expect(retrieved).not.toBe(created);
    });
  });

  describe('removePendingSession', () => {
    it('removes a session from the store', () => {
      const session = createPendingSession('A7X-K9M');
      removePendingSession(session.id);

      expect(getPendingSession(session.id)).toBeNull();
    });

    it('does not throw when removing non-existent ID', () => {
      expect(() => removePendingSession('non-existent')).not.toThrow();
    });
  });

  describe('pending session TTL', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns null for a session older than TTL', () => {
      vi.useFakeTimers();
      const session = createPendingSession('A7X-K9M');
      vi.advanceTimersByTime(PENDING_SESSION_TTL_MS + 1);
      expect(getPendingSession(session.id)).toBeNull();
    });

    it('cleans up the expired session from the store', () => {
      vi.useFakeTimers();
      const session = createPendingSession('A7X-K9M');
      vi.advanceTimersByTime(PENDING_SESSION_TTL_MS + 1);
      getPendingSession(session.id); // trigger cleanup
      vi.useRealTimers();
      // after real timers restored, session should still be gone
      expect(getPendingSession(session.id)).toBeNull();
    });

    it('returns the session within the TTL window', () => {
      vi.useFakeTimers();
      const session = createPendingSession('A7X-K9M');
      vi.advanceTimersByTime(PENDING_SESSION_TTL_MS - 60 * 1000); // 1 min before expiry
      expect(getPendingSession(session.id)).not.toBeNull();
    });
  });

  describe('multiple sessions', () => {
    it('can store and retrieve multiple pending sessions', () => {
      const session1 = createPendingSession('A7X-K9M');
      const session2 = createPendingSession('A7X-K9M');
      const session3 = createPendingSession('A7X-K9M');

      expect(getPendingSession(session1.id)).not.toBeNull();
      expect(getPendingSession(session2.id)).not.toBeNull();
      expect(getPendingSession(session3.id)).not.toBeNull();
    });

    it('removing one session does not affect others', () => {
      const session1 = createPendingSession('A7X-K9M');
      const session2 = createPendingSession('A7X-K9M');

      removePendingSession(session1.id);

      expect(getPendingSession(session1.id)).toBeNull();
      expect(getPendingSession(session2.id)).not.toBeNull();
    });
  });
});

describe('Full Session State Management', () => {
  beforeEach(() => {
    clearPendingSessions();
    clearSessions();
  });

  describe('createSession', () => {
    it('creates a session with a valid UUID token', () => {
      const pending = createPendingSession('A7X-K9M');
      const session = createSession(pending.id, 'Alice', 'socket-1');

      expect(session.token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('stores username, socketId, and otpCode', () => {
      const pending = createPendingSession('A7X-K9M');
      const session = createSession(pending.id, 'Alice', 'socket-1');

      expect(session.username).toBe('Alice');
      expect(session.socketId).toBe('socket-1');
      expect(session.otpCode).toBe('A7X-K9M');
      expect(session.roomId).toBeNull();
    });

    it('removes the pending session it consumes', () => {
      const pending = createPendingSession('A7X-K9M');
      createSession(pending.id, 'Alice', 'socket-1');

      expect(getPendingSession(pending.id)).toBeNull();
    });

    it('throws if pendingSessionId does not exist', () => {
      expect(() => createSession('non-existent', 'Alice', 'socket-1')).toThrow(
        'Pending session not found or expired'
      );
    });

    it('throws if pending session has expired', () => {
      vi.useFakeTimers();
      const pending = createPendingSession('A7X-K9M');
      vi.advanceTimersByTime(PENDING_SESSION_TTL_MS + 1);
      expect(() => createSession(pending.id, 'Alice', 'socket-1')).toThrow(
        'Pending session not found or expired'
      );
      vi.useRealTimers();
    });

    it('uses the otpCode stored in the pending session', () => {
      const pending = createPendingSession('ORIGINAL-OTP');
      const session = createSession(pending.id, 'Alice', 'socket-1');
      expect(session.otpCode).toBe('ORIGINAL-OTP');
    });

    it('returns a copy, not a reference to internal state', () => {
      const pending = createPendingSession('A7X-K9M');
      const session = createSession(pending.id, 'Alice', 'socket-1');

      session.username = 'Hacked';
      const retrieved = getSessionByToken(session.token);
      expect(retrieved!.username).toBe('Alice');
    });
  });

  describe('getSessionByToken', () => {
    it('retrieves a stored session by token', () => {
      const pending = createPendingSession('A7X-K9M');
      const created = createSession(pending.id, 'Alice', 'socket-1');
      const retrieved = getSessionByToken(created.token);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.token).toBe(created.token);
      expect(retrieved!.username).toBe('Alice');
    });

    it('returns null for non-existent token', () => {
      expect(getSessionByToken('non-existent')).toBeNull();
    });
  });

  describe('updateSessionSocketId', () => {
    it('updates the socketId of an existing session', () => {
      const pending = createPendingSession('A7X-K9M');
      const session = createSession(pending.id, 'Alice', 'socket-1');

      updateSessionSocketId(session.token, 'socket-2');

      const retrieved = getSessionByToken(session.token);
      expect(retrieved!.socketId).toBe('socket-2');
    });

    it('does nothing for non-existent token', () => {
      expect(() => updateSessionSocketId('non-existent', 'socket-2')).not.toThrow();
    });
  });

  describe('updateSessionRoomId', () => {
    it('updates the roomId of an existing session', () => {
      const pending = createPendingSession('A7X-K9M');
      const session = createSession(pending.id, 'Alice', 'socket-1');

      expect(getSessionByToken(session.token)!.roomId).toBeNull();
      updateSessionRoomId(session.token, 'room-123');
      expect(getSessionByToken(session.token)!.roomId).toBe('room-123');
    });

    it('can set roomId back to null', () => {
      const pending = createPendingSession('A7X-K9M');
      const session = createSession(pending.id, 'Alice', 'socket-1');

      updateSessionRoomId(session.token, 'room-123');
      updateSessionRoomId(session.token, null);
      expect(getSessionByToken(session.token)!.roomId).toBeNull();
    });

    it('does nothing for non-existent token', () => {
      expect(() => updateSessionRoomId('non-existent', 'room-123')).not.toThrow();
    });
  });

  describe('removeSession', () => {
    it('removes a session from the store', () => {
      const pending = createPendingSession('A7X-K9M');
      const session = createSession(pending.id, 'Alice', 'socket-1');

      removeSession(session.token);
      expect(getSessionByToken(session.token)).toBeNull();
    });

    it('does not throw when removing non-existent token', () => {
      expect(() => removeSession('non-existent')).not.toThrow();
    });
  });

  describe('multiple full sessions', () => {
    it('can store and retrieve multiple sessions', () => {
      const p1 = createPendingSession('A7X-K9M');
      const p2 = createPendingSession('A7X-K9M');
      const p3 = createPendingSession('A7X-K9M');

      const s1 = createSession(p1.id, 'Alice', 'socket-1');
      const s2 = createSession(p2.id, 'Bob', 'socket-2');
      const s3 = createSession(p3.id, 'Charlie', 'socket-3');

      expect(getSessionByToken(s1.token)).not.toBeNull();
      expect(getSessionByToken(s2.token)).not.toBeNull();
      expect(getSessionByToken(s3.token)).not.toBeNull();
    });

    it('removing one session does not affect others', () => {
      const p1 = createPendingSession('A7X-K9M');
      const p2 = createPendingSession('A7X-K9M');

      const s1 = createSession(p1.id, 'Alice', 'socket-1');
      const s2 = createSession(p2.id, 'Bob', 'socket-2');

      removeSession(s1.token);

      expect(getSessionByToken(s1.token)).toBeNull();
      expect(getSessionByToken(s2.token)).not.toBeNull();
    });
  });
});
