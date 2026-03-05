# Story 3.2: Game Session Control

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **room owner**,
I want **to configure and start the game when everyone is ready**,
so that **we can begin playing with the right settings and player count**.

## Acceptance Criteria

1. **Given** a room owner in a room with "lobby" status **When** they view the room screen **Then** they can see the currently selected game type **And** they can change the game type via a dropdown/selector **And** the game type change is broadcast to all players in the room
2. **Given** a room with players **When** viewing the room screen **Then** the current player count is displayed (e.g., "3 players") **And** the required player count for the selected game is shown (e.g., "Blackjack: 2-4 players") **And** a visual indicator shows if the count is valid (green) or invalid (red)
3. **Given** the player count matches the game requirements **When** the room owner clicks "Start Game" **Then** the room status changes from "lobby" to "playing" **And** a new game instance is created using the GameEngine **And** all players receive the initial game state (filtered per-player) **And** the game screen is displayed for all players
4. **Given** the player count does NOT match game requirements **When** the room owner attempts to start the game **Then** the start is prevented **And** an error message is shown: "Need X-Y players for this game"
5. **Given** a game concludes (handled in Story 3.6) **When** the game is over **Then** the room status transitions from "playing" back to "lobby" **And** players return to the room screen _(Note: actual game-end trigger deferred to Story 3.6 — this story only implements the `endGame` utility function for the transition)_

## Tasks / Subtasks

