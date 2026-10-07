import { gameTypeSchema, gameActionSchema, GameType } from '@cardpal/shared';
import type { GameAction } from '@cardpal/shared';
import { getRoomById, toRoomState, GAME_MIN_PLAYERS, GAME_MAX_PLAYERS, updateRoomGameType, setRoomStatus } from '../../state/rooms.js';
import { getSessionByPlayerId } from '../../state/sessions.js';
import { createGame, removeGame, getGame, updateGameState, setPaused } from '../../state/games.js';
import { getEngine } from '../../games/engine.js';
import { filterGameState } from '../../utils/filterGameState.js';
import { broadcastLobbyState } from './lobbyHandlers.js';
import type { AppSocket, AppServer } from '../types.js';
import { safeHandler } from '../safeHandler.js';

export function handleChangeGameType(
  socket: AppSocket,
  io: AppServer,
  data: { gameType: string },
): void {
  const session = socket.data.session;
  if (!session) {
    socket.emit('error', { code: 'AUTH_ERROR', message: 'Not authenticated' });
    return;
  }

  const result = gameTypeSchema.safeParse(data?.gameType);
  if (!result.success) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Invalid game type' });
    return;
  }

  if (!session.roomId) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Not in a room' });
    return;
  }

  const room = getRoomById(session.roomId);
  if (!room) {
    socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    return;
  }

  if (room.ownerId !== session.playerId) {
    socket.emit('error', { code: 'NOT_AUTHORIZED', message: 'Only the room owner can change the game type' });
    return;
  }

  if (room.status !== 'lobby') {
    socket.emit('error', { code: 'GAME_IN_PROGRESS', message: 'Cannot change game type during a game' });
    return;
  }

  const updatedRoom = updateRoomGameType(session.roomId, result.data);
  if (!updatedRoom) return;

  io.to(session.roomId).emit('roomState', toRoomState(updatedRoom));
  broadcastLobbyState(io);
}

/**
 * Pause the game while the player whose turn it is is disconnected, and resume
 * it once they are back. Derived from current state so that it also covers the
 * turn passing *to* an already-disconnected player (not just disconnects that
 * happen mid-turn).
 */
export function syncPauseState(roomId: string): void {
  const instance = getGame(roomId);
  const room = getRoomById(roomId);
  if (!instance || !room) return;
  const activePlayerId = instance.state.players[instance.state.currentPlayerIndex] ?? null;
  const activePlayer = room.players.find((p) => p.id === activePlayerId);
  const shouldPause = instance.state.status === 'playing' && activePlayer !== undefined && !activePlayer.isConnected;
  if (shouldPause && (!instance.isPaused || instance.pausedForPlayerId !== activePlayerId)) {
    setPaused(roomId, true, activePlayerId);
  } else if (!shouldPause && instance.isPaused) {
    setPaused(roomId, false, null);
  }
}

/**
 * Broadcast filtered game state to each player in the room individually.
 * Each player receives only their own hand and valid actions.
 */
export function broadcastGameState(roomId: string, io: AppServer): void {
  syncPauseState(roomId);
  const instance = getGame(roomId);
  const room = getRoomById(roomId);
  if (!instance || !room) return;
  const connectionMap = new Map(room.players.map((p) => [p.id, p.isConnected]));
  const pauseInfo = { isPaused: instance.isPaused, pausedForPlayerId: instance.pausedForPlayerId };
  for (const player of room.players) {
    const playerSession = getSessionByPlayerId(player.id);
    if (playerSession?.socketId) {
      io.to(playerSession.socketId).emit('gameState', filterGameState(instance, player.id, connectionMap, pauseInfo));
    }
  }
}

export function handleStartGame(
  socket: AppSocket,
  io: AppServer,
): void {
  const session = socket.data.session;
  if (!session) {
    socket.emit('error', { code: 'AUTH_ERROR', message: 'Not authenticated' });
    return;
  }

  if (!session.roomId) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Not in a room' });
    return;
  }

  const room = getRoomById(session.roomId);
  if (!room) {
    socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    return;
  }

  if (room.ownerId !== session.playerId) {
    socket.emit('error', { code: 'NOT_AUTHORIZED', message: 'Only the room owner can start the game' });
    return;
  }

  if (room.status !== 'lobby') {
    socket.emit('error', { code: 'GAME_IN_PROGRESS', message: 'Game already in progress' });
    return;
  }

  const minPlayers = GAME_MIN_PLAYERS[room.gameType];
  const maxPlayers = GAME_MAX_PLAYERS[room.gameType];
  if (room.players.length < minPlayers || room.players.length > maxPlayers) {
    socket.emit('error', {
      code: 'VALIDATION_ERROR',
      message: `Need ${minPlayers}-${maxPlayers} players for ${room.gameType}`,
    });
    return;
  }

  const engine = getEngine(room.gameType);
  if (!engine) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: `Game engine not available for ${room.gameType}` });
    return;
  }

  const players = room.players.map((p) => ({ id: p.id, username: p.username }));
  createGame(session.roomId, room.gameType, engine, players);

  setRoomStatus(session.roomId, 'playing');
  const updatedRoom = getRoomById(session.roomId);

  broadcastGameState(session.roomId, io);

  if (updatedRoom) {
    io.to(session.roomId).emit('roomState', toRoomState(updatedRoom));
  }
  broadcastLobbyState(io);
}

