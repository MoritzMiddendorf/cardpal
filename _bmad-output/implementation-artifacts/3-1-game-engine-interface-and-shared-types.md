# Story 3.1: Game Engine Interface & Shared Types

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **a well-defined game engine interface and shared types**,
so that **multiple games can be implemented consistently and the client/server stay in sync**.

## Acceptance Criteria

1. **Given** the shared package **When** game types are defined **Then** the following interfaces exist: `GameEngine` interface with methods `getInitialState(players)`, `getValidActions(state, playerId)`, `applyAction(state, action)`, `isGameOver(state)`, `getWinner(state)`
2. **Given** the shared package **When** game types are defined **Then** `Card` type exists with: `suit` (union of Suit values), `rank` (union of Rank values), `faceUp` boolean
3. **Given** the shared package **When** game types are defined **Then** `GameState` base type exists with: `players`, `currentPlayerIndex`, `status` **And** `GameAction` type exists with: `type`, `playerId`, `payload` **And** `PlayerGameState` exists for filtered per-player view
4. **Given** the shared package **When** game types are defined **Then** Zod schemas exist for all game-related types with proper validation (enum unions for suit/rank, not bare strings)
5. **Given** the shared package **When** game types are defined **Then** `GameType` enum exists with BLACKJACK and SKIPBO **And** server can import and use the GameEngine interface **And** client can import types for rendering game state
6. **Given** the server **When** game state management is needed **Then** an in-memory `games` Map exists (`Map<roomId, GameInstance>`) with CRUD operations following the existing deep-copy pattern from `rooms.ts`

## Tasks / Subtasks