- [x] Task 1: Add `changeGameType` event and min-player constants (AC: #1, #2)
  - [x] 1.1 Update `packages/shared/src/types/events.ts` — add `changeGameType: (data: { gameType: GameType }) => void` to `ClientToServerEvents`
  - [x] 1.2 Update `packages/shared/src/index.ts` — verify events re-export (already re-exports full interfaces)
  - [x] 1.3 Add `GAME_MIN_PLAYERS: Record<GameType, number>` to `packages/server/src/state/rooms.ts`: `{ BLACKJACK: 2, SKIPBO: 2 }`
  - [x] 1.4 Export `GAME_MIN_PLAYERS` alongside existing `GAME_MAX_PLAYERS`

- [x] Task 2: Add room state mutation functions (AC: #1, #3, #5)
  - [x] 2.1 Add `updateRoomGameType(roomId: string, gameType: GameType): Room | null` to `packages/server/src/state/rooms.ts` — validates room exists and is in 'lobby' status, updates gameType, returns deep copy
  - [x] 2.2 Add `setRoomStatus(roomId: string, status: 'lobby' | 'playing'): Room | null` to `packages/server/src/state/rooms.ts` — updates room status, returns deep copy
  - [x] 2.3 Write tests for new functions in `packages/server/src/state/rooms.test.ts` — updateRoomGameType (success, not found, playing room rejects), setRoomStatus (success, not found)

- [x] Task 3: Create game engine registry (AC: #3)
  - [x] 3.1 Add `gameEngines: Map<GameType, GameEngine>` registry to `packages/server/src/games/engine.ts`
  - [x] 3.2 Add `registerEngine(gameType: GameType, engine: GameEngine): void` export
  - [x] 3.3 Add `getEngine(gameType: GameType): GameEngine | null` export
  - [x] 3.4 Create stub engine for testing: `packages/server/src/games/stubEngine.ts` — implements `GameEngine` with minimal logic (creates basic state, returns empty actions, always returns false for isGameOver). This is ONLY for testing `startGame` flow before Story 3-3 implements the real Blackjack engine.

- [x] Task 4: Implement `filterGameState` utility (AC: #3)
  - [x] 4.1 Create `packages/server/src/utils/filterGameState.ts` — implements `FilterGameStateFn` from `engine.ts`. For now, constructs `FilteredGameState` from `GameInstance` for a given `playerId`: extracts `gameType`, `currentPlayerIndex`, `status`, maps players to `PlayerPublicInfo[]`, sets `myPlayerId`, `hand: []`, `validActions: []` (hand/actions populated by real engines in Story 3-3+)
  - [x] 4.2 Write tests: `packages/server/src/utils/filterGameState.test.ts`

- [x] Task 5: Create `gameHandlers.ts` with startGame and changeGameType (AC: #1, #2, #3, #4)
  - [x] 5.1 Create `packages/server/src/socket/handlers/gameHandlers.ts`
  - [x] 5.2 Implement `handleChangeGameType(socket, io, data: { gameType: GameType })`:
    - Auth guard: check `socket.data.session`, emit `AUTH_ERROR` if absent
    - Validate `gameType` with `gameTypeSchema.safeParse()`, emit `VALIDATION_ERROR` if invalid
    - Get room by `session.roomId`, emit error if not in a room
    - Check caller is room owner (`room.ownerId === session.token`), emit `NOT_AUTHORIZED` if not
    - Check room status is `'lobby'`, emit `GAME_IN_PROGRESS` if playing
    - Call `updateRoomGameType(roomId, gameType)`
    - Emit `roomState` to all in room via `io.to(roomId).emit('roomState', toRoomState(updatedRoom))`
    - Broadcast `lobbyState` to all via `broadcastLobbyState(io)`
  - [x] 5.3 Implement `handleStartGame(socket, io)`:
    - Auth guard: check `socket.data.session`, emit `AUTH_ERROR` if absent
    - Get room by `session.roomId`, emit error if not in a room
    - Check caller is room owner, emit `NOT_AUTHORIZED` if not
    - Check room status is `'lobby'`, emit `GAME_IN_PROGRESS` if already playing
    - Check player count: `room.players.length >= GAME_MIN_PLAYERS[room.gameType] && room.players.length <= GAME_MAX_PLAYERS[room.gameType]`, emit `VALIDATION_ERROR` with message `"Need ${min}-${max} players for ${gameType}"` if invalid
    - Get engine from registry: `getEngine(room.gameType)`, emit error `"Game engine not available for ${gameType}"` if null
    - Build players array: `room.players.map(p => ({ id: p.id, username: p.username }))`
    - Create game instance: `createGame(roomId, room.gameType, engine, players)`
    - Set room status: `setRoomStatus(roomId, 'playing')`
    - For each player in room: emit `gameState` with `filterGameState(gameInstance, playerId)` using `io.to(socketId).emit()`
    - Emit updated `roomState` to room
    - Broadcast `lobbyState` to all
  - [x] 5.4 Implement `handleEndGame(roomId: string, io: Server)` — utility function (not a socket handler, called programmatically from game logic in Story 3-6):
    - Remove game: `removeGame(roomId)`
    - Set room status: `setRoomStatus(roomId, 'lobby')`
    - Emit `roomState` to all in room
    - Broadcast `lobbyState` to all
    - Emit `gameState` with `null` to all in room (signals game ended — client transitions to room screen)
  - [x] 5.5 Export `registerGameHandlers(socket, io)` — registers `startGame` and `changeGameType` on socket
  - [x] 5.6 Export `handleEndGame` for use by future game completion logic (Story 3-6)

- [x] Task 6: Register gameHandlers in server entry point (AC: #3)
  - [x] 6.1 Update `packages/server/src/index.ts` — import and call `registerGameHandlers(socket, io)` inside `io.on('connection')` callback, after `registerLobbyHandlers`

- [x] Task 7: Add client socket listener for gameState (AC: #3)
  - [x] 7.1 Update `packages/client/src/App.tsx` — add `socket.on('gameState', (state) => { ... })` listener:
    - If `state !== null`: call `setGameState(state)` and `setScreen('game')`
    - If `state === null`: call `setGameState(null)` and `setScreen('room')` (game ended, return to room)
  - [x] 7.2 Ensure the `gameState` listener is cleaned up in the effect return

- [x] Task 8: Update RoomScreen UI for game type change and start game (AC: #1, #2, #3, #4)
  - [x] 8.1 Update `packages/client/src/components/screens/RoomScreen.tsx`:
    - Add game type dropdown/selector for the owner (only when `isOwner && room.status === 'lobby'`): `<select>` with `GameType` options. On change, emit `changeGameType` with `{ gameType: selectedType }`
    - Non-owners see the game type as read-only text (already shown)
  - [x] 8.2 Add player count requirements indicator:
    - Define local `GAME_MIN_PLAYERS` and `GAME_MAX_PLAYERS` constants matching server
    - Show "X/Y-Z players" (e.g., "2/2-4 players") with color: green if within range, red if outside
  - [x] 8.3 Enable "Start Game" button for owner:
    - Remove `disabled` and `title="Coming soon"` from the start button
    - Button enabled only when: `isOwner && playerCount >= minPlayers && playerCount <= maxPlayers`
    - On click: emit `startGame` via `socket.emit('startGame')`
    - Show disabled state with tooltip "Need X-Y players" when count is invalid
  - [x] 8.4 Add CSS for new elements in `packages/client/src/components/screens/RoomScreen.css`:
    - `.room-game-selector` for the game type dropdown
    - `.room-player-count-valid` / `.room-player-count-invalid` for green/red indicator
    - Update `.room-start-btn` enabled state styling

- [x] Task 9: Write server handler tests (AC: #1, #3, #4)
  - [x] 9.1 Create `packages/server/src/socket/handlers/gameHandlers.test.ts`
  - [x] 9.2 Test `handleChangeGameType`:
    - Success: owner changes game type, roomState emitted, lobbyState broadcast
    - Fail: non-owner gets NOT_AUTHORIZED
    - Fail: room in 'playing' status gets GAME_IN_PROGRESS
    - Fail: invalid gameType gets VALIDATION_ERROR
  - [x] 9.3 Test `handleStartGame`:
    - Success: creates game, sets room to playing, emits gameState to each player
    - Fail: non-owner gets NOT_AUTHORIZED
    - Fail: not enough players gets VALIDATION_ERROR with message
    - Fail: too many players gets VALIDATION_ERROR with message
    - Fail: room already playing gets GAME_IN_PROGRESS
    - Fail: no engine registered gets error
  - [x] 9.4 Test `handleEndGame`:
    - Success: removes game, sets room to lobby, emits null gameState

- [x] Task 10: Verify compilation and all tests pass (AC: all)
  - [x] 10.1 TypeScript compilation: no errors across shared, server, and client packages
  - [x] 10.2 All existing tests pass — no regressions
  - [x] 10.3 All new tests pass
  - [x] 10.4 Manual verification: shared types compile, server handler types match Socket.io types

## Dev Notes

### Architecture Compliance

**CRITICAL — Follow these patterns exactly:**

- **Existing event types in `packages/shared/src/types/events.ts`** — `startGame` is already defined as `startGame: () => void` (no payload). Add `changeGameType` as `changeGameType: (data: { gameType: GameType }) => void`. Do NOT rename or change the `startGame` signature.

- **Existing `gameState` event** — `gameState: (state: FilteredGameState) => void` is already defined in `ServerToClientEvents`. For the "game ended" signal, we'll send `null`. Update the type to `gameState: (state: FilteredGameState | null) => void` to support this.

- **Socket handler pattern** — Follow the exact pattern from `lobbyHandlers.ts`:
  ```typescript
  export function handleStartGame(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
    io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>
  ): void { ... }
  ```
  Import `Socket` and `Server` from `socket.io`, import `SocketData` from `../types.js`.

- **Auth guard pattern** — Every handler starts with:
  ```typescript
  const session = socket.data.session;
  if (!session) {
    socket.emit('error', { code: 'AUTH_ERROR', message: 'Not authenticated' });
    return;
  }
  ```

- **Room state broadcasting** — After any room mutation, follow this pattern:
  1. Emit `roomState` to all sockets in the room: `io.to(roomId).emit('roomState', toRoomState(updatedRoom))`
  2. Broadcast `lobbyState` to all: `broadcastLobbyState(io)` (import from `lobbyHandlers.js`)

- **`filterGameState` utility** — Create in `packages/server/src/utils/filterGameState.ts`. Signature matches `FilterGameStateFn` from `engine.ts`. For this story, create a basic implementation that constructs `PlayerGameState` from `GameInstance`:
  ```typescript
  export function filterGameState(instance: GameInstance, playerId: string): FilteredGameState {
    return {
      gameType: instance.state.gameType,
      currentPlayerIndex: instance.state.currentPlayerIndex,
      status: instance.state.status,
      players: instance.state.players.map((pid, idx) => ({
        id: pid,
        username: instance.playerUsernames.get(pid) ?? 'Unknown',
        cardCount: 0,
        isActive: idx === instance.state.currentPlayerIndex,
      })),
      myPlayerId: playerId,
      hand: [],
      validActions: [],
    };
  }
  ```
  Story 3-3+ will enhance this to include actual card data, hand values, and valid actions from the engine.

- **Game engine registry** — Add to `packages/server/src/games/engine.ts` at the bottom:
  ```typescript
  const gameEngines = new Map<GameType, GameEngine>();
  export function registerEngine(gameType: GameType, engine: GameEngine): void { ... }
  export function getEngine(gameType: GameType): GameEngine | null { ... }
  ```
  This lets Story 3-3 call `registerEngine(GameType.BLACKJACK, blackjackEngine)` without modifying gameHandlers.

- **Stub engine for testing** — Create `packages/server/src/games/stubEngine.ts` that implements `GameEngine` with minimal behavior. Only used in tests. NOT imported in production code.

- **Sending `gameState` per-player** — The server needs to emit filtered state individually per player. To find socket IDs, use `session.socketId` from `getSession(playerId)`. Pattern:
  ```typescript
  for (const player of room.players) {
    const playerSession = getSession(player.id);
    if (playerSession?.socketId) {
      io.to(playerSession.socketId).emit('gameState', filterGameState(gameInstance, player.id));
    }
  }
  ```
  Import `getSession` from `../../state/sessions.js`.

- **Room status transition** — `setRoomStatus` is a simple function: find room in map, update status, return deep copy. Pattern mirrors other room state functions.

- **Client `GAME_MIN_PLAYERS` / `GAME_MAX_PLAYERS`** — Duplicate as local constants in `RoomScreen.tsx` (same pattern as existing `GAME_MAX_PLAYERS` already defined there). Server constants can't be imported on client.

- **ESM `.js` import extensions** — All TypeScript imports must use `.js` extension: `import { registerGameHandlers } from './socket/handlers/gameHandlers.js'`

- **Vitest for server tests** — Follow the same mocking pattern from `lobbyHandlers.test.ts` and `authHandlers.test.ts` for the new `gameHandlers.test.ts`.

### Scope Boundary — Do NOT implement in Story 3-2

- Blackjack-specific rules, cards, or dealing (Story 3-3)
- Skip-Bo rules (Epic 5)
- Card visibility filtering with actual card data (Story 3-5)
- Game action processing (`gameAction` handler) (Story 3-4)
- Game end detection from game rules (Story 3-6)
- "Play Again" button (Story 3-6)
- Card animation (Epic 4)

### Technical Stack — Relevant Versions

| Package | Version | Notes |
|---------|---------|-------|
| TypeScript | ~5.9.3 | Strict mode; ESM with `.js` import extensions |
| Zod | ^3.25.67 | `gameTypeSchema` already exists for validation |
| Vitest | ^4.0.18 | Server test runner |
| Socket.io | ^4.x | Typed events via shared interfaces |
| React | 18.x | Functional components with hooks |
| Zustand | ^5.x | `setGameState` and `setScreen` actions available |

### Previous Story Intelligence (3-1 learnings)

**From Story 3-1:**
- Created `GameEngine` generic interface, `GameInstance` type, `FilterGameStateFn` type signature
- Created `games.ts` state with deep-copy pattern — `createGame`, `getGame`, `updateGameState`, `removeGame`
- `GameState.gameType` field added so client knows which game
- `PlayerPublicInfo` type created for opponent visibility
- Enhanced `PlayerGameState` with all client-facing fields
- 147 total server tests, 20 shared tests — ALL PASSING

**From Story 3-1 code review:**
- `updateGameState` deep-copies input before storing (not just output)
- `gameStatusSchema` extracted to avoid duplication
- Unused imports were flagged — be clean about imports

**From Story 2-4 (RoomScreen):**
- `RoomScreen.tsx` has disabled "Start Game" button with "Coming soon" title
- `GAME_MAX_PLAYERS` is duplicated client-side (server constants can't be imported)
- CSS classes for room elements already exist in `RoomScreen.css`
- `handleLeaveRoom` clears `currentRoom` and sets screen to `'lobby'`

### Git Intelligence

**Recent commits:**
- `3dae192` feat: Story 1.1 - Project scaffolding & shared types with code review fixes
- `e8b583a` Initial commit: project planning artifacts and BMAD workflow setup

**Uncommitted work** includes Stories 1.2-3.1 (all completed). Story 3-2 builds on this foundation.

**Commit format**: `feat: Story X.X - <description>`

### Project Structure Notes

**Files to create:**
```
packages/server/src/socket/handlers/gameHandlers.ts          # NEW: startGame, changeGameType handlers
packages/server/src/socket/handlers/gameHandlers.test.ts     # NEW: handler tests
packages/server/src/games/stubEngine.ts                      # NEW: stub engine for testing
packages/server/src/utils/filterGameState.ts                 # NEW: per-player state filtering
packages/server/src/utils/filterGameState.test.ts            # NEW: filter tests
```

**Files to modify:**
```
packages/shared/src/types/events.ts                          # ADD: changeGameType event, update gameState to allow null
packages/server/src/state/rooms.ts                           # ADD: GAME_MIN_PLAYERS, updateRoomGameType, setRoomStatus
packages/server/src/state/rooms.test.ts                      # ADD: tests for new functions
packages/server/src/games/engine.ts                          # ADD: game engine registry (registerEngine, getEngine)
packages/server/src/index.ts                                 # ADD: registerGameHandlers call
packages/client/src/App.tsx                                  # ADD: gameState socket listener
packages/client/src/components/screens/RoomScreen.tsx        # UPDATE: game type selector, start button, player count
packages/client/src/components/screens/RoomScreen.css        # ADD: new CSS classes
```

**Files NOT to modify:**
```
packages/shared/src/types/game.ts                            # No changes needed
packages/shared/src/schemas/game.ts                          # No schema changes needed
packages/server/src/state/games.ts                           # Already has all needed CRUD
packages/server/src/state/sessions.ts                        # Already has getSession
packages/server/src/socket/handlers/lobbyHandlers.ts         # No changes needed (broadcastLobbyState already exported)
packages/client/src/store/index.ts                           # Already has setGameState, setScreen, FilteredGameState
```

### Testing Requirements

**New tests required:**

1. **Room state tests** (`packages/server/src/state/rooms.test.ts` — add to existing):
   - `updateRoomGameType`: success returns updated room, returns null for non-existent, rejects when room is playing
   - `setRoomStatus`: success changes status, returns null for non-existent

2. **Game handler tests** (`packages/server/src/socket/handlers/gameHandlers.test.ts`):
   - `handleChangeGameType`: owner changes type successfully, non-owner rejected, playing room rejected, invalid type rejected
   - `handleStartGame`: success flow (game created, room status changed, gameState emitted per player), non-owner rejected, insufficient players rejected, too many players rejected, already playing rejected, no engine registered rejected
   - `handleEndGame`: success flow (game removed, room back to lobby, null gameState emitted)

3. **Filter game state tests** (`packages/server/src/utils/filterGameState.test.ts`):
   - Returns correct shape with proper playerId
   - Maps player usernames correctly
   - Sets isActive based on currentPlayerIndex

**Test count target**: ~15-20 new tests, zero regressions on existing 167 tests (147 server + 20 shared).

**Test runner**: `pnpm --filter server test -- --run` for server tests.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2: Game Session Control]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3: Game Engine & Blackjack]
- [Source: _bmad-output/planning-artifacts/architecture.md#Socket.io Event Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Server Directory Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Game Engine Boundary]
- [Source: _bmad-output/planning-artifacts/prd.md#Game Session Control FR17-23]
- [Source: packages/shared/src/types/events.ts — existing startGame and gameState events]
- [Source: packages/server/src/socket/handlers/lobbyHandlers.ts — handler pattern reference]
- [Source: packages/server/src/state/rooms.ts — room state and GAME_MAX_PLAYERS]
- [Source: packages/server/src/games/engine.ts — GameEngine interface and GameInstance type]
- [Source: packages/client/src/components/screens/RoomScreen.tsx — current disabled Start Game button]
- [Source: packages/client/src/store/index.ts — Zustand store with setGameState, setScreen]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Added `changeGameType` event to `ClientToServerEvents` and updated `gameState` to accept `FilteredGameState | null`
- Added `GAME_MIN_PLAYERS` constant to rooms.ts (Blackjack: 2, Skip-Bo: 2)
- Added `updateRoomGameType()` and `setRoomStatus()` functions to rooms.ts with deep-copy pattern
- Created game engine registry in engine.ts with `registerEngine()`, `getEngine()`, `clearEngines()`
- Created stub engine for testing (stubEngine.ts)
- Created `filterGameState` utility for per-player state filtering
- Created `gameHandlers.ts` with `handleChangeGameType`, `handleStartGame`, `handleEndGame`, and `registerGameHandlers`
- Registered `gameHandlers` in server entry point
- Added `gameState` socket listener in App.tsx (transitions to game/room screens)
- Updated RoomScreen with game type dropdown for owner, player count indicator (green/red), enabled Start Game button
- Added CSS for `.room-game-selector`, `.room-player-count-valid`, `.room-player-count-invalid`
- 28 new tests: 11 room state, 4 filterGameState, 13 gameHandlers
- 195 total tests (175 server + 20 shared) — all passing, zero regressions
- TypeScript clean across all 3 packages

### Change Log

- 2026-03-03: Story 3-2 implemented — Game session control (changeGameType, startGame, endGame handlers, RoomScreen UI, engine registry)
- 2026-03-04: Code review fixes — Fixed gameTypeSchema to z.nativeEnum (removed as GameType casts), improved mock server for per-player gameState verification, added missing too-many-players test, added not-in-room error path tests, added null guard in handleEndGame, removed dead createStubEngine code

### File List

- packages/shared/src/types/events.ts (MODIFIED — added changeGameType event, gameState accepts null)
- packages/server/src/state/rooms.ts (MODIFIED — added GAME_MIN_PLAYERS, updateRoomGameType, setRoomStatus)
- packages/server/src/state/rooms.test.ts (MODIFIED — added 11 tests for new functions)
- packages/server/src/games/engine.ts (MODIFIED — added game engine registry: registerEngine, getEngine, clearEngines)
- packages/server/src/games/stubEngine.ts (NEW — stub engine for testing)
- packages/server/src/utils/filterGameState.ts (NEW — per-player state filtering)
- packages/server/src/utils/filterGameState.test.ts (NEW — 4 filter tests)
- packages/server/src/socket/handlers/gameHandlers.ts (NEW — handleChangeGameType, handleStartGame, handleEndGame, registerGameHandlers)
- packages/server/src/socket/handlers/gameHandlers.test.ts (NEW — 13 handler tests)
- packages/server/src/index.ts (MODIFIED — added registerGameHandlers call)
- packages/client/src/App.tsx (MODIFIED — added gameState socket listener)
- packages/client/src/components/screens/RoomScreen.tsx (MODIFIED — game type selector, player count indicator, enabled start button)
- packages/client/src/components/screens/RoomScreen.css (MODIFIED — new CSS classes for selector and indicators)
