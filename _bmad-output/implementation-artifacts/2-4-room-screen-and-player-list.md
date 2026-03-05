# Story 2.4: Room Screen & Player List

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **player**,
I want **to see who is in my room while waiting for the game to start**,
so that **I know when everyone has joined and we're ready to play**.

## Acceptance Criteria

1. **Given** a user is inside a room **When** the room screen loads **Then** the room name is displayed **And** the selected game type is shown **And** a list of all players in the room is displayed with their usernames **And** the room owner is visually indicated (e.g., "Host" label)
2. **Given** players join or leave the room **When** the player list changes **Then** the room screen updates in real-time for all players in the room
3. **Given** two rooms exist concurrently **When** players interact with each room **Then** room states are completely independent **And** actions in one room do not affect the other **And** the server correctly routes messages to the appropriate room
4. **Given** the user is not the room owner **When** viewing the room screen **Then** the "Start Game" button is not visible or is disabled

## Tasks / Subtasks

- [x] Task 1: Create RoomScreen component (AC: #1)
  - [x] 1.1 Create `packages/client/src/components/screens/RoomScreen.tsx` — functional component that reads `currentRoom` and `sessionToken` from Zustand store
  - [x] 1.2 Display room header: room name (`currentRoom.name`) and game type label (reuse `GAME_TYPE_LABELS` pattern from LobbyScreen)
  - [x] 1.3 Display player list: iterate `currentRoom.players` (type `PlayerInfo[]`) — show `username`, "Host" badge when `player.isOwner === true`, connection status dot (green for `isConnected`, gray otherwise)
  - [x] 1.4 Display player count: `{currentRoom.players.length}/{maxPlayers} players` using `GAME_MAX_PLAYERS` lookup or derive from shared constant
  - [x] 1.5 Add "Leave Room" button — on click: `socket.emit('leaveRoom')`, then `setCurrentRoom(null)` and `setScreen('lobby')`
  - [x] 1.6 Add "Start Game" button — conditionally rendered: only visible when `currentRoom.ownerId === sessionToken`. Button is disabled for now (Story 3-2 implements start game logic). Show disabled tooltip: "Coming soon"
  - [x] 1.7 For non-owners: show "Waiting for {ownerUsername} to start..." message instead of the Start Game button

- [x] Task 2: Create RoomScreen CSS (AC: #1)
  - [x] 2.1 Create `packages/client/src/components/screens/RoomScreen.css` following the existing dark theme conventions: background `#0a0e1a`, cards `#16213e`, borders `#0f3460`, text `#eaeaea`, accent `#e94560`
  - [x] 2.2 Style room header: room name (1.25rem bold), game type label (0.875rem muted)
  - [x] 2.3 Style player list: each player item in a card-like row with username, owner badge (accent-colored "Host" chip), connection dot indicator
  - [x] 2.4 Style Leave Room button: secondary style (transparent bg, border `#0f3460`, gray text, hover to `#16213e`)
  - [x] 2.5 Style Start Game button: primary style (`#e94560` bg, white text), disabled state with opacity 0.5
  - [x] 2.6 Style "Waiting for..." message: muted text, centered

- [x] Task 3: Integrate RoomScreen in App.tsx (AC: #1, #2)
  - [x] 3.1 Import `RoomScreen` component in `packages/client/src/App.tsx`
  - [x] 3.2 Replace the room screen placeholder (`{screen === 'room' && (<div>...</div>)}`) with `<RoomScreen />`
  - [x] 3.3 Verify the existing `onRoomState` listener in App.tsx already updates `currentRoom` in the store — no new socket listeners needed

- [x] Task 4: Verify real-time updates work (AC: #2)
  - [x] 4.1 Confirm that when another player joins the room, the server emits `roomState` via `io.to(roomId).emit('roomState', toRoomState(updatedRoom))` — this is already implemented in Story 2-3's `handleJoinRoom`
  - [x] 4.2 Confirm that when a player leaves, the server emits updated `roomState` to remaining players — already implemented in Story 2-3's `handleLeaveRoom`
  - [x] 4.3 The `onRoomState` handler in App.tsx calls `store.setCurrentRoom(room)` which triggers re-render of RoomScreen — no additional work needed
  - [x] 4.4 Verify by reviewing that the RoomScreen reads from `useAppStore((s) => s.currentRoom)` and re-renders on changes

- [x] Task 5: Verify concurrent room independence (AC: #3)
  - [x] 5.1 Confirm Socket.io room-scoped broadcasting (`io.to(roomId).emit()`) already ensures room isolation — no cross-room state leaks
  - [x] 5.2 Confirm each room is a separate Map entry in `rooms.ts` with its own `Room` object — state mutations only affect the targeted room
  - [x] 5.3 This AC is a verification task — the architecture already enforces independence via Socket.io room groups and the rooms Map structure

- [x] Task 6: Verify acceptance criteria
  - [x] 6.1 TypeScript compilation: no errors across all packages
  - [x] 6.2 All server tests pass (existing — no new server code in this story)
  - [x] 6.3 Visual: room screen shows room name, game type, player list with host badge
  - [x] 6.4 Visual: non-owner sees "Waiting for..." message, no Start Game button
  - [x] 6.5 Visual: owner sees disabled Start Game button
  - [x] 6.6 Visual: Leave Room works — returns to lobby

## Dev Notes

### Architecture Compliance

**CRITICAL — Follow these patterns exactly:**

- **`RoomState` type from `@cardpal/shared`** — `packages/shared/src/types/room.ts` defines `RoomState { id, name, gameType, status, ownerId, players: PlayerInfo[] }` and `PlayerInfo { id, username, isOwner, isConnected }`. Use these types directly — do NOT create new types.

- **`roomState` event already handled in App.tsx** — Line 63-67 in `packages/client/src/App.tsx`: `onRoomState(room: RoomState)` calls `store.setCurrentRoom(room)` and `store.setScreen('room')`. No new socket listeners needed for this story.

- **Zustand store already has `currentRoom: RoomState | null`** — `packages/client/src/store/index.ts` line 20. Access via `useAppStore((s) => s.currentRoom)`. Also has `sessionToken` (line 8) for owner comparison.

- **`GAME_MAX_PLAYERS` is server-side only** — Defined in `packages/server/src/state/rooms.ts`. The client doesn't import this directly. For player count display, use `currentRoom.players.length` and derive max from the `RoomInfo.maxPlayers` field if available, or hardcode display per game type on client side (Blackjack: 4, Skip-Bo: 6) as constants.

- **Component file naming** — PascalCase: `RoomScreen.tsx`, `RoomScreen.css`. Place in `packages/client/src/components/screens/` alongside existing screens.

- **CSS conventions** — BEM-like naming: `.room-screen`, `.room-header`, `.room-player-item`, `.room-player-owner`, `.room-start-btn`, `.room-leave-btn`. Follow the dark theme from LobbyScreen.css: `#0a0e1a` (bg), `#16213e` (cards), `#0f3460` (borders), `#eaeaea` (text), `#e94560` (accent).

- **`socket` import** — Import from `../../socket/client.js` (same as LobbyScreen).

- **`GameType` labels** — Reuse the `GAME_TYPE_LABELS` pattern from LobbyScreen: `{ [GameType.BLACKJACK]: 'Blackjack', [GameType.SKIPBO]: 'Skip-Bo' }`. Can duplicate in RoomScreen or extract to shared client utility — prefer duplicating for now to keep scoped (extraction is a future refactor).

- **Leave Room pattern** — Already proven in Story 2-3's App.tsx placeholder. Emit `socket.emit('leaveRoom')`, then `useAppStore.getState().setCurrentRoom(null)` and `useAppStore.getState().setScreen('lobby')`.

- **Start Game is OUT OF SCOPE** — Story 3-2 implements game starting. The button should be present but disabled. Do NOT implement `startGame` socket emission or any game logic.

- **Scope boundary — do NOT implement in Story 2-4:**
  - Game starting logic (Story 3-2)
  - Game type changing in room (Story 3-2)
  - Disconnect handling/reconnection UI (Story 4-2, 4-3)
  - Card animations or game rendering (Epic 3/4)

### Technical Stack — Relevant Versions

| Package | Version | Notes |
|---------|---------|-------|
| React | ^18.3.1 | Functional components, hooks |
| Zustand | ^5.0.11 | `useAppStore((s) => s.currentRoom)` selector pattern |
| TypeScript | ~5.9.3 | Strict mode; ESM with `.js` import extensions |
| socket.io-client | ^4.8.3 | `socket.emit('leaveRoom')` |

### Previous Story Intelligence (2.3 learnings)

**From Story 2-3 (most recent):**

- **LobbyScreen pattern** — Functional component with local state (`useState`), socket event listeners in `useEffect` with cleanup, error handling via `socket.on('error', onError)`.
- **Code review fix: input validation** — `handleJoinRoom` was updated to validate `data.roomId` (typeof + empty string check). RoomScreen doesn't need server-side validation (read-only display).
- **Code review fix: CSS hover on disabled items** — Generic `.lobby-room-item:hover` was removed; only `.lobby-room-joinable:hover` applies. For RoomScreen, don't add hover to non-interactive elements.
- **Code review fix: capacity guard** — `addPlayerToRoom` now enforces capacity at the state level. This is transparent to RoomScreen.
- **`socket.data.session` update pattern** — `socket.data.session = { ...session, roomId: room.id }` keeps socket data consistent. RoomScreen reads from Zustand store, not socket.data.
- **App.tsx already handles `roomState` and `lobbyState`** — `onRoomState` sets `currentRoom` and `screen='room'`. `onLobbyState` sets `lobbyRooms`. No duplicate listeners needed.

**From Story 2-2:**

- **`toRoomState(room)` converts internal Room to shared RoomState** — Already exists. Players get `isOwner` flag computed.
- **Deep-copy pattern** — All state getters return copies. RoomScreen consumes copies from the store.

### Git Intelligence

**Recent commits:**
- `3dae192` feat: Story 1.1 - Project scaffolding & shared types with code review fixes
- `e8b583a` Initial commit: project planning artifacts and BMAD workflow setup

**Uncommitted work** includes Stories 1.2-2.3 (all completed). Story 2-4 builds on this foundation.

**Commit format**: `feat: Story X.X - <description>`

### Project Structure Notes

**Files to create:**
```
packages/client/src/components/screens/RoomScreen.tsx    # NEW: Room screen component
packages/client/src/components/screens/RoomScreen.css    # NEW: Room screen styles
```

**Files to modify:**
```
packages/client/src/App.tsx                              # UPDATE: Replace room placeholder with RoomScreen component
```

**Files NOT to modify:**
```
packages/shared/src/types/room.ts          # Already has RoomState, PlayerInfo — no changes
packages/shared/src/types/events.ts        # Already has roomState event — no changes
packages/client/src/store/index.ts         # Already has currentRoom, setCurrentRoom — no changes
packages/server/src/socket/handlers/*      # No server changes needed for this story
packages/server/src/state/*                # No server state changes needed
```

### Testing Requirements

**This story is primarily a client-side UI story.** No new server-side code is being added, so no new server tests are required. Existing 131 server tests should continue to pass.

**Verification is visual/manual:**
- Room screen renders with correct room info
- Player list shows all players with owner badge
- Owner sees disabled Start Game button
- Non-owner sees "Waiting for..." message
- Leave Room navigates back to lobby
- Real-time updates work when another player joins/leaves (requires two browser tabs)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4: Room Screen & Player List]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2: Lobby & Room Management]
- [Source: _bmad-output/planning-artifacts/architecture.md#Socket.io Event Architecture — roomState event]
- [Source: _bmad-output/planning-artifacts/architecture.md#Client State Management — Zustand store]
- [Source: packages/shared/src/types/room.ts — RoomState, PlayerInfo]
- [Source: packages/shared/src/types/events.ts — roomState event]
- [Source: packages/client/src/store/index.ts — currentRoom, setCurrentRoom, sessionToken]
- [Source: packages/client/src/App.tsx — onRoomState listener (lines 63-67)]
- [Source: packages/client/src/components/screens/LobbyScreen.tsx — component pattern reference]
- [Source: packages/client/src/components/screens/LobbyScreen.css — styling conventions reference]
- [Source: _bmad-output/implementation-artifacts/2-3-join-and-leave-room.md — previous story patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Created RoomScreen component with all required UI elements: room name, game type label, player list with Host badge, connection status dots, player count with max, Leave Room button, disabled Start Game button (owner) / "Waiting for..." message (non-owner)
- Created RoomScreen CSS following dark theme conventions from LobbyScreen (BEM-like naming, matching color palette)
- Integrated RoomScreen in App.tsx replacing the placeholder div
- Verified real-time updates: `onRoomState` listener in App.tsx → `setCurrentRoom` → RoomScreen re-renders via Zustand selector
- Verified concurrent room independence: Socket.io room-scoped broadcasting + separate Map entries enforce isolation
- TypeScript clean across all packages, 131 server tests pass with no regressions
- Client-side GAME_MAX_PLAYERS constant duplicated (Blackjack: 4, Skip-Bo: 6) since server constant is not importable by client

### Change Log

- 2026-03-03: Story 2-4 implemented — RoomScreen component, CSS, App.tsx integration
- 2026-03-03: Code review — 3 MEDIUM fixes applied: batched getState() calls, added accessibility title to connection dots, added double-click guard on Leave Room button with disabled styling

### File List

- packages/client/src/components/screens/RoomScreen.tsx (NEW)
- packages/client/src/components/screens/RoomScreen.css (NEW)
- packages/client/src/App.tsx (MODIFIED — import RoomScreen, replace placeholder)
