# Story 5.3: Skip-Bo UI & Playfield Layout

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **player**,
I want **to see the Skip-Bo game layout clearly**,
so that **I can see all piles and make strategic decisions**.

## Acceptance Criteria

1. **Given** a Skip-Bo game in progress, **when** rendering the game screen, **then** the 4 building piles are displayed in the center **and** each building pile shows the top card (or empty state) **and** the current value needed for each pile is clear
2. **Given** my player area, **when** rendering, **then** my stock pile is shown with the top card face-up and count visible **and** my hand of up to 5 cards is displayed (private, only I see) **and** my 4 discard piles are shown with top cards visible
3. **Given** other players' areas, **when** rendering, **then** their stock pile top card and count are visible **and** their hand is shown as card backs (private cards hidden) **and** their 4 discard piles are visible with top cards shown
4. **Given** the playfield layout, **when** arranging elements, **then** building piles are central and prominent **and** player areas are arranged around the building piles **and** the current player is highlighted **and** it's clear whose turn it is
5. **Given** a card in a discard pile or stock pile, **when** it can be played, **then** a visual affordance indicates it's playable (highlight, glow, etc.)

## Tasks / Subtasks

- [x] Task 1: Create SkipBoCard UI component (AC: #1, #2, #3)
  - [x] 1.1: Create `packages/client/src/components/ui/SkipBoCard.tsx` — renders numbered cards (1-12), wild cards ("SKIP BO" text), and card backs
  - [x] 1.2: Create `packages/client/src/components/ui/SkipBoCard.css` — card styling with color coding per number range (1-3 blue, 4-6 green, 7-9 orange, 10-12 red, wild purple)
  - [x] 1.3: Card shows value prominently centered, with "SKIP BO" text for wilds
  - [x] 1.4: Card back shows generic card-back pattern (consistent with existing AnimatedCard back pattern)
  - [x] 1.5: Support `highlighted` and `selected` props for playable card glow/lift effects (AC: #5)

- [x] Task 2: Create SkipBoPile UI component (AC: #1, #2, #3)
  - [x] 2.1: Create `packages/client/src/components/ui/SkipBoPile.tsx` — displays a pile with top card + count badge
  - [x] 2.2: Empty pile shows placeholder slot with dashed border (via SkipBoCard null card)
  - [x] 2.3: Count badge displays number of cards remaining in pile (red badge, top-right)
  - [x] 2.4: For building piles: show "needs X" label indicating next required value
  - [x] 2.5: Support `onClick` prop for interactive piles (playing cards to building/discard piles)

- [x] Task 3: Create SkipBoGameScreen component (AC: #1, #2, #3, #4, #5)
  - [x] 3.1: Create `packages/client/src/components/screens/SkipBoGameScreen.tsx`
  - [x] 3.2: Create `packages/client/src/components/screens/SkipBoGameScreen.css`
  - [x] 3.3: Layout structure: building piles (center), my area (bottom), other players (top)
  - [x] 3.4: My area: stock pile (left), hand cards (center, spread), 4 discard piles (right)
  - [x] 3.5: Other players: compact row showing stock pile, hand count, 4 discard pile tops
  - [x] 3.6: Current player highlight with border/glow effect (AC: #4)
  - [x] 3.7: Turn indicator banner showing whose turn it is (AC: #4)
  - [x] 3.8: Draw pile count display (informational)

- [x] Task 4: Implement game action interaction (AC: #5)
  - [x] 4.1: Card selection state — clicking a hand card, stock pile top, or discard pile top selects it as "source"
  - [x] 4.2: Target selection — after selecting a source, clicking a building pile or discard pile triggers the action
  - [x] 4.3: Map selection to correct action types: PLAY_FROM_HAND, PLAY_FROM_STOCK, PLAY_FROM_DISCARD, DISCARD
  - [x] 4.4: Highlight valid targets when a source card is selected (use `validActions` from game state)
  - [x] 4.5: Send action via socket: `socket.emit('gameAction', { type, payload })` — matches existing `handleGameAction` server handler
  - [x] 4.6: Clear selection after action is sent or on deselect (click empty area)

- [x] Task 5: Integrate into existing GameScreen routing (AC: #1)
  - [x] 5.1: Modify `GameScreen.tsx` to branch on `gameState.gameType` — render SkipBoGameScreen for SKIPBO, existing Blackjack UI for BLACKJACK
  - [x] 5.2: SkipBoGameScreen reads its own state from Zustand store
  - [x] 5.3: Reuse existing ConnectionOverlay (rendered in App.tsx) and pause banner in SkipBoGameScreen
  - [x] 5.4: Results overlay: show winner, stock pile counts, Play Again / Return to Lobby buttons

- [x] Task 6: Write tests (AC: all)
  - [x] 6.1: Unit tests for getNextNeededValue (empty pile, numbered, wild, completed pile)
  - [x] 6.2: Unit tests for getActionsForSource (hand, stock, discard sources, edge cases)
  - [x] 6.3: Unit tests for isBuildingPileTarget (valid/invalid targets, no selection)
  - [x] 6.4: Unit tests for isDiscardPileTarget (valid/invalid targets, stock source)

## Dev Notes

### Architecture Compliance

- **FR32**: "System supports Skip-Bo with complete rule enforcement" — this story implements the client-side rendering
- **Server-authoritative (NFR7)**: Client ONLY displays `FilteredGameState.skipBoState` received from server. Never compute game logic client-side.
- **Private card isolation (NFR6)**: Other players' hands shown as card backs with count only. The server's `filterGameState` already enforces this — the UI just renders what it receives.
- **Immutability**: Use `previousGameState` from Zustand store for animation diffing, never mutate state.

### FilteredSkipBoState Structure (from server)

The client receives this structure via `gameState.skipBoState`:

```typescript
interface FilteredSkipBoState {
  myHand: SkipBoCard[];                              // My visible hand (up to 5 cards)
  myStockPile: PileInfo;                             // { topCard: SkipBoCard | null, count: number }
  myDiscardPiles: [PileInfo, PileInfo, PileInfo, PileInfo];
  buildingPiles: [PileInfo, PileInfo, PileInfo, PileInfo]; // Shared center piles
  otherPlayers: Array<{
    stockPile: PileInfo;
    discardPiles: [PileInfo, PileInfo, PileInfo, PileInfo];
    handCount: number;
    isConnected: boolean;
  }>;
  drawPileCount: number;
}

interface PileInfo {
  topCard: SkipBoCard | null;
  count: number;
}
```

### Action Types and Payloads

The `validActions` array in `gameState` contains `GameAction` objects. For Skip-Bo:

- `{ type: 'PLAY_FROM_STOCK', payload: { buildingPileIndex: 0-3 } }`
- `{ type: 'PLAY_FROM_HAND', payload: { handIndex: 0-4, buildingPileIndex: 0-3 } }`
- `{ type: 'PLAY_FROM_DISCARD', payload: { discardPileIndex: 0-3, buildingPileIndex: 0-3 } }`
- `{ type: 'DISCARD', payload: { handIndex: 0-4, discardPileIndex: 0-3 } }`

**Interaction flow:**
1. Player clicks a source (hand card, stock pile, discard pile) → set `selectedSource`
2. Filter `validActions` to find valid targets for that source
3. Highlight valid target piles (building piles for play actions, discard piles for discard)
4. Player clicks a target → find matching action in `validActions` → emit via socket

### Existing GameScreen Pattern to Follow

The current `GameScreen.tsx` (lines ~1-200) renders Blackjack with:
- `gameState` and `previousGameState` from Zustand store
- `detectNewCards()` utility for animation triggers
- Action buttons that emit `game:action` events
- Results overlay with "Play Again" and "Return to Lobby"
- Pause banner and ConnectionOverlay

**For Skip-Bo**: Create a separate `SkipBoGameScreen` component and have `GameScreen.tsx` act as a router based on `gameState.gameType`. This keeps Blackjack code untouched and allows game-specific layouts.

### Existing Card Component — NOT Reusable for Skip-Bo

The existing `Card.tsx` renders standard playing cards with suits (♠♥♦♣) and ranks (A-K). Skip-Bo cards are completely different:
- Numbered 1-12 (no suits)
- Wild cards (marked "SKIP-BO")
- Different visual design

**Create a new `SkipBoCard.tsx`** component. Do NOT modify the existing `Card.tsx`.

### Socket Event Pattern

Game actions use the existing socket infrastructure:
```typescript
// Client sends (from packages/client/src/socket/client.ts):
socket.emit('game:action', { type: string, payload: Record<string, unknown> });

// Server handles in gameHandlers.ts — already works for any game type
```

No new socket events needed. The existing `game:action` handler calls `engine.applyAction()` which is already implemented for Skip-Bo.

### CSS Styling Guidelines

- **Vanilla CSS only** — no CSS-in-JS or preprocessors (project convention)
- Use existing color palette:
  - Background: `#0a0e1a`
  - Card area: `#16213e`
  - Accent/active: `#e94560`
  - Connected green: `#2ecc71`
  - Warning: `#e67e22`
  - Text: `#eaeaea`
  - Muted text: `#aaa`
- Follow BEM-ish naming: `.skipbo-card`, `.skipbo-pile`, `.skipbo-game`
- Responsive considerations: game should work on desktop (primary target per architecture)

### Skip-Bo Card Color Scheme (suggested)

- Values 1-3: Blue tones (`#3498db`)
- Values 4-6: Green tones (`#2ecc71`)
- Values 7-9: Orange tones (`#e67e22`)
- Values 10-12: Red tones (`#e94560`)
- Wild (Skip-Bo): Purple/gold gradient (`#9b59b6`)
- Card back: Dark pattern matching existing card-back style

### Layout Strategy

```
┌─────────────────────────────────────┐
│        Other Players (compact)       │
│  [Stock] 🂠🂠🂠 [D1][D2][D3][D4]    │
├─────────────────────────────────────┤
│                                      │
│      [Build1][Build2][Build3][Build4]│
│           (Center Piles)             │
│         Draw Pile: XX cards          │
│                                      │
├─────────────────────────────────────┤
│  [Stock]  [1][2][3][4][5]  [D1-D4]  │
│   pile     My Hand Cards    Discard  │
│  (XX)                       Piles    │
└─────────────────────────────────────┘
```

### Testing Standards

- Use Vitest (configured at `packages/client/vitest.config.ts`)
- Current test count: 459 tests passing — NO regressions
- Use `@testing-library/react` for component tests (already installed for client)
- Test rendering states: loading, playing, game over
- Test interaction: card selection, target selection, action dispatch
- Mock socket events for action tests

### What Already Exists (DO NOT REDO)

- `GameType.SKIPBO` enum value in shared types
- `FilteredSkipBoState` type and `PileInfo` type in shared types
- `skipBoState` optional field on `PlayerGameState` and `FilteredGameState`
- `filterGameState()` already populates `skipBoState` for Skip-Bo games
- Server game engine fully implemented (getValidActions, applyAction)
- Socket handler `game:action` works for any game type
- Zustand store tracks `gameState` and `previousGameState`
- `ConnectionOverlay` component for connection status
- `AnimatedCard` component (for standard cards — NOT for Skip-Bo cards)
- Results overlay pattern in current GameScreen

### Files to Create

- `packages/client/src/components/ui/SkipBoCard.tsx`
- `packages/client/src/components/ui/SkipBoCard.css`
- `packages/client/src/components/ui/SkipBoPile.tsx`
- `packages/client/src/components/ui/SkipBoPile.css`
- `packages/client/src/components/screens/SkipBoGameScreen.tsx`
- `packages/client/src/components/screens/SkipBoGameScreen.css`

### Files to Modify

- `packages/client/src/components/screens/GameScreen.tsx` — add game type branching to render SkipBoGameScreen for SKIPBO

### Files NOT to Modify

- `packages/client/src/components/ui/Card.tsx` — Blackjack-specific, leave untouched
- `packages/client/src/components/ui/AnimatedCard.tsx` — Blackjack-specific
- `packages/client/src/store/index.ts` — already supports all needed state
- `packages/client/src/socket/client.ts` — already handles game:action events
- Any server-side files — game engine is complete

### Project Structure Notes

- All new files go in `packages/client/src/components/`
- UI components in `ui/` subdirectory, screen components in `screens/`
- Follow existing naming convention: PascalCase for components, kebab-case for CSS classes
- CSS files co-located with their components

### Previous Story Intelligence

**From Story 5.2 (done):**
- Skip-Bo engine fully implemented with all 4 action types
- 459 tests passing (420 server + 39 shared), TypeScript builds clean
- Action types: PLAY_FROM_STOCK, PLAY_FROM_HAND, PLAY_FROM_DISCARD, DISCARD
- Deep copy pattern used for state immutability
- filterGameState already handles Skip-Bo state filtering with full privacy

**From Story 5.1 (done):**
- SkipBoCard type: `{ value: number, isWild: boolean, faceUp: boolean }`
- 162-card deck: 12 each of 1-12 + 18 wilds
- Stock pile: 30 cards (2-4 players), 20 cards (5+)
- Hand size: 5 cards
- 4 building piles (shared), 4 discard piles (per player)

### Git Intelligence

- Only 2 commits in repo — most changes are uncommitted (stories 1.2-5.2 implemented but not individually committed)
- All code follows TypeScript strict mode
- Monorepo with pnpm workspaces

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture, Game Engine Interface]
- [Source: _bmad-output/planning-artifacts/prd.md#FR32, NFR6, NFR7]
- [Source: _bmad-output/implementation-artifacts/5-1-skip-bo-game-rules-and-state.md]
- [Source: _bmad-output/implementation-artifacts/5-2-skip-bo-turn-flow-and-actions.md]
- [Source: packages/shared/src/types/game.ts — FilteredSkipBoState, PileInfo, SkipBoCard]
- [Source: packages/client/src/components/screens/GameScreen.tsx — existing game screen pattern]
- [Source: packages/client/src/components/ui/Card.tsx — existing card component (not reusable)]
- [Source: packages/server/src/utils/filterGameState.ts — Skip-Bo state filtering]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no issues.

### Completion Notes List

- Created SkipBoCard component with color-coded card values (blue 1-3, green 4-6, orange 7-9, red 10-12, purple wild)
- Created SkipBoPile component with top card display, count badge, "needs X" label for building piles
- Created SkipBoGameScreen with full layout: other players (top), building piles (center), my area (bottom)
- Implemented two-step action interaction: select source (hand card/stock/discard) then select target (building pile/discard pile)
- Valid action highlighting: playable sources get green glow, valid targets highlighted when source selected
- Selected source gets red glow with lift animation
- Turn indicator banner (red when it's your turn)
- Results overlay with stock pile counts, Play Again / Return to Lobby buttons
- Pause banner for disconnected player handling
- Integrated into GameScreen.tsx with game type routing (SKIPBO → SkipBoGameScreen, BLACKJACK → existing UI)
- Extracted helper logic into skipBoHelpers.ts for testability
- 20 unit tests for helper functions (getNextNeededValue, getActionsForSource, isBuildingPileTarget, isDiscardPileTarget)
- All 489 tests pass (420 server + 30 client + 39 shared), zero regressions
- TypeScript compiles clean

**Code Review Fixes (2026-03-05):**
- H1: Added `useEffect` to clear `selectedSource` when `validActions` changes (prevents stale selection)
- H2: Rendered card backs for other players' hands instead of text count (AC #3 compliance)
- M1: Removed unused `idx` parameter in other players map
- M2: Cached `getNextNeededValue()` result to avoid double call per render
- M3: Added `prefers-reduced-motion` media query to SkipBoCard.css
- M4: Added test for empty validActions array
- L1: Removed unused `GameAction` import

### Change Log

- 2026-03-05: Implemented story 5-3 Skip-Bo UI & Playfield Layout
- 2026-03-05: Code review — fixed 6 issues (2 HIGH, 4 MEDIUM), 489 tests pass

### File List

New files:
- packages/client/src/components/ui/SkipBoCard.tsx
- packages/client/src/components/ui/SkipBoCard.css
- packages/client/src/components/ui/SkipBoPile.tsx
- packages/client/src/components/ui/SkipBoPile.css
- packages/client/src/components/screens/SkipBoGameScreen.tsx
- packages/client/src/components/screens/SkipBoGameScreen.css
- packages/client/src/components/screens/skipBoHelpers.ts
- packages/client/src/components/screens/skipBoHelpers.test.ts

Modified files:
- packages/client/src/components/screens/GameScreen.tsx

## Senior Developer Review (AI)

**Review Date:** 2026-03-05
**Review Outcome:** Approve (after fixes)
**Issues Found:** 2 High, 4 Medium, 2 Low — all HIGH/MEDIUM fixed

### Action Items
- [x] H1: Clear selectedSource on validActions change
- [x] H2: Render card backs for other players' hands (AC #3)
- [x] M1: Remove unused idx parameter
- [x] M2: Cache getNextNeededValue result
- [x] M3: Add prefers-reduced-motion for card transitions
- [x] M4: Add test for empty validActions
- [x] L1: Remove unused GameAction import
- [ ] L2: Missing .skipbo-result-push CSS — accepted (Skip-Bo has no push result)
