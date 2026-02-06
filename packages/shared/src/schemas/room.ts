import { z } from 'zod';
import { gameTypeSchema } from './game.js';

export const roomInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  gameType: gameTypeSchema,
  playerCount: z.number().int().nonnegative(),
  maxPlayers: z.number().int().positive(),
  status: z.enum(['lobby', 'playing']),
});

export const playerInfoSchema = z.object({
  id: z.string(),
  username: z.string(),
  isOwner: z.boolean(),
  isConnected: z.boolean(),
});

export const roomStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  gameType: gameTypeSchema,
  status: z.enum(['lobby', 'playing']),
  ownerId: z.string(),
  players: z.array(playerInfoSchema),
});