export function handleGameAction(
  socket: AppSocket,
  io: AppServer,
  action: GameAction,
): void {
  const session = socket.data.session;
  if (!session) {
    socket.emit('error', { code: 'AUTH_ERROR', message: 'Not authenticated' });
    return;
  }

  if (!session.roomId) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Not in a room' });
    return;
  }

  // Validate action payload with Zod
  const parsed = gameActionSchema.safeParse(action);
  if (!parsed.success) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Invalid action payload' });
    return;
  }

  // Server-authoritative: override playerId to prevent spoofing
  const serverAction: GameAction = { ...parsed.data, playerId: session.playerId };

  const instance = getGame(session.roomId);
  if (!instance) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'No active game' });
    return;
  }

  if (instance.isPaused) {
    socket.emit('error', { code: 'GAME_PAUSED', message: 'Game is paused - waiting for player to reconnect' });
    return;
  }

  try {
    const newState = instance.engine.applyAction(instance.state, serverAction);
    updateGameState(session.roomId, newState);
    broadcastGameState(session.roomId, io);
  } catch (err) {
    socket.emit('error', {
      code: 'INVALID_ACTION',
      message: err instanceof Error ? err.message : 'Invalid action',
    });
  }
}

/**
 * Start a new game with the same players when owner clicks "Play Again".
 * Room stays in 'playing' status. Only the room owner can trigger this.
 */
export function handlePlayAgain(
  socket: AppSocket,
  io: AppServer,
): void {
  const session = socket.data.session;
  if (!session) {
    socket.emit('error', { code: 'AUTH_ERROR', message: 'Not authenticated' });
    return;
  }

  if (!session.roomId) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Not in a room' });
    return;
  }

  const room = getRoomById(session.roomId);
  if (!room) {
    socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    return;
  }

  if (room.ownerId !== session.playerId) {
    socket.emit('error', { code: 'NOT_AUTHORIZED', message: 'Only the room owner can start a new game' });
    return;
  }

  const instance = getGame(session.roomId);
  if (!instance || instance.state.status !== 'finished') {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Game is not finished' });
    return;
  }

  const engine = getEngine(room.gameType);
  if (!engine) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: `Game engine not available for ${room.gameType}` });
    return;
  }

  // Remove old game and create fresh one with same players
  removeGame(session.roomId);
  const players = room.players.map((p) => ({ id: p.id, username: p.username }));
  createGame(session.roomId, room.gameType, engine, players);

  // Room stays in 'playing' status — no change needed
  broadcastGameState(session.roomId, io);
  broadcastLobbyState(io);
}

export function handleReturnToLobby(
  socket: AppSocket,
  io: AppServer,
): void {
  const session = socket.data.session;
  if (!session) {
    socket.emit('error', { code: 'AUTH_ERROR', message: 'Not authenticated' });
    return;
  }

  if (!session.roomId) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Not in a room' });
    return;
  }

  const instance = getGame(session.roomId);
  if (!instance || instance.state.status !== 'finished') {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Game is not finished' });
    return;
  }

  handleEndGame(session.roomId, io);
}

/**
 * End a game and transition the room back to lobby status.
 * Called from handleReturnToLobby and can be called programmatically.
 */
export function handleEndGame(roomId: string, io: AppServer): void {
  removeGame(roomId);
  const updatedRoom = setRoomStatus(roomId, 'lobby');

  if (updatedRoom) {
    io.to(roomId).emit('roomState', toRoomState(updatedRoom));
    io.to(roomId).emit('gameState', null);
  }
  broadcastLobbyState(io);
}

export function registerGameHandlers(socket: AppSocket, io: AppServer): void {
  socket.on('changeGameType', safeHandler(socket, 'changeGameType', (data) => handleChangeGameType(socket, io, data)));
  socket.on('startGame', safeHandler(socket, 'startGame', () => handleStartGame(socket, io)));
  socket.on('gameAction', safeHandler(socket, 'gameAction', (action) => handleGameAction(socket, io, action)));
  socket.on('playAgain', safeHandler(socket, 'playAgain', () => handlePlayAgain(socket, io)));
  socket.on('returnToLobby', safeHandler(socket, 'returnToLobby', () => handleReturnToLobby(socket, io)));
}
