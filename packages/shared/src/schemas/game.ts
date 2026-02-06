import { z } from 'zod';

export const gameTypeSchema = z.enum(['blackjack', 'skipbo']);

export const cardSchema = z.object({
  suit: z.string(),
  rank: z.string(),
  faceUp: z.boolean(),
});

export const gameActionSchema = z.object({
  type: z.string(),
  playerId: z.string(),
  payload: z.record(z.unknown()).optional(),
});

export const gameStateSchema = z.object({
  players: z.array(z.string()),
  currentPlayerIndex: z.number().int(),
  status: z.enum(['waiting', 'playing', 'finished']),
});

export const playerGameStateSchema = z.object({
  gameState: gameStateSchema,
  hand: z.array(cardSchema),
  validActions: z.array(gameActionSchema),
});
