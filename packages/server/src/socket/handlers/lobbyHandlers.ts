import { gameTypeSchema, GameType } from '@cardpal/shared';
import { getRooms, createRoom, toRoomState, getRoomById, addPlayerToRoom, removePlayerFromRoom, GAME_MAX_PLAYERS } from '../../state/rooms.js';
import { updateSessionRoomId } from '../../state/sessions.js';
import type { AppSocket, AppServer } from '../types.js';

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
  const result = gameTypeSchema.safeParse(data.gameType);
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

  const room = createRoom(result.data, session.token, session.username);

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
  if (!data || typeof data.roomId !== 'string' || data.roomId.length === 0) {
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

  const updatedRoom = addPlayerToRoom(data.roomId, session.token, session.username);
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
  const { room, deleted } = removePlayerFromRoom(roomId, session.token);

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

export function registerLobbyHandlers(socket: AppSocket, io: AppServer): void {
  socket.on('createRoom', (data) => handleCreateRoom(socket, io, data));
  socket.on('joinRoom', (data) => handleJoinRoom(socket, io, data));
  socket.on('leaveRoom', () => handleLeaveRoom(socket, io));
}
