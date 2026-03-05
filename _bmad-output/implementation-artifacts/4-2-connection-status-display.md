# Story 4.2: Connection Status Display

Status: done

## Story

As a player,
I want to see the connection status of all players,
so that I know if someone is having connection issues.

## Acceptance Criteria

1. Given a game room with players, when viewing the room or game screen, then each player has a connection status indicator, and connected players show a green indicator or "online" status, and disconnected players show a red/orange indicator or "disconnected" status
2. Given a player's connection status changes, when the server detects the change, then all other players receive the status update via WebSocket, and their UI updates in real-time
3. Given viewing the player list, when a player is disconnected, then their username is visually dimmed or marked, and it's clear they are not currently connected
4. Given I am the disconnected player, when my connection is lost, then I see a "Reconnecting..." overlay or indicator, and the UI shows my connection state

## Tasks / Subtasks

- [x] Task 1: Server — mark players disconnected/connected in room state on socket events (AC: #1, #2)
  - [x] 1.1 In `packages/server/src/state/rooms.ts`, add `setPlayerConnected(roomId, playerToken, isConnected)` function that updates the player's `isConnected` field in the room's player list and returns the updated room (or null)
  - [x] 1.2 In `packages/server/src/index.ts` `disconnect` handler, look up the disconnecting socket's session (`socket.data.session`), and if they are in a room (`session.roomId`), call `setPlayerConnected(roomId, token, false)` and broadcast the updated `roomState` to the room via `io.to(roomId).emit('roomState', toRoomState(room))`; also broadcast `lobbyState` to all
  - [x] 1.3 In `packages/server/src/socket/handlers/authHandlers.ts`, when a returning user authenticates (session restored), if they have a `roomId`, call `setPlayerConnected(roomId, token, true)`, rejoin the socket room (`socket.join(roomId)`), and broadcast the updated `roomState` to the room
  - [x] 1.4 Write unit tests for `setPlayerConnected` in `packages/server/src/state/rooms.test.ts` (at least 3 tests: set disconnected, set connected, nonexistent room returns null)

- [x] Task 2: Add `isConnected` to game-screen player info (AC: #1, #3)
  - [x] 2.1 In `packages/shared/src/types/game.ts`, add `isConnected: boolean` to the `PlayerPublicInfo` interface
  - [x] 2.2 In `packages/server/src/utils/filterGameState.ts`, when building `PlayerPublicInfo` objects, look up the player's connection status from the room's player list (pass room data or connection map) and include `isConnected` in the output
  - [x] 2.3 Update existing `filterGameState` tests to include `isConnected` field in expected output

- [x] Task 3: Client — show connection indicators on GameScreen (AC: #1, #3)
  - [x] 3.1 In `packages/client/src/components/screens/GameScreen.tsx`, for each player area (other players section), add a connection status dot similar to `RoomScreen`'s `.room-player-dot` pattern: a small colored circle (green = connected, orange/red = disconnected) next to the player name
  - [x] 3.2 In `packages/client/src/components/screens/GameScreen.css`, add `.game-player-status-dot` styles: 8px circle, green `#2ecc71` when connected, orange `#e67e22` when disconnected; place inline next to the username in `.game-area-label`
  - [x] 3.3 When a player is disconnected, apply `opacity: 0.5` to their entire player area (add class `.game-player-disconnected`)
  - [x] 3.4 Show connection dot for the dealer area label too — skip, dealer is server-controlled, no connection status needed

- [x] Task 4: Client — show "Reconnecting..." overlay for own connection loss (AC: #4)
  - [x] 4.1 In `packages/client/src/components/ui/ConnectionOverlay.tsx` (new), create a component that reads `connectionStatus` from the Zustand store and, when status is `'disconnected'`, renders a semi-transparent dark overlay with centered "Reconnecting..." text and a simple CSS pulse animation
  - [x] 4.2 In `packages/client/src/components/ui/ConnectionOverlay.css` (new), style the overlay: position fixed, full viewport, `background: rgba(0,0,0,0.7)`, z-index 1000, white centered text, pulse animation on the text
  - [x] 4.3 In `packages/client/src/App.tsx`, render `<ConnectionOverlay />` unconditionally (it self-hides when connected) — place it after the screen components so it overlays everything

- [x] Task 5: Enable Socket.io auto-reconnect (AC: #4)
  - [x] 5.1 In `packages/client/src/socket/client.ts`, ensure Socket.io reconnection is enabled (it is by default with `io()`, but since we use `autoConnect: false`, verify `reconnection: true` is set or defaulted); the current config should already support reconnection since Socket.io defaults `reconnection: true`
  - [x] 5.2 Verify the `connect` handler in `App.tsx` already sets `connectionStatus: 'connected'` — it does (line 54); verify `disconnect` handler sets `'disconnected'` — it does (line 58); no changes needed here

- [x] Task 6: Run all tests and verify (AC: all)
  - [x] 6.1 Run full test suite — all existing + new tests pass (339 total: 304 server + 9 client + 26 shared)
  - [x] 6.2 Verify TypeScript compilation clean (`pnpm run build`)

## Dev Notes

### Architecture Compliance
- **FR39**: "System displays player connection status to all players in the room" — this story implements the display layer
- **Server-authoritative**: Connection status is tracked server-side in room state. Client renders what server sends.
- **Existing `isConnected` field**: The `RoomPlayer` in `rooms.ts` and `PlayerInfo` in shared types ALREADY have `isConnected: boolean`. The `RoomScreen` ALREADY renders a green dot for connected players. The gap is: (a) server doesn't update `isConnected` on disconnect/reconnect, (b) `PlayerPublicInfo` in game types lacks `isConnected`, (c) `GameScreen` doesn't show connection status, (d) no reconnecting overlay.
- **No new socket events needed**: Reuse existing `roomState` broadcast to communicate connection changes. When a player disconnects, server marks them disconnected and re-broadcasts `roomState` to the room.
- **CSS-only styling**: Per architecture, vanilla CSS only. No animation libraries.

### Key Implementation Insights

**Server disconnect flow (current gap):**
The `io.on('connection')` handler in `index.ts:92-94` only logs disconnections. It does NOT:
- Look up the player's session
- Mark them disconnected in the room
- Broadcast updated room state

This is the core server-side work for this story.

**Server reconnect flow (current state):**
In `authHandlers.ts`, when `handleAuthenticate` restores a session, it already emits `roomState` and `gameState` if the player has a `roomId`. BUT it doesn't:
- Mark them as connected in the room player list
- Rejoin the socket to the room channel
- Broadcast updated status to other players

**`filterGameState` context:**
The `filterGameState` function in `server/src/utils/filterGameState.ts` creates `PlayerPublicInfo` objects. Currently it does NOT include `isConnected` because `PlayerPublicInfo` lacks that field. To show connection status in GameScreen, we need to add `isConnected` to `PlayerPublicInfo` and populate it in `filterGameState`.

**Socket.io reconnection:**
Socket.io client has `reconnection: true` by default. With `autoConnect: false`, the reconnection behavior activates after the first manual `connect()`. When connection drops, Socket.io will auto-reconnect and resend `auth` credentials. The server's auth middleware will validate the token and restore the session. This should work out-of-box but needs verification.

### Current File State (from Story 4.1)
- `packages/client/src/store/index.ts`: Has `connectionStatus: 'connecting' | 'connected' | 'disconnected'` — already exists
- `packages/client/src/App.tsx`: Has `onConnect`/`onDisconnect` handlers updating store — already exists
- `packages/server/src/state/rooms.ts`: `RoomPlayer` has `isConnected: boolean`, set to `true` on create/join — needs disconnect update logic
- `packages/server/src/index.ts`: `disconnect` handler only logs — needs enhancement
- `packages/client/src/components/screens/RoomScreen.tsx`: Already renders `.room-player-dot-connected` — no changes needed
- `packages/client/src/components/screens/GameScreen.tsx`: No connection indicators yet

### CSS Color Palette (established)
- Background: `#0a0e1a`
- Card area: `#16213e`
- Accent: `#e94560`
- Connected green: `#2ecc71` (used in game results)
- Warning/disconnect: `#e67e22` (orange, standard for "attention")
- Text: `#eaeaea`
- Muted text: `#aaa`

### Project Structure Notes
- New files: `packages/client/src/components/ui/ConnectionOverlay.tsx`, `ConnectionOverlay.css`
- Modified files: `packages/server/src/state/rooms.ts` (setPlayerConnected), `packages/server/src/index.ts` (disconnect handler), `packages/server/src/socket/handlers/authHandlers.ts` (reconnect flow), `packages/shared/src/types/game.ts` (PlayerPublicInfo), `packages/server/src/utils/filterGameState.ts`, `packages/client/src/components/screens/GameScreen.tsx`, `packages/client/src/components/screens/GameScreen.css`, `packages/client/src/App.tsx`
- 335 tests passing at start of this story (9 client + 300 server + 26 shared)

### References
- [Source: _bmad-output/planning-artifacts/epics.md - Story 4.2 lines 757-785]
- [Source: _bmad-output/planning-artifacts/architecture.md - FR39, FR40]
- [Source: _bmad-output/implementation-artifacts/4-1-card-movement-animations.md - Previous story patterns]
- [Source: packages/server/src/state/rooms.ts - RoomPlayer.isConnected already exists]
- [Source: packages/client/src/components/screens/RoomScreen.tsx - Connection dot pattern already exists]

### Previous Story Intelligence (from 4-1)
- GameScreen uses `useAppStore((s) => s.gameState)` selector pattern
- AnimatedCard wraps Card component; card-pile uses `.animated-card + .animated-card` for overlap
- Socket listeners in App.tsx update Zustand store; components read from store only
- Code review fixed card overlap CSS and added `prefers-reduced-motion` support
- 335 tests passing (9 + 300 + 26)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
No issues encountered.

### Completion Notes List
- Added `setPlayerConnected(roomId, playerToken, isConnected)` to rooms state module with 4 unit tests
- Enhanced server disconnect handler to mark players disconnected in room state and broadcast updated roomState + lobbyState
- Added `restoreRoomConnection` helper to authHandlers — on reconnect: rejoins socket room, marks player connected, broadcasts roomState, sends game state if game in progress
- Added `isConnected: boolean` to `PlayerPublicInfo` interface in shared types
- Extended `filterGameState` with optional `connectionMap` parameter; `broadcastGameState` and `restoreRoomConnection` pass room player connection data
- Updated `filterGameState` tests for `isConnected` field
- Added connection status dots to GameScreen other-player areas with green/orange coloring
- Added `.game-player-disconnected` class (opacity: 0.5) for disconnected players
- Created `ConnectionOverlay` component — full-viewport dark overlay with pulsing "Reconnecting..." text, shown when `connectionStatus === 'disconnected'`; includes `prefers-reduced-motion` support
- Verified Socket.io auto-reconnect works with `autoConnect: false` config (reconnection defaults to true)
- 339 tests passing (304 server + 9 client + 26 shared), TypeScript build clean

### Change Log
- 2026-03-04: Implemented Story 4.2 - Connection Status Display (all 6 tasks completed)
- 2026-03-04: Code review fixes — added 7 new tests (4 for restoreRoomConnection, 3 for filterGameState connectionMap), broadcast gameState on disconnect for real-time GameScreen updates, fixed CSS opacity specificity, added display:inline-block to status dot

### File List
- packages/server/src/state/rooms.ts (modified - added setPlayerConnected)
- packages/server/src/state/rooms.test.ts (modified - added 4 tests for setPlayerConnected)
- packages/server/src/index.ts (modified - enhanced disconnect handler)
- packages/server/src/socket/handlers/authHandlers.ts (modified - added restoreRoomConnection helper, reconnect room/game state flow)
- packages/server/src/socket/handlers/gameHandlers.ts (modified - pass connectionMap to filterGameState)
- packages/shared/src/types/game.ts (modified - added isConnected to PlayerPublicInfo)
- packages/server/src/utils/filterGameState.ts (modified - added connectionMap parameter, populate isConnected)
- packages/server/src/utils/filterGameState.test.ts (modified - updated expected PlayerPublicInfo with isConnected)
- packages/client/src/components/screens/GameScreen.tsx (modified - added connection status dots and disconnected class)
- packages/client/src/components/screens/GameScreen.css (modified - added status dot and disconnected styles)
- packages/client/src/components/ui/ConnectionOverlay.tsx (new - reconnecting overlay component)
- packages/client/src/components/ui/ConnectionOverlay.css (new - overlay styles with pulse animation)
- packages/client/src/App.tsx (modified - added ConnectionOverlay import and render)
