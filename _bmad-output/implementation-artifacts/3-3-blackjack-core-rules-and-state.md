# Story 3.3: Blackjack Core Rules & State

Status: done

## Story

As a **player**,
I want **the Blackjack rules to be enforced correctly**,
so that **the game is fair and plays like real Blackjack**.

## Acceptance Criteria

1. **Given** a Blackjack game starts **When** the initial state is created **Then** a standard 52-card deck is shuffled **And** each player receives 2 cards (both face-up) **And** the dealer receives 2 cards (1 face-up, 1 face-down) **And** the first player becomes the current player
2. **Given** a player's hand **When** calculating hand value **Then** number cards (2-10) count as face value **And** face cards (J, Q, K) count as 10 **And** Aces count as 11, or 1 if 11 would bust **And** the best non-busting value is calculated
3. **Given** a player's turn **When** requesting valid actions **Then** "Hit" is available if hand value < 21 **And** "Stand" is always available **And** no other actions are permitted
4. **Given** a player performs an invalid action **When** the server validates the action **Then** the action is rejected with error (thrown from engine) **And** the game state remains unchanged
5. **Given** a player hits and their hand exceeds 21 **When** the action is applied **Then** the player is marked as "bust" **And** their turn ends automatically (currentPlayerIndex advances) **And** they cannot take further actions this round

## Tasks / Subtasks

