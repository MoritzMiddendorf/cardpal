import { createPendingSession, getSessionByToken } from '../../state/sessions.js';
import { getOtp } from '../../state/otp.js';
import { getAccessEdition, isSessionValid } from '../../utils/access.js';
import type { AppSocket } from '../types.js';

/**
 * Returning players authenticate with their session token. New players need access: the
 * server-signed OTP cookie (original edition) or public access (neutral edition). Nothing the
 * client puts in the handshake can choose the edition.
 */
export function authMiddleware(socket: AppSocket, next: (err?: Error) => void): void {
  const { token } = (socket.handshake.auth ?? {}) as { token?: unknown };

  if (typeof token === 'string' && token) {
    const session = getSessionByToken(token);
    if (session && isSessionValid(session)) {
      socket.data.session = session;
      socket.data.authType = 'token';
      return next();
    }
    return next(new Error('AUTH_ERROR'));
  }

  const edition = getAccessEdition(socket.handshake.headers.cookie);
  if (edition) {
    const pending = createPendingSession(edition === 'original' ? getOtp()!.code : null);
    socket.data.pendingSessionId = pending.id;
    socket.data.authType = 'pending';
    return next();
  }

  return next(new Error('AUTH_ERROR'));
}
