import type { Edition } from '@cardpal/shared';

export interface PendingSession {
  id: string;
  validatedAt: Date;
  /** The OTP code this visitor proved to know, or null for a public (neutral edition) visitor. */
  otpCode: string | null;
  edition: Edition;
}

export interface UserSession {
  /** Secret bearer credential — never send to anyone but the session owner. */
  token: string;
  /** Public identifier used in rooms and game state; safe to broadcast. */
  playerId: string;
  username: string;
  socketId: string;
  roomId: string | null;
  /** OTP the session was created under (original edition); null for public sessions. */
  otpCode: string | null;
  /** Fixed at creation from the server-verified access tier; decides which rooms the player sees. */
  edition: Edition;
}

export const PENDING_SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

const pendingSessions = new Map<string, PendingSession>();
const sessions = new Map<string, UserSession>();

// --- Pending Sessions (Story 1.3) ---

export function createPendingSession(otpCode: string | null): PendingSession {
  const id = crypto.randomUUID();
  const edition: Edition = otpCode === null ? 'neutral' : 'original';
  const session: PendingSession = { id, validatedAt: new Date(), otpCode, edition };
  pendingSessions.set(id, session);
  return { ...session };
}

export function getPendingSession(id: string): PendingSession | null {
  const session = pendingSessions.get(id);
  if (!session) return null;
  if (Date.now() - session.validatedAt.getTime() > PENDING_SESSION_TTL_MS) {
    pendingSessions.delete(id);
    return null;
  }
  return { ...session };
}

export function removePendingSession(id: string): void {
  pendingSessions.delete(id);
}

export function clearPendingSessions(): void {
  pendingSessions.clear();
}

// --- Full Sessions (Story 1.4) ---

export function createSession(
  pendingSessionId: string,
  username: string,
  socketId: string,
): UserSession {
  const pending = getPendingSession(pendingSessionId);  // M2: TTL-checked lookup
  if (!pending) {
    throw new Error('Pending session not found or expired');
  }

  pendingSessions.delete(pendingSessionId);  // consume the pending session

  const token = crypto.randomUUID();
  const playerId = crypto.randomUUID();
  const session: UserSession = {
    token, playerId, username, socketId, roomId: null, otpCode: pending.otpCode, edition: pending.edition,
  };
  sessions.set(token, session);
  return { ...session };
}

export function getSessionByToken(token: string): UserSession | null {
  const session = sessions.get(token);
  return session ? { ...session } : null;
}

/**
 * Case-insensitive check whether a username is already used by a live session of the same
 * edition. Editions never meet, and a clash across them would reveal the other edition's players.
 */
export function isUsernameTaken(username: string, edition: Edition): boolean {
  const wanted = username.toLowerCase();
  for (const session of sessions.values()) {
    if (session.edition === edition && session.username.toLowerCase() === wanted) return true;
  }
  return false;
}

export function getSessionByPlayerId(playerId: string): UserSession | null {
  for (const session of sessions.values()) {
    if (session.playerId === playerId) return { ...session };
  }
  return null;
}

export function getAllSessions(): UserSession[] {
  return Array.from(sessions.values(), (s) => ({ ...s }));
}

export function updateSessionSocketId(token: string, socketId: string): void {
  const session = sessions.get(token);
  if (session) {
    session.socketId = socketId;
  }
}

export function updateSessionRoomId(token: string, roomId: string | null): void {
  const session = sessions.get(token);
  if (session) {
    session.roomId = roomId;
  }
}

export function removeSession(token: string): void {
  sessions.delete(token);
}

export function clearSessions(): void {
  sessions.clear();
}
