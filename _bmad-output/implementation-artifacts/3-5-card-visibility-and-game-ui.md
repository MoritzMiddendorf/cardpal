# Story 3.5: Card Visibility & Game UI

Status: done

## Story

As a **player**,
I want **to see the cards clearly with proper visibility rules**,
so that **I can make informed decisions and the game is visually clear**.

## Acceptance Criteria

1. **Given** a Blackjack game in progress **When** rendering the game screen **Then** my cards are displayed in my hand area (all face-up, visible to me) **And** other players' cards are displayed in their areas (all face-up, public) **And** the dealer's cards show: first card face-up, second card face-down (until reveal)
2. **Given** a card is face-down **When** the server sends game state **Then** the card data is NOT included for non-owning players (NFR6 compliance) **And** the client renders a card back placeholder
3. **Given** the Blackjack playfield layout **When** rendering the game **Then** the dealer area is at the top **And** player areas are arranged below **And** each area shows: player name, cards, hand value (for face-up cards) **And** the current player is highlighted
4. **Given** cards in a hand (pile) **When** rendering **Then** cards are visually stacked/fanned so all are visible **And** the number of cards in the pile is clear
5. **Given** the filtered game state sent to a player **When** comparing to full server state **Then** only public cards and owned private cards are included **And** opponent face-down cards are represented as `{ faceUp: false }` with no suit/rank **And** dealer face-down cards are sent as `{ faceUp: false }` without suit/rank until dealer reveals
6. **Given** the game screen is active **When** a player clicks Hit or Stand **Then** the `gameAction` socket event is emitted with the correct action type **And** the UI updates when the server broadcasts new game state
7. **Given** the game status is 'finished' **When** rendering the game screen **Then** all dealer cards are shown face-up **And** each player's hand value is displayed **And** the action buttons are hidden _(Note: results display/return-to-lobby is Story 3-6)_

## Tasks / Subtasks

