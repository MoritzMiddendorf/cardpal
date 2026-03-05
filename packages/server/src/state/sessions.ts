export interface PendingSession {
  id: string;
  validatedAt: Date;
  otpCode: string;  // the OTP code that was validated to create this session
}

export interface UserSession {
  token: string;
  username: string;
  socketId: string;
  roomId: string | null;
  otpCode: string;
}

export const PENDING_SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

const pendingSessions = new Map<string, PendingSession>();
const sessions = new Map<string, UserSession>();

// --- Pending Sessions (Story 1.3) ---

export function createPendingSession(otpCode: string): PendingSession {
  const id = crypto.randomUUID();
  const session: PendingSession = { id, validatedAt: new Date(), otpCode };
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
  const session: UserSession = { token, username, socketId, roomId: null, otpCode: pending.otpCode };  // M3: use stored OTP code
  sessions.set(token, session);
  return { ...session };
}

export function getSessionByToken(token: string): UserSession | null {
  const session = sessions.get(token);
  return session ? { ...session } : null;
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
