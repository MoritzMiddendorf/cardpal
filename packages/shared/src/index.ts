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
  type Suit,
  type Rank,
  type Card,
  type GameAction,
  type GameState,
  type PlayerPublicInfo,
  type OtherPlayerHand,
  type PlayerGameState,
  type FilteredGameState,
  type GameResult,
  type PlayerResult,
  type SkipBoCard,
  type SkipBoPile,
  type SkipBoPlayerState,
  type SkipBoGameState,
  type FilteredSkipBoState,
  type PileInfo,
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
  gameStatusSchema,
  suitSchema,
  rankSchema,
  cardSchema,
  gameActionSchema,
  gameStateSchema,
  playerPublicInfoSchema,
  otherPlayerHandSchema,
  playerGameStateSchema,
  gameResultSchema,
  playerResultSchema,
  skipBoCardSchema,
  skipBoPileSchema,
  skipBoPlayerStateSchema,
  skipBoGameStateSchema,
  filteredSkipBoStateSchema,
} from './schemas/game.js';

export {
  roomInfoSchema,
  playerInfoSchema,
  roomStateSchema,
} from './schemas/room.js';
