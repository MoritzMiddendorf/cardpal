import { usernameRequestSchema } from '@cardpal/shared';
import { createSession, getSessionByToken, updateSessionSocketId } from '../../state/sessions.js';
import { isOtpValid } from '../../state/otp.js';
import { setPlayerConnected, getRoomById, toRoomState } from '../../state/rooms.js';
import { getGame, setPaused } from '../../state/games.js';
import { filterGameState } from '../../utils/filterGameState.js';
import { broadcastGameState } from './gameHandlers.js';
import { sendLobbyState, broadcastLobbyState } from './lobbyHandlers.js';
import type { AppSocket, AppServer } from '../types.js';

export function handleSetUsername(
  socket: AppSocket,
  _io: AppServer,
  data: { username: string },
): void {
  const result = usernameRequestSchema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Invalid username';
    socket.emit('error', { code: 'VALIDATION_ERROR', message });
    return;
  }

  const pendingSessionId = socket.data.pendingSessionId;
  if (!pendingSessionId) {
    socket.emit('error', { code: 'AUTH_ERROR', message: 'No pending session' });
    return;
  }

  try {
    const session = createSession(pendingSessionId, result.data.username, socket.id);  // otpCode taken from pending session
    socket.data.session = session;
    socket.data.authType = 'token';
    socket.emit('authenticated', { token: session.token, username: session.username });
    sendLobbyState(socket);
    console.log(`Session created: ${session.username} (token: ${session.token.slice(0, 8)}...)`);
  } catch {
    socket.emit('error', { code: 'AUTH_ERROR', message: 'Session creation failed' });
  }
}

function restoreRoomConnection(socket: AppSocket, io: AppServer, session: { token: string; roomId: string | null }): void {
  if (!session.roomId) return;

  socket.join(session.roomId);
  const room = setPlayerConnected(session.roomId, session.token, true);
  if (room) {
    io.to(session.roomId).emit('roomState', toRoomState(room));
    broadcastLobbyState(io);

    // If a game is in progress, handle unpause and send game state
    const game = getGame(session.roomId);
    if (game && room.status === 'playing') {
      // Unpause if game was paused for this player
      if (game.isPaused && game.pausedForPlayerId === session.token) {
        setPaused(session.roomId, false, null);
        broadcastGameState(session.roomId, io);
      } else {
        const connectionMap = new Map(room.players.map((p) => [p.id, p.isConnected]));
        const pauseInfo = { isPaused: game.isPaused, pausedForPlayerId: game.pausedForPlayerId };
        socket.emit('gameState', filterGameState(game, session.token, connectionMap, pauseInfo));
      }
    }
  }
}

export function handleAuthenticate(
  socket: AppSocket,
  io: AppServer,
  data: { token: string },
): void {
  const session = getSessionByToken(data.token);
  if (!session || !isOtpValid(session.otpCode)) {
    socket.emit('error', { code: 'AUTH_ERROR', message: 'Session expired' });
    return;
  }

  updateSessionSocketId(session.token, socket.id);
  socket.data.session = session;
  socket.data.authType = 'token';
  socket.emit('authenticated', { token: session.token, username: session.username, roomId: session.roomId ?? undefined });
  restoreRoomConnection(socket, io, session);
  console.log(`Session restored: ${session.username} (token: ${session.token.slice(0, 8)}...)`);
}

export function registerAuthHandlers(socket: AppSocket, io: AppServer): void {
  socket.on('setUsername', (data) => handleSetUsername(socket, io, data));
  socket.on('authenticate', (data) => handleAuthenticate(socket, io, data));

  // Auto-authenticate returning users whose session was validated in middleware
  if (socket.data.authType === 'token' && socket.data.session) {
    updateSessionSocketId(socket.data.session.token, socket.id);
    socket.emit('authenticated', {
      token: socket.data.session.token,
      username: socket.data.session.username,
      roomId: socket.data.session.roomId ?? undefined,
    });
    sendLobbyState(socket);
    restoreRoomConnection(socket, io, socket.data.session);
    console.log(`Session auto-restored: ${socket.data.session.username} (token: ${socket.data.session.token.slice(0, 8)}...)`);
  }
}
