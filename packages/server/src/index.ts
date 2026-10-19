import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ClientToServerEvents, ServerToClientEvents } from '@cardpal/shared';
import { GameType, otpValidationRequestSchema } from '@cardpal/shared';
import { PORT, ADMIN_SECRET, DEPLOYED_VERSION, OTP_ATTEMPTS_PER_WINDOW, OTP_ATTEMPT_WINDOW_MS, OTP_ENTRY_PATH, isPublicAccess } from './config.js';
import { generateOtpCode } from './utils/generateOtp.js';
import { isAdminRequest } from './utils/adminAuth.js';
import { createRateLimiter } from './utils/rateLimiter.js';
import { setOtp, isOtpValid, getOtp, clearOtp } from './state/otp.js';
import { getSessionByToken, clearSessions, clearPendingSessions, removePendingSession } from './state/sessions.js';
import { ACCESS_COOKIE, getAccessEdition, issueAccessToken } from './utils/access.js';
import { BLANK_PAGE, choosePage, toEntryHtml } from './utils/clientHtml.js';
import { authMiddleware } from './socket/middleware/auth.js';
import { registerAuthHandlers } from './socket/handlers/authHandlers.js';
import { registerLobbyHandlers } from './socket/handlers/lobbyHandlers.js';
import { registerGameHandlers } from './socket/handlers/gameHandlers.js';
import { blackjackEngine } from './games/blackjack/index.js';
import { skipBoEngine } from './games/skipbo/index.js';
import { registerEngine } from './games/engine.js';
import { setPlayerConnected, toRoomState, clearRooms } from './state/rooms.js';
import { broadcastLobbyState } from './socket/handlers/lobbyHandlers.js';
import { broadcastGameState } from './socket/handlers/gameHandlers.js';
import { clearGames } from './state/games.js';
import type { SocketData, AppServer } from './socket/types.js';

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

// Behind a single reverse proxy (e.g. Render) so req.ip reflects the real client for rate limiting
app.set('trust proxy', 1);
app.use(express.json());

const otpRateLimiter = createRateLimiter(OTP_ATTEMPTS_PER_WINDOW, OTP_ATTEMPT_WINDOW_MS);

/**
 * Drop every session, room and game and disconnect all clients. Used when the
 * OTP is rotated or expires: access is granted per OTP, so nothing obtained
 * through an old OTP may outlive it.
 */
function revokeAllAccess(server: AppServer, message: string): void {
  server.emit('error', { code: 'AUTH_ERROR', message });
  server.disconnectSockets(true);
  clearGames();
  clearRooms();
  clearSessions();
  clearPendingSessions();
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: DEPLOYED_VERSION });
});

// Admin: Generate OTP
app.post('/api/admin/generate-otp', (req, res) => {
  if (!isAdminRequest(ADMIN_SECRET, req.get('authorization'), req.socket.remoteAddress)) {
    res.status(401).json({ code: 'AUTH_ERROR', message: 'Admin authorization required' });
    return;
  }
  try {
    const code = generateOtpCode();
    const otpState = setOtp(code);
    revokeAllAccess(io, 'A new access code was issued — please enter it to continue');
    console.log(`OTP generated: ${code} (expires: ${otpState.expiresAt.toISOString()})`);
    res.json({ code, expiresAt: otpState.expiresAt.toISOString(), entryPath: OTP_ENTRY_PATH });
  } catch (err) {
    console.error('Failed to generate OTP:', err);
    res.status(500).json({ code: 'UNKNOWN_ERROR', message: 'Failed to generate OTP' });
  }
});

