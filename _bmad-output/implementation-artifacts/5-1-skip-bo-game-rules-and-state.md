# Story 5.1: Skip-Bo Game Rules & State

Status: done

## Story

As a player,
I want to play Skip-Bo with correct rules,
so that the game plays like the real card game.

## Acceptance Criteria

1. Given a Skip-Bo game starts, when the initial state is created, then a Skip-Bo deck is created (144 cards: 12 each of 1-12, plus 18 Skip-Bo wild cards) and the deck is shuffled and each player receives a stock pile (30 cards for 2-4 players, 20 cards for 5+ players) and only the top card of each stock pile is face-up and each player receives 5 cards in their hand and 4 building piles are initialized (empty, in center) and each player has 4 empty discard piles and the first player is determined
2. Given the game state, when examining card values, then numbered cards (1-12) have their face value and Skip-Bo cards are wild and can represent any number 1-12
3. Given a building pile, when cards are played to it, then it must start with a 1 (or Skip-Bo wild) and cards must be played in sequential order (1, 2, 3... 12) and when a pile reaches 12, it is cleared and shuffled back into the draw pile
4. Given the Skip-Bo game engine, when registering with the server, then it implements the GameEngine interface from Epic 3 and it can be selected as a game type when creating a room

## Tasks / Subtasks

