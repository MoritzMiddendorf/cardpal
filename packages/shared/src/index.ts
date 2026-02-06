// Types
export type {
  SessionToken,
  OtpValidationRequest,
  OtpValidationResponse,
  UsernameRequest,
} from './types/auth.js';

export type { ErrorCode, ErrorPayload } from './types/errors.js';

export {
  GameType,
  type Card,
  type GameAction,
  type GameState,
  type PlayerGameState,
  type FilteredGameState,
} from './types/game.js';

export type {
  RoomInfo,
  PlayerInfo,
  RoomState,
} from './types/room.js';

export type {
  ClientToServerEvents,
  ServerToClientEvents,
} from './types/events.js';

// Schemas
export {
  otpValidationRequestSchema,
  otpValidationResponseSchema,
  usernameRequestSchema,
  sessionTokenSchema,
} from './schemas/auth.js';

export {
  errorCodeSchema,
  errorPayloadSchema,
} from './schemas/errors.js';

export {
  gameTypeSchema,
  cardSchema,
  gameActionSchema,
  gameStateSchema,
  playerGameStateSchema,
} from './schemas/game.js';

export {
  roomInfoSchema,
  playerInfoSchema,
  roomStateSchema,
} from './schemas/room.js';