- [x] Task 1: Enhance shared Card type with proper union types (AC: #2, #4)
  - [x] 1.1 Update `packages/shared/src/types/game.ts` — define `Suit` union type: `'hearts' | 'diamonds' | 'clubs' | 'spades'`
  - [x] 1.2 Define `Rank` union type: `'2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'`
  - [x] 1.3 Update `Card` interface: `suit: Suit`, `rank: Rank`, `faceUp: boolean`
  - [x] 1.4 Update `packages/shared/src/schemas/game.ts` — update `cardSchema` to use `z.enum()` for suit and rank instead of `z.string()`
  - [x] 1.5 Update `packages/shared/src/index.ts` — export `Suit` and `Rank` types
  - [x] 1.6 Write tests: `packages/shared/src/schemas/game.test.ts` — card schema validates valid/invalid suit/rank values

- [x] Task 2: Enhance shared GameState and GameAction types (AC: #3, #4)
  - [x] 2.1 Update `GameState` in `packages/shared/src/types/game.ts` — keep `players: string[]` (player session tokens), `currentPlayerIndex: number`, `status: 'waiting' | 'playing' | 'finished'`. Add `gameType: GameType` field so the client knows which game is being played
  - [x] 2.2 Update `GameAction` — keep `type: string`, `playerId: string`, `payload?: Record<string, unknown>`. The `type` stays as string at the shared level — game-specific action types are narrowed per engine implementation
  - [x] 2.3 Update `PlayerGameState` — ensure it provides everything the client needs: `hand: Card[]`, `validActions: GameAction[]`, `gameType: GameType`, `currentPlayerIndex: number`, `status: GameState['status']`, `players: PlayerPublicInfo[]`, `myPlayerId: string`
  - [x] 2.4 Define `PlayerPublicInfo` type: `{ id: string, username: string, cardCount: number, isActive: boolean }` — what each player can see about other players
  - [x] 2.5 Update `FilteredGameState` to equal `PlayerGameState` (keep as type alias)
  - [x] 2.6 Update schemas in `packages/shared/src/schemas/game.ts` to match new types
  - [x] 2.7 Update `packages/shared/src/index.ts` — export `PlayerPublicInfo`
  - [x] 2.8 Write tests: card schema, gameState schema, playerGameState schema validation in `packages/shared/src/schemas/game.test.ts`

- [x] Task 3: Create GameEngine interface (AC: #1, #5)
  - [x] 3.1 Create `packages/server/src/games/engine.ts` — define `GameEngine<TState extends GameState = GameState>` interface with 5 methods:
    - `getInitialState(players: Array<{ id: string; username: string }>): TState`
    - `getValidActions(state: TState, playerId: string): GameAction[]`
    - `applyAction(state: TState, action: GameAction): TState` (returns new state or throws on invalid action)
    - `isGameOver(state: TState): boolean`
    - `getWinner(state: TState): string | null` (returns player ID or null for draw/no winner)
  - [x] 3.2 Define `GameInstance` type: `{ roomId: string, gameType: GameType, state: GameState, engine: GameEngine, playerUsernames: Map<string, string> }`
  - [x] 3.3 Define `toFilteredGameState(instance: GameInstance, playerId: string): FilteredGameState` function signature as export — this is the per-player state filtering function the server uses before sending to clients
  - [x] 3.4 Add JSDoc comments on each method explaining contract and error behavior

- [x] Task 4: Create server game state management (AC: #6)
  - [x] 4.1 Create `packages/server/src/state/games.ts` — in-memory `Map<string, GameInstance>` (keyed by roomId)
  - [x] 4.2 Implement `createGame(roomId, gameType, engine, players): GameInstance` — creates game, stores in map, returns deep copy
  - [x] 4.3 Implement `getGame(roomId): GameInstance | null` — returns deep copy or null
  - [x] 4.4 Implement `updateGameState(roomId, newState): GameInstance | null` — updates game state, returns deep copy
  - [x] 4.5 Implement `removeGame(roomId): boolean` — removes game from map
  - [x] 4.6 Implement `clearGames(): void` — test helper
  - [x] 4.7 Follow deep-copy pattern from `rooms.ts` — all getters return copies, internal state never leaked
  - [x] 4.8 Write tests: `packages/server/src/state/games.test.ts` — createGame, getGame, updateGameState, removeGame, clearGames, deep-copy safety

- [x] Task 5: Verify all packages compile and tests pass (AC: #5)
  - [x] 5.1 TypeScript compilation: no errors across shared, server, and client packages
  - [x] 5.2 All existing server tests pass (131 tests — no regressions)
  - [x] 5.3 All new tests pass (shared schema tests + server games state tests)
  - [x] 5.4 Verify server can import GameEngine from `../games/engine.js`
  - [x] 5.5 Verify client can import Card, GameState, PlayerGameState, FilteredGameState from `@cardpal/shared`

## Dev Notes

### Architecture Compliance

**CRITICAL — Follow these patterns exactly:**

- **Existing game types in `packages/shared/src/types/game.ts`** — Story 1.1 scaffolded placeholder types with generic `string` for suit/rank. This story ENHANCES them with proper union types. Do NOT create a separate file — modify the existing `game.ts`.

- **Existing schemas in `packages/shared/src/schemas/game.ts`** — Already has `cardSchema`, `gameActionSchema`, `gameStateSchema`, `playerGameStateSchema` with `z.string()`. Update to use `z.enum()` for suit and rank.

- **Existing exports in `packages/shared/src/index.ts`** — Already exports `Card`, `GameAction`, `GameState`, `PlayerGameState`, `FilteredGameState`, `GameType`, and all game schemas. Add new type exports (`Suit`, `Rank`, `PlayerPublicInfo`) here.

- **`GameEngine` interface goes in SERVER package** (`packages/server/src/games/engine.ts`) — NOT in shared. The client never needs the engine interface — it only needs the output types (`FilteredGameState`). The engine is a server-side orchestration contract.

- **`GameInstance` type in `engine.ts`** — Combines runtime state with engine reference. The `engine` field holds the specific game implementation (Blackjack, Skip-Bo). This enables the server's game handlers to call `instance.engine.applyAction(instance.state, action)` without knowing which game is running.

- **`games.ts` state follows `rooms.ts` pattern** — In-memory Map, deep-copy on read, CRUD functions, `_addGameForTest` helper, `clearGames` for test cleanup. Import types from `./engine.js` (NOT from shared).

- **Deep-copy for game state is CRITICAL** — `GameState` will contain nested arrays (cards, hands). Use structured clone or manual deep copy: `JSON.parse(JSON.stringify(state))` for deep nested objects, or spread + map for known structures.

- **`GameType` enum already exists** — In `packages/shared/src/types/game.ts`. Already has `BLACKJACK = 'blackjack'` and `SKIPBO = 'skipbo'`. Do NOT modify.

- **Events already defined** — `packages/shared/src/types/events.ts` already has `startGame`, `gameAction`, and `gameState` events. Do NOT modify events.ts.

- **`FilteredGameState` already in Zustand store** — `packages/client/src/store/index.ts` line 21 has `gameState: FilteredGameState | null`. The type change from `PlayerGameState` alias to enhanced `PlayerGameState` is backward-compatible.

- **ESM `.js` import extensions** — All TypeScript imports must use `.js` extension: `import { GameEngine } from '../games/engine.js'`

- **Vitest for server tests** — `packages/server/vitest.config.ts` already configured. Test files use `*.test.ts` suffix.

- **No Zod in server game logic** — Zod schemas are for validating incoming socket messages. The game engine interface uses TypeScript types directly. Schemas exist in shared for contract validation at boundaries, not for internal state.

### Scope Boundary — Do NOT implement in Story 3-1

- Blackjack-specific rules or state (Story 3-3)
- `startGame` or `gameAction` socket handlers (Story 3-2)
- Card dealing, shuffling, or deck management (Story 3-3)
- `filterGameState.ts` utility implementation (Story 3-5) — only define the signature in `engine.ts`
- Room status transitions to 'playing' (Story 3-2)
- Game UI rendering (Story 3-5)
- Skip-Bo types or rules (Epic 5)

### Technical Stack — Relevant Versions

| Package | Version | Notes |
|---------|---------|-------|
| TypeScript | ~5.9.3 | Strict mode; ESM with `.js` import extensions |
| Zod | ^3.25.67 | Enum schemas: `z.enum(['hearts', 'diamonds', 'clubs', 'spades'])` |
| Vitest | ^4.0.18 | Server test runner |

### Previous Story Intelligence (2-4 learnings)

**From Story 2-4 (most recent):**

- **Client-side constants pattern** — `GAME_MAX_PLAYERS` and `GAME_TYPE_LABELS` are duplicated client-side because server constants can't be imported. For Story 3-1, game types live in shared — no duplication needed.
- **Deep-copy pattern** — `rooms.ts` uses `{ ...room, players: room.players.map((p) => ({ ...p })) }` for shallow nested copies. Game state will have deeper nesting (arrays of cards) — use `JSON.parse(JSON.stringify())` or structured clone for safety.
- **Code review improvements** — Batched `getState()` calls, accessibility attributes, double-click guards. Apply same quality bar to game state.

**From Story 2-3 code review:**

- **Input validation at state level** — `addPlayerToRoom` enforces capacity as defense-in-depth. Apply same pattern: `updateGameState` should validate basic invariants.
- **Test helper pattern** — `_addRoomForTest(room)` for direct map insertion. Create `_addGameForTest(game)` following same pattern.

### Git Intelligence

**Recent commits:**
- `3dae192` feat: Story 1.1 - Project scaffolding & shared types with code review fixes
- `e8b583a` Initial commit: project planning artifacts and BMAD workflow setup

**Uncommitted work** includes Stories 1.2-2.4 (all completed). Story 3-1 builds on this foundation.

**Commit format**: `feat: Story X.X - <description>`

### Project Structure Notes

**Files to create:**
```
packages/server/src/games/engine.ts              # NEW: GameEngine interface + GameInstance type
packages/server/src/state/games.ts               # NEW: Game state management (Map<roomId, GameInstance>)
packages/server/src/state/games.test.ts          # NEW: Game state tests
packages/shared/src/schemas/game.test.ts         # NEW: Schema validation tests
```

**Files to modify:**
```
packages/shared/src/types/game.ts                # UPDATE: Enhance Card, GameState, PlayerGameState types
packages/shared/src/schemas/game.ts              # UPDATE: Use z.enum() for suit/rank
packages/shared/src/index.ts                     # UPDATE: Export Suit, Rank, PlayerPublicInfo
```

**Files NOT to modify:**
```
packages/shared/src/types/events.ts              # Already has startGame, gameAction, gameState
packages/shared/src/types/errors.ts              # Already has INVALID_ACTION, NOT_AUTHORIZED
packages/client/src/store/index.ts               # Already has gameState: FilteredGameState | null
packages/server/src/socket/handlers/*            # No handler changes (Story 3-2)
packages/server/src/state/rooms.ts               # No room changes needed
```

### Testing Requirements

**New tests required:**

1. **Shared schema tests** (`packages/shared/src/schemas/game.test.ts`):
   - Card schema: valid card parses, invalid suit rejected, invalid rank rejected
   - GameState schema: valid state parses, invalid status rejected
   - GameAction schema: valid action parses, missing fields rejected
   - PlayerGameState schema: valid state parses

2. **Server game state tests** (`packages/server/src/state/games.test.ts`):
   - `createGame`: creates and stores game instance, returns deep copy
   - `getGame`: returns null for non-existent, returns deep copy for existing
   - `updateGameState`: updates state, returns deep copy, returns null for non-existent
   - `removeGame`: removes game, returns true; returns false for non-existent
   - `clearGames`: removes all games
   - Deep-copy safety: mutating returned objects doesn't affect internal state

**Vitest runner**: `pnpm --filter server test -- --run` and for shared: check if shared has vitest config, else run from root.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1: Game Engine Interface & Shared Types]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3: Game Engine & Blackjack]
- [Source: _bmad-output/planning-artifacts/architecture.md#Game Engine Interface]
- [Source: _bmad-output/planning-artifacts/architecture.md#Server Directory Structure — games/]
- [Source: _bmad-output/planning-artifacts/architecture.md#Shared Package Structure — types/game.ts]
- [Source: _bmad-output/planning-artifacts/architecture.md#Socket.io Event Architecture — gameState event]
- [Source: packages/shared/src/types/game.ts — existing Card, GameState, GameAction, PlayerGameState]
- [Source: packages/shared/src/schemas/game.ts — existing Zod schemas]
- [Source: packages/shared/src/index.ts — existing exports]
- [Source: packages/server/src/state/rooms.ts — deep-copy pattern reference]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Enhanced `Card` type with proper `Suit` and `Rank` union types (replacing generic `string`)
- Enhanced `GameState` with `gameType: GameType` field
- Redesigned `PlayerGameState` with full client-facing state: `gameType`, `currentPlayerIndex`, `status`, `players: PlayerPublicInfo[]`, `myPlayerId`, `hand`, `validActions`
- Added `PlayerPublicInfo` type for opponent visibility
- Updated all Zod schemas with `z.enum()` for suit/rank, added `playerPublicInfoSchema`, `suitSchema`, `rankSchema`
- Created `GameEngine<TState>` generic interface with 5 methods (getInitialState, getValidActions, applyAction, isGameOver, getWinner)
- Created `GameInstance` type combining runtime state + engine reference
- Defined `FilterGameStateFn` type signature for per-player state filtering
- Created `games.ts` state management following `rooms.ts` deep-copy pattern
- Added vitest to shared package for schema testing
- 20 shared schema tests + 16 server game state tests = 36 new tests
- 147 total server tests, 20 shared tests — all passing, zero regressions
- TypeScript clean across all 3 packages (shared, server, client)

### Change Log

- 2026-03-03: Story 3-1 implemented — Game engine interface, enhanced shared types, game state management
- 2026-03-03: Code review completed — 5 fixes applied: updateGameState deep-copies input, added input mutation safety test, extracted gameStatusSchema to eliminate duplication, removed unused GameAction imports from games.ts and games.test.ts, exported gameStatusSchema from index.ts

### File List

- packages/shared/src/types/game.ts (MODIFIED — Suit, Rank unions, enhanced Card/GameState/PlayerGameState, PlayerPublicInfo)
- packages/shared/src/schemas/game.ts (MODIFIED — z.enum() for suit/rank, new schemas)
- packages/shared/src/schemas/game.test.ts (NEW — 20 schema validation tests)
- packages/shared/src/index.ts (MODIFIED — export Suit, Rank, PlayerPublicInfo, new schemas)
- packages/shared/package.json (MODIFIED — added vitest dev dependency and test scripts)
- packages/shared/vitest.config.ts (NEW — vitest configuration)
- packages/server/src/games/engine.ts (NEW — GameEngine interface, GameInstance type, FilterGameStateFn)
- packages/server/src/state/games.ts (NEW — game state CRUD with deep-copy)
- packages/server/src/state/games.test.ts (NEW — 16 game state tests)
