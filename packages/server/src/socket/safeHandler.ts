import type { ClientToServerEvents } from '@cardpal/shared';
import type { AppSocket } from './types.js';

/**
 * Wrap a socket event handler so a throw (e.g. from a malformed client payload)
 * is reported to that client instead of escaping into socket.io's dispatch,
 * where it would become an uncaught exception and take the whole server down.
 */
export function safeHandler<Ev extends keyof ClientToServerEvents>(
  socket: AppSocket,
  event: Ev,
  handler: ClientToServerEvents[Ev],
): ClientToServerEvents[Ev] {
  const wrapped = (...args: unknown[]) => {
    try {
      (handler as (...a: unknown[]) => void)(...args);
    } catch (err) {
      console.error(`Error handling '${event}' from ${socket.id}:`, err);
      socket.emit('error', { code: 'UNKNOWN_ERROR', message: 'Something went wrong' });
    }
  };
  return wrapped as ClientToServerEvents[Ev];
}
