import { GameType } from './game.js';

export interface RoomInfo {
  id: string;
  name: string;
  gameType: GameType;
  playerCount: number;
  maxPlayers: number;
  status: 'lobby' | 'playing';
}

export interface PlayerInfo {
  id: string;
  username: string;
  isOwner: boolean;
  isConnected: boolean;
}

export interface RoomState {
  id: string;
  name: string;
  gameType: GameType;
  status: 'lobby' | 'playing';
  ownerId: string;
  players: PlayerInfo[];
}
