# Story 4.3: Disconnect Detection & Game Pause

Status: done

## Story

As a player,
I want the game to handle disconnections gracefully,
so that a brief network issue doesn't ruin the game.

## Acceptance Criteria

1. Given a player disconnects during a game, when it is their turn, then the game is paused and all players see a message: "[Player] disconnected - waiting for reconnection" and no other player can take actions
2. Given a player disconnects during a game, when it is NOT their turn, then the game continues normally and other players can take their turns and the disconnected player's status is shown but doesn't block play
3. Given a paused game waiting for a disconnected player, when viewing the game screen, then a clear indicator shows the game is paused and the reason (waiting for [Player]) is displayed
4. Given a paused game, when the disconnected player reconnects, then the game unpauses and all players are notified and play resumes normally

## Tasks / Subtasks

- [x] Task 1: Add `isPaused` and `pausedForPlayer` to shared game types (AC: #1, #3)
  - [x] 1.1 In `packages/shared/src/types/game.ts`, add `isPaused: boolean` and `pausedForPlayer: string | null` fields to the `PlayerGameState` interface (and by extension `FilteredGameState`)
  - [x] 1.2 Update `packages/shared/src/schemas/game.ts` if there are Zod schemas validating `PlayerGameState` — add the new fields

- [x] Task 2: Server — detect active-player disconnect and pause game (AC: #1, #2)
  - [x] 2.1 In `packages/server/src/index.ts` disconnect handler, after marking player disconnected, check if the room is `'playing'` AND the disconnected player is the current active player (i.e., `game.state.players[game.state.currentPlayerIndex] === session.token`); if so, set a pause flag on the game
  - [x] 2.2 In `packages/server/src/state/games.ts`, add `setPaused(roomId, isPaused, pausedForPlayer)` function that sets pause metadata on the game instance; store `isPaused: boolean` and `pausedForPlayerId: string | null` on the `GameInstance` interface
  - [x] 2.3 Write unit tests for `setPaused` in `packages/server/src/state/games.test.ts` (pause, unpause, nonexistent room)

- [x] Task 3: Server — block game actions when paused (AC: #1)
  - [x] 3.1 In `packages/server/src/socket/handlers/gameHandlers.ts` `handleGameAction`, add a check at the start: if `getGame(session.roomId)` returns an instance where `isPaused === true`, emit an error `{ code: 'GAME_PAUSED', message: 'Game is paused - waiting for player to reconnect' }` and return early
  - [x] 3.2 In `getValidActions` calls within `filterGameState`, when `isPaused` is true return empty `validActions` for ALL players (not just the disconnected one); update `filterGameState` to accept `isPaused` parameter
  - [x] 3.3 Write tests for handleGameAction rejecting actions when game is paused

- [x] Task 4: Server — include pause state in `filterGameState` output (AC: #3)
  - [x] 4.1 In `packages/server/src/utils/filterGameState.ts`, add optional `isPaused` and `pausedForPlayerId` parameters; populate `isPaused` and `pausedForPlayer` (resolve player ID to username) in the returned `FilteredGameState`
  - [x] 4.2 In `broadcastGameState` in `gameHandlers.ts`, pass the game instance's pause state to `filterGameState`
  - [x] 4.3 In `restoreRoomConnection` in `authHandlers.ts`, pass pause state when sending game state to reconnecting player
  - [x] 4.4 Update `filterGameState` tests for pause state propagation

- [x] Task 5: Server — unpause on reconnect (AC: #4)
  - [x] 5.1 In `packages/server/src/socket/handlers/authHandlers.ts` `restoreRoomConnection`, after marking player connected, check if the game was paused for this player; if so, call `setPaused(roomId, false, null)` and broadcast updated game state to all players
  - [x] 5.2 Write tests verifying unpause on reconnect

- [x] Task 6: Client — show pause indicator on GameScreen (AC: #3)
  - [x] 6.1 In `packages/client/src/components/screens/GameScreen.tsx`, when `gameState.isPaused` is true, render a pause overlay/banner showing "Game paused — waiting for [pausedForPlayer] to reconnect..." with a pulsing animation
  - [x] 6.2 In `packages/client/src/components/screens/GameScreen.css`, add `.game-paused-banner` styles: prominent banner at top of game area, background accent color, white text, pulse animation, `prefers-reduced-motion` support
  - [x] 6.3 When game is paused, disable Hit/Stand buttons (they should already be disabled since `validActions` will be empty, but add visual "Paused" state to button area for clarity)

- [x] Task 7: Run all tests and verify (AC: all)
  - [x] 7.1 Run full test suite — all existing + new tests pass (357 total: 322 server + 9 client + 26 shared)
  - [x] 7.2 Verify TypeScript compilation clean (`pnpm run build`)

## Dev Notes

### Architecture Compliance
- **FR40**: "System detects disconnections via WebSocket events" — already done in Story 4.2
- **FR41**: "Game pauses when active player disconnects" — this story's core focus
- **Server-authoritative**: Pause state tracked server-side. Client renders what server sends. Client cannot unpause — only server does on reconnect.
- **No new socket events needed**: Reuse existing `gameState` broadcast which now includes `isPaused` and `pausedForPlayer` fields
- **CSS-only styling**: Per architecture, vanilla CSS only. No animation libraries.

### Key Implementation Insights

**What Story 4.2 already implemented (DO NOT REDO):**
- `setPlayerConnected(roomId, playerToken, isConnected)` in `rooms.ts` — marks player disconnected/connected
- Disconnect handler in `index.ts` — marks player disconnected, broadcasts `roomState` and `gameState`
- `restoreRoomConnection` in `authHandlers.ts` — on reconnect: rejoins room, marks connected, broadcasts `roomState`, sends `gameState`
- `isConnected: boolean` on `PlayerPublicInfo` — already in shared types and `filterGameState`
- Connection status dots on `GameScreen` — already renders green/orange dots
- `ConnectionOverlay` component — shows "Reconnecting..." when own connection lost

**What this story adds:**
- Game pause logic: when the ACTIVE player (whose turn it is) disconnects, the game pauses
- Action blocking: no player can take game actions while paused
- Pause indicator on GameScreen: "[Player] disconnected - waiting for reconnection"
- Unpause on reconnect: when paused player reconnects, game resumes

**Game pause vs normal disconnect:**
The key distinction is whether the disconnected player is the CURRENT active player:
- `game.state.players[game.state.currentPlayerIndex] === disconnectedPlayerToken` → PAUSE
- Otherwise → game continues normally, disconnected player just shown as offline

**Pause metadata storage approach:**
Add `isPaused` and `pausedForPlayerId` to `GameInstance` (NOT to `GameState`). This keeps pause state separate from game engine state — the game engine doesn't need to know about connection issues. The pause is a transport-layer concern.

**`filterGameState` changes:**
When `isPaused` is true:
1. Return empty `validActions` for ALL players (nobody can act)
2. Include `isPaused: true` and `pausedForPlayer: username` in the response
3. The client uses these to show the pause indicator

**Unpause flow:**
1. Player reconnects → `restoreRoomConnection` runs
2. Check: was game paused for this player?
3. If yes: `setPaused(roomId, false, null)` then `broadcastGameState`
4. All players get updated state with `isPaused: false`, `validActions` restored

### Current File State (from Story 4.2)
- `packages/server/src/state/rooms.ts`: Has `setPlayerConnected()` — no changes needed
- `packages/server/src/index.ts`: Disconnect handler marks player disconnected, broadcasts roomState and gameState — needs pause logic added
- `packages/server/src/socket/handlers/authHandlers.ts`: `restoreRoomConnection` handles reconnect — needs unpause logic
- `packages/server/src/socket/handlers/gameHandlers.ts`: `handleGameAction` validates actions — needs pause check; `broadcastGameState` broadcasts game state — needs to pass pause info
- `packages/server/src/utils/filterGameState.ts`: Returns `FilteredGameState` — needs `isPaused`/`pausedForPlayer` fields
- `packages/server/src/state/games.ts`: `GameInstance` holds game state — needs `isPaused`/`pausedForPlayerId`
- `packages/client/src/components/screens/GameScreen.tsx`: Game UI — needs pause banner
- `packages/client/src/components/screens/GameScreen.css`: Game styles — needs pause banner styles
- 346 tests passing (311 server + 9 client + 26 shared)

### CSS Color Palette (established)
- Background: `#0a0e1a`
- Card area: `#16213e`
- Accent: `#e94560`
- Connected green: `#2ecc71`
- Warning/disconnect: `#e67e22` (orange)
- Text: `#eaeaea`
- Muted text: `#aaa`

### Project Structure Notes
- Modified files: `packages/shared/src/types/game.ts`, `packages/server/src/state/games.ts`, `packages/server/src/state/games.test.ts`, `packages/server/src/index.ts`, `packages/server/src/socket/handlers/gameHandlers.ts`, `packages/server/src/socket/handlers/gameHandlers.test.ts`, `packages/server/src/socket/handlers/authHandlers.ts`, `packages/server/src/socket/handlers/authHandlers.test.ts`, `packages/server/src/utils/filterGameState.ts`, `packages/server/src/utils/filterGameState.test.ts`, `packages/client/src/components/screens/GameScreen.tsx`, `packages/client/src/components/screens/GameScreen.css`
- No new files needed — all changes in existing files

### References
- [Source: _bmad-output/planning-artifacts/epics.md - Story 4.3 lines 788-819]
- [Source: _bmad-output/planning-artifacts/epics.md - Story 4.4 lines 822-864 (next story context)]
- [Source: _bmad-output/planning-artifacts/architecture.md - FR40, FR41]
- [Source: _bmad-output/implementation-artifacts/4-2-connection-status-display.md - Previous story patterns]
- [Source: packages/server/src/games/engine.ts - GameInstance interface]
- [Source: packages/server/src/state/games.ts - Game state management]

### Previous Story Intelligence (from 4-2)
- `setPlayerConnected` is in rooms.ts, not games.ts — connection status is a room-level concern
- `filterGameState` already accepts `connectionMap` optional parameter — follow same pattern for `isPaused`
- `broadcastGameState` in gameHandlers.ts already gets room data for connectionMap — add pause data similarly
- `restoreRoomConnection` in authHandlers.ts is the reconnection entry point — add unpause check here
- Code review added `broadcastGameState` call to disconnect handler — game state IS sent on disconnect already
- 346 tests passing (311 server + 9 client + 26 shared)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
No issues encountered.

### Completion Notes List
- Added `isPaused: boolean` and `pausedForPlayer: string | null` to `PlayerGameState` interface in shared types
- Updated Zod schemas (`playerPublicInfoSchema` with `isConnected`, `playerGameStateSchema` with `isPaused`/`pausedForPlayer`)
- Added `GAME_PAUSED` to `ErrorCode` union type
- Added `isPaused`/`pausedForPlayerId` to `GameInstance` interface and `deepCopyInstance`
- Added `setPaused(roomId, isPaused, pausedForPlayerId)` function to games state module with 4 unit tests
- Enhanced disconnect handler in `index.ts` to pause game when active player disconnects
- Added pause check to `handleGameAction` — rejects actions with `GAME_PAUSED` error when game is paused
- Added `PauseInfo` interface to `filterGameState` — returns empty `validActions` when paused, resolves player ID to username for `pausedForPlayer`
- Updated `broadcastGameState` to pass pause info to `filterGameState`
- Updated `restoreRoomConnection` to unpause game when paused player reconnects (calls `setPaused` then `broadcastGameState`)
- Added pause banner to `GameScreen` with pulse animation and `prefers-reduced-motion` support
- Added 11 new tests: 4 setPaused, 5 filterGameState pause, 1 handleGameAction pause rejection, 1 unpause on reconnect
- 357 tests passing (322 server + 9 client + 26 shared), TypeScript build clean

### Change Log
- 2026-03-04: Implemented Story 4.3 - Disconnect Detection & Game Pause (all 7 tasks completed)
- 2026-03-04: Code review fixes — broadcastGameState now reads fresh pause state from store to prevent stale existingInstance data, removed unnecessary PauseInfo export

### File List
- packages/shared/src/types/game.ts (modified - added isPaused, pausedForPlayer to PlayerGameState)
- packages/shared/src/types/errors.ts (modified - added GAME_PAUSED to ErrorCode)
- packages/shared/src/schemas/game.ts (modified - added isConnected to playerPublicInfoSchema, isPaused/pausedForPlayer to playerGameStateSchema)
- packages/shared/src/schemas/game.test.ts (modified - updated test data with new fields)
- packages/server/src/games/engine.ts (modified - added isPaused/pausedForPlayerId to GameInstance)
- packages/server/src/state/games.ts (modified - added setPaused function, isPaused/pausedForPlayerId init and deep copy)
- packages/server/src/state/games.test.ts (modified - added 4 setPaused tests, updated GameInstance test data)
- packages/server/src/index.ts (modified - added pause logic to disconnect handler)
- packages/server/src/socket/handlers/gameHandlers.ts (modified - added pause check in handleGameAction, pass pauseInfo in broadcastGameState)
- packages/server/src/socket/handlers/gameHandlers.test.ts (modified - added pause rejection test)
- packages/server/src/socket/handlers/authHandlers.ts (modified - added unpause logic in restoreRoomConnection)
- packages/server/src/socket/handlers/authHandlers.test.ts (modified - added unpause on reconnect test, updated GameInstance test data)
- packages/server/src/utils/filterGameState.ts (modified - added PauseInfo interface, isPaused/pausedForPlayer output, empty validActions when paused)
- packages/server/src/utils/filterGameState.test.ts (modified - added 5 pause state tests)
- packages/client/src/components/screens/GameScreen.tsx (modified - added pause banner, isPaused disables actions)
- packages/client/src/components/screens/GameScreen.css (modified - added pause banner styles with pulse animation)
- packages/client/src/utils/cardDiff.test.ts (modified - updated test data with isPaused/pausedForPlayer)
