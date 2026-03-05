import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ClientToServerEvents, ServerToClientEvents } from '@cardpal/shared';
import { GameType, otpValidationRequestSchema } from '@cardpal/shared';
import { PORT } from './config.js';
import { generateOtpCode } from './utils/generateOtp.js';
import { setOtp, isOtpValid } from './state/otp.js';
import { createPendingSession } from './state/sessions.js';
import { authMiddleware } from './socket/middleware/auth.js';
import { registerAuthHandlers } from './socket/handlers/authHandlers.js';
import { registerLobbyHandlers } from './socket/handlers/lobbyHandlers.js';
import { registerGameHandlers } from './socket/handlers/gameHandlers.js';
import { blackjackEngine } from './games/blackjack/index.js';
import { skipBoEngine } from './games/skipbo/index.js';
import { registerEngine } from './games/engine.js';
import { setPlayerConnected, getRoomById, toRoomState } from './state/rooms.js';
import { broadcastLobbyState } from './socket/handlers/lobbyHandlers.js';
import { broadcastGameState } from './socket/handlers/gameHandlers.js';
import { getGame, setPaused } from './state/games.js';
import type { SocketData } from './socket/types.js';

// Register game engines
registerEngine(GameType.BLACKJACK, blackjackEngine);
registerEngine(GameType.SKIPBO, skipBoEngine);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
  cors: {
    origin: process.env['NODE_ENV'] === 'production' ? false : ['http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Admin: Generate OTP
app.post('/api/admin/generate-otp', (_req, res) => {
  try {
    const code = generateOtpCode();
    const otpState = setOtp(code);
    console.log(`OTP generated: ${code} (expires: ${otpState.expiresAt.toISOString()})`);
    res.json({ code, expiresAt: otpState.expiresAt.toISOString() });
  } catch (err) {
    console.error('Failed to generate OTP:', err);
    res.status(500).json({ code: 'UNKNOWN_ERROR', message: 'Failed to generate OTP' });
  }
});

// Validate OTP
app.post('/api/validate-otp', (req, res) => {
  const result = otpValidationRequestSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid OTP format' });
    return;
  }

  if (!isOtpValid(result.data.code)) {
    res.status(401).json({ code: 'AUTH_ERROR', message: 'Invalid or expired code' });
    return;
  }

  const session = createPendingSession(result.data.code);  // store validated OTP code in pending session
  res.json({ pendingSessionId: session.id });
});

// Serve static files in production (must be after API routes to avoid wildcard shadowing)
if (process.env['NODE_ENV'] === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Socket.io authentication middleware
io.use(authMiddleware);

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  registerAuthHandlers(socket, io);
  registerLobbyHandlers(socket, io);
  registerGameHandlers(socket, io);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    const session = socket.data.session;
    if (session?.roomId) {
      const room = setPlayerConnected(session.roomId, session.token, false);
      if (room) {
        io.to(session.roomId).emit('roomState', toRoomState(room));
        if (room.status === 'playing') {
          // Pause game if the disconnected player is the active player
          const game = getGame(session.roomId);
          if (game && game.state.players[game.state.currentPlayerIndex] === session.token) {
            setPaused(session.roomId, true, session.token);
          }
          broadcastGameState(session.roomId, io);
        }
      }
      broadcastLobbyState(io);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
