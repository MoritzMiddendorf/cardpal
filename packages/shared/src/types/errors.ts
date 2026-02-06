export type ErrorCode =
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'INVALID_ACTION'
  | 'ROOM_FULL'
  | 'ROOM_NOT_FOUND'
  | 'NOT_AUTHORIZED'
  | 'GAME_IN_PROGRESS'
  | 'UNKNOWN_ERROR';

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
}
