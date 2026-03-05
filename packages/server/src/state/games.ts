import type { GameType, GameState } from '@cardpal/shared';
import type { GameEngine, GameInstance } from '../games/engine.js';

const games = new Map<string, GameInstance>();

function deepCopyState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

function deepCopyInstance(instance: GameInstance): GameInstance {
  return {
    roomId: instance.roomId,
    gameType: instance.gameType,
    state: deepCopyState(instance.state),
    engine: instance.engine, // engine is stateless, safe to share reference
    playerUsernames: new Map(instance.playerUsernames),
    isPaused: instance.isPaused,
    pausedForPlayerId: instance.pausedForPlayerId,
  };
}

export function createGame(
  roomId: string,
  gameType: GameType,
  engine: GameEngine,
  players: Array<{ id: string; username: string }>,
): GameInstance {
  const state = engine.getInitialState(players);
  const playerUsernames = new Map(players.map((p) => [p.id, p.username]));
  const instance: GameInstance = {
    roomId,
    gameType,
    state,
    engine,
    playerUsernames,
    isPaused: false,
    pausedForPlayerId: null,
  };
  games.set(roomId, instance);
  return deepCopyInstance(instance);
}

export function getGame(roomId: string): GameInstance | null {
  const instance = games.get(roomId);
  if (!instance) return null;
  return deepCopyInstance(instance);
}

export function updateGameState(roomId: string, newState: GameState): GameInstance | null {
  const instance = games.get(roomId);
  if (!instance) return null;
  instance.state = deepCopyState(newState);
  return deepCopyInstance(instance);
}

export function setPaused(roomId: string, isPaused: boolean, pausedForPlayerId: string | null): GameInstance | null {
  const instance = games.get(roomId);
  if (!instance) return null;
  instance.isPaused = isPaused;
  instance.pausedForPlayerId = pausedForPlayerId;
  return deepCopyInstance(instance);
}

export function removeGame(roomId: string): boolean {
  return games.delete(roomId);
}

export function clearGames(): void {
  games.clear();
}

/** @internal Test-only helper — do not use in production code. */
export function _addGameForTest(instance: GameInstance): void {
  games.set(instance.roomId, instance);
}
