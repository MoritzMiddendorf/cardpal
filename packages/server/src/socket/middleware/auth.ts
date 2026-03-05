import { getPendingSession, getSessionByToken } from '../../state/sessions.js';
import { isOtpValid } from '../../state/otp.js';
import type { AppSocket } from '../types.js';

export function authMiddleware(socket: AppSocket, next: (err?: Error) => void): void {
  const { token, pendingSessionId } = socket.handshake.auth as {
    token?: string;
    pendingSessionId?: string;
  };

  if (token) {
    const session = getSessionByToken(token);
    if (session && isOtpValid(session.otpCode)) {
      socket.data.session = session;
      socket.data.authType = 'token';
      return next();
    }
    return next(new Error('AUTH_ERROR'));
  }

  if (pendingSessionId) {
    const pending = getPendingSession(pendingSessionId);
    if (pending) {
      socket.data.pendingSessionId = pendingSessionId;
      socket.data.authType = 'pending';
      return next();
    }
    return next(new Error('AUTH_ERROR'));
  }

  return next(new Error('AUTH_ERROR'));
}
