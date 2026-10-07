import type { GameType, GameAction, FilteredGameState } from './game.js';
import type { RoomInfo, RoomState } from './room.js';
import type { ErrorPayload } from './errors.js';

export interface ClientToServerEvents {
  authenticate: (data: { token: string }) => void;
  setUsername: (data: { username: string }) => void;
  createRoom: (data: { gameType: GameType }) => void;
  joinRoom: (data: { roomId: string }) => void;
  leaveRoom: () => void;
  changeGameType: (data: { gameType: GameType }) => void;
  startGame: () => void;
  gameAction: (action: GameAction) => void;
  playAgain: () => void;
  returnToLobby: () => void;
  /** Room owner removes a player (lobby: anyone; in game: only disconnected players). */
  kickPlayer: (data: { playerId: string }) => void;
}

export interface ServerToClientEvents {
  authenticated: (session: { token: string; playerId: string; username: string; roomId?: string }) => void;
  lobbyState: (data: { rooms: RoomInfo[] }) => void;
  roomState: (room: RoomState) => void;
  gameState: (state: FilteredGameState | null) => void;
  error: (error: ErrorPayload) => void;
  /** Sent to a player who was removed from their room by the owner. */
  kicked: (data: { roomName: string }) => void;
}
