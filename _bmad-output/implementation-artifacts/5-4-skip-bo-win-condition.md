# Story 5.4: Skip-Bo Win Condition

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **player**,
I want **the game to end when someone wins**,
so that **we have a clear winner and can play again**.

## Acceptance Criteria

1. **Given** a player plays the last card from their stock pile, **when** the stock pile becomes empty, **then** `isGameOver()` returns true **and** that player is declared the winner
2. **Given** the game ends, **when** determining results, **then** the winner is the player who emptied their stock pile **and** all other players lose **and** the results are sent to all players
3. **Given** results are displayed, **when** rendering the game end screen, **then** the winner is announced prominently **and** each player's remaining stock pile count is shown **and** "Play Again" and "Return to Lobby" options are available
4. **Given** the draw pile runs out, **when** players need to draw, **then** completed building piles (that reached 12) are reshuffled into the draw pile **and** play continues
5. **Given** the room owner clicks "Play Again", **when** a new Skip-Bo game starts, **then** a fresh game is initialized with the same players **and** stock piles are re-dealt

## Tasks / Subtasks

- [x] Task 1: Implement `isGameOver()` in Skip-Bo engine (AC: #1)
  - [x] 1.1: In `packages/server/src/games/skipbo/index.ts`, replace the stub `isGameOver()` to check if any player's `stockPile.length === 0`
  - [x] 1.2: Return `true` when any player has an empty stock pile

- [x] Task 2: Implement `getWinner()` in Skip-Bo engine (AC: #1, #2)
  - [x] 2.1: Replace stub `getWinner()` to find the player whose `stockPile.length === 0`
  - [x] 2.2: Return that player's `playerId`

- [x] Task 3: Implement `getResults()` in Skip-Bo engine (AC: #2, #3)
  - [x] 3.1: Replace stub `getResults()` to produce `PlayerResult[]`
  - [x] 3.2: Winner gets `result: 'win'`, all others get `result: 'lose'`
  - [x] 3.3: Set `handValue` to each player's remaining stock pile count (winner = 0, others = their count)
  - [x] 3.4: Use `playerUsernames` map to set correct usernames

- [x] Task 4: Trigger game end in `applyAction()` flow (AC: #1)
  - [x] 4.1: After `PLAY_FROM_STOCK` action removes a card from stock pile, check if stock pile is now empty
  - [x] 4.2: If empty, set `state.status = 'finished'` and populate `state.results` using `getResults()`
  - [x] 4.3: Also check after building pile completion triggers (a completed pile reshuffle might reveal the stock was the source)
  - [x] 4.4: Ensure `getValidActions()` returns empty array when `state.status === 'finished'`

- [x] Task 5: Handle draw pile exhaustion with reshuffle (AC: #4)
  - [x] 5.1: In the draw-card logic (when hand needs refilling), check if draw pile is empty
  - [x] 5.2: If empty, collect all completed building piles, shuffle them back into draw pile
  - [x] 5.3: Verify `handleCompletedPile()` already handles this — if so, ensure no edge case when draw pile is empty AND no completed building piles exist (stalemate)

- [x] Task 6: Verify client results display for Skip-Bo (AC: #3)
  - [x] 6.1: Verify SkipBoGameScreen results overlay shows stock pile counts correctly (currently shows `r.handValue` which will be stock count)
  - [x] 6.2: Update results overlay label from "Stock:" to "Remaining Stock:" for clarity if needed
  - [x] 6.3: Ensure winner is prominently announced (already shows result badges)

- [x] Task 7: Verify Play Again flow (AC: #5)
  - [x] 7.1: Verify existing "Play Again" button in SkipBoGameScreen triggers `game:start` which reinitializes the game
  - [x] 7.2: Verify `getInitialState()` properly resets all state (stock piles re-dealt, building piles cleared)

- [x] Task 8: Write tests (AC: all)
  - [x] 8.1: Test `isGameOver()` returns false when all players have stock pile cards
  - [x] 8.2: Test `isGameOver()` returns true when one player's stock pile is empty
  - [x] 8.3: Test `getWinner()` returns correct player ID when a player's stock is empty
  - [x] 8.4: Test `getWinner()` returns null when no player has empty stock
  - [x] 8.5: Test `getResults()` produces correct win/lose results with stock counts
  - [x] 8.6: Test that `applyAction` with PLAY_FROM_STOCK that empties stock sets status to 'finished'
  - [x] 8.7: Test that `getValidActions()` returns empty when game is finished
  - [x] 8.8: Test draw pile reshuffle when draw pile is exhausted (if applicable)

## Dev Notes

### Architecture Compliance

- **FR29**: "System detects game end conditions" — this story implements Skip-Bo game end detection
- **FR30**: "System determines and announces the winner when game concludes" — winner determination and results
- **FR32**: "System supports Skip-Bo with complete rule enforcement" — win condition completes the rule set
- **Server-authoritative (NFR7)**: All win detection happens server-side. Client only renders `results` from filtered game state.
- **NFR6**: No private data leaks — results only include stock pile counts (public information)

### Current Stub Implementations to Replace

In `packages/server/src/games/skipbo/index.ts` (lines ~237-245):
```typescript
isGameOver(_state: SkipBoGameState): boolean {
  // TODO: Story 5.4 will implement
  return false;
}

getWinner(_state: SkipBoGameState): string | null {
  // TODO: Story 5.4 will implement
  return null;
}

getResults(_state: SkipBoGameState, _playerUsernames: Map<string, string>): PlayerResult[] {
  // TODO: Story 5.4 will implement
  return [];
}
```

### Game End Trigger Point

The critical moment is in `applyAction()` when processing `PLAY_FROM_STOCK`:
```typescript
case 'PLAY_FROM_STOCK': {
  const ps = currentPlayer(state);
  const card = ps.stockPile.pop()!;  // After this pop, check if stockPile.length === 0
  // ... play card to building pile ...
  handleCompletedPile(state, payload.buildingPileIndex);
  revealStockTop(ps);
  break;
}
```

After the `PLAY_FROM_STOCK` case completes, check `isGameOver(state)` and if true, set `state.status = 'finished'` and compute results.

### Building Pile Completion & Reshuffle (Already Implemented)

`handleCompletedPile()` in `packages/server/src/games/skipbo/index.ts` already:
- Checks if pile has 12 cards (`isBuildingPileComplete`)
- Clears the pile, shuffles cards back into draw pile
- This handles AC #4 for reshuffle during play

The remaining concern is draw pile exhaustion when **drawing cards** (hand refill at turn start). Check `drawCards()` or equivalent — if draw pile runs empty during hand refill, need to reshuffle completed building piles first.

### Client Already Handles Results Display

`SkipBoGameScreen.tsx` already has:
- Results overlay (lines ~162-188) showing when `isFinished && results`
- Shows each player with result badge (WIN/LOSE/PUSH)
- Shows "Stock: {r.handValue}" — this will correctly show remaining stock count
- "Play Again" button (for owner) and "Return to Lobby" button
- These were implemented in Story 5.3

### PlayerResult Interface

```typescript
export interface PlayerResult {
  playerId: string;
  username: string;
  result: GameResult;  // 'win' | 'lose' | 'push'
  handValue: number;   // Will hold stock pile count for Skip-Bo
}
```

### Important: `getValidActions()` Guard

The existing `getValidActions()` should return empty array when `state.status === 'finished'`. Check if this guard already exists. If not, add it as the first check.

### Draw Pile Exhaustion Edge Case

When a player's turn starts, they draw up to 5 cards in hand. If the draw pile is empty at that point:
1. Check for any completed building piles to reshuffle
2. If still empty after reshuffle, the player plays with whatever cards they have
3. This is an extremely rare edge case but must be handled gracefully

### Files to Modify

- `packages/server/src/games/skipbo/index.ts` — implement `isGameOver()`, `getWinner()`, `getResults()`, add win check in `applyAction()`

### Files to Potentially Modify

- `packages/client/src/components/screens/SkipBoGameScreen.tsx` — minor label tweaks for results if needed

### Files NOT to Modify

- `packages/shared/src/types/game.ts` — types already support everything needed
- `packages/server/src/utils/filterGameState.ts` — already populates results when `status === 'finished'`
- `packages/server/src/socket/handlers/gameHandlers.ts` — already broadcasts state updates including results
- `packages/client/src/store/index.ts` — already handles game state updates
- Any Blackjack engine files

### Testing Standards

- Use Vitest (configured at `packages/server/vitest.config.ts`)
- Current test count: 489 tests passing — NO regressions allowed
- Test file: `packages/server/src/games/skipbo/index.test.ts` (create or extend existing)
- Follow existing test patterns from Skip-Bo engine tests

### Project Structure Notes

- All changes primarily in `packages/server/src/games/skipbo/`
- Minimal to no client changes expected (UI already handles results)
- Shared types already support the required interfaces

### Previous Story Intelligence

**From Story 5.3 (done):**
- SkipBoGameScreen fully implemented with results overlay
- 489 tests passing (420 server + 30 client + 39 shared)
- Results display shows stock pile counts via `r.handValue`
- Helper functions extracted to `skipBoHelpers.ts`
- Code review caught and fixed stale selection issue

**From Story 5.2 (done):**
- Skip-Bo engine fully implemented except win condition stubs
- All 4 action types working: PLAY_FROM_STOCK, PLAY_FROM_HAND, PLAY_FROM_DISCARD, DISCARD
- Deep copy pattern for state immutability
- `handleCompletedPile` already reshuffles completed building piles back to draw pile

**From Story 5.1 (done):**
- SkipBoCard type: `{ value: number, isWild: boolean, faceUp: boolean }`
- Stock pile: 30 cards (2-4 players), 20 cards (5+)
- 162-card deck: 12 each of 1-12 + 18 wilds
- 4 building piles (shared), 4 discard piles (per player)

### Git Intelligence

- 2 commits total, most work uncommitted
- All code follows TypeScript strict mode
- Monorepo with pnpm workspaces

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Game Engine Interface]
- [Source: _bmad-output/planning-artifacts/prd.md#FR29, FR30, FR32]
- [Source: _bmad-output/implementation-artifacts/5-3-skip-bo-ui-and-playfield-layout.md]
- [Source: _bmad-output/implementation-artifacts/5-2-skip-bo-turn-flow-and-actions.md]
- [Source: packages/server/src/games/skipbo/index.ts — stub implementations]
- [Source: packages/server/src/utils/filterGameState.ts — results filtering]
- [Source: packages/client/src/components/screens/SkipBoGameScreen.tsx — results overlay]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no issues.

### Completion Notes List

- Replaced `isGameOver()` stub: checks `playerStates.some(ps => ps.stockPile.length === 0)`
- Replaced `getWinner()` stub: finds player with empty stock pile, returns their playerId
- Replaced `getResults()` stub: produces `PlayerResult[]` with winner='win' (handValue=0), others='lose' (handValue=remaining stock count)
- Added win condition check in `applyAction()` after the switch statement: if `isGameOver(newState)` then `newState.status = 'finished'`
- `getValidActions()` already guarded by `state.status !== 'playing'` check (line 101) — no change needed
- Draw pile exhaustion handled by existing `handleCompletedPile()` (reshuffles completed piles inline) and `drawToFive()` (draws as many as available)
- Client results overlay already displays stock counts via `r.handValue`, winner badges, Play Again/Return to Lobby — no changes needed
- Play Again flow works via existing `handlePlayAgain` → `removeGame` + `createGame` with `getInitialState()`
- Added 10 new tests (replaced 3 stub tests), all 499 tests pass (430 server + 30 client + 39 shared)
- TypeScript compiles clean

**Code Review Fixes (2026-03-05):**
- H1: Added `status !== 'finished'` guard to `getResults()` — returns `[]` when game not finished (consistent with Blackjack pattern)
- M1: Added test for win via PLAY_FROM_STOCK that also completes a building pile (12th card from stock empties stock AND clears pile)
- M2: Added test for `getResults` with 3+ players (1 winner, 2 losers with different stock counts)
- M3: Updated client label from "Stock:" to "Remaining Stock:" for clarity
- Added `getResults` guard test (returns empty before game ends)
- Fixed existing `getResults` tests to set `status: 'finished'` for guard consistency
- All 502 tests pass (433 server + 30 client + 39 shared)

### Change Log

- 2026-03-05: Implemented story 5-4 Skip-Bo Win Condition
- 2026-03-05: Code review — fixed 4 issues (1 HIGH, 3 MEDIUM), 502 tests pass

### File List

Modified files:
- packages/server/src/games/skipbo/index.ts
- packages/server/src/games/skipbo/index.test.ts
- packages/client/src/components/screens/SkipBoGameScreen.tsx

## Senior Developer Review (AI)

**Review Date:** 2026-03-05
**Review Outcome:** Approve (after fixes)
**Issues Found:** 1 High, 3 Medium, 1 Low — all HIGH/MEDIUM fixed

### Action Items
- [x] H1: Add `status !== 'finished'` guard to `getResults()` (consistency with Blackjack)
- [x] M1: Add test for win when stock card also completes building pile
- [x] M2: Add test for `getResults` with 3+ players
- [x] M3: Update client label "Stock:" → "Remaining Stock:"
- [ ] L1: Win check runs after all action types (harmless, no fix needed)