// Validate OTP
app.post('/api/validate-otp', (req, res) => {
  if (!otpRateLimiter.attempt(req.ip ?? 'unknown')) {
    res.status(429).json({ code: 'RATE_LIMITED', message: 'Too many attempts — please wait a few minutes' });
    return;
  }

  const result = otpValidationRequestSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid OTP format' });
    return;
  }

  if (!isOtpValid(result.data.code)) {
    res.status(401).json({ code: 'AUTH_ERROR', message: 'Invalid or expired code' });
    return;
  }

  const access = issueAccessToken();
  if (!access) {
    res.status(401).json({ code: 'AUTH_ERROR', message: 'Invalid or expired code' });
    return;
  }
  // The proof of OTP entry lives only in this httpOnly cookie; the socket handshake and page
  // requests read it from there. Lax (not Strict) so links shared in chat apps keep working.
  res.cookie(ACCESS_COOKIE, access.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    path: '/',
    expires: access.expiresAt,
  });
  res.json({ ok: true });
});

// Which edition this browser may use (null: none). Lets the client decide what to render.
app.get('/api/access', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ edition: getAccessEdition(req.get('cookie')) });
});

// Serve the built client whenever it exists (must be after API routes to avoid wildcard shadowing)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (existsSync(clientDist)) {
  const indexHtml = readFileSync(path.join(clientDist, 'index.html'), 'utf8');
  const entryHtml = toEntryHtml(indexHtml);
  // The app's html only goes out through the access check below: `/` (index: false) and a direct
  // `/index.html` request both end up there instead of being served as static files
  app.use((req, _res, next) => {
    if (req.path === '/index.html') req.url = '/';
    next();
  });
  app.use(express.static(clientDist, { index: false }));
  app.get('/{*splat}', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const page = choosePage(req.path, req.get('cookie'));
    if (page === 'toApp') res.redirect('/');
    else res.type('html').send(page === 'entry' ? entryHtml : page === 'app' ? indexHtml : BLANK_PAGE);
  });
}

// Socket.io authentication middleware
io.use(authMiddleware);

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // socket.data.session is a snapshot; refresh it before every event so changes made
  // on behalf of this player by others (e.g. being kicked) are seen by the handlers
  socket.use((_packet, next) => {
    if (socket.data.session) {
      const fresh = getSessionByToken(socket.data.session.token);
      if (fresh) socket.data.session = fresh;
      else delete socket.data.session;
    }
    next();
  });

  registerAuthHandlers(socket, io);
  registerLobbyHandlers(socket, io);
  registerGameHandlers(socket, io);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    // A visitor who never picked a username leaves nothing behind
    if (socket.data.pendingSessionId) removePendingSession(socket.data.pendingSessionId);
    // Read the live session: socket.data holds a snapshot that may be stale
    const session = socket.data.session ? getSessionByToken(socket.data.session.token) : null;
    // Ignore sockets that were already superseded by a newer connection for the same
    // session (a quick reconnect often lands before the old socket times out)
    if (!session?.roomId || session.socketId !== socket.id) return;

    const room = setPlayerConnected(session.roomId, session.playerId, false);
    if (room) {
      io.to(session.roomId).emit('roomState', toRoomState(room));
      if (room.status === 'playing') {
        // Pauses the game if it is (or later becomes) the disconnected player's turn
        broadcastGameState(session.roomId, io);
      }
    }
    broadcastLobbyState(io);
  });
});

// Expire access when the OTP's validity window ends, even for clients that stay connected
setInterval(() => {
  const otp = getOtp();
  if (otp && !isOtpValid(otp.code)) {
    console.log('OTP expired — revoking all sessions');
    clearOtp();
    revokeAllAccess(io, 'The access code expired — ask the host for a new one');
  }
}, 60 * 1000).unref();

if (isPublicAccess()) {
  console.log('PUBLIC_ACCESS is on — visitors without the OTP can play the neutral edition.');
}
if (!process.env['OTP_ENTRY_PATH']) {
  console.warn(`OTP_ENTRY_PATH is not set — the OTP form is at the default path ${OTP_ENTRY_PATH}.`);
}

if (!ADMIN_SECRET) {
  console.warn('ADMIN_SECRET is not set — OTP generation is only allowed from localhost.');
}

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
