# Story 6.1: Card Drag & Drop and Draw Fly-In

Status: done

## Story

As a **player**,
I want **to drag my cards onto the pile where they go, and see drawn cards fly in from the deck**,
so that **playing feels like handling real cards and I can follow where cards come from**.

Owner request (2026-10-16): "Implement drag and drop for moving cards + let the draw phase 'fly in' the new card from a deck in a
smooth animation." Decision log entry D12 records the design choices below.

## Acceptance Criteria

1. **Drag to play (Skip-Bo).** On my turn I can press a playable source (hand card, top of my stock pile, top of one of my
   discard piles) and drag it. A copy of the card follows the pointer; the source card is dimmed; every valid target for that
   source is highlighted (building piles; my discard piles when the source is a hand card). The target under the pointer gets a
   stronger "drop here" highlight.
2. **Drop.** Releasing over a valid target emits exactly the matching `gameAction` (`PLAY_FROM_HAND` / `PLAY_FROM_STOCK` /
   `PLAY_FROM_DISCARD` / `DISCARD`) from `validActions`. Releasing anywhere else (or on an invalid target, or pressing Escape)
   cancels: the card glides back to its source and nothing is sent.
3. **Click-to-move stays.** A press that moves less than a small threshold (~6px) is a click and runs the existing
   select-then-target flow unchanged. Selecting a card, then tapping a target still works on mouse and touch.
4. **Touch & pen.** Drag uses Pointer Events, so it works with mouse, touch and pen. Draggable cards set `touch-action: none` so
   dragging on a touch screen does not scroll the page. Only the primary button/pointer starts a drag.
5. **Not my turn / paused / finished.** No drag starts when I cannot act (same rule as click: `isMyTurn` and the source has
   actions). A drag in progress is cancelled if the game state changes so the move is no longer valid.
6. **Visible deck.** Skip-Bo shows the draw pile as a face-down deck (with its count) in the center next to the building piles,
   replacing the "Draw pile: N" text. Blackjack shows a face-down deck (shoe) in the dealer area.
7. **Draw fly-in.** Every card drawn into a hand flies from the deck to its final position (~450ms, eased, staggered ~120ms per
   card): Skip-Bo refills of my hand (start of turn and empty-hand refill) and of opponents' hands (to their face-down hand
   backs); Blackjack initial deal, hits and dealer draws (replacing the old "slide down" deal animation; the dealer reveal flip
   stays).
