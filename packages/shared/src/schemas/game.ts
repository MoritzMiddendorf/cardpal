import { z } from 'zod';
import { GameType } from '../types/game.js';

export const gameTypeSchema = z.enum(GameType);

export const suitSchema = z.enum(['hearts', 'diamonds', 'clubs', 'spades']);

export const rankSchema = z.enum(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);

export const cardSchema = z.object({
  suit: suitSchema,
  rank: rankSchema,
  faceUp: z.boolean(),
});

export const gameActionSchema = z.object({
  type: z.string(),
  playerId: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const gameStatusSchema = z.enum(['waiting', 'playing', 'finished']);

export const gameStateSchema = z.object({
  gameType: gameTypeSchema,
  players: z.array(z.string()),
  currentPlayerIndex: z.number().int(),
  status: gameStatusSchema,
});

export const playerPublicInfoSchema = z.object({
  id: z.string(),
  username: z.string(),
  cardCount: z.number().int().min(0),
  isActive: z.boolean(),
  isBust: z.boolean(),
  hasStood: z.boolean(),
  isConnected: z.boolean(),
});

export const otherPlayerHandSchema = z.object({
  playerId: z.string(),
  cards: z.array(cardSchema),
  handValue: z.number(),
});

export const gameResultSchema = z.enum(['win', 'lose', 'push']);

export const playerResultSchema = z.object({
  playerId: z.string(),
  username: z.string(),
  result: gameResultSchema,
  handValue: z.number(),
});

// --- Skip-Bo Schemas ---

export const skipBoCardSchema = z.object({
  value: z.number().int().min(0).max(12),
  isWild: z.boolean(),
  faceUp: z.boolean(),
});

export const skipBoPileSchema = z.array(skipBoCardSchema);

export const skipBoPlayerStateSchema = z.object({
  playerId: z.string(),
  stockPile: skipBoPileSchema,
  hand: z.array(skipBoCardSchema),
  discardPiles: z.tuple([skipBoPileSchema, skipBoPileSchema, skipBoPileSchema, skipBoPileSchema]),
});

export const skipBoGameStateSchema = gameStateSchema.extend({
  gameType: z.literal(GameType.SKIPBO),
  drawPile: skipBoPileSchema,
  buildingPiles: z.tuple([skipBoPileSchema, skipBoPileSchema, skipBoPileSchema, skipBoPileSchema]),
  playerStates: z.array(skipBoPlayerStateSchema),
});

const pileInfoSchema = z.object({
  topCard: skipBoCardSchema.nullable(),
  count: z.number().int().min(0),
});

export const filteredSkipBoStateSchema = z.object({
  myHand: z.array(skipBoCardSchema),
  myStockPile: pileInfoSchema,
  myDiscardPiles: z.tuple([pileInfoSchema, pileInfoSchema, pileInfoSchema, pileInfoSchema]),
  buildingPiles: z.tuple([pileInfoSchema, pileInfoSchema, pileInfoSchema, pileInfoSchema]),
  otherPlayers: z.array(z.object({
    playerId: z.string(),
    username: z.string(),
    stockPile: pileInfoSchema,
    discardPiles: z.tuple([pileInfoSchema, pileInfoSchema, pileInfoSchema, pileInfoSchema]),
    handCount: z.number().int().min(0),
    isConnected: z.boolean(),
  })),
  drawPileCount: z.number().int().min(0),
});

export const playerGameStateSchema = z.object({
  gameType: gameTypeSchema,
  currentPlayerIndex: z.number().int(),
  status: gameStatusSchema,
  players: z.array(playerPublicInfoSchema),
  myPlayerId: z.string(),
  hand: z.array(cardSchema),
  handValue: z.number(),
  validActions: z.array(gameActionSchema),
  dealerCards: z.array(cardSchema),
  dealerHandValue: z.number().nullable(),
  otherPlayerHands: z.array(otherPlayerHandSchema),
  results: z.array(playerResultSchema).optional(),
  isPaused: z.boolean(),
  pausedForPlayer: z.string().nullable(),
  skipBoState: filteredSkipBoStateSchema.optional(),
});
