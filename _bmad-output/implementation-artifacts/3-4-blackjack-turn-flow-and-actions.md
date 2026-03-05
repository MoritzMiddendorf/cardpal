# Story 3.4: Blackjack Turn Flow & Actions

Status: done

## Story

As a **player**,
I want **to take my turn and see others take theirs in order**,
so that **the game flows correctly and I know when to act**.

## Acceptance Criteria

1. **Given** a player's turn **When** they choose "Hit" **Then** one card is dealt from the deck to their hand (face-up) **And** the new hand value is calculated **And** all players see the card dealt (public information) **And** if not bust, the player can act again
2. **Given** a player's turn **When** they choose "Stand" **Then** their turn ends **And** the next player becomes the current player **And** all players are notified of the turn change
3. **Given** a player is not the current player **When** they attempt to take an action **Then** the action is rejected **And** an error is returned: "Not your turn"
4. **Given** all players have completed their turns (stood or bust) **When** the last player finishes **Then** the dealer reveals their face-down card **And** the dealer draws cards according to standard rules (hit on 16 or less, stand on 17+) **And** all dealer actions are visible to all players
5. **Given** a game action results in game over (all players done + dealer done) **When** the state transitions to 'finished' **Then** the game end is detected **And** results are available via the game state _(Note: results display is Story 3-6 — this story only broadcasts the final state)_

## Tasks / Subtasks