- [x] Task 1: Extend `FilteredGameState` with dealer and opponent card data (AC: #1, #2, #5)
  - [x] 1.1 Add to `packages/shared/src/types/game.ts`:
    - Add `dealerCards: Card[]` to `PlayerGameState` interface — dealer's cards with face-down cards stripped of suit/rank
    - Add `dealerHandValue: number | null` to `PlayerGameState` — null while dealer has face-down cards, number when all revealed
    - Add `otherPlayerHands: Array<{ playerId: string; cards: Card[] }>` to `PlayerGameState` — other players' face-up cards
    - Add `handValue: number` to `PlayerGameState` — the requesting player's calculated hand value
    - Add `isBust: boolean` to `PlayerPublicInfo` — whether the player has bust
    - Add `hasStood: boolean` to `PlayerPublicInfo` — whether the player has stood
  - [x] 1.2 Add matching Zod schema fields to `packages/shared/src/schemas/game.ts`:
    - Add `dealerCards` array to `playerGameStateSchema`
    - Add `dealerHandValue` nullable number to `playerGameStateSchema`
    - Add `otherPlayerHands` array to `playerGameStateSchema`
    - Add `handValue` number to `playerGameStateSchema`
    - Add `isBust` boolean to `playerPublicInfoSchema`
    - Add `hasStood` boolean to `playerPublicInfoSchema`
  - [x] 1.3 Update `packages/shared/src/schemas/game.test.ts` to validate new schema fields

- [x] Task 2: Update `filterGameState` to populate new fields (AC: #1, #2, #5)
  - [x] 2.1 In `packages/server/src/utils/filterGameState.ts`, update the blackjack branch:
    - Populate `dealerCards`: map dealer cards — face-up cards sent as-is, face-down cards sent as `{ suit: 'hearts', rank: '2', faceUp: false }` placeholder (strip real suit/rank) UNLESS `dealerDone === true` (then send all face-up)
    - Populate `dealerHandValue`: if `dealerDone`, calculate and send value; otherwise `null`
    - Populate `otherPlayerHands`: for each player OTHER than the requesting player, include their face-up cards only (in Blackjack, all player cards are face-up, so include all)
    - Populate `handValue`: calculate the requesting player's hand value using `calculateHandValue` from blackjack rules
    - Populate `isBust` and `hasStood` in each player's `PlayerPublicInfo`
  - [x] 2.2 Import `calculateHandValue` from `../../games/blackjack/rules.js` in filterGameState
  - [x] 2.3 Update `packages/server/src/utils/filterGameState.test.ts`:
    - Test: dealer cards face-down are stripped of suit/rank when `dealerDone: false`
    - Test: dealer cards all sent face-up when `dealerDone: true`
    - Test: dealerHandValue is null when dealer has face-down cards
    - Test: dealerHandValue is calculated when dealerDone
    - Test: otherPlayerHands includes all other players' cards
    - Test: handValue calculated correctly
    - Test: isBust and hasStood are passed through to PlayerPublicInfo

- [x] Task 3: Create `GameScreen` component and CSS (AC: #1, #3, #6, #7)
  - [x] 3.1 Create `packages/client/src/components/screens/GameScreen.tsx`:
    - Read `gameState` from Zustand store via `useAppStore`
    - If `gameState` is null, return null (shouldn't render)
    - Layout: dealer area at top, player areas below, action buttons at bottom
    - Dealer area: show dealer's cards (face-up or face-down placeholder), show hand value when dealerDone
    - Each player area: show player name, cards, hand value, bust/stood status, highlight if active
    - My hand area: show my cards, my hand value, action buttons (Hit/Stand) if I have valid actions
    - When status is 'finished': hide action buttons, show all values
    - Import and use `Card` component from Task 4
  - [x] 3.2 Create `packages/client/src/components/screens/GameScreen.css`:
    - Follow existing CSS patterns from RoomScreen.css (dark theme: `#0a0e1a` bg, `#16213e` cards, `#0f3460` borders)
    - Dealer area: centered at top with card row
    - Player areas: grid or flex layout below dealer
    - Active player highlight: border or glow effect using `#e94560`
    - My area: distinct styling (slightly larger or bordered)
    - Action buttons: follow `.room-start-btn` pattern for primary, `.room-leave-btn` for secondary
    - Bust indicator: red text/badge
    - Stood indicator: muted/grayed
  - [x] 3.3 Wire up `GameScreen` in `App.tsx`:
    - Import `GameScreen` component
    - Replace `{screen === 'game' && <p>Game Screen (Story 3.5)</p>}` with `{screen === 'game' && <GameScreen />}`

- [x] Task 4: Create `Card` UI component (AC: #1, #2, #4)
  - [x] 4.1 Create `packages/client/src/components/ui/Card.tsx`:
    - Props: `card: { suit, rank, faceUp }` (from shared Card type)
    - Face-up: display rank and suit symbol with suit color (red for hearts/diamonds, black for clubs/spades)
    - Face-down: display card back placeholder (solid color or pattern, no data)
    - Card size: ~80px wide, ~120px tall (CSS-rendered, no images)
    - Suit symbols: ♠ ♥ ♦ ♣
  - [x] 4.2 Create `packages/client/src/components/ui/Card.css`:
    - Card styling: rounded corners, border, white face / dark back
    - Suit colors: `.card-hearts, .card-diamonds { color: #e94560 }`, `.card-clubs, .card-spades { color: #1a1a2e }`
    - Face-down: dark pattern background (e.g., `#0f3460` with subtle pattern)
    - Stacked cards: negative margin-left (~-40px) so cards overlap but are visible

- [x] Task 5: Add `gameAction` emit helper to client (AC: #6)
  - [x] 5.1 In `GameScreen.tsx`, add handler functions:
    - `handleHit()`: `socket.emit('gameAction', { type: 'hit', playerId: myPlayerId })`
    - `handleStand()`: `socket.emit('gameAction', { type: 'stand', playerId: myPlayerId })`
    - Get `myPlayerId` from `gameState.myPlayerId`
  - [x] 5.2 Wire action buttons to handlers with disabled state when no valid actions

- [x] Task 6: Verify compilation and all tests pass (AC: all)
  - [x] 6.1 TypeScript compilation: no errors across shared, server, and client packages
  - [x] 6.2 All existing tests pass — no regressions
  - [x] 6.3 All new tests pass (shared schema tests + filterGameState tests)

## Dev Notes

### Architecture Compliance

**CRITICAL — Follow these patterns exactly:**

- **FilteredGameState is the ONLY data sent to clients** — Never expose raw `BlackjackState` or `deck`. The server filters before sending. All new fields must be added to the shared `PlayerGameState` type and the `filterGameState` utility.

- **Card privacy model (NFR6)** — Face-down cards MUST be stripped of suit/rank before sending. Send `{ suit: 'hearts', rank: '2', faceUp: false }` as a dummy placeholder — the client only checks `faceUp` to render a card back. The actual suit/rank values don't matter for face-down cards, but the fields must be present for type compatibility.

- **`calculateHandValue` exists in blackjack rules** — Import from `../../games/blackjack/rules.js`. It handles aces (1 or 11) correctly. Do NOT reimplement hand value calculation on the client — use the server-calculated `handValue` field.

- **CSS class naming** — All screen components use BEM-like flat naming with component prefix: `game-screen`, `game-dealer-area`, `game-player-area`, `game-card`, etc. Follow the pattern in `RoomScreen.css`.

- **Zustand store** — `gameState` is already in the store as `FilteredGameState | null`. The `onGameState` handler in `App.tsx` already sets the game screen when state is received. No store changes needed.

- **Socket.io client** — Import `socket` from `../../socket/client.js`. Use `socket.emit('gameAction', action)` to send actions. The `gameAction` event is already defined in `ClientToServerEvents`.

- **ESM `.js` import extensions** — ALL imports must use `.js` extension in both client and server packages.

- **React patterns** — Use function components. Use `useAppStore` selector pattern: `const gameState = useAppStore((s) => s.gameState)`. No class components.

### Scope Boundary — Do NOT implement in Story 3-5

- Game end results display / "Play Again" / "Return to Lobby" buttons (Story 3-6)
- Card movement animations (Story 4-1)
- Connection status display (Story 4-2)
- Any server-side game logic changes (engine is complete from Story 3-3/3-4)

### Technical Stack — Relevant Versions

| Package | Version | Notes |
|---------|---------|-------|
| TypeScript | ~5.9.3 | Strict mode; ESM with `.js` import extensions |
| React | ^19.1.0 | Function components only; hooks |
| Zustand | ^5.0.5 | State management — `useAppStore` pattern |
| Vite | ^6.4.1 | Build tool for client |
| Vitest | ^4.0.18 | Server test runner; use `describe`/`it`/`expect` |
| Socket.io-client | ^4.x | Client-side socket (already configured) |
| Zod | ^3.25.67 | Schema validation for shared types |

### Previous Story Intelligence (3-4 learnings)

**From Story 3-4:**
- `handleGameAction` handler implemented with full validation pipeline
- `broadcastGameState` helper extracts per-player broadcasting (accepts optional pre-fetched `GameInstance`)
- Server overrides `playerId` with `session.token` — client can send any playerId, server ignores it
- Game over detection broadcasts final 'finished' state; `handleEndGame` is NOT called (deferred to Story 3-6)
- 292 total tests (272 server + 20 shared) — all passing
- TypeScript compilation clean

**From Story 3-4 code review:**
- `broadcastGameState` signature: `(roomId, io, existingInstance?)` — optional instance to avoid extra deep copy
- Hit test verifies card count increases from 2→3
- Finished game action test verifies "Game is already finished" error

**From Story 3-3:**
- `calculateHandValue(cards: Card[]): number` — available in `blackjack/rules.ts`, handles aces correctly
- `isBust(cards: Card[]): boolean` — checks if hand value > 21
- All blackjack engine methods are immutable (deep copy internally)

### Existing `FilteredGameState` Structure (CURRENT — to be extended)

```typescript
// packages/shared/src/types/game.ts
interface PlayerGameState {
  gameType: GameType;
  currentPlayerIndex: number;
  status: 'waiting' | 'playing' | 'finished';
  players: PlayerPublicInfo[];    // id, username, cardCount, isActive
  myPlayerId: string;
  hand: Card[];                    // MY cards only
  validActions: GameAction[];      // Actions I can take
}
```

**Fields to ADD:**
```typescript
  dealerCards: Card[];             // Dealer's visible cards (face-down stripped)
  dealerHandValue: number | null;  // null until dealer reveals
  otherPlayerHands: Array<{ playerId: string; cards: Card[] }>;  // Other players' cards
  handValue: number;               // My calculated hand value
```

**PlayerPublicInfo fields to ADD:**
```typescript
  isBust: boolean;
  hasStood: boolean;
```

### `filterGameState` Current Implementation

The function in `packages/server/src/utils/filterGameState.ts` already:
- Detects blackjack game type via `'playerHands' in state`
- Extracts requesting player's hand
- Gets valid actions from engine
- Builds card counts per player

**What needs to change:**
- Add dealer card filtering (strip face-down card data unless dealerDone)
- Add other players' hands
- Calculate and include hand value
- Add isBust/hasStood to player public info
- Import `calculateHandValue` from blackjack rules

### App.tsx Screen Routing (CURRENT)

```tsx
{screen === 'game' && <p>Game Screen (Story 3.5)</p>}
```

Replace with:
```tsx
{screen === 'game' && <GameScreen />}
```

The `onGameState` handler already: sets `gameState` in store, sets screen to 'game' when state received, sets screen to 'room' and clears state when null received.

### Git Intelligence

**Recent commits:**
- `3dae192` feat: Story 1.1 - Project scaffolding & shared types with code review fixes
- `e8b583a` Initial commit: project planning artifacts and BMAD workflow setup

**Uncommitted work** includes Stories 1.2-3.4 (all completed).

### Project Structure Notes

**Files to CREATE:**
```
packages/client/src/components/screens/GameScreen.tsx    # Main game UI
packages/client/src/components/screens/GameScreen.css    # Game screen styling
packages/client/src/components/ui/Card.tsx               # Card component
packages/client/src/components/ui/Card.css               # Card styling
```

**Files to MODIFY:**
```
packages/shared/src/types/game.ts                        # Add dealerCards, otherPlayerHands, handValue, etc.
packages/shared/src/schemas/game.ts                      # Add matching Zod fields
packages/shared/src/schemas/game.test.ts                 # Add schema validation tests
packages/server/src/utils/filterGameState.ts             # Populate new fields
packages/server/src/utils/filterGameState.test.ts        # Test new field population
packages/client/src/App.tsx                              # Wire GameScreen component
```

**Files NOT to modify:**
```
packages/server/src/games/blackjack/                     # Engine is complete
packages/server/src/socket/handlers/gameHandlers.ts      # Handler is complete
packages/server/src/state/                               # State management is complete
packages/server/src/index.ts                             # No changes needed
```

### Testing Requirements

**Shared package tests (`packages/shared/src/schemas/game.test.ts`):**
- Validate `playerGameStateSchema` accepts new fields (dealerCards, dealerHandValue, otherPlayerHands, handValue)
- Validate `playerPublicInfoSchema` accepts new fields (isBust, hasStood)

**Server tests (`packages/server/src/utils/filterGameState.test.ts`):**
1. Dealer cards face-down are stripped when `dealerDone: false`
2. Dealer cards all face-up when `dealerDone: true`
3. `dealerHandValue` is null when dealer not done
4. `dealerHandValue` is calculated when dealer done
5. `otherPlayerHands` includes all other players' cards
6. `handValue` is calculated correctly for requesting player
7. `isBust` and `hasStood` passed through to PlayerPublicInfo

**Test count target**: ~7-10 new tests, zero regressions on existing 292 tests.

**Note**: No client-side tests required for this story (React component tests are not configured in this project). The game screen correctness is verified through manual testing and server-side filter tests.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.5: Card Visibility & Game UI]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3: Game Engine & Blackjack]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Socket.io Event Architecture]
- [Source: _bmad-output/planning-artifacts/prd.md#FR33-FR36 Card Visibility]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR6 Private card data isolation]
- [Source: packages/shared/src/types/game.ts — FilteredGameState/PlayerGameState]
- [Source: packages/server/src/utils/filterGameState.ts — current filtering logic]
- [Source: packages/server/src/games/blackjack/rules.ts — calculateHandValue]
- [Source: packages/client/src/App.tsx — screen routing and gameState handler]
- [Source: packages/client/src/store/index.ts — Zustand store with gameState]
- [Source: packages/client/src/components/screens/RoomScreen.tsx — existing screen pattern]
- [Source: packages/client/src/components/screens/RoomScreen.css — CSS naming pattern]
- [Source: _bmad-output/implementation-artifacts/3-4-blackjack-turn-flow-and-actions.md — previous story]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation.

### Completion Notes List

- Extended `PlayerGameState` with `dealerCards`, `dealerHandValue`, `otherPlayerHands`, `handValue` fields
- Extended `PlayerPublicInfo` with `isBust`, `hasStood` fields
- Added `OtherPlayerHand` type and `otherPlayerHandSchema` to shared package
- Updated `filterGameState` to populate all new fields including card privacy (NFR6): face-down dealer cards stripped of suit/rank
- Imported `calculateHandValue` from blackjack rules for server-side hand value calculation
- Created `Card` component (face-up with suit symbols and colors, face-down with pattern)
- Created `GameScreen` with dealer area, other players, my hand, Hit/Stand buttons
- CSS follows existing dark theme pattern (RoomScreen.css)
- Wired GameScreen in App.tsx replacing placeholder
- 15 new tests (9 filterGameState + 6 shared schema), all 307 total pass
- TypeScript compilation clean across all packages

### Change Log

- 2026-03-04: Implemented Story 3-5 — Card Visibility & Game UI
- 2026-03-04: Code Review — Fixed 3 HIGH, 2 MEDIUM issues (see Senior Developer Review below)

### Senior Developer Review (AI)

**Reviewer:** Code Review Agent (Claude Opus 4.6) on 2026-03-04

**Issues Found & Fixed:**
- **H1/H2 (AC3/AC7 violation):** Other players' hand values were not displayed. Added `handValue: number` to `OtherPlayerHand` type/schema, populated in `filterGameState`, displayed in `GameScreen` replacing card count.
- **H3 (Test quality):** Face-down dealer card sanitization test didn't verify dummy suit/rank values. Strengthened assertion to verify exact dummy values and confirm real rank not leaked.
- **M1:** `otherPlayerHandSchema` was not exported from `shared/index.ts`. Added export.
- **M2:** `.card-pile` CSS was defined in `Card.css` but used in `GameScreen.tsx`. Moved to `GameScreen.css` where it belongs.

**Remaining (accepted):**
- L1: No card pile overflow handling — acceptable for Chromium-only with typical hand sizes.

**Result:** APPROVED — all HIGH and MEDIUM issues fixed, all 307 tests pass, TypeScript clean.

### File List

- packages/shared/src/types/game.ts (modified)
- packages/shared/src/schemas/game.ts (modified)
- packages/shared/src/schemas/game.test.ts (modified)
- packages/shared/src/index.ts (modified)
- packages/server/src/utils/filterGameState.ts (modified)
- packages/server/src/utils/filterGameState.test.ts (modified)
- packages/client/src/components/screens/GameScreen.tsx (new)
- packages/client/src/components/screens/GameScreen.css (new)
- packages/client/src/components/ui/Card.tsx (new)
- packages/client/src/components/ui/Card.css (new)
- packages/client/src/App.tsx (modified)
