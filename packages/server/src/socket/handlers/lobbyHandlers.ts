import { gameTypeSchema, GameType } from '@cardpal/shared';
import { getRooms, createRoom, toRoomState, getRoomById, addPlayerToRoom, removePlayerFromRoom, setRoomStatus, GAME_MAX_PLAYERS } from '../../state/rooms.js';
import { updateSessionRoomId, getSessionByPlayerId } from '../../state/sessions.js';
import { getGame, removeGame } from '../../state/games.js';
import type { AppSocket, AppServer } from '../types.js';
import { safeHandler } from '../safeHandler.js';

export function sendLobbyState(socket: AppSocket): void {
  socket.emit('lobbyState', { rooms: getRooms() });
}

export function broadcastLobbyState(io: AppServer): void {
  io.emit('lobbyState', { rooms: getRooms() });
}

export function handleCreateRoom(
  socket: AppSocket,
  io: AppServer,
  data: { gameType: string },
): void {
  const result = gameTypeSchema.safeParse(data?.gameType);
  if (!result.success) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Invalid game type' });
    return;
  }

  const session = socket.data.session;
  if (!session) {
    socket.emit('error', { code: 'AUTH_ERROR', message: 'Not authenticated' });
    return;
  }

  if (session.roomId) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Already in a room' });
    return;
  }

  const room = createRoom(result.data, session.playerId, session.username);

  socket.join(room.id);

  updateSessionRoomId(session.token, room.id);
  socket.data.session = { ...session, roomId: room.id };

  socket.emit('roomState', toRoomState(room));

  broadcastLobbyState(io);

  console.log(`Room created: ${room.name} (${room.id.slice(0, 8)}...) by ${session.username}`);
}

export function handleJoinRoom(
  socket: AppSocket,
  io: AppServer,
  data: { roomId: string },
): void {
  if (typeof data?.roomId !== 'string' || data.roomId.length === 0) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Invalid roomId' });
    return;
  }

  const session = socket.data.session;
  if (!session) {
    socket.emit('error', { code: 'AUTH_ERROR', message: 'Not authenticated' });
    return;
  }

  if (session.roomId) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Already in a room' });
    return;
  }

  const room = getRoomById(data.roomId);
  if (!room) {
    socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    return;
  }

  if (room.status === 'playing') {
    socket.emit('error', { code: 'GAME_IN_PROGRESS', message: 'Game in progress' });
    return;
  }

  if (room.players.length >= GAME_MAX_PLAYERS[room.gameType]) {
    socket.emit('error', { code: 'ROOM_FULL', message: 'Room is full' });
    return;
  }

  const updatedRoom = addPlayerToRoom(data.roomId, session.playerId, session.username);
  if (!updatedRoom) return;

  socket.join(updatedRoom.id);
  updateSessionRoomId(session.token, updatedRoom.id);
  socket.data.session = { ...session, roomId: updatedRoom.id };

  io.to(updatedRoom.id).emit('roomState', toRoomState(updatedRoom));
  broadcastLobbyState(io);

  console.log(`Player joined: ${session.username} → ${updatedRoom.name}`);
}

export function handleLeaveRoom(
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

  const roomId = session.roomId;
  if (getRoomById(roomId)?.status === 'playing') {
    socket.emit('error', { code: 'GAME_IN_PROGRESS', message: 'Cannot leave a room while a game is in progress' });
    return;
  }

  const { room, deleted } = removePlayerFromRoom(roomId, session.playerId);

  socket.leave(roomId);
  updateSessionRoomId(session.token, null);
  socket.data.session = { ...session, roomId: null };

  if (!deleted && room) {
    io.to(roomId).emit('roomState', toRoomState(room));
  }

  broadcastLobbyState(io);
  sendLobbyState(socket);

  console.log(`Player left: ${session.username} ← room (${deleted ? 'room deleted' : 'room kept'})`);
}

export function handleKickPlayer(
  socket: AppSocket,
  io: AppServer,
  data: { playerId: string },
): void {
  const session = socket.data.session;
  if (!session) {
    socket.emit('error', { code: 'AUTH_ERROR', message: 'Not authenticated' });
    return;
  }

  if (typeof data?.playerId !== 'string' || data.playerId.length === 0) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Invalid playerId' });
    return;
  }

  const room = session.roomId ? getRoomById(session.roomId) : null;
  if (!room) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Not in a room' });
    return;
  }

  if (room.ownerId !== session.playerId) {
    socket.emit('error', { code: 'NOT_AUTHORIZED', message: 'Only the host can remove players' });
    return;
  }

  if (data.playerId === session.playerId) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'You cannot remove yourself' });
    return;
  }

  const target = room.players.find((p) => p.id === data.playerId);
  if (!target) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Player is not in this room' });
    return;
  }

  // Mid-game, only players who dropped out may be removed (the game can't continue
  // without them). The game can't continue with a player missing either, so it ends.
  if (room.status === 'playing') {
    if (target.isConnected) {
      socket.emit('error', { code: 'GAME_IN_PROGRESS', message: 'Only disconnected players can be removed during a game' });
      return;
    }
    if (getGame(room.id)) removeGame(room.id);
    setRoomStatus(room.id, 'lobby');
    io.to(room.id).emit('gameState', null);
  }

  const { room: updatedRoom } = removePlayerFromRoom(room.id, target.id);

  const targetSession = getSessionByPlayerId(target.id);
  if (targetSession) {
    updateSessionRoomId(targetSession.token, null);
    io.in(targetSession.socketId).socketsLeave(room.id);
    io.to(targetSession.socketId).emit('kicked', { roomName: room.name });
    io.to(targetSession.socketId).emit('lobbyState', { rooms: getRooms() });
  }

  if (updatedRoom) {
    io.to(room.id).emit('roomState', toRoomState(updatedRoom));
  }
  broadcastLobbyState(io);

  console.log(`Player kicked: ${target.username} from ${room.name} by ${session.username}`);
}

export function registerLobbyHandlers(socket: AppSocket, io: AppServer): void {
  socket.on('createRoom', safeHandler(socket, 'createRoom', (data) => handleCreateRoom(socket, io, data)));
  socket.on('joinRoom', safeHandler(socket, 'joinRoom', (data) => handleJoinRoom(socket, io, data)));
  socket.on('leaveRoom', safeHandler(socket, 'leaveRoom', () => handleLeaveRoom(socket, io)));
  socket.on('kickPlayer', safeHandler(socket, 'kickPlayer', (data) => handleKickPlayer(socket, io, data)));
}
