# Story 5.2: Skip-Bo Turn Flow & Actions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **player**,
I want **to take my turn with valid Skip-Bo actions**,
so that **I can strategically play cards and try to win**.

## Acceptance Criteria

1. **Given** a player's turn begins, **when** their hand has fewer than 5 cards, **then** they draw from the draw pile until they have 5 cards
2. **Given** a player's turn, **when** requesting valid actions, **then**:
   - they can play the top card of their stock pile to a valid building pile
   - they can play a card from their hand to a valid building pile
   - they can play the top card of any of their discard piles to a valid building pile
   - they can discard one card from their hand to one of their 4 discard piles (ends turn)
3. **Given** a player plays a card to a building pile, **when** the card is valid (next sequential number or Skip-Bo wild), **then** the card is moved to the building pile and the player can continue playing more cards and their turn does not end
4. **Given** a player discards a card, **when** they place it on one of their discard piles, **then** their turn ends and the next player's turn begins
5. **Given** a player attempts an invalid action, **when** the server validates the action, **then** it is rejected with "INVALID_ACTION" and the game state remains unchanged
6. **Given** a player plays all 5 cards from their hand without discarding, **when** their hand is empty, **then** they draw 5 new cards and they can continue playing

## Tasks / Subtasks

- [x] Task 1: Implement `getValidActions()` in Skip-Bo engine (AC: #2)
  - [x] 1.1: Generate PLAY_FROM_STOCK actions — check top card of stock pile against all 4 building piles using `canPlayOnBuildingPile()`
  - [x] 1.2: Generate PLAY_FROM_HAND actions — for each hand card, check against all 4 building piles
  - [x] 1.3: Generate PLAY_FROM_DISCARD actions — for each non-empty discard pile's top card, check against all 4 building piles
  - [x] 1.4: Generate DISCARD actions — for each hand card, allow placing on any of 4 discard piles (always valid if it's your turn)
- [x] Task 2: Implement `applyAction()` in Skip-Bo engine (AC: #1, #3, #4, #5, #6)
  - [x] 2.1: Deep copy state at entry (immutability)
  - [x] 2.2: Validate it's the player's turn and action is valid
  - [x] 2.3: Handle PLAY_FROM_STOCK — pop top card from stock pile, push to building pile; reveal new top card of stock pile
  - [x] 2.4: Handle PLAY_FROM_HAND — remove card at index from hand, push to building pile
  - [x] 2.5: Handle PLAY_FROM_DISCARD — pop top card from discard pile, push to building pile
  - [x] 2.6: Handle DISCARD — remove card at index from hand, push to discard pile; advance turn
  - [x] 2.7: After any building pile play: check `isBuildingPileComplete()` → clear pile and shuffle cards back into draw pile
  - [x] 2.8: After any hand card play: if hand is empty, draw 5 new cards from draw pile (AC: #6)
  - [x] 2.9: Turn start draw: when turn advances, draw cards for new player until they have 5 (AC: #1)
  - [x] 2.10: Handle draw pile exhaustion — if draw pile runs out during draw, draw as many as available
- [x] Task 3: Add helper functions to `rules.ts` as needed (AC: #1-#6)
  - [x] 3.1: `drawToFive(state, playerIndex)` — draw from draw pile until hand has 5, handle exhaustion
  - [x] 3.2: `advanceTurn(state)` — increment currentPlayerIndex (wrapping), draw for next player
- [x] Task 4: Write comprehensive tests (AC: #1-#6)
  - [x] 4.1: Tests for `getValidActions()` — all action types, edge cases (empty piles, wilds)
  - [x] 4.2: Tests for `applyAction()` — each action type, invalid actions, turn advancement
  - [x] 4.3: Tests for hand refill when all 5 cards played without discarding
  - [x] 4.4: Tests for building pile completion and reshuffle
  - [x] 4.5: Tests for draw pile exhaustion and reshuffle
  - [x] 4.6: Tests for turn-start draw mechanics

## Dev Notes

### Architecture Compliance

- **FR24/FR25/FR26/FR27/FR28/FR32**: Server enforces all rules, determines valid actions, prevents illegal moves, manages turn order
- **NFR6**: Private card isolation — already handled by `filterGameState` in `packages/server/src/utils/filterGameState.ts`
- **NFR7**: Server-authoritative — `handleGameAction` in `gameHandlers.ts` overrides `playerId` with server session token (line 164)
- **Immutability**: All engine methods MUST return new state objects. Use `JSON.parse(JSON.stringify(state))` for deep copy at entry of `applyAction()`

### Action Types (GameAction.type values)

Define these string constants for Skip-Bo actions:
- `PLAY_FROM_STOCK` — payload: `{ buildingPileIndex: number }`
- `PLAY_FROM_HAND` — payload: `{ handIndex: number, buildingPileIndex: number }`
- `PLAY_FROM_DISCARD` — payload: `{ discardPileIndex: number, buildingPileIndex: number }`
- `DISCARD` — payload: `{ handIndex: number, discardPileIndex: number }`

### Key Implementation Details

1. **Turn start draw**: When `applyAction()` advances the turn (after DISCARD), the new player's hand should be topped up to 5 cards. Also check at the very start of `getValidActions()` — if it's called and the current player has < 5 cards, this indicates the draw hasn't happened yet. **Best approach**: Do the draw inside `applyAction()` when advancing the turn, so the state always has the drawn cards when `getValidActions()` is called.

2. **Hand refill (AC #6)**: After PLAY_FROM_HAND or PLAY_FROM_STOCK (if stock card was also in hand concept — no, stock is separate), after any play that removes from hand: check if hand is empty → draw 5 new cards. This only applies after PLAY_FROM_HAND since that's the only action that removes from the hand (besides DISCARD which ends the turn).

3. **Building pile completion**: After adding a card to a building pile, check `isBuildingPileComplete()`. If complete: use `clearCompletedBuildingPile()` to get the cards back, shuffle them, add to draw pile, and replace the building pile with an empty array.

4. **Draw pile exhaustion**: If draw pile runs out during a draw: collect all completed building piles (should already be cleared in normal flow, but as a safety net), reshuffle them into the draw pile. Per Skip-Bo rules, if the draw pile runs out mid-draw the game should reshuffle completed building piles. In our implementation, completed piles are immediately cleared, so the draw pile might simply be empty with no completed piles to reclaim — in this extreme edge case, draw as many cards as possible.

5. **Stock pile top card visibility**: When a card is played from the stock pile, the new top card must be set to `faceUp: true`. The stock pile convention: top = last element of the array.

### Existing Code to Leverage

- `canPlayOnBuildingPile(pile, card)` — already in `rules.ts`, returns boolean
- `isBuildingPileComplete(pile)` — already in `rules.ts`, checks pile.length === 12
- `clearCompletedBuildingPile(pile)` — already in `rules.ts`, returns cards with faceUp: false
- `getEffectiveValue(card, targetValue)` — already in `rules.ts`
- `shuffleDeck(deck)` — already in `rules.ts`, Fisher-Yates shuffle
- `getInitialState()` — already in `index.ts`, shows how state is structured

### Files to Modify

- `packages/server/src/games/skipbo/index.ts` — Implement `getValidActions()` and `applyAction()`
- `packages/server/src/games/skipbo/rules.ts` — Add helper functions (drawCards, advanceTurn, etc.)

### Files to Create

- `packages/server/src/games/skipbo/actions.test.ts` — Tests for turn flow and actions (or extend existing `index.test.ts`)

### Files NOT to Modify

- `packages/shared/src/types/game.ts` — GameAction type is generic (`type: string`, `payload?: Record<string, unknown>`), no changes needed
- `packages/shared/src/schemas/game.ts` — gameActionSchema already handles string type + optional payload
- `packages/server/src/socket/handlers/gameHandlers.ts` — Already handles the engine flow correctly
- `packages/server/src/utils/filterGameState.ts` — Already has Skip-Bo filtering

### Testing Standards

- Use Vitest (already configured at `packages/server/vitest.config.ts`)
- 430 tests currently passing — NO regressions allowed
- Test each action type individually with valid and invalid scenarios
- Test edge cases: empty draw pile, complete building pile, empty hand refill, wild cards
- Test turn advancement with multiple players
- Test that invalid actions throw errors (caught by gameHandlers.ts)

### Project Structure Notes

- All Skip-Bo code lives in `packages/server/src/games/skipbo/`
- Convention: `index.ts` (engine), `rules.ts` (pure functions), `types.ts` (re-exports from shared)
- Existing test files: `rules.test.ts`, `index.test.ts` — add action tests to `index.test.ts` or create separate file
- TypeScript must compile clean (`pnpm build` or `tsc --noEmit`)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Game Engine Interface]
- [Source: _bmad-output/planning-artifacts/prd.md#FR24-FR28, FR32, NFR6, NFR7]
- [Source: _bmad-output/implementation-artifacts/5-1-skip-bo-game-rules-and-state.md#Dev Notes]
- [Source: packages/server/src/games/skipbo/index.ts — current stubs]
- [Source: packages/server/src/games/skipbo/rules.ts — existing helpers]
- [Source: packages/server/src/games/engine.ts — GameEngine interface]
- [Source: packages/server/src/socket/handlers/gameHandlers.ts — action flow]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Implemented `getValidActions()` with 4 action types: PLAY_FROM_STOCK, PLAY_FROM_HAND, PLAY_FROM_DISCARD, DISCARD
- Implemented `applyAction()` with full validation, state immutability (JSON deep copy), and all action handlers
- Turn advancement: DISCARD ends turn, advances to next player, draws cards to 5
- Hand refill (AC #6): when hand empties from PLAY_FROM_HAND, auto-draws 5 new cards
- Building pile completion: piles reaching 12 are cleared and reshuffled into draw pile
- Stock pile top card revealed after PLAY_FROM_STOCK
- Draw pile exhaustion handled gracefully (draws as many as available)
- Helper functions (`drawToFive`, `advanceTurn`, `handleCompletedPile`, `revealStockTop`, `cloneState`) kept as module-private functions in index.ts
- 58 tests in index.test.ts (up from 18), 30 tests in rules.test.ts — 88 Skip-Bo tests total
- All 459 tests pass (420 server + 39 shared), 0 regressions
- TypeScript compiles clean

**Code Review Fixes (2026-03-05):**
- H1: Removed dead code `getNextBuildingValue` from rules.ts
- M1: Fixed `as unknown as SkipBoPile` double assertion → `as SkipBoPile`
- M2: Added test for PLAY_FROM_DISCARD completing a building pile
- M3: Added test for wild card played from stock pile
- M4: Removed unused `SkipBoCard` import from index.ts

### File List

- packages/server/src/games/skipbo/index.ts (modified — implemented getValidActions, applyAction, added action constants and helpers)
- packages/server/src/games/skipbo/rules.ts (modified — no net additions after review cleanup)
- packages/server/src/games/skipbo/index.test.ts (modified — expanded from 18 to 58 tests covering all action types, edge cases)

## Senior Developer Review (AI)

**Review Date:** 2026-03-05
**Review Outcome:** Approve (after fixes)
**Issues Found:** 1 High, 4 Medium, 1 Low — all fixed

### Action Items
- [x] H1: Remove dead code `getNextBuildingValue` from rules.ts
- [x] M1: Fix `as unknown as SkipBoPile` double assertion
- [x] M2: Add missing test for PLAY_FROM_DISCARD completing building pile
- [x] M3: Add missing test for wild card from stock pile
- [x] M4: Remove unused `SkipBoCard` import
- [ ] L1: JSON.stringify for action comparison — accepted as-is (low risk, simple payloads)