- [x] Task 1: Add `handleGameAction` socket handler (AC: #1, #2, #3, #4, #5)
  - [x] 1.1 Add `handleGameAction(socket, io, action: GameAction)` to `packages/server/src/socket/handlers/gameHandlers.ts`:
    - Auth guard: check `socket.data.session`, emit `AUTH_ERROR` if absent
    - Validate player is in a room (`session.roomId`), emit error if not
    - Get game instance: `getGame(session.roomId)`, emit error if no active game
    - Validate action has `playerId` matching `session.token`
    - Try `engine.applyAction(instance.state, action)`:
      - On success: call `updateGameState(roomId, newState)`, broadcast filtered game state to all players
      - On error (thrown): emit `INVALID_ACTION` error to the requesting socket
    - After successful action: check `engine.isGameOver(newState)` — if true, call `handleEndGame(roomId, io)`
  - [x] 1.2 Register `gameAction` handler in `registerGameHandlers`: `socket.on('gameAction', (action) => handleGameAction(socket, io, action))`

- [x] Task 2: Implement broadcast helper for game state updates (AC: #1, #2, #4)
  - [x] 2.1 Extract per-player game state broadcasting into a reusable helper `broadcastGameState(roomId, io)` in `gameHandlers.ts`:
    - Get game instance from `getGame(roomId)`
    - Get room from `getRoomById(roomId)` for player list
    - For each player: get session, emit `filterGameState(instance, playerId)` to their socket
  - [x] 2.2 Refactor `handleStartGame` to use the new `broadcastGameState` helper (reduces duplication)

- [x] Task 3: Write handler tests (AC: #1, #2, #3, #4, #5)
  - [x] 3.1 Add `handleGameAction` tests to `packages/server/src/socket/handlers/gameHandlers.test.ts`:
    - Success: hit action — game state updated, gameState emitted to all players
    - Success: stand action — game state updated, gameState emitted to all players
    - Success: game over after action — handleEndGame called (room back to lobby, null gameState)
    - Fail: not authenticated → AUTH_ERROR
    - Fail: not in a room → error
    - Fail: no active game → error
    - Fail: wrong playerId → INVALID_ACTION (engine throws "Not your turn")
    - Fail: invalid action type → INVALID_ACTION (engine throws)

- [x] Task 4: Validate action with Zod schema (AC: #3)
  - [x] 4.1 Validate incoming `gameAction` payload with `gameActionSchema.safeParse()` before passing to engine
  - [x] 4.2 Emit `VALIDATION_ERROR` if schema validation fails (malformed action)
  - [x] 4.3 Override `action.playerId` with `session.token` to prevent spoofing (server-authoritative)

- [x] Task 5: Verify compilation and all tests pass (AC: all)
  - [x] 5.1 TypeScript compilation: no errors across shared, server, and client packages
  - [x] 5.2 All existing tests pass — no regressions
  - [x] 5.3 All new tests pass

## Dev Notes

### Architecture Compliance

**CRITICAL — Follow these patterns exactly:**

- **Socket handler pattern** — Follow the exact pattern from existing handlers in `gameHandlers.ts`:
  ```typescript
  export function handleGameAction(
    socket: AppSocket,
    io: AppServer,
    action: GameAction,
  ): void {
    const session = socket.data.session;
    if (!session) {
      socket.emit('error', { code: 'AUTH_ERROR', message: 'Not authenticated' });
      return;
    }
    // ... validation, engine call, broadcast
  }
  ```

- **Auth guard pattern** — Every handler starts with session check, then room check.

- **Server-authoritative playerId** — The client sends `gameAction` with `{ type, playerId, payload? }`. The server MUST override `action.playerId` with `session.token` to prevent clients from spoofing actions as another player. This is critical for NFR7 (server-authoritative game state).

- **Engine error handling** — `blackjackEngine.applyAction()` throws errors for invalid actions. Catch these and emit as `INVALID_ACTION` error:
  ```typescript
  try {
    const newState = instance.engine.applyAction(instance.state, action);
    updateGameState(roomId, newState);
    // broadcast...
  } catch (err) {
    socket.emit('error', {
      code: 'INVALID_ACTION',
      message: err instanceof Error ? err.message : 'Invalid action',
    });
    return;
  }
  ```

- **Game state broadcasting** — After each action, broadcast filtered state to ALL players in the room (not just the acting player). Use the same per-player pattern from `handleStartGame`:
  ```typescript
  function broadcastGameState(roomId: string, io: AppServer): void {
    const instance = getGame(roomId);
    const room = getRoomById(roomId);
    if (!instance || !room) return;
    for (const player of room.players) {
      const playerSession = getSessionByToken(player.id);
      if (playerSession?.socketId) {
        io.to(playerSession.socketId).emit('gameState', filterGameState(instance, player.id));
      }
    }
  }
  ```

- **Game over detection** — After updating state, check `engine.isGameOver(newState)`. If true, broadcast the final state FIRST (so clients see the finished state with dealer cards revealed), then call `handleEndGame(roomId, io)` which transitions room back to lobby.

  **IMPORTANT**: `handleEndGame` sends `null` gameState to signal game ended. But we want clients to see the final results first. So the sequence is:
  1. `updateGameState(roomId, newState)` — store the finished state
  2. `broadcastGameState(roomId, io)` — send final state with all cards/results
  3. Do NOT call `handleEndGame` immediately — let Story 3-6 handle the "return to lobby" transition when the user clicks "Play Again" or "Return to Lobby"

  Actually, re-reading the architecture: `handleEndGame` is meant to be called when the game concludes (Story 3-6). For Story 3-4, just broadcast the final 'finished' state. Story 3-6 will add the UI trigger for handleEndGame.

- **Zod validation** — Use `gameActionSchema` from `@cardpal/shared` to validate the incoming action payload. This catches malformed payloads before the engine.

- **`getGame` returns deep copy** — `games.ts` deep-copies on read. After `applyAction`, call `updateGameState(roomId, newState)` to store the new state. Then call `getGame(roomId)` again for broadcasting (or use the returned instance from `updateGameState`).

- **`updateGameState` returns a GameInstance** — Use this directly for broadcasting instead of calling `getGame` again.

- **ESM `.js` import extensions** — All imports must use `.js` extension.

- **Existing `gameAction` event** — Already defined in `ClientToServerEvents` as `gameAction: (action: GameAction) => void`. No shared type changes needed.

### Scope Boundary — Do NOT implement in Story 3-4

- Game screen UI / card rendering (Story 3-5)
- Game end results display / "Play Again" / "Return to Lobby" buttons (Story 3-6)
- Any client-side changes (no React component changes in this story)
- Connection resilience / disconnect handling during game (Epic 4)

### Technical Stack — Relevant Versions

| Package | Version | Notes |
|---------|---------|-------|
| TypeScript | ~5.9.3 | Strict mode; ESM with `.js` import extensions |
| Vitest | ^4.0.18 | Server test runner; use `describe`/`it`/`expect` |
| Zod | ^3.25.67 | `gameActionSchema` for payload validation |
| Socket.io | ^4.x | Typed events via shared interfaces |

### Previous Story Intelligence (3-3 learnings)

**From Story 3-3:**
- `blackjackEngine.applyAction()` returns new state (immutable — deep copies internally)
- `applyAction` throws errors for: wrong player ("Not your turn"), unknown action type, game already finished, player already done
- After last player stands/busts, dealer auto-plays (reveal, hit on ≤16, stand on 17+), sets `status='finished'` and `dealerDone=true`
- `isGameOver(state)` checks `state.status === 'finished'`
- `getWinner(state)` returns winner's playerId or null
- `filterGameState` already populates hand, validActions, and cardCount from BlackjackState
- 258 total server tests, 20 shared tests — all passing

**From Story 3-3 code review:**
- `dealCard` uses `deck.slice(1)` (optimized from spread+shift)
- `getWinner` simplified logic
- 3-player turn wrapping tested and working

**From Story 3-2:**
- `handleStartGame` pattern: per-player gameState broadcast via `getSessionByToken`
- `handleEndGame` utility: removes game, sets room to lobby, emits null gameState
- `registerGameHandlers` registers `changeGameType` and `startGame` — add `gameAction` here
- Mock pattern in `gameHandlers.test.ts`: mock socket, io, sessions, rooms, games modules

### Git Intelligence

**Recent commits:**
- `3dae192` feat: Story 1.1 - Project scaffolding & shared types with code review fixes
- `e8b583a` Initial commit: project planning artifacts and BMAD workflow setup

**Uncommitted work** includes Stories 1.2-3.3 (all completed).

### Project Structure Notes

**Files to modify:**
```
packages/server/src/socket/handlers/gameHandlers.ts      # ADD: handleGameAction, broadcastGameState, register gameAction
packages/server/src/socket/handlers/gameHandlers.test.ts  # ADD: handleGameAction tests
```

**Files NOT to modify:**
```
packages/shared/src/types/events.ts                       # gameAction already defined
packages/shared/src/types/game.ts                         # No type changes
packages/server/src/games/blackjack/                      # Engine already complete
packages/server/src/state/games.ts                        # CRUD already works (updateGameState exists)
packages/server/src/utils/filterGameState.ts              # Already handles blackjack
packages/server/src/index.ts                              # No changes (gameAction registered via registerGameHandlers)
packages/client/                                          # No client changes
```

### Testing Requirements

**New tests required in `packages/server/src/socket/handlers/gameHandlers.test.ts`:**

1. **handleGameAction — success paths:**
   - Hit action: calls applyAction, updates game state, emits gameState to all players
   - Stand action: calls applyAction, updates game state, emits gameState to all players
   - Game over after action: detects finished status (does NOT call handleEndGame yet — deferred to Story 3-6)

2. **handleGameAction — failure paths:**
   - Not authenticated: emits AUTH_ERROR
   - Not in a room: emits error
   - No active game: emits error
   - Invalid action payload (Zod fails): emits VALIDATION_ERROR
   - Engine throws (wrong player, invalid type): emits INVALID_ACTION with engine error message

3. **broadcastGameState helper:**
   - Emits filtered state to each player individually
   - Handles missing sessions gracefully

4. **handleStartGame refactor:**
   - Verify existing handleStartGame tests still pass after refactoring to use broadcastGameState

**Test count target**: ~10-15 new tests, zero regressions on existing 278 tests (258 server + 20 shared).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4: Blackjack Turn Flow & Actions]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3: Game Engine & Blackjack]
- [Source: _bmad-output/planning-artifacts/architecture.md#Socket.io Event Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling Patterns]
- [Source: packages/shared/src/types/events.ts — gameAction event already defined]
- [Source: packages/server/src/socket/handlers/gameHandlers.ts — existing handler patterns]
- [Source: packages/server/src/games/blackjack/index.ts — applyAction, isGameOver]
- [Source: packages/server/src/state/games.ts — getGame, updateGameState]
- [Source: packages/server/src/utils/filterGameState.ts — blackjack-aware filtering]
- [Source: _bmad-output/implementation-artifacts/3-3-blackjack-core-rules-and-state.md — previous story]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no debugging required.

### Completion Notes List

- Implemented `handleGameAction` handler with full auth guard, Zod validation, server-authoritative playerId override, engine action dispatch, and per-player game state broadcasting
- Extracted `broadcastGameState` helper and refactored `handleStartGame` to use it (reduced duplication)
- Registered `gameAction` socket event in `registerGameHandlers`
- Game over detection broadcasts final 'finished' state; does NOT call `handleEndGame` (deferred to Story 3-6 per Dev Notes)
- 12 new tests: 9 for handleGameAction (3 success + 6 failure paths including finished game), 3 for broadcastGameState, 1 updated registerGameHandlers test
- All 292 tests pass (272 server + 20 shared), zero regressions
- TypeScript compilation clean across all packages

**Code Review Fixes (2026-03-04):**
- M1: `broadcastGameState` now accepts optional pre-fetched `GameInstance` to avoid redundant deep copy; `handleGameAction` passes `updateGameState` return value
- M2/L3: Hit test now verifies card count increases from 2→3 (AC #1 validation)
- L1: Added test for game action on already-finished game ("Game is already finished")

### Change Log

- 2026-03-04: Implemented Story 3-4 — Blackjack Turn Flow & Actions
- 2026-03-04: Code review fixes — 2 MEDIUM + 2 LOW issues resolved

### File List

- packages/server/src/socket/handlers/gameHandlers.ts (modified)
- packages/server/src/socket/handlers/gameHandlers.test.ts (modified)
