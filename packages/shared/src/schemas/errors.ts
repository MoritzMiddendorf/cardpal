import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'AUTH_ERROR',
  'VALIDATION_ERROR',
  'INVALID_ACTION',
  'ROOM_FULL',
  'ROOM_NOT_FOUND',
  'NOT_AUTHORIZED',
  'GAME_IN_PROGRESS',
  'GAME_PAUSED',
  'RATE_LIMITED',
  'UNKNOWN_ERROR',
]);

export const errorPayloadSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
});