8. **Correct cards.** Only newly drawn cards fly. In Skip-Bo the server exposes a cumulative per-player draw counter
   (`drawnCount`) so the client knows exactly how many of the last hand cards are new, including the case where the last hand
   card is played and 5 new ones are drawn in the same update. The first state after joining/reconnecting does not animate
   Skip-Bo hands (nothing was "drawn" from the viewer's point of view); Blackjack keeps animating the initial deal.
9. **Reduced motion.** With `prefers-reduced-motion: reduce`, cards do not fly and the drag ghost does not animate back; drag &
   drop itself still works.
10. **No regressions.** Desktop layout from D11 is unchanged apart from the deck; typecheck, unit tests, smoke test and build
    stay green.

## Tasks / Subtasks

- [x] Task 1: Server draw counter (AC: 7, 8)
  - [x] Add `drawnCount: number` to `SkipBoPlayerState` (shared type + zod schema), initialise to 0, increment in `drawToFive`
        per card drawn (initial deal included).
  - [x] Expose `myDrawnCount` on `FilteredSkipBoState` and `drawnCount` on each `otherPlayers` entry (type + schema +
        `filterGameState`).
  - [x] Server tests: counter increments on initial deal, turn-start refill and empty-hand refill; filter exposes it.
- [x] Task 2: Pure helpers with unit tests (AC: 2, 3, 8)
  - [x] `findDropAction(validActions, source, target)` in `skipBoHelpers.ts` (target = building pile i or discard pile i).
  - [x] `newlyDrawnIndices(prevCount, nextCount, prevDrawn, nextDrawn)` returning the hand indices that are new (last N, clamped).
  - [x] `exceedsDragThreshold(dx, dy)` (lives in `utils/drag.ts`, since the drag hook is not Skip-Bo specific).
- [x] Task 3: Fly-in primitive (AC: 6, 7, 9)
  - [x] `FlyIn` wrapper component (`components/ui/FlyIn.tsx`): when `active`, on mount measures its own rect and the deck element's
        rect and plays a Web Animations API `translate + scale → none` animation with `fill: 'backwards'` and a delay.
        Skips when reduced motion is set or the deck element is missing.
  - [x] `Deck` component (`components/ui/Deck.tsx`) showing a face-down stacked deck and count; forwards a ref.
- [x] Task 4: Drag & drop hook (AC: 1–5, 9)
  - [x] `useCardDrag` hook (`hooks/useCardDrag.ts`) built on Pointer Events + pointer capture: threshold, ghost position,
        hovered target found via `document.elementFromPoint` and `data-drop-target` attributes, Escape cancels, glide-back on cancel.
  - [x] Ghost rendered `position: fixed`, `pointer-events: none`, above everything.
- [x] Task 5: Skip-Bo screen wiring (AC: 1–8)
  - [x] Make hand cards, stock and discard tops drag sources; building piles and my discard piles drop targets.
  - [x] Suppress the click that follows a drag; keep click-to-move as is.
  - [x] Replace draw-pile text with `Deck`; wrap newly drawn hand cards (mine and opponents' backs) in `FlyIn`.
- [x] Task 6: Blackjack fly-in (AC: 6, 7, 9)
  - [x] Add a `Deck` to the dealer area; `AnimatedCard` uses `FlyIn` from the deck instead of the CSS slide-down for new cards.
- [x] Task 7: Verify (AC: 10)
  - [x] `pnpm build && pnpm typecheck && pnpm test && pnpm smoke-test`; drive a real two-player Skip-Bo game in a browser
        (Playwright) with mouse drag, touch-style drag and click-to-move; screenshot.
- [x] Task 8: Record D12 in the decision log; update open item 3.

## Dev Notes

### Why Pointer Events, not HTML5 drag & drop
HTML5 DnD (`draggable`, `dragstart`/`drop`) does not fire for touch on most mobile browsers and gives poor control over the drag
image. Pointer Events cover mouse, touch and pen with one code path. No new dependency (dnd-kit etc.) is needed for this small set
of sources/targets; PRD asks for "CSS transitions, minimal JS animation" [Source: prd.md#Technical]. WAAPI (`Element.animate`) is
used for the fly-in because start coordinates are only known at runtime.

### Current code to build on
- `SkipBoGameScreen.tsx`: click-to-move state machine (`selectedSource`, `handleSourceClick`, `handleBuildingPileClick`,
  `handleDiscardPileClick`); the background click clears selection; `useEffect` clears selection when `validActions` changes.
- `skipBoHelpers.ts`: `getActionsForSource`, `isBuildingPileTarget`, `isDiscardPileTarget` (tested in `skipBoHelpers.test.ts`).
- `SkipBoPile` / `SkipBoCard`: presentational; pass through extra props (pointer handlers, data attributes, class names).
- Blackjack: `GameScreen.tsx` + `AnimatedCard.tsx` + `utils/cardDiff.ts` (`detectNewCards`, used for which cards are new) with
  `STAGGER_DELAY_MS = 150`. Keep `cardDiff` as is.
- Store keeps `previousGameState` (`setGameState`), use it for Skip-Bo draw diffs too.

### Server facts (packages/server/src/games/skipbo/index.ts)
- Hand cards are removed with `splice` and drawn cards are `push`ed, so drawn cards are always the last N of the hand.
- `drawToFive` runs at game start, in `advanceTurn` (next player's turn start) and after `PLAY_FROM_HAND` empties the hand. A
  single update can remove one hand card and draw 5, which is why a length diff is not enough (AC 8).
- `skipPlayersWithoutMoves` may draw for several players in one update; per-player counters handle that.

### Guardrails
- Server stays authoritative; the client only picks an action out of `validActions` (never builds payloads itself).
- Every socket handler stays wrapped in `safeHandler` (D5); this story adds none.
- Desktop-first (NFR9, D11). Touch support is a bonus that costs nothing with Pointer Events.
- Respect `prefers-reduced-motion` like the existing CSS does.

### Testing
- Vitest (client tests run in node, no DOM): keep DOM-free logic in helpers and test those.
- Server: extend `skipbo` engine tests and `filterGameState.test.ts`.
- Manual/Playwright run in a real browser for the drag and animation behaviour.

### References
- [Source: _bmad-output/planning-artifacts/prd.md#FR37] card movement animation
- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.1]
- [Source: _bmad-output/implementation-artifacts/4-1-card-movement-animations.md] earlier animation approach
- [Source: _bmad-output/planning-artifacts/decision-log.md#D11] desktop layout

## Dev Agent Record

### Agent Model Used

Claude (Claude Code, BMAD dev-story workflow)

### Debug Log References

- `pnpm build && pnpm -r typecheck && pnpm test && pnpm smoke-test`: all green (shared 40, client 44, server 459 tests).
- Playwright run against the built server (two players, Chromium 1440×900): drag cancelled on empty space (nothing sent,
  ghost gone, selection cleared); mouse drag onto a discard pile with drop-hover highlight (hand 5 → 4); click-to-move still
  works (hand 5 → 4); opponent's draw flies in from the deck (WAAPI animation running, screenshot mid-flight); touch drag
  via CDP touch events plays the card without scrolling the page; Blackjack deal and hit fly from the shoe.

### Completion Notes List

Ultimate context engine analysis completed - comprehensive developer guide created.

- Server: `SkipBoPlayerState.drawnCount` (cumulative, starts at 5 for the deal, `drawToFive` increments it), exposed as
  `myDrawnCount` and `otherPlayers[].drawnCount`. Shared types and zod schemas updated.
- Client: `useCardDrag` (Pointer Events, 6px threshold, `elementFromPoint` + `data-drop-target`, Escape cancels, swallows the
  click after a drag, glide-back on cancel), `FlyIn` (WAAPI from the deck's rect, hidden on the deck while it waits for its
  stagger slot), `Deck`. Skip-Bo: hand/stock/discard tops drag onto building piles and (hand only) discard piles; dropped card
  stays hidden until the next state (1.5s fallback if the server rejects it); deck replaces the draw-pile text; drawn cards fly
  in for me and to opponents' hand backs. Blackjack: shoe in the dealer area, deal/hit/dealer draws fly from it; reveal flip kept.
- Click-to-move code now uses the shared `findDropAction` helper; behaviour unchanged.
- Reduced motion: no fly-in, no ghost glide-back, no ghost tilt.

### File List

- `_bmad-output/planning-artifacts/epics.md` (Epic 6, Story 6.1)
- `_bmad-output/planning-artifacts/decision-log.md` (D12)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/6-1-card-drag-drop-and-draw-fly-in.md`
- `packages/shared/src/types/game.ts`
- `packages/shared/src/schemas/game.ts`
- `packages/shared/src/schemas/game.test.ts`
- `packages/server/src/games/skipbo/index.ts`
- `packages/server/src/games/skipbo/index.test.ts`
- `packages/server/src/utils/filterGameState.ts`
- `packages/server/src/utils/filterGameState.test.ts`
- `packages/client/src/hooks/useCardDrag.ts` (new)
- `packages/client/src/utils/drag.ts` (new), `packages/client/src/utils/drag.test.ts` (new)
- `packages/client/src/utils/motion.ts` (new)
- `packages/client/src/components/ui/FlyIn.tsx` (new)
- `packages/client/src/components/ui/Deck.tsx` (new), `packages/client/src/components/ui/Deck.css` (new)
- `packages/client/src/components/ui/SkipBoCard.tsx`, `SkipBoCard.css`
- `packages/client/src/components/ui/SkipBoPile.tsx`, `SkipBoPile.css`
- `packages/client/src/components/ui/AnimatedCard.tsx`, `AnimatedCard.css`
- `packages/client/src/components/screens/SkipBoGameScreen.tsx`, `SkipBoGameScreen.css`
- `packages/client/src/components/screens/skipBoHelpers.ts`, `skipBoHelpers.test.ts`
- `packages/client/src/components/screens/GameScreen.tsx`, `GameScreen.css`

## Senior Developer Review (AI)

**Date:** 2026-10-16 · **Outcome:** Approved after fixes (all findings fixed automatically, per CLAUDE.md)

### Findings

- [x] [Med] `FlyIn` cancelled a running flight whenever its effect re-ran, so any game update within ~450ms of a draw (the next
  state turns `active` off) made in-flight cards jump to their spot. Now only unmount cancels a flight. [FlyIn.tsx]
- [x] [Med] After a successful drop the source card reappeared at 30% opacity until the server answered, so the card briefly
  looked like it was in two places. It is now hidden (`skipbo-card-dropped`) until the next state, with the 1.5s fallback.
  [SkipBoGameScreen.tsx, SkipBoPile.tsx, SkipBoCard.css]
- [x] [Med] "Play Again" resets `drawnCount`; the counter going backwards animated nothing, so a new game's deal didn't fly.
  A decreasing counter now means a new game and animates the whole deal (test added). [skipBoHelpers.ts]
- [x] [Low] `AnimatedCard` props listed `deckRef` before `key`. [GameScreen.tsx]
- [ ] [Low] `useCardDrag` and `FlyIn` have no unit tests: client tests run in node without a DOM and adding jsdom would be a new
  dependency. Covered by the Playwright run (see Debug Log); accepted.

## Change Log

- 2026-10-16: Implemented drag & drop for Skip-Bo and deck fly-in for Skip-Bo and Blackjack (story 6.1).
- 2026-10-16: Code review: 4 findings fixed (flight cancelled by later updates, dropped card visible twice, no deal animation on
  Play Again, prop order); Playwright run repeated, all green.