- [x] Task 1: Add Skip-Bo card types to shared package (AC: #1, #2)
  - [x] 1.1 In `packages/shared/src/types/game.ts`, add `SkipBoCard` type: `{ value: number; isWild: boolean; faceUp: boolean }` — value is 1-12 for numbered cards, 0 for wild cards
  - [x] 1.2 In `packages/shared/src/types/game.ts`, add `SkipBoPile` type: `SkipBoCard[]`
  - [x] 1.3 In `packages/shared/src/types/game.ts`, add `SkipBoPlayerState` type: `{ playerId: string; stockPile: SkipBoPile; hand: SkipBoCard[]; discardPiles: [SkipBoPile, SkipBoPile, SkipBoPile, SkipBoPile] }`
  - [x] 1.4 In `packages/shared/src/types/game.ts`, add `SkipBoGameState` extending `GameState`: `{ gameType: GameType.SKIPBO; drawPile: SkipBoPile; buildingPiles: [SkipBoPile, SkipBoPile, SkipBoPile, SkipBoPile]; playerStates: SkipBoPlayerState[] }`
  - [x] 1.5 In `packages/shared/src/types/game.ts`, add `FilteredSkipBoState` type for client-side filtered view
  - [x] 1.6 Export all new types from `packages/shared/src/index.ts`

- [x] Task 2: Add Skip-Bo Zod schemas (AC: #1, #2)
  - [x] 2.1 In `packages/shared/src/schemas/game.ts`, add `skipBoCardSchema`: `z.object({ value: z.number().int().min(0).max(12), isWild: z.boolean(), faceUp: z.boolean() })`
  - [x] 2.2 Add `skipBoPileSchema`: `z.array(skipBoCardSchema)`
  - [x] 2.3 Add `skipBoPlayerStateSchema` and `skipBoGameStateSchema` matching the types
  - [x] 2.4 Add `filteredSkipBoStateSchema` for client-side validation
  - [x] 2.5 Export all new schemas from `packages/shared/src/index.ts`

- [x] Task 3: Create Skip-Bo rules module (AC: #1, #2, #3)
  - [x] 3.1 Create `packages/server/src/games/skipbo/rules.ts`
  - [x] 3.2 Implement `createSkipBoDeck(): SkipBoCard[]` — 162 cards total: 12 copies each of values 1-12, plus 18 wild cards
  - [x] 3.3 Implement `shuffleDeck(deck: SkipBoCard[]): SkipBoCard[]` — Fisher-Yates shuffle, returns new array
  - [x] 3.4 Implement `getStockPileSize(playerCount: number): number` — returns 30 for 2-4 players, 20 for 5-6 players
  - [x] 3.5 Implement `canPlayOnBuildingPile(pile: SkipBoPile, card: SkipBoCard): boolean`
  - [x] 3.6 Implement `getEffectiveValue(card: SkipBoCard, targetValue?: number): number`
  - [x] 3.7 Implement `isBuildingPileComplete(pile: SkipBoPile): boolean`
  - [x] 3.8 Implement `clearCompletedBuildingPile(pile: SkipBoPile): SkipBoCard[]`
  - [x] 3.9 All functions are pure (no mutation, return new values)

- [x] Task 4: Create Skip-Bo types file (AC: #1)
  - [x] 4.1 Create `packages/server/src/games/skipbo/types.ts` — re-exports from `@cardpal/shared`

- [x] Task 5: Create Skip-Bo engine (AC: #1, #4)
  - [x] 5.1 Create `packages/server/src/games/skipbo/index.ts`
  - [x] 5.2 Implement `getInitialState(players)`: full deck creation, shuffling, dealing, pile initialization
  - [x] 5.3 Implement `getValidActions(state, playerId)`: stub returning empty array with guard checks
  - [x] 5.4 Implement `applyAction(state, action)`: throws "not yet implemented"
  - [x] 5.5 Implement `isGameOver(state)`: returns false stub
  - [x] 5.6 Implement `getWinner(state)`: returns null stub
  - [x] 5.7 Implement `getResults(state, playerUsernames)`: returns empty array stub
  - [x] 5.8 Export `skipBoEngine` as `GameEngine<SkipBoGameState>`
  - [x] 5.9 Use `deepCopy()` via `JSON.parse(JSON.stringify(state))` for state immutability

- [x] Task 6: Register Skip-Bo engine and update filterGameState (AC: #4)
  - [x] 6.1 In `packages/server/src/index.ts`, import and register skipBoEngine
  - [x] 6.2 In `packages/server/src/utils/filterGameState.ts`, add SKIPBO branch
  - [x] 6.3 Skip-Bo filter builds filtered view with privacy enforcement (hand hidden from others)
  - [x] 6.4 Added `skipBoState?: FilteredSkipBoState` optional field to `PlayerGameState`
  - [x] 6.5 Added `skipBoState` to `playerGameStateSchema` as optional

- [x] Task 7: Write comprehensive tests (AC: all)
  - [x] 7.1 Create `packages/server/src/games/skipbo/rules.test.ts` — 29 tests covering all rule functions
  - [x] 7.2 Create `packages/server/src/games/skipbo/index.test.ts` — 20 tests covering engine methods
  - [x] 7.3 Add Skip-Bo filtering tests to `packages/server/src/utils/filterGameState.test.ts` — 10 tests for privacy and filtering
  - [x] 7.4 Add Skip-Bo schema tests to `packages/shared/src/schemas/game.test.ts` — 13 tests for new schemas

- [x] Task 8: Verify all tests pass and TypeScript compiles (AC: all)
  - [x] 8.1 Run `pnpm run build` — TypeScript compiles clean
  - [x] 8.2 Run full test suite — 429 tests pass (381 server + 39 shared + 9 client)
  - [x] 8.3 Blackjack game works correctly (no regressions in filterGameState)

## Dev Notes

### Architecture Compliance

- **FR32**: "System supports Skip-Bo with complete rule enforcement" — this story establishes the foundation (types, rules, engine skeleton); stories 5.2-5.4 complete it
- **GameEngine interface**: `engine.ts` defines `GameEngine<TState extends GameState>` with generic type parameter — Skip-Bo engine must be typed as `GameEngine<SkipBoGameState>`
- **Server-authoritative**: All game logic in server; client only renders filtered state
- **Private card isolation (NFR6)**: Hand cards are PRIVATE — filterGameState must never expose them to other players. Stock pile only shows top card. Discard piles show top cards (public).
- **Immutable state**: All engine methods return new state objects, never mutate input

### What Already Exists (DO NOT REDO)

- `GameType.SKIPBO = 'skipbo'` enum value in `packages/shared/src/types/game.ts`
- `gameTypeSchema` in `packages/shared/src/schemas/game.ts` already includes `'skipbo'`
- `GAME_MIN_PLAYERS[GameType.SKIPBO] = 2` and `GAME_MAX_PLAYERS[GameType.SKIPBO] = 6` in `packages/server/src/state/rooms.ts`
- Client-side `GAME_TYPE_LABELS`, `GAME_MIN_PLAYERS`, `GAME_MAX_PLAYERS` already include Skip-Bo entries in `RoomScreen.tsx` and `LobbyScreen.tsx`
- Room creation already supports `GameType.SKIPBO` selection
- `registerEngine()` / `getEngine()` in `packages/server/src/games/engine.ts`
- `createGame()` / `getGame()` / `updateGameState()` in `packages/server/src/state/games.ts`
- `handleStartGame` in `gameHandlers.ts` uses `getEngine(gameType)` — will automatically find Skip-Bo engine once registered
- `filterGameState()` in `packages/server/src/utils/filterGameState.ts` — add SKIPBO branch, don't modify BLACKJACK branch

### Skip-Bo Card Representation

Skip-Bo cards are NOT standard playing cards (no suits). Use a separate type:
```typescript
interface SkipBoCard {
  value: number;  // 1-12 for numbered, 0 for wild
  isWild: boolean;
  faceUp: boolean;
}
```
Do NOT reuse the existing `Card` type (which has `suit`/`rank` for standard 52-card decks).

### Skip-Bo Deck Composition (144 cards)
- 12 copies of each number 1-12 = 144 numbered cards... wait, that's 144. But we also need 18 wilds.
- CORRECT: 12 each of 1-12 = 144, PLUS 18 wild = 162 total. Actually, the official Skip-Bo deck has 162 cards total.

**WAIT — recheck**: The AC says "144 cards: 12 each of 1-12, plus 18 Skip-Bo wild cards". 12 * 12 = 144 numbered + 18 wild = 162 total. The "144 cards" in the AC likely refers to the numbered cards only, with 18 wild cards additional. Total deck = 162 cards.

### FilteredGameState Strategy

The existing `FilteredGameState` type was designed for Blackjack. For Skip-Bo:
- Generic fields used: `gameType`, `currentPlayerIndex`, `status`, `players` (PlayerPublicInfo[]), `myPlayerId`, `validActions`, `results`, `isPaused`, `pausedForPlayer`
- Blackjack-specific fields set to defaults: `hand: []`, `handValue: 0`, `dealerCards: []`, `dealerHandValue: null`, `otherPlayerHands: []`
- Skip-Bo data goes in new optional `skipBoState: FilteredSkipBoState` field
- Client GameScreen will branch on `gameType` to render the correct layout

### Building Pile Rules
- 4 building piles, shared by all players
- Must start with 1 (or wild used as 1)
- Sequential play: 1, 2, 3... 12
- When a pile reaches 12, it's cleared and cards are shuffled back into draw pile
- Wild cards can substitute for ANY value 1-12

### Stock Pile Rules
- Only top card is visible (face-up)
- 30 cards for 2-4 players, 20 cards for 5+ players
- Playing the top card reveals the next card underneath

### Key Implementation Details

**Engine Registration Pattern (from index.ts):**
```typescript
import { skipBoEngine } from './games/skipbo/index.js';
registerEngine(GameType.SKIPBO, skipBoEngine);
```

**filterGameState Pattern (add else-if branch):**
```typescript
} else if (state.gameType === GameType.SKIPBO && 'playerStates' in state) {
  const skipBoState = state as SkipBoGameState;
  // Build filtered view...
}
```

**PlayerPublicInfo for Skip-Bo:**
- `cardCount`: stock pile remaining count (most relevant metric)
- `isBust`: always `false` (no bust concept in Skip-Bo)
- `hasStood`: always `false` (no stand concept)
- `isActive`: `true` if it's this player's turn

### CSS Color Palette (established)
- Background: `#0a0e1a`
- Card area: `#16213e`
- Accent: `#e94560`
- Connected green: `#2ecc71`
- Warning/disconnect: `#e67e22`
- Text: `#eaeaea`
- Muted text: `#aaa`

### Testing Strategy
- Unit tests for all rules functions (pure functions are easy to test)
- Unit tests for engine getInitialState (verify deck, stock piles, hands, piles)
- Unit tests for filterGameState Skip-Bo branch (privacy enforcement)
- Schema validation tests for new Zod schemas
- Regression: all existing tests must pass unchanged

### Project Structure Notes
- New files: `packages/server/src/games/skipbo/index.ts`, `packages/server/src/games/skipbo/types.ts`, `packages/server/src/games/skipbo/rules.ts`, `packages/server/src/games/skipbo/rules.test.ts`, `packages/server/src/games/skipbo/index.test.ts`
- Modified files: `packages/shared/src/types/game.ts`, `packages/shared/src/schemas/game.ts`, `packages/shared/src/index.ts`, `packages/server/src/index.ts`, `packages/server/src/utils/filterGameState.ts`, `packages/server/src/utils/filterGameState.test.ts`, `packages/shared/src/schemas/game.test.ts`
- Follow existing directory structure: games are in `server/src/games/<gamename>/` with `index.ts`, `types.ts`, `rules.ts`

### References
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 5, Story 5.1]
- [Source: _bmad-output/planning-artifacts/architecture.md - Game Engine Interface, Project Structure]
- [Source: packages/server/src/games/engine.ts - GameEngine interface, registerEngine]
- [Source: packages/server/src/games/blackjack/index.ts - Reference implementation pattern]
- [Source: packages/server/src/games/blackjack/rules.ts - Pure function rule utilities pattern]
- [Source: packages/server/src/utils/filterGameState.ts - State filtering for privacy]
- [Source: packages/shared/src/types/game.ts - GameState, GameType, FilteredGameState]

### Previous Story Intelligence (from 4-4)
- 357 tests passing (322 server + 9 client + 26 shared), TypeScript build clean
- Socket.io reconnection config added to client
- filterGameState handles isPaused and pausedForPlayer
- Vanilla CSS only, no animation libraries
- All state modules use deep copy pattern for immutability

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no issues.

### Completion Notes List

- Implemented all Skip-Bo types (SkipBoCard, SkipBoPile, SkipBoPlayerState, SkipBoGameState, FilteredSkipBoState) in shared package
- Created Zod schemas matching all new types with proper validation constraints
- Built pure-function rules module: createSkipBoDeck (162 cards), shuffleDeck (Fisher-Yates), getStockPileSize, canPlayOnBuildingPile, getEffectiveValue, isBuildingPileComplete, clearCompletedBuildingPile
- Created Skip-Bo engine implementing GameEngine interface with full getInitialState and stub methods for actions/win (deferred to stories 5.2-5.4)
- Registered skipBoEngine in server index.ts
- Added Skip-Bo branch to filterGameState with full privacy enforcement (hands hidden from other players, stock/discard/building piles properly filtered)
- Added skipBoState optional field to PlayerGameState/FilteredGameState and playerGameStateSchema
- 72 new tests across 4 test files, all passing. Zero regressions (429 total tests pass)
- TypeScript builds clean across all 3 packages

### Senior Developer Review (AI)

**Reviewer:** Moritz (via Claude Opus 4.6) on 2026-03-05
**Outcome:** Approved with fixes applied

**Findings (7 total: 2 HIGH, 3 MEDIUM, 2 LOW):**

Fixed:
- H1: `FilteredSkipBoState` type changed from plain arrays to 4-tuples for `myDiscardPiles`, `buildingPiles`, `otherPlayers[].discardPiles`
- H2: `filteredSkipBoStateSchema` updated to use `z.tuple()` instead of `z.array()` for pile arrays
- M1: Removed dead `deepCopy` function from `skipbo/index.ts`
- M2: Added missing test for `canPlayOnBuildingPile` rejecting play on complete 12-card pile
- M3: Changed `z.literal('skipbo')` to `z.literal(GameType.SKIPBO)` in schema

Not fixed (LOW, acceptable):
- L1: `getStockPileSize` has no bounds validation (enforced upstream)
- L2: `clearCompletedBuildingPile` doesn't verify pile completeness (caller responsibility)

### Change Log

- 2026-03-05: Code review — fixed 5 issues (2 HIGH, 3 MEDIUM), all tests pass (430 total)
- 2026-03-04: Implemented story 5-1 Skip-Bo game rules and state foundation

### File List

New files:
- packages/server/src/games/skipbo/types.ts
- packages/server/src/games/skipbo/rules.ts
- packages/server/src/games/skipbo/index.ts
- packages/server/src/games/skipbo/rules.test.ts
- packages/server/src/games/skipbo/index.test.ts

Modified files:
- packages/shared/src/types/game.ts
- packages/shared/src/schemas/game.ts
- packages/shared/src/index.ts
- packages/server/src/index.ts
- packages/server/src/utils/filterGameState.ts
- packages/server/src/utils/filterGameState.test.ts
- packages/shared/src/schemas/game.test.ts
