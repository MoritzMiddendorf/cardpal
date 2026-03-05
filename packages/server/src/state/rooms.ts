import { GameType } from '@cardpal/shared';
import type { RoomInfo, RoomState } from '@cardpal/shared';
import { generateRoomName } from '../utils/generateRoomName.js';

interface RoomPlayer {
  id: string;
  username: string;
  isConnected: boolean;
}

export interface Room {
  id: string;
  name: string;
  gameType: GameType;
  status: 'lobby' | 'playing';
  ownerId: string;
  players: RoomPlayer[];
}

export const GAME_MIN_PLAYERS: Record<GameType, number> = {
  [GameType.BLACKJACK]: 2,
  [GameType.SKIPBO]: 2,
};

export const GAME_MAX_PLAYERS: Record<GameType, number> = {
  [GameType.BLACKJACK]: 4,
  [GameType.SKIPBO]: 6,
};

const rooms = new Map<string, Room>();

export function getRooms(): RoomInfo[] {
  return Array.from(rooms.values()).map((room) => ({
    id: room.id,
    name: room.name,
    gameType: room.gameType,
    playerCount: room.players.length,
    maxPlayers: GAME_MAX_PLAYERS[room.gameType],
    status: room.status,
  }));
}

export function getRoomById(id: string): Room | null {
  const room = rooms.get(id);
  if (!room) return null;
  return { ...room, players: room.players.map((p) => ({ ...p })) };
}

export function clearRooms(): void {
  rooms.clear();
}

export function createRoom(
  gameType: GameType,
  ownerToken: string,
  ownerUsername: string,
): Room {
  const id = crypto.randomUUID();
  const name = generateRoomName();
  const room: Room = {
    id,
    name,
    gameType,
    status: 'lobby',
    ownerId: ownerToken,
    players: [{ id: ownerToken, username: ownerUsername, isConnected: true }],
  };
  rooms.set(id, room);
  return { ...room, players: room.players.map((p) => ({ ...p })) };
}

export function toRoomState(room: Room): RoomState {
  return {
    id: room.id,
    name: room.name,
    gameType: room.gameType,
    status: room.status,
    ownerId: room.ownerId,
    players: room.players.map((p) => ({
      id: p.id,
      username: p.username,
      isOwner: p.id === room.ownerId,
      isConnected: p.isConnected,
    })),
  };
}

export function addPlayerToRoom(
  roomId: string,
  playerToken: string,
  username: string,
): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  // Prevent duplicate joins
  if (room.players.some((p) => p.id === playerToken)) {
    return { ...room, players: room.players.map((p) => ({ ...p })) };
  }
  // Enforce capacity at the state level (defense-in-depth)
  if (room.players.length >= GAME_MAX_PLAYERS[room.gameType]) {
    return null;
  }
  room.players.push({ id: playerToken, username, isConnected: true });
  return { ...room, players: room.players.map((p) => ({ ...p })) };
}

export function removePlayerFromRoom(
  roomId: string,
  playerToken: string,
): { room: Room | null; deleted: boolean } {
  const room = rooms.get(roomId);
  if (!room) return { room: null, deleted: false };

  room.players = room.players.filter((p) => p.id !== playerToken);

  if (room.players.length === 0) {
    rooms.delete(roomId);
    return { room: null, deleted: true };
  }

  // Transfer ownership if the leaving player was the owner
  if (room.ownerId === playerToken) {
    room.ownerId = room.players[0]!.id;
  }

  return { room: { ...room, players: room.players.map((p) => ({ ...p })) }, deleted: false };
}

export function updateRoomGameType(roomId: string, gameType: GameType): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.status !== 'lobby') return null;
  room.gameType = gameType;
  return { ...room, players: room.players.map((p) => ({ ...p })) };
}

export function setRoomStatus(roomId: string, status: 'lobby' | 'playing'): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.status = status;
  return { ...room, players: room.players.map((p) => ({ ...p })) };
}

export function setPlayerConnected(roomId: string, playerToken: string, isConnected: boolean): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const player = room.players.find((p) => p.id === playerToken);
  if (!player) return null;
  player.isConnected = isConnected;
  return { ...room, players: room.players.map((p) => ({ ...p })) };
}

/** @internal Test-only helper — do not use in production code. */
export function _addRoomForTest(room: Room): void {
  rooms.set(room.id, room);
}
