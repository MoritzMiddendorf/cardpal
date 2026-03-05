# Story 3.6: Game End & Results

Status: done

## Story

As a player,
I want to see who won when the game ends,
so that the outcome is clear and we can play again.

## Acceptance Criteria

1. Given the dealer has completed their turn, when checking game end conditions, then `isGameOver()` returns true (already implemented in 3-4)
2. Given the game is over, when determining the winner:
   - Players who bust lose regardless of dealer
   - Players with higher hand value than dealer (without busting) win
   - Players with same value as dealer push (tie)
   - If dealer busts, all non-bust players win
3. Given the game has ended, when results are calculated, then each player's outcome is determined: "win", "lose", or "push" and the results are sent to all players
4. Given results are received by clients, when rendering the game end screen:
   - The winner(s) are announced prominently
   - Final hands and values are displayed for all players
   - The dealer's full hand is revealed
   - A "Return to Lobby" button is shown
   - A "Play Again" button is shown (room owner only)
5. Given the room owner clicks "Play Again", when a new game is requested, then the room remains in "playing" status and a fresh game is initialized with the same players
6. Given any player clicks "Return to Lobby", when leaving the game, then the room status changes to "lobby", all players return to the room screen, and the game instance is cleared from memory

## Tasks / Subtasks

- [x] Task 1: Add result types to shared types (AC: #2, #3)
  - [x] 1.1 Add `GameResult` type ('win' | 'lose' | 'push') to `packages/shared/src/types/game.ts`
  - [x] 1.2 Add `PlayerResult` interface { playerId: string; username: string; result: GameResult; handValue: number } to shared types
  - [x] 1.3 Add `results` field (PlayerResult[] | undefined) to `PlayerGameState` (FilteredGameState)
  - [x] 1.4 Add Zod schemas for GameResult, PlayerResult in `packages/shared/src/schemas/game.ts`
  - [x] 1.5 Export new types from `packages/shared/src/index.ts`

- [x] Task 2: Add socket events for play-again and return-to-lobby (AC: #5, #6)
  - [x] 2.1 Add `playAgain` event to `ClientToServerEvents` in `packages/shared/src/types/events.ts`
  - [x] 2.2 Add `returnToLobby` event to `ClientToServerEvents` in `packages/shared/src/types/events.ts`

- [x] Task 3: Implement per-player result calculation in blackjack engine (AC: #2, #3)
  - [x] 3.1 Add `getResults()` method to `GameEngine` interface in `packages/server/src/games/engine.ts` returning `PlayerResult[]`
  - [x] 3.2 Implement `getResults()` in `blackjackEngine` (`packages/server/src/games/blackjack/index.ts`) - compare each player hand to dealer, return win/lose/push per player
  - [x] 3.3 Update stub engine to implement `getResults()`
  - [x] 3.4 Write unit tests for getResults covering: player wins, player loses, push, player busts, dealer busts, multiple players with mixed results

- [x] Task 4: Include results in filtered game state (AC: #3, #4)
  - [x] 4.1 In `filterGameState.ts`, when game status is 'finished', call `engine.getResults()` and include `results` in the returned `PlayerGameState`
  - [x] 4.2 Update filterGameState tests for finished-state scenarios

- [x] Task 5: Implement play-again and return-to-lobby handlers (AC: #5, #6)
  - [x] 5.1 Add `handlePlayAgain` in `gameHandlers.ts` - validate caller is room owner, game is finished, then create new game with same players and broadcast
  - [x] 5.2 Add `handleReturnToLobby` in `gameHandlers.ts` - validate game is finished, call existing `handleEndGame()` to clean up and return all players to room
  - [x] 5.3 Register new event handlers in socket setup (`packages/server/src/index.ts`)
  - [x] 5.4 Write unit tests for both handlers

- [x] Task 6: Update GameScreen UI for game-end display (AC: #4, #5, #6)
  - [x] 6.1 When `gameState.status === 'finished'` and `gameState.results` exists, render results overlay/section showing each player's outcome (win/lose/push) with hand values
  - [x] 6.2 Show dealer's full revealed hand (already handled by filterGameState when dealerDone=true)
  - [x] 6.3 Add "Play Again" button (visible only if current user is room owner) that emits `playAgain` event
  - [x] 6.4 Add "Return to Lobby" button that emits `returnToLobby` event
  - [x] 6.5 Add socket emit functions to client store for playAgain and returnToLobby

- [x] Task 7: Run all tests and verify (AC: all)
  - [x] 7.1 Run full test suite - all existing + new tests pass (323 tests)
  - [x] 7.2 Verify TypeScript compilation clean

## Dev Notes

### Architecture Compliance
- **Server-authoritative**: All result calculation MUST happen server-side via `getResults()`. Client only displays what server sends.
- **Deep copy pattern**: All state mutations in `games.ts` use `structuredClone()`. Continue this pattern.
- **NFR6 compliance**: `filterGameState` already strips face-down cards; when status='finished' and dealerDone=true, all dealer cards are revealed (already working from 3-5).
- **Error handling**: Use `ErrorCode` enum from shared types for all error responses. Validate room ownership for play-again.

### Key Existing Code to Build On
- `blackjackEngine.getWinner()` already exists but returns only a single winner ID or null. Story 3-6 needs **per-player results** (win/lose/push for each player), so add `getResults()` alongside it.
- `handleEndGame(roomId, io)` in gameHandlers.ts already removes game + resets room to lobby + broadcasts. Reuse for return-to-lobby.
- `handleStartGame()` in gameHandlers.ts already creates a new game instance. Reuse similar logic for play-again (skip room status change since already 'playing').
- `filterGameState()` already handles BlackjackState casting and dealerDone reveal logic.

### Current getWinner() Implementation
The existing `getWinner()` in blackjack/index.ts:
- Finds non-bust players, compares to dealer
- Returns single winner ID or null
- This is **insufficient** for AC#2 - we need per-player results
- `getResults()` should return `PlayerResult[]` with individual win/lose/push per player

### Socket Event Flow
1. Game finishes (dealer plays) -> status = 'finished'
2. `broadcastGameState` sends filtered state with results to each player
3. Client receives gameState with status='finished' + results array
4. Client shows results UI with Play Again / Return to Lobby buttons
5a. Owner clicks "Play Again" -> `playAgain` event -> server creates new game -> broadcasts new gameState
5b. Player clicks "Return to Lobby" -> `returnToLobby` event -> server calls handleEndGame -> broadcasts roomState + gameState=null

### Project Structure Notes
- Shared types: `packages/shared/src/types/game.ts`
- Shared schemas: `packages/shared/src/schemas/game.ts`
- Events: `packages/shared/src/types/events.ts`
- Engine interface: `packages/server/src/games/engine.ts`
- Blackjack engine: `packages/server/src/games/blackjack/index.ts`
- Blackjack rules: `packages/server/src/games/blackjack/rules.ts`
- Blackjack types: `packages/server/src/games/blackjack/types.ts`
- Game handlers: `packages/server/src/socket/handlers/gameHandlers.ts`
- Filter: `packages/server/src/utils/filterGameState.ts`
- Client UI: `packages/client/src/components/screens/GameScreen.tsx`
- Client store: `packages/client/src/store/index.ts`
- App routing: `packages/client/src/App.tsx`
- Server socket setup: `packages/server/src/index.ts`

### References
- [Source: _bmad-output/planning-artifacts/epics.md - Story 3.6 lines 673-714]
- [Source: _bmad-output/planning-artifacts/architecture.md - Game Engine pattern]
- [Source: _bmad-output/planning-artifacts/prd.md - FR29, FR30, FR23]
- [Source: _bmad-output/implementation-artifacts/3-5-card-visibility-and-game-ui.md - Previous story learnings]

### Previous Story Intelligence (from 3-5)
- filterGameState test patterns established: create BlackjackState, verify PlayerGameState output
- Card component already renders face-up/face-down cards
- GameScreen uses `gameState.players` for player info and `gameState.otherPlayerHands` for hand display
- 307 tests passing at end of story 3-5

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
No issues encountered during implementation.

### Completion Notes List
- Added `GameResult` type and `PlayerResult` interface to shared types with Zod schemas
- Added `playAgain` and `returnToLobby` socket events to `ClientToServerEvents`
- Added `getResults()` method to `GameEngine` interface, implemented in blackjack engine and stub engine
- `getResults()` returns per-player win/lose/push based on hand comparison with dealer (bust players always lose, dealer bust means non-bust players win)
- `filterGameState` now includes `results` in the `PlayerGameState` when game status is 'finished'
- Added `handlePlayAgain` handler: validates owner + finished game, creates fresh game with same players, room stays in 'playing'
- Added `handleReturnToLobby` handler: validates finished game, delegates to `handleEndGame` to clean up
- Updated `GameScreen.tsx` with results overlay showing per-player outcomes, Play Again button (owner only), and Return to Lobby button
- Added CSS styles for results display with color-coded win/lose/push badges
- 7 new getResults tests, 8 new handler tests, 2 new filterGameState tests = 323 total tests passing
- TypeScript compilation clean across all packages

### Change Log
- 2026-03-04: Implemented Story 3.6 - Game End & Results (all 7 tasks completed)
- 2026-03-04: Code review fixes - 6 issues found (1 HIGH, 4 MEDIUM, 1 LOW), all fixed

## Senior Developer Review (AI)

**Review Date:** 2026-03-04
**Outcome:** Approved (after fixes)
**Issues Found:** 1 High, 4 Medium, 2 Low (6 fixed, 1 acknowledged)

### Action Items
- [x] [HIGH] Fix misplaced JSDoc on handlePlayAgain (was handleEndGame's doc)
- [x] [MED] Fix type ordering - GameResult/PlayerResult defined after usage
- [x] [MED] Remove IIFE pattern in GameScreen.tsx, extract myResult variable
- [x] [MED] Add dealer hand value to results overlay for AC#4 completeness
- [x] [MED] Add missing test coverage (handlePlayAgain not-in-room, room-not-found; handleReturnToLobby not-in-room)
- [x] [LOW] Add broadcastLobbyState to handlePlayAgain for consistency

### File List
- packages/shared/src/types/game.ts (modified - added GameResult, PlayerResult, results field)
- packages/shared/src/schemas/game.ts (modified - added gameResultSchema, playerResultSchema, results field)
- packages/shared/src/index.ts (modified - exported new types and schemas)
- packages/shared/src/types/events.ts (modified - added playAgain, returnToLobby events)
- packages/server/src/games/engine.ts (modified - added getResults to GameEngine interface)
- packages/server/src/games/blackjack/index.ts (modified - implemented getResults)
- packages/server/src/games/stubEngine.ts (modified - added getResults stub)
- packages/server/src/utils/filterGameState.ts (modified - include results when finished)
- packages/server/src/utils/filterGameState.test.ts (modified - added finished-state tests)
- packages/server/src/socket/handlers/gameHandlers.ts (modified - added handlePlayAgain, handleReturnToLobby, registered handlers)
- packages/server/src/socket/handlers/gameHandlers.test.ts (modified - added tests for new handlers)
- packages/server/src/games/blackjack/index.test.ts (modified - added getResults tests)
- packages/client/src/components/screens/GameScreen.tsx (modified - game-end results UI)
- packages/client/src/components/screens/GameScreen.css (modified - results styling)