- [x] Task 1: Create Blackjack types (AC: #1, #2)
  - [x] 1.1 Create `packages/server/src/games/blackjack/types.ts` with `BlackjackPlayerHand` and `BlackjackState` extending `GameState`
  - [x] 1.2 `BlackjackPlayerHand`: `playerId: string`, `cards: Card[]`, `isBust: boolean`, `hasStood: boolean`
  - [x] 1.3 `BlackjackState extends GameState`: `gameType: GameType.BLACKJACK`, `deck: Card[]`, `playerHands: BlackjackPlayerHand[]`, `dealerCards: Card[]`, `dealerDone: boolean`

- [x] Task 2: Create Blackjack rules module (AC: #1, #2, #5)
  - [x] 2.1 Create `packages/server/src/games/blackjack/rules.ts` with pure helper functions
  - [x] 2.2 `createDeck(): Card[]` — generates standard 52-card deck (4 suits x 13 ranks), all face-down
  - [x] 2.3 `shuffleDeck(deck: Card[]): Card[]` — Fisher-Yates shuffle, returns new array
  - [x] 2.4 `dealCard(deck: Card[], faceUp: boolean): { card: Card; deck: Card[] }` — removes top card, sets faceUp, returns both
  - [x] 2.5 `calculateHandValue(cards: Card[]): number` — sum card values, Aces start as 11, reduce to 1 as needed to avoid bust
  - [x] 2.6 `isBust(cards: Card[]): boolean` — hand value > 21
  - [x] 2.7 `cardValue(rank: Rank): number` — 2-10 face value, J/Q/K = 10, A = 11

- [x] Task 3: Create Blackjack engine (AC: #1, #2, #3, #4, #5)
  - [x] 3.1 Create `packages/server/src/games/blackjack/index.ts` implementing `GameEngine<BlackjackState>`
  - [x] 3.2 `getInitialState(players)`: create+shuffle deck, deal 2 cards per player (face-up), deal 2 dealer cards (first face-up, second face-down), set currentPlayerIndex=0, status='playing'
  - [x] 3.3 `getValidActions(state, playerId)`: return empty if not player's turn or game over; return `[{type:'hit'}, {type:'stand'}]` if hand < 21 and not bust; return `[{type:'stand'}]` if hand === 21; return empty if player bust or stood
  - [x] 3.4 `applyAction(state, action)`:
    - Validate action.playerId matches current player
    - Handle 'hit': deal card from deck face-up to player, check bust, if bust auto-advance turn
    - Handle 'stand': mark player hasStood, advance to next non-done player
    - After last player done: auto-play dealer (reveal face-down card, hit on ≤16, stand on 17+), set dealerDone=true, set status='finished'
    - Throw Error for invalid action types or wrong player
  - [x] 3.5 `isGameOver(state)`: return `state.status === 'finished'`
  - [x] 3.6 `getWinner(state)`: return null if not finished; determine per-player results vs dealer (win/lose/push); return the player with best outcome (or null for all-push)

- [x] Task 4: Register Blackjack engine (AC: #1)
  - [x] 4.1 Update `packages/server/src/index.ts` — import blackjack engine, call `registerEngine(GameType.BLACKJACK, blackjackEngine)` at startup

- [x] Task 5: Update filterGameState for Blackjack (AC: #1, #3)
  - [x] 5.1 Update `packages/server/src/utils/filterGameState.ts` to detect BlackjackState and populate:
    - `hand`: requesting player's cards from playerHands
    - `validActions`: call `instance.engine.getValidActions(instance.state, playerId)`
    - `players[].cardCount`: actual card count from playerHands
  - [x] 5.2 Update existing filterGameState tests for new behavior

- [x] Task 6: Write comprehensive engine tests (AC: #1, #2, #3, #4, #5)
  - [x] 6.1 Create `packages/server/src/games/blackjack/rules.test.ts`:
    - createDeck: returns 52 cards, 4 suits x 13 ranks
    - shuffleDeck: returns different order (statistically), same cards
    - calculateHandValue: number cards, face cards, Aces (single ace, multiple aces, ace reduction)
    - isBust: true when > 21, false otherwise
    - dealCard: removes from deck, sets faceUp correctly
  - [x] 6.2 Create `packages/server/src/games/blackjack/index.test.ts`:
    - getInitialState: correct player count, 2 cards each, dealer 2 cards (1 up, 1 down), status playing
    - getValidActions: hit+stand when hand < 21, stand-only at 21, empty when bust/stood, empty when not turn
    - applyAction hit: adds card, detects bust, auto-advances turn on bust
    - applyAction stand: marks stood, advances to next player
    - applyAction invalid: throws for wrong player, unknown type
    - Dealer auto-play: triggers after last player, follows hit-on-≤16 rule
    - isGameOver: false during play, true when finished
    - getWinner: correct win/lose/push vs dealer
  - [x] 6.3 Update `packages/server/src/utils/filterGameState.test.ts` for Blackjack state handling

- [x] Task 7: Verify compilation and all tests pass (AC: all)
  - [x] 7.1 TypeScript compilation: no errors across shared, server, and client packages
  - [x] 7.2 All existing tests pass — no regressions
  - [x] 7.3 All new tests pass

## Dev Notes

### Architecture Compliance

**CRITICAL — Follow these patterns exactly:**

- **Blackjack directory structure** — Create files under `packages/server/src/games/blackjack/`:
  ```
  packages/server/src/games/blackjack/
  ├── index.ts            # Engine implementation (exports blackjackEngine)
  ├── types.ts            # BlackjackState, BlackjackPlayerHand types
  ├── rules.ts            # Pure rule functions (createDeck, shuffle, calculateHandValue, etc.)
  ├── index.test.ts       # Engine integration tests
  └── rules.test.ts       # Unit tests for pure rule functions
  ```

- **GameEngine interface** — The engine must implement `GameEngine<BlackjackState>` from `../../engine.js`. The interface methods:
  ```typescript
  import type { GameEngine } from '../engine.js';

  export const blackjackEngine: GameEngine<BlackjackState> = {
    getInitialState(players) { ... },
    getValidActions(state, playerId) { ... },
    applyAction(state, action) { ... },
    isGameOver(state) { ... },
    getWinner(state) { ... },
  };
  ```

- **BlackjackState design** — Extends the base `GameState` with blackjack-specific fields. MUST be JSON-serializable (no Maps, Sets, or class instances) because `games.ts` deep-copies state via `JSON.parse(JSON.stringify())`:
  ```typescript
  import type { Card, GameState, GameType } from '@cardpal/shared';

  export interface BlackjackPlayerHand {
    playerId: string;
    cards: Card[];
    isBust: boolean;
    hasStood: boolean;
  }

  export interface BlackjackState extends GameState {
    gameType: GameType.BLACKJACK;
    deck: Card[];
    playerHands: BlackjackPlayerHand[];
    dealerCards: Card[];
    dealerDone: boolean;
  }
  ```

- **Card type** — Use the existing `Card` type from `@cardpal/shared`: `{ suit: Suit, rank: Rank, faceUp: boolean }`. Suits: `'hearts' | 'diamonds' | 'clubs' | 'spades'`. Ranks: `'2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'`.

- **Pure functions in rules.ts** — All rule functions must be pure (no side effects, no state mutation). `applyAction` in the engine creates a deep copy of state before modifying. Use spread operator or structured cloning for immutability.

- **Dealer logic in applyAction** — When the last player stands or busts:
  1. Reveal dealer's face-down card (set `faceUp: true`)
  2. While dealer hand value ≤ 16: deal card face-up from deck
  3. Set `dealerDone: true`
  4. Set `state.status = 'finished'`
  This keeps the engine self-contained. The socket handler (Story 3.4) just calls `applyAction` and broadcasts the result.

- **Action format** — Actions use the `GameAction` type: `{ type: string, playerId: string, payload?: Record<string, unknown> }`. For Blackjack:
  - Hit: `{ type: 'hit', playerId: '<id>' }`
  - Stand: `{ type: 'stand', playerId: '<id>' }`
  No payload needed for either action.

- **Error handling** — `applyAction` THROWS an Error for invalid actions (wrong player, invalid action type, game over). The socket handler (Story 3.4) catches these and emits error events. The engine does NOT emit socket events.

- **Turn advancement** — After a player busts or stands, advance `currentPlayerIndex` to the next player who hasn't bust/stood. If no such player exists, all players are done → trigger dealer turn.

- **ESM `.js` import extensions** — All TypeScript imports must use `.js` extension.

- **filterGameState update** — The existing function returns empty hand/actions. Update it to detect `BlackjackState` (check for `playerHands` property or `gameType === 'blackjack'`) and populate:
  - `hand`: the requesting player's cards from `playerHands`
  - `validActions`: result of `instance.engine.getValidActions(instance.state, playerId)`
  - `players[].cardCount`: count of cards in each player's `playerHands` entry
  Keep fallback behavior for non-blackjack games.

- **Registering the engine** — In `packages/server/src/index.ts`, add after existing imports:
  ```typescript
  import { blackjackEngine } from './games/blackjack/index.js';
  import { registerEngine } from './games/engine.js';
  registerEngine(GameType.BLACKJACK, blackjackEngine);
  ```
  This must happen BEFORE the Socket.io connection handler.

### Scope Boundary — Do NOT implement in Story 3-3

- `gameAction` socket handler (Story 3-4) — the engine is built and tested directly, not via sockets
- Card visibility filtering with face-down card data redaction (Story 3-5)
- Game screen UI / card rendering (Story 3-5)
- Game end results display / "Play Again" button (Story 3-6)
- Any client-side changes (no React component changes in this story)
- New shared types — BlackjackState is server-only, NOT in `@cardpal/shared`

### Technical Stack — Relevant Versions

| Package | Version | Notes |
|---------|---------|-------|
| TypeScript | ~5.9.3 | Strict mode; ESM with `.js` import extensions |
| Vitest | ^4.0.18 | Server test runner; use `describe`/`it`/`expect` |
| @cardpal/shared | workspace | Card, GameState, GameAction, GameType, Rank, Suit types |

### Previous Story Intelligence (3-2 learnings)

**From Story 3-2:**
- `GameEngine` interface is generic: `GameEngine<TState extends GameState = GameState>`
- `GameInstance` stores `state: GameState` (base type), `engine: GameEngine`, `playerUsernames: Map<string, string>`
- `games.ts` deep-copies state via `JSON.parse(JSON.stringify())` — state MUST be JSON-serializable
- `filterGameState` currently returns empty `hand: []` and `validActions: []` — Story 3-3 fills these in
- `registerEngine` and `getEngine` in `engine.ts` manage the engine registry
- `handleStartGame` calls `createGame(roomId, gameType, engine, players)` then `filterGameState` for each player
- `stubEngine` exists for testing — the real blackjack engine replaces it for actual gameplay
- 195 total tests (175 server + 20 shared) — all passing

**From Story 3-2 code review:**
- `gameTypeSchema` uses `z.nativeEnum(GameType)` — important for validation
- Deep-copy pattern is critical — state in the games Map is never exposed directly
- Engine is stateless (same instance shared across games) — safe to register once at startup

### Git Intelligence

**Recent commits:**
- `3dae192` feat: Story 1.1 - Project scaffolding & shared types with code review fixes
- `e8b583a` Initial commit: project planning artifacts and BMAD workflow setup

**Uncommitted work** includes Stories 1.2-3.2 (all completed). Story 3-3 builds on this foundation.

**Commit format**: `feat: Story X.X - <description>`

### Project Structure Notes

**Files to create:**
```
packages/server/src/games/blackjack/types.ts         # NEW: BlackjackState, BlackjackPlayerHand
packages/server/src/games/blackjack/rules.ts          # NEW: createDeck, shuffleDeck, calculateHandValue, etc.
packages/server/src/games/blackjack/index.ts          # NEW: blackjackEngine implementing GameEngine
packages/server/src/games/blackjack/rules.test.ts     # NEW: rule function unit tests
packages/server/src/games/blackjack/index.test.ts     # NEW: engine integration tests
```

**Files to modify:**
```
packages/server/src/index.ts                           # ADD: registerEngine(GameType.BLACKJACK, blackjackEngine)
packages/server/src/utils/filterGameState.ts           # UPDATE: populate hand, validActions, cardCount for blackjack
packages/server/src/utils/filterGameState.test.ts      # UPDATE: add tests for blackjack filtering
```

**Files NOT to modify:**
```
packages/shared/src/types/game.ts                      # No shared type changes
packages/shared/src/schemas/game.ts                    # No schema changes
packages/server/src/games/engine.ts                    # Engine interface already correct
packages/server/src/state/games.ts                     # CRUD already works
packages/server/src/socket/handlers/gameHandlers.ts    # gameAction handler is Story 3-4
packages/client/                                       # No client changes in this story
```

### Testing Requirements

**New tests required:**

1. **Rules unit tests** (`packages/server/src/games/blackjack/rules.test.ts`):
   - `createDeck`: returns 52 unique cards, all 4 suits, all 13 ranks
   - `shuffleDeck`: returns array of same length with same cards in different order
   - `calculateHandValue`:
     - Number cards sum correctly (e.g., 5+7=12)
     - Face cards count as 10 (e.g., J+Q=20)
     - Single Ace counts as 11 (e.g., A+5=16)
     - Ace reduces to 1 when 11 would bust (e.g., A+5+10=16 not 26)
     - Multiple Aces: A+A=12 (one 11, one 1), A+A+9=21
     - Blackjack: A+K=21
   - `isBust`: true for value > 21, false otherwise
   - `dealCard`: removes top card, sets faceUp

2. **Engine integration tests** (`packages/server/src/games/blackjack/index.test.ts`):
   - `getInitialState`: 2 cards per player, 2 dealer cards, first dealer card face-up, second face-down, status 'playing', deck size correct (52 - dealt cards)
   - `getValidActions`: hit+stand when < 21, empty when not turn, empty when bust
   - `applyAction('hit')`: adds card to player hand, busts if > 21, auto-advances turn
   - `applyAction('stand')`: marks stood, advances turn
   - `applyAction` invalid: throws for wrong player, unknown action type
   - Dealer auto-play: after last player, dealer reveals and draws correctly
   - `isGameOver`: false while playing, true when finished
   - `getWinner`: wins against lower dealer, loses against higher, pushes on tie, wins if dealer busts

3. **Updated filterGameState tests** (`packages/server/src/utils/filterGameState.test.ts`):
   - Returns player's actual cards for blackjack state
   - Returns valid actions from engine
   - Returns correct card counts per player

**Test count target**: ~30-40 new tests, zero regressions on existing 195 tests.

**Test runner**: `pnpm --filter server test -- --run` for server tests.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3: Blackjack Core Rules & State]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3: Game Engine & Blackjack]
- [Source: _bmad-output/planning-artifacts/architecture.md#Game Engine Boundary]
- [Source: _bmad-output/planning-artifacts/architecture.md#Server Directory Structure]
- [Source: _bmad-output/planning-artifacts/prd.md#Gameplay Core FR24-30]
- [Source: _bmad-output/planning-artifacts/prd.md#Gameplay Game-Specific FR31]
- [Source: packages/server/src/games/engine.ts — GameEngine interface, registerEngine]
- [Source: packages/shared/src/types/game.ts — Card, GameState, GameAction, Rank, Suit types]
- [Source: packages/server/src/state/games.ts — createGame, deep-copy pattern]
- [Source: packages/server/src/utils/filterGameState.ts — current stub implementation]
- [Source: packages/server/src/games/stubEngine.ts — pattern reference for engine implementation]
- [Source: _bmad-output/implementation-artifacts/3-2-game-session-control.md — previous story learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Created `BlackjackPlayerHand` and `BlackjackState` types extending `GameState` in `types.ts`
- Created pure rule functions in `rules.ts`: `createDeck`, `shuffleDeck`, `dealCard`, `calculateHandValue`, `isBust`, `cardValue`
- Created complete `blackjackEngine` implementing `GameEngine<BlackjackState>` in `index.ts`:
  - `getInitialState`: shuffles deck, deals 2 face-up cards per player, 2 dealer cards (1 up, 1 down)
  - `getValidActions`: returns hit+stand when < 21, stand-only at 21, empty when bust/stood/not turn
  - `applyAction`: handles hit (deal card, bust check, auto-advance), stand (mark stood, advance), dealer auto-play after last player (reveal, hit on ≤16, stand on 17+)
  - `isGameOver`: checks `status === 'finished'`
  - `getWinner`: compares player hands vs dealer (win/lose/push)
- Registered blackjack engine in `index.ts` with `registerEngine(GameType.BLACKJACK, blackjackEngine)` at startup
- Updated `filterGameState` to detect BlackjackState and populate `hand`, `validActions`, and `cardCount` from actual game data
- 30 rules unit tests, 42 engine integration tests, 9 filterGameState tests — all passing
- 275 total tests (255 server + 20 shared) — zero regressions
- TypeScript clean across all 3 packages

### Change Log

- 2026-03-04: Story 3-3 implemented — Blackjack core rules engine with complete game logic, pure rule functions, and updated filterGameState
- 2026-03-04: Code review fixes — Simplified getWinner logic (removed redundant condition), fixed let→const in filterGameState, optimized dealCard (spread+shift → slice), added hit-to-21 test, added 3-player turn wrapping tests (258 total server tests)

### File List

- packages/server/src/games/blackjack/types.ts (NEW — BlackjackState, BlackjackPlayerHand types)
- packages/server/src/games/blackjack/rules.ts (NEW — createDeck, shuffleDeck, dealCard, calculateHandValue, isBust, cardValue)
- packages/server/src/games/blackjack/index.ts (NEW — blackjackEngine implementing GameEngine)
- packages/server/src/games/blackjack/rules.test.ts (NEW — 30 rule function unit tests)
- packages/server/src/games/blackjack/index.test.ts (NEW — 42 engine integration tests)
- packages/server/src/index.ts (MODIFIED — added blackjack engine import and registration)
- packages/server/src/utils/filterGameState.ts (MODIFIED — populated hand, validActions, cardCount for blackjack)
- packages/server/src/utils/filterGameState.test.ts (MODIFIED — added 5 blackjack-specific tests, updated existing tests with proper engine mock)
