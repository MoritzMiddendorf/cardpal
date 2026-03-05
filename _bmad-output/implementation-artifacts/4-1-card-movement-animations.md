# Story 4.1: Card Movement Animations

Status: done

## Story

As a player,
I want to see cards animate when they move,
so that I can follow the action and understand where cards came from.

## Acceptance Criteria

1. Given a card is dealt or played, when the game state updates, then the card animates from its source location to its destination, the animation is smooth (CSS transition, ~300-500ms), and the source location is visually clear (deck, player hand, etc.)
2. Given a player hits in Blackjack, when a card is dealt to them, then the card visually moves from the deck area to the player's hand, and other players can see this animation
3. Given the dealer draws cards, when dealer actions occur, then cards animate from deck to dealer's hand, and face-up/face-down state is respected during animation
4. Given an opponent plays a card, when viewing their action, then I can visually identify where the card originated from, and the animation makes the game flow easy to follow
5. Given multiple cards are dealt quickly (e.g., initial deal), when animating, then cards are dealt with slight stagger delays, and the sequence is visually clear

## Tasks / Subtasks

- [x] Task 1: Track previous game state for diffing (AC: #1, #2, #3, #4)
  - [x] 1.1 Add `previousGameState` field to Zustand store (FilteredGameState | null)
  - [x] 1.2 Update `setGameState` action to save current state as `previousGameState` before overwriting with new state
  - [x] 1.3 Write helper `detectNewCards(prev, next)` in `packages/client/src/utils/cardDiff.ts` that returns arrays of newly-arrived cards per location (myHand, dealerCards, each otherPlayerHand) by comparing card arrays between old and new state

- [x] Task 2: Create AnimatedCard component (AC: #1, #3)
  - [x] 2.1 Create `packages/client/src/components/ui/AnimatedCard.tsx` that wraps `<Card>` with CSS transition logic
  - [x] 2.2 AnimatedCard accepts props: `card`, `isNew` (boolean), `animationDelay` (ms), `isRevealed` (boolean)
  - [x] 2.3 When `isNew=true`, apply CSS class `card-entering` that starts the card offscreen/invisible and transitions to its final position
  - [x] 2.4 Create `packages/client/src/components/ui/AnimatedCard.css` with keyframe animation: initial state (translateY(-50px) + opacity 0) → final state (translateY(0) + opacity 1), duration 400ms ease-out
  - [x] 2.5 Support `animationDelay` via inline `style={{ animationDelay: '${delay}ms' }}` for stagger effects

- [x] Task 3: Replace Card usage in GameScreen with AnimatedCard (AC: #1, #2, #3, #4)
  - [x] 3.1 In GameScreen.tsx, read `previousGameState` from store
  - [x] 3.2 Use `detectNewCards()` to determine which cards in each area are newly dealt
  - [x] 3.3 Replace `<Card>` with `<AnimatedCard>` in dealer area, other player areas, and my hand area
  - [x] 3.4 Pass `isNew={true}` and appropriate `animationDelay` for newly-arrived cards
  - [x] 3.5 Pass `isNew={false}` for cards already present (no animation)

- [x] Task 4: Implement stagger delays for initial deal and multi-card sequences (AC: #5)
  - [x] 4.1 When multiple new cards arrive simultaneously (e.g., initial deal with 2 cards each), assign stagger delays: first card 0ms, second card 150ms, etc.
  - [x] 4.2 For dealer cards, stagger similarly with appropriate offsets
  - [x] 4.3 For sequential single-card deals (hit), use 0ms delay (immediate animation)

- [x] Task 5: Handle face-down card animations (AC: #3)
  - [x] 5.1 Ensure AnimatedCard respects `card.faceUp` during animation — face-down cards animate as card-back (Card component already handles this)
  - [x] 5.2 When dealer's face-down card is revealed (game finishes, dealerDone=true), add a `card-reveal` CSS animation that flips the card from back to front

- [x] Task 6: Run all tests and verify (AC: all)
  - [x] 6.1 Write unit tests for `detectNewCards` utility (9 tests)
  - [x] 6.2 Run full test suite - all existing + new tests pass (335 total)
  - [x] 6.3 Verify TypeScript compilation clean

## Dev Notes

### Architecture Compliance
- **Client-only implementation**: This story is purely client-side. No server changes needed. The server sends `FilteredGameState` snapshots; the client diffs them to detect card movement.
- **No new socket events**: Animation is derived from the existing `gameState` event by comparing previous vs current state. Do NOT add server-side animation events.
- **CSS-only animations**: Per architecture decision, use vanilla CSS transitions/keyframes. No animation libraries (framer-motion, react-spring, etc.).
- **NFR2 compliance**: "Card animations smooth and followable" — target 300-500ms duration per AC.

### Key Implementation Challenge
The server sends complete state snapshots, not incremental "card moved from X to Y" events. The client must:
1. Store the previous `gameState` before updating
2. Diff previous vs new state to detect which cards are new
3. Animate only the new cards; existing cards stay in place

### Card Diffing Strategy
Cards don't have unique IDs. Compare by array length and card identity (rank+suit+faceUp). When `next.hand.length > prev.hand.length`, the extra cards at the end are new (cards are always appended). Same logic for dealerCards and otherPlayerHands.

### Current Card Rendering
- `Card.tsx`: Stateless component rendering face-up (rank+suit) or face-down (card-back div)
- `GameScreen.tsx`: Renders cards in `.card-pile` divs with `-40px` overlap via `margin-left`
- Cards use `key={i}` (array index) — this is important for React reconciliation of card animations

### CSS Animation Approach
```css
/* New card enters from above with fade-in */
.card-entering {
  animation: card-deal 400ms ease-out forwards;
}

@keyframes card-deal {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Card flip for dealer reveal */
.card-reveal {
  animation: card-flip 500ms ease-in-out forwards;
}
```

### Project Structure Notes
- New files: `packages/client/src/components/ui/AnimatedCard.tsx`, `AnimatedCard.css`, `packages/client/src/utils/cardDiff.ts`
- Modified files: `packages/client/src/store/index.ts` (previousGameState), `packages/client/src/components/screens/GameScreen.tsx` (use AnimatedCard)
- Existing Card.tsx stays unchanged — AnimatedCard wraps it

### References
- [Source: _bmad-output/planning-artifacts/epics.md - Story 4.1 lines 717-755]
- [Source: _bmad-output/planning-artifacts/architecture.md - FR37, FR38, NFR2]
- [Source: _bmad-output/implementation-artifacts/3-6-game-end-and-results.md - Client patterns]

### Previous Story Intelligence (from 3-6)
- GameScreen uses `useAppStore((s) => s.gameState)` selector pattern
- Socket listeners in App.tsx update Zustand store; components read from store only
- CSS color palette: bg `#0a0e1a`, card area `#16213e`, accent `#e94560`
- Card.css: `.card` is 80px x 120px, `.card-pile .card + .card` has `-40px margin-left`
- 326 tests passing at end of story 3-6

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
No issues encountered.

### Completion Notes List
- Added `previousGameState` to Zustand store; `setGameState` saves current as previous before update
- Created `detectNewCards()` utility that diffs previous vs next game state to find new card indices per area (myHand, dealerCards, otherPlayerHands) plus dealer reveal detection
- Created `AnimatedCard` wrapper component with CSS `card-entering` (deal from above, 400ms) and `card-reveal` (flip, 500ms) animations
- Replaced all `<Card>` usage in GameScreen with `<AnimatedCard>`, passing `isNew` and stagger `animationDelay` (150ms between cards)
- Dealer card reveal detected when faceUp changes from false to true (game end)
- Added vitest to client package for testing utilities
- 9 unit tests for `detectNewCards` covering: initial deal, hit, unchanged state, dealer new cards, dealer reveal, other player hands, new player appearing, simultaneous cards, reveal+new combo

### Change Log
- 2026-03-04: Implemented Story 4.1 - Card Movement Animations (all 6 tasks completed)
- 2026-03-04: Code review - Fixed 4 issues: (H1) card overlap CSS broken by AnimatedCard wrapper — added `.animated-card + .animated-card` selector; (M1) removed dead `cardsMatch` function; (M2) added `prefers-reduced-motion` media query; (M3) removed no-op `display: inline-block` on `.animated-card`

### File List
- packages/client/src/store/index.ts (modified - added previousGameState)
- packages/client/src/utils/cardDiff.ts (new - detectNewCards utility)
- packages/client/src/utils/cardDiff.test.ts (new - 9 unit tests)
- packages/client/src/components/ui/AnimatedCard.tsx (new - animated card wrapper)
- packages/client/src/components/ui/AnimatedCard.css (new - deal and reveal animations)
- packages/client/src/components/screens/GameScreen.tsx (modified - use AnimatedCard with diffing)
- packages/client/package.json (modified - added vitest dev dependency and test script)
- packages/client/vitest.config.ts (new - vitest configuration)
- packages/client/src/components/screens/GameScreen.css (modified - fixed card overlap selector for AnimatedCard wrapper)
