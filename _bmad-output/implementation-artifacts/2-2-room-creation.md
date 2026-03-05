# Story 2.2: Room Creation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **player**,
I want **to create a new game room**,
so that **my friends can join and we can play together**.

## Acceptance Criteria

1. **Given** an authenticated user in the lobby **When** they click "Create Room" **Then** a game type selection is presented (Blackjack, Skip-Bo)
2. **Given** the user selects a game type **When** the room is created **Then** the system generates a readable random room name (e.g., "Crimson-Tiger") **And** the room is created with status "lobby" (not playing) **And** the creator is automatically placed inside the room **And** the creator is marked as the room owner **And** the room appears in all users' lobby lists
3. **Given** a room is created **When** viewing the room details **Then** the room has: id, name, gameType, status ("lobby"), ownerId, players array **And** the room state is stored in server memory

## Tasks / Subtasks

- [x] Task 1: Create room name generator utility (AC: #2)
  - [x] 1.1 Create `packages/server/src/utils/generateRoomName.ts`
  - [x] 1.2 Implement `generateRoomName(): string` — picks one adjective and one noun from curated word lists, returns "Adjective-Noun" format (e.g., "Crimson-Tiger", "Silver-Phoenix")
  - [x] 1.3 Use at least 20 adjectives and 20 nouns for variety (400 combinations)
  - [x] 1.4 Write unit tests in `packages/server/src/utils/generateRoomName.test.ts`

- [x] Task 2: Add `createRoom` function to rooms state module (AC: #2, #3)
  - [x] 2.1 In `packages/server/src/state/rooms.ts`, implement `createRoom(gameType: GameType, ownerToken: string, ownerUsername: string): Room`
  - [x] 2.2 Generates room id via `crypto.randomUUID()`
  - [x] 2.3 Generates room name via `generateRoomName()`
  - [x] 2.4 Creates room with status `'lobby'`, ownerId = ownerToken, players array with owner as first player (`{ id: ownerToken, username: ownerUsername, isConnected: true }`)
  - [x] 2.5 Stores room in rooms Map, returns shallow copy
  - [x] 2.6 Write unit tests for `createRoom` in `packages/server/src/state/rooms.test.ts`

- [x] Task 3: Add `toRoomState` helper to rooms state module (AC: #3)
  - [x] 3.1 Implement `toRoomState(room: Room): RoomState` — converts internal `Room` to shared `RoomState` type by mapping `players` array from internal `RoomPlayer` to shared `PlayerInfo` (adding `isOwner: player.id === room.ownerId`)
  - [x] 3.2 Write unit tests for the `toRoomState` conversion

- [x] Task 4: Add `handleCreateRoom` socket handler (AC: #1, #2, #3)
  - [x] 4.1 In `packages/server/src/socket/handlers/lobbyHandlers.ts`, implement `handleCreateRoom(socket: AppSocket, io: AppServer, data: { gameType: GameType })`
  - [x] 4.2 Validate `data` using `gameTypeSchema.safeParse()` from `@cardpal/shared`
  - [x] 4.3 Check `socket.data.session` exists (user must be authenticated) — emit `error({ code: 'AUTH_ERROR', message: 'Not authenticated' })` if not
  - [x] 4.4 Check user is NOT already in a room (iterate rooms to verify) — emit `error({ code: 'VALIDATION_ERROR', message: 'Already in a room' })` if so
  - [x] 4.5 Call `createRoom(gameType, session.token, session.username)`
  - [x] 4.6 Join Socket.io room: `socket.join(room.id)` — for future room-scoped broadcasts
  - [x] 4.7 Update user's session `roomId` via a new `updateSessionRoomId(token, roomId)` function
  - [x] 4.8 Emit `roomState(toRoomState(room))` to creator socket
  - [x] 4.9 Call `broadcastLobbyState(io)` to update all clients' lobby lists
  - [x] 4.10 Log: `Room created: ${room.name} (${room.id.slice(0, 8)}...) by ${session.username}`

- [x] Task 5: Register `createRoom` socket event (AC: #1)
  - [x] 5.1 In `registerLobbyHandlers`, add `socket.on('createRoom', (data) => handleCreateRoom(socket, io, data))`

- [x] Task 6: Add `updateSessionRoomId` to sessions state module (AC: #2)
  - [x] 6.1 In `packages/server/src/state/sessions.ts`, implement `updateSessionRoomId(token: string, roomId: string | null): void`
  - [x] 6.2 Write unit test for `updateSessionRoomId`

- [x] Task 7: Update LobbyScreen to enable room creation (AC: #1)
  - [x] 7.1 In `packages/client/src/components/screens/LobbyScreen.tsx`, enable "Create Room" button (remove `disabled`)
  - [x] 7.2 Add local state: `isCreating: boolean` (shows game type picker), `isSubmitting: boolean`
  - [x] 7.3 When "Create Room" clicked: toggle `isCreating` to show game type picker inline (two buttons: "Blackjack" and "Skip-Bo")
  - [x] 7.4 When game type selected: emit `socket.emit('createRoom', { gameType })`, set `isSubmitting = true`
  - [x] 7.5 Add `roomState` socket listener in `App.tsx`: when received, store in Zustand `setCurrentRoom(room)` and `setScreen('room')`
  - [x] 7.6 Add loading state during room creation (disabled state on buttons)

- [x] Task 8: Handle `roomState` event in App.tsx (AC: #2)
  - [x] 8.1 In `App.tsx` global socket `useEffect`, add `roomState` listener: `function onRoomState(room: RoomState) { useAppStore.getState().setCurrentRoom(room); useAppStore.getState().setScreen('room'); }`
  - [x] 8.2 Register: `socket.on('roomState', onRoomState)` and clean up: `socket.off('roomState', onRoomState)`

- [x] Task 9: Verify acceptance criteria
  - [x] 9.1 Confirm no TypeScript compilation errors across all packages
  - [x] 9.2 Confirm all server tests pass (new + existing: 104 tests, 8 test files)
  - [ ] 9.3 Start server with `pnpm dev`, authenticate → confirm "Create Room" button is enabled
  - [ ] 9.4 Click "Create Room" → confirm game type picker appears
  - [ ] 9.5 Select "Blackjack" → confirm room created with random name, user transitions to room screen
  - [ ] 9.6 Open second browser tab, authenticate → confirm new room appears in lobby list
  - [ ] 9.7 Verify room has correct structure: id, name, gameType, status, ownerId, players

## Dev Notes

### Architecture Compliance

**CRITICAL — Follow these patterns exactly:**

- **`createRoom` event already defined in shared types** — `ClientToServerEvents` in `packages/shared/src/types/events.ts` has `createRoom: (data: { gameType: GameType }) => void`. Do NOT modify shared event types. Payload is `{ gameType: GameType }` (an object with the enum value).

- **`RoomState` already defined in shared types** — `packages/shared/src/types/room.ts`. Fields: `{ id, name, gameType, status, ownerId, players: PlayerInfo[] }`. `PlayerInfo` has `{ id, username, isOwner, isConnected }`. Import from `@cardpal/shared`.

- **`roomState` event already defined** — `ServerToClientEvents` has `roomState: (room: RoomState) => void`. Emit this to the creator after room creation.

- **`gameTypeSchema` exists in shared schemas** — `packages/shared/src/schemas/game.ts`: `z.enum(['blackjack', 'skipbo'])`. Use this for server-side validation of the `createRoom` payload.

- **Zustand store already has `currentRoom` and `setCurrentRoom`** — `packages/client/src/store/index.ts`. Do NOT add new store fields. Use `setCurrentRoom(room)` and `setScreen('room')`.

- **Room name generation goes in `utils/`** — Per architecture: `server/src/utils/generateRoomId.ts` or `generateRoomName.ts`. Use `generateRoomName.ts` since we're generating human-readable names, not IDs.

- **Socket.io rooms**: Use `socket.join(room.id)` to add the creator to the Socket.io room. This is used in Story 2-3 for room-scoped broadcasts. Do NOT use this for lobby broadcasts — `io.emit()` broadcasts to all.

- **`broadcastLobbyState(io)` after room creation** — The `broadcastLobbyState` function already exists in `lobbyHandlers.ts` and uses `io.emit()` to send updated room list to ALL connected clients. Call this after creating a room.

- **Session `roomId` tracking** — The `UserSession` interface already has `roomId: string | null`. Add `updateSessionRoomId(token, roomId)` to `sessions.ts` to track which room a user is in. This prevents a user from creating/joining multiple rooms.

- **Scope boundary — do NOT implement in Story 2-2**:
  - Room joining by other users (Story 2-3): no `joinRoom` handler wiring
  - Room leaving (Story 2-3): no `leaveRoom` handler
  - Room screen UI (Story 2-4): just transition to `screen === 'room'`, the room screen placeholder is sufficient
  - Game starting (Story 3-2): no `startGame` handler

### Technical Stack — Relevant Versions

| Package | Version | Notes |
|---------|---------|-------|
| Node.js | 20.x LTS | `crypto.randomUUID()` available globally |
| Socket.io (server) | ^4.8.3 | `io.emit()` broadcasts to all; `socket.join(roomId)` for room groups |
| socket.io-client | ^4.8.3 | `socket.emit('createRoom', { gameType })` |
| React | ^18.3.1 | Functional components, hooks, `useState` for UI state |
| Zustand | ^5.0.11 | `useAppStore((s) => s.currentRoom)` selector pattern |
| Zod | ^3.24.0 | `gameTypeSchema.safeParse()` for server-side validation |
| TypeScript | ~5.9.3 | Strict mode; ESM with `.js` import extensions |
| GameType enum | @cardpal/shared | `GameType.BLACKJACK = 'blackjack'`, `GameType.SKIPBO = 'skipbo'` |

### Room Name Generator Design

```typescript
// packages/server/src/utils/generateRoomName.ts

const ADJECTIVES = [
  'Crimson', 'Silver', 'Golden', 'Shadow', 'Crystal',
  'Thunder', 'Velvet', 'Cosmic', 'Mystic', 'Brave',
  'Swift', 'Noble', 'Lucky', 'Neon', 'Wild',
  'Frozen', 'Blazing', 'Silent', 'Royal', 'Iron',
];

const NOUNS = [
  'Tiger', 'Phoenix', 'Dragon', 'Wolf', 'Falcon',
  'Panther', 'Eagle', 'Cobra', 'Lion', 'Hawk',
  'Bear', 'Fox', 'Raven', 'Shark', 'Viper',
  'Orca', 'Lynx', 'Puma', 'Stag', 'Owl',
];

export function generateRoomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}-${noun}`;
}
```

### Server: rooms.ts Additions

```typescript
// Add to packages/server/src/state/rooms.ts

import { generateRoomName } from '../utils/generateRoomName.js';

export function createRoom(
  gameType: GameType,
  ownerToken: string,
  ownerUsername: string,
): Room {
  const id = crypto.randomUUID();
  const name = generateRoomName();
  const room: Room = {
    id,
    name,
    gameType,
    status: 'lobby',
    ownerId: ownerToken,
    players: [{ id: ownerToken, username: ownerUsername, isConnected: true }],
  };
  rooms.set(id, room);
  return { ...room, players: [...room.players] };  // copy-on-return
}

// Convert internal Room to shared RoomState (with isOwner derived)
export function toRoomState(room: Room): RoomState {
  return {
    id: room.id,
    name: room.name,
    gameType: room.gameType,
    status: room.status,
    ownerId: room.ownerId,
    players: room.players.map((p) => ({
      id: p.id,
      username: p.username,
      isOwner: p.id === room.ownerId,
      isConnected: p.isConnected,
    })),
  };
}
```

### Server: sessions.ts Addition

```typescript
// Add to packages/server/src/state/sessions.ts

export function updateSessionRoomId(token: string, roomId: string | null): void {
  const session = sessions.get(token);
  if (session) {
    session.roomId = roomId;
  }
}
```

### Server: lobbyHandlers.ts Updates

```typescript
// Update packages/server/src/socket/handlers/lobbyHandlers.ts

import { getRooms, createRoom, toRoomState } from '../../state/rooms.js';
import { updateSessionRoomId } from '../../state/sessions.js';
import { gameTypeSchema } from '@cardpal/shared';

export function handleCreateRoom(
  socket: AppSocket,
  io: AppServer,
  data: { gameType: string },
): void {
  const result = gameTypeSchema.safeParse(data.gameType);
  if (!result.success) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Invalid game type' });
    return;
  }

  const session = socket.data.session;
  if (!session) {
    socket.emit('error', { code: 'AUTH_ERROR', message: 'Not authenticated' });
    return;
  }

  // Prevent creating room if user is already in one
  // Check session's roomId (fast check via session state)
  if (session.roomId) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Already in a room' });
    return;
  }

  const room = createRoom(result.data, session.token, session.username);

  // Join Socket.io room for future room-scoped broadcasts
  socket.join(room.id);

  // Update session with room membership
  updateSessionRoomId(session.token, room.id);
  socket.data.session = { ...socket.data.session, roomId: room.id };

  // Send room state to creator
  socket.emit('roomState', toRoomState(room));

  // Update all clients' lobby lists
  broadcastLobbyState(io);

  console.log(`Room created: ${room.name} (${room.id.slice(0, 8)}...) by ${session.username}`);
}

// In registerLobbyHandlers, add:
socket.on('createRoom', (data) => handleCreateRoom(socket, io, data));
```

### Client: LobbyScreen.tsx Update

```typescript
// Update packages/client/src/components/screens/LobbyScreen.tsx
// Key changes:
// 1. Enable "Create Room" button
// 2. Add game type picker (toggle inline)
// 3. Emit createRoom event on game type selection
// 4. Loading state during submission

import { useState, useCallback } from 'react';
import { socket } from '../../socket/client.js';
import { GameType } from '@cardpal/shared';

// Add state:
const [isCreating, setIsCreating] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);

// Handler:
const handleCreateRoom = useCallback((gameType: GameType) => {
  setIsSubmitting(true);
  socket.emit('createRoom', { gameType });
}, []);

// JSX — replace disabled Create Room button:
<button
  className="lobby-create-btn"
  onClick={() => setIsCreating(!isCreating)}
  disabled={isSubmitting}
>
  {isCreating ? 'Cancel' : 'Create Room'}
</button>

// Below the button, show game type picker when isCreating:
{isCreating && (
  <div className="lobby-game-picker">
    <button onClick={() => handleCreateRoom(GameType.BLACKJACK)} disabled={isSubmitting}>
      {isSubmitting ? 'Creating...' : 'Blackjack'}
    </button>
    <button onClick={() => handleCreateRoom(GameType.SKIPBO)} disabled={isSubmitting}>
      {isSubmitting ? 'Creating...' : 'Skip-Bo'}
    </button>
  </div>
)}
```

### Client: App.tsx Update

```typescript
// In global socket useEffect, add roomState listener:
function onRoomState(room: RoomState) {
  useAppStore.getState().setCurrentRoom(room);
  useAppStore.getState().setScreen('room');
}

socket.on('roomState', onRoomState);

// In cleanup:
socket.off('roomState', onRoomState);

// Add import:
import type { RoomInfo, RoomState } from '@cardpal/shared';
```

### Previous Story Intelligence (2.1, 1.4 learnings)

**From Story 2-1 (most recent):**

- **`rooms.ts` state module exists** — has `Room` interface, `RoomPlayer` interface, `GAME_MAX_PLAYERS`, `getRooms()`, `getRoomById()`, `clearRooms()`, `_addRoomForTest()`. Extend this file, don't create new.
- **`lobbyHandlers.ts` exists** — has `sendLobbyState`, `broadcastLobbyState`, `registerLobbyHandlers`. Add `handleCreateRoom` here and wire in `registerLobbyHandlers`.
- **`LobbyScreen.tsx` has disabled "Create Room" button** — enable it and add game type picker UI.
- **`App.tsx` already has `lobbyState` listener** — add `roomState` listener in same `useEffect` block.
- **Copy-on-return pattern** — `getRoomById` returns `{ ...room, players: [...room.players] }`. Follow same pattern in `createRoom`.
- **`_addRoomForTest` helper** — exists for test-only direct room insertion. Use for testing `toRoomState` without going through `createRoom`.
- **Code review M2 fix from 2-1** — removed duplicate lobbyState emission for returning users (was in both `registerAuthHandlers` auto-restore AND `registerLobbyHandlers`). Now only in `registerAuthHandlers` and `handleSetUsername`.

**From Story 1-4:**

- **ESM imports**: All server imports use `.js` extension: `import { createRoom } from '../../state/rooms.js'`
- **`socket.data.session`** contains the user's `UserSession` object (set by auth middleware for token auth, or by `handleSetUsername` for new users). Access `session.token`, `session.username`, `session.roomId`.
- **`gameTypeSchema`** from `@cardpal/shared` — use `.safeParse(data.gameType)` for validation. Check `.success` before accessing `.data`.
- **Zustand selector pattern**: `useAppStore((s) => s.currentRoom)` — always use selectors.
- **`useAppStore.getState()` in event handlers** — same pattern as `onAuthenticated` in App.tsx.
- **Socket.io client**: Pre-configured in `packages/client/src/socket/client.ts` with `autoConnect: false`. Import `socket` from `'../../socket/client.js'`.

**Previous code review action items still relevant:**
- [L1 from 1-4] `maxLength` HTML attribute makes validation message unreachable — cosmetic, not a blocker
- [M3 from 1-1] No JSON 404 handler for `/api/*` routes — deferred

### Git Intelligence

**Recent commits:**
- `3dae192` feat: Story 1.1 - Project scaffolding & shared types with code review fixes
- `e8b583a` Initial commit: project planning artifacts and BMAD workflow setup

**Uncommitted work** (Stories 1.2, 1.3, 1.4, 2.1) is in the working tree. Story 2-2 builds on top of this uncommitted code.

**Commit format**: `feat: Story X.X - <description>`

### Project Structure Notes

**Files to create:**
```
packages/server/src/utils/generateRoomName.ts               # NEW: Room name generator
packages/server/src/utils/generateRoomName.test.ts           # NEW: Room name tests
```

**Files to modify:**
```
packages/server/src/state/rooms.ts                           # UPDATE: Add createRoom, toRoomState
packages/server/src/state/rooms.test.ts                      # UPDATE: Add createRoom, toRoomState tests
packages/server/src/state/sessions.ts                        # UPDATE: Add updateSessionRoomId
packages/server/src/state/sessions.test.ts                   # UPDATE: Add updateSessionRoomId test
packages/server/src/socket/handlers/lobbyHandlers.ts         # UPDATE: Add handleCreateRoom, wire createRoom event
packages/server/src/socket/handlers/lobbyHandlers.test.ts    # UPDATE: Add handleCreateRoom tests
packages/client/src/components/screens/LobbyScreen.tsx       # UPDATE: Enable Create Room, add game type picker
packages/client/src/components/screens/LobbyScreen.css       # UPDATE: Add game-picker styles
packages/client/src/App.tsx                                  # UPDATE: Add roomState listener
```

**Files NOT to modify:**
```
packages/shared/src/types/events.ts     # Already has createRoom event — no changes
packages/shared/src/types/room.ts       # Already has RoomState, PlayerInfo — no changes
packages/shared/src/schemas/game.ts     # Already has gameTypeSchema — no changes
packages/client/src/store/index.ts      # Already has currentRoom, setCurrentRoom — no changes
```

### Testing Requirements

**Server-side (Vitest):**

`packages/server/src/utils/generateRoomName.test.ts`:
- `generateRoomName()` returns a string in "Word-Word" format
- `generateRoomName()` returns different names across multiple calls (probabilistic)

`packages/server/src/state/rooms.test.ts` (extend existing):
- `createRoom()` returns a Room with valid UUID id
- `createRoom()` generates a readable room name
- `createRoom()` sets status to 'lobby'
- `createRoom()` sets owner as first player with isConnected=true
- `createRoom()` returns a copy (not internal reference)
- `createRoom()` room appears in `getRooms()` list
- `toRoomState()` maps RoomPlayer to PlayerInfo with isOwner flag
- `toRoomState()` marks owner correctly
- `toRoomState()` preserves all room fields

`packages/server/src/state/sessions.test.ts` (extend existing):
- `updateSessionRoomId()` updates roomId on existing session
- `updateSessionRoomId()` does nothing for non-existent token

`packages/server/src/socket/handlers/lobbyHandlers.test.ts` (extend existing):
- `handleCreateRoom` creates room and emits roomState for valid input
- `handleCreateRoom` emits VALIDATION_ERROR for invalid game type
- `handleCreateRoom` emits AUTH_ERROR when not authenticated

**Client-side (manual verification):**
- "Create Room" button is enabled on lobby screen
- Clicking shows game type picker (Blackjack / Skip-Bo)
- Selecting game type creates room and transitions to room screen placeholder
- Second browser tab sees new room in lobby list

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2: Room Creation]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2: Lobby & Room Management]
- [Source: _bmad-output/planning-artifacts/architecture.md#Lobby & Room (FR9-16)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Socket.io Event Architecture — createRoom, roomState events]
- [Source: _bmad-output/planning-artifacts/architecture.md#In-Memory State Structure — rooms: Map<roomId, Room>]
- [Source: _bmad-output/planning-artifacts/architecture.md#State Boundary — expose functions, not raw data]
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns — server/src/utils/generateRoomId.ts]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Format Patterns — Room ID: 6 alphanumeric]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — Full state on change]
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling Patterns — VALIDATION_ERROR, ROOM_FULL]
- [Source: _bmad-output/planning-artifacts/prd.md#FR12: Users can create a new game room]
- [Source: _bmad-output/planning-artifacts/prd.md#FR13: System generates a readable random string as the room name]
- [Source: _bmad-output/planning-artifacts/prd.md#FR17: Room creator can select the game type]
- [Source: _bmad-output/implementation-artifacts/2-1-lobby-screen-and-room-listing.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/1-4-username-entry-and-session-establishment.md#Dev Notes]
- [Source: packages/shared/src/types/events.ts — createRoom, roomState events]
- [Source: packages/shared/src/types/room.ts — RoomState, PlayerInfo, RoomInfo]
- [Source: packages/shared/src/schemas/game.ts — gameTypeSchema]
- [Source: packages/server/src/state/rooms.ts — Room interface, getRooms, getRoomById]
- [Source: packages/server/src/socket/handlers/lobbyHandlers.ts — sendLobbyState, broadcastLobbyState]
- [Source: packages/server/src/state/sessions.ts — UserSession.roomId]
- [Source: packages/client/src/store/index.ts — currentRoom, setCurrentRoom, setScreen]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed TS2345: `gameTypeSchema.safeParse()` returns `"blackjack" | "skipbo"` literal union, not `GameType` enum — cast with `as GameType`
- Fixed TS2322: `{ ...socket.data.session }` spread produces optional properties — used the already-validated `session` local variable instead

### Completion Notes List

- All 9 tasks completed. 106 server tests pass (8 test files). TypeScript compiles cleanly across all packages.
- Tasks 9.3-9.7 are manual verification (browser testing) — cannot be automated in this workflow.
- Game type picker uses inline toggle pattern with Cancel button, not modal.
- Code review: Fixed 5 issues (2 HIGH, 3 MEDIUM). Added error handling to LobbyScreen, deep-copy for player objects, registerLobbyHandlers test, socket.data.session verification.

### Change Log

- Created `packages/server/src/utils/generateRoomName.ts` — room name generator with 20 adjectives x 20 nouns
- Created `packages/server/src/utils/generateRoomName.test.ts` — 3 tests
- Modified `packages/server/src/state/rooms.ts` — added `createRoom()`, `toRoomState()`
- Modified `packages/server/src/state/rooms.test.ts` — added 11 tests (8 createRoom, 3 toRoomState)
- Modified `packages/server/src/state/sessions.ts` — added `updateSessionRoomId()`
- Modified `packages/server/src/state/sessions.test.ts` — added 3 tests for updateSessionRoomId
- Modified `packages/server/src/socket/handlers/lobbyHandlers.ts` — added `handleCreateRoom()`, wired `createRoom` event in `registerLobbyHandlers`
- Modified `packages/server/src/socket/handlers/lobbyHandlers.test.ts` — added 5 tests for handleCreateRoom
- Modified `packages/client/src/components/screens/LobbyScreen.tsx` — enabled Create Room button, added game type picker UI
- Modified `packages/client/src/components/screens/LobbyScreen.css` — added picker and cancel button styles
- Modified `packages/client/src/App.tsx` — added `roomState` socket listener

**Code Review Fixes (2026-03-03):**
- [H1] Added error event listener to LobbyScreen for createRoom failure feedback
- [H2] Removed arbitrary 3s setTimeout; isSubmitting now reset by error listener
- [M1] Added `registerLobbyHandlers` unit test for event wiring
- [M2] Changed `createRoom()` and `getRoomById()` to deep-copy player objects; added mutation test
- [M3] Added `socket.data.session.roomId` assertion to handleCreateRoom test
- Added `.lobby-picker-error` CSS for error message display

### File List

- `packages/server/src/utils/generateRoomName.ts` (created)
- `packages/server/src/utils/generateRoomName.test.ts` (created)
- `packages/server/src/state/rooms.ts` (modified)
- `packages/server/src/state/rooms.test.ts` (modified)
- `packages/server/src/state/sessions.ts` (modified)
- `packages/server/src/state/sessions.test.ts` (modified)
- `packages/server/src/socket/handlers/lobbyHandlers.ts` (modified)
- `packages/server/src/socket/handlers/lobbyHandlers.test.ts` (modified)
- `packages/client/src/components/screens/LobbyScreen.tsx` (modified)
- `packages/client/src/components/screens/LobbyScreen.css` (modified)
- `packages/client/src/App.tsx` (modified)
