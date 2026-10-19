import { useAppStore } from '../store/index.js';
import { socket } from './client.js';

/**
 * Start a new session: the server reads the access cookie in the socket handshake and decides
 * the edition; the user then picks a username.
 */
export function startNewSession(): void {
  socket.auth = {};
  if (!socket.connected) socket.connect();
  useAppStore.getState().setScreen('username');
}
