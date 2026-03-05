# Story 2.3: Join & Leave Room

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **player**,
I want **to join an available room or leave a room I'm in**,
so that **I can play with friends or switch to a different game**.

## Acceptance Criteria

1. **Given** an authenticated user in the lobby **When** they click on a room that is in "lobby" status **Then** they join the room **And** they are navigated to the room screen **And** the player count updates for all users viewing the lobby **And** their session is updated with the roomId
2. **Given** a room is in "playing" status (game in progress) **When** a user attempts to join **Then** the join is rejected **And** an error message is displayed: "Game in progress"
3. **Given** a user is inside a room in "lobby" status **When** they click "Leave Room" **Then** they are removed from the room **And** they return to the lobby screen **And** the room's player count updates for all users
4. **Given** the room owner leaves the room **When** other players remain **Then** ownership transfers to the next player who joined **And** all players in the room are notified of the new owner
5. **Given** the last player leaves a room **When** the room becomes empty **Then** the room is deleted from the server **And** it disappears from all lobby lists

## Tasks / Subtasks

- [x] Task 1: Add room state mutation functions to rooms module (AC: #1, #3, #4, #5)
  - [x] 1.1 In `packages/server/src/state/rooms.ts`, implement `addPlayerToRoom(roomId: string, playerToken: string, username: string): Room | null` — adds player to room's players array, returns updated room copy or null if room not found
  - [x] 1.2 Implement `removePlayerFromRoom(roomId: string, playerToken: string): { room: Room | null; deleted: boolean }` — removes player, handles ownership transfer (set `ownerId` to next player in array), deletes room if empty, returns updated room (or null if deleted) plus `deleted` flag
  - [x] 1.3 Write unit tests for `addPlayerToRoom`: successful add, room not found, player already in room
  - [x] 1.4 Write unit tests for `removePlayerFromRoom`: successful remove, owner leaves (ownership transfers), last player leaves (room deleted), non-existent room

- [x] Task 2: Add `handleJoinRoom` socket handler (AC: #1, #2)
  - [x] 2.1 In `packages/server/src/socket/handlers/lobbyHandlers.ts`, implement `handleJoinRoom(socket: AppSocket, io: AppServer, data: { roomId: string })`
  - [x] 2.2 Auth check: `socket.data.session` must exist — emit `error({ code: 'AUTH_ERROR', message: 'Not authenticated' })` if not
  - [x] 2.3 Already-in-room check: `session.roomId` must be null — emit `error({ code: 'VALIDATION_ERROR', message: 'Already in a room' })` if not
  - [x] 2.4 Room exists check: `getRoomById(data.roomId)` — emit `error({ code: 'ROOM_NOT_FOUND', message: 'Room not found' })` if null
  - [x] 2.5 Room status check: room must be `'lobby'` — emit `error({ code: 'GAME_IN_PROGRESS', message: 'Game in progress' })` if `'playing'`
  - [x] 2.6 Room capacity check: `room.players.length < GAME_MAX_PLAYERS[room.gameType]` — emit `error({ code: 'ROOM_FULL', message: 'Room is full' })` if at max
  - [x] 2.7 Call `addPlayerToRoom(data.roomId, session.token, session.username)`
  - [x] 2.8 `socket.join(room.id)` — join Socket.io room group
  - [x] 2.9 `updateSessionRoomId(session.token, room.id)` and update `socket.data.session`
  - [x] 2.10 Emit `roomState(toRoomState(updatedRoom))` to all players in room: `io.to(room.id).emit('roomState', toRoomState(updatedRoom))`
  - [x] 2.11 Call `broadcastLobbyState(io)` to update all lobby lists
  - [x] 2.12 Log: `Player joined: ${session.username} → ${room.name}`

- [x] Task 3: Add `handleLeaveRoom` socket handler (AC: #3, #4, #5)
  - [x] 3.1 In `packages/server/src/socket/handlers/lobbyHandlers.ts`, implement `handleLeaveRoom(socket: AppSocket, io: AppServer)`
  - [x] 3.2 Auth check: session must exist — emit `error` if not
  - [x] 3.3 Room check: `session.roomId` must not be null — emit `error({ code: 'VALIDATION_ERROR', message: 'Not in a room' })` if null
  - [x] 3.4 Call `removePlayerFromRoom(session.roomId, session.token)` — returns `{ room, deleted }`
  - [x] 3.5 `socket.leave(session.roomId)` — leave Socket.io room group
  - [x] 3.6 `updateSessionRoomId(session.token, null)` and update `socket.data.session`
  - [x] 3.7 If room NOT deleted: emit `roomState(toRoomState(room))` to remaining players in room via `io.to(room.id).emit(...)`
  - [x] 3.8 Call `broadcastLobbyState(io)` to update all lobby lists (reflects player count change or room deletion)
  - [x] 3.9 Emit `lobbyState` to the leaving socket directly: `sendLobbyState(socket)` (they need the latest lobby when returning)
  - [x] 3.10 Log: `Player left: ${session.username} ← room (${deleted ? 'room deleted' : 'room kept'})`

- [x] Task 4: Register `joinRoom` and `leaveRoom` socket events (AC: #1, #3)
  - [x] 4.1 In `registerLobbyHandlers`, add `socket.on('joinRoom', (data) => handleJoinRoom(socket, io, data))`
  - [x] 4.2 Add `socket.on('leaveRoom', () => handleLeaveRoom(socket, io))`
  - [x] 4.3 Remove the placeholder comment about Story 2-3

- [x] Task 5: Write handler tests (AC: #1, #2, #3, #4, #5)
  - [x] 5.1 In `packages/server/src/socket/handlers/lobbyHandlers.test.ts`, add `handleJoinRoom` tests:
    - Valid join: emits roomState to room, broadcasts lobbyState, updates session
    - AUTH_ERROR when not authenticated
    - VALIDATION_ERROR when already in a room
    - ROOM_NOT_FOUND for non-existent room
    - GAME_IN_PROGRESS for playing room
    - ROOM_FULL when at max capacity
  - [x] 5.2 Add `handleLeaveRoom` tests:
    - Valid leave: leaves Socket.io room, updates session, broadcasts lobby
    - Owner leaves with remaining players: ownership transfers to next player
    - Last player leaves: room deleted, lobby updated
    - Not in a room: emits error
    - Not authenticated: emits error

- [x] Task 6: Update LobbyScreen to support room joining (AC: #1, #2)
  - [x] 6.1 In `packages/client/src/components/screens/LobbyScreen.tsx`, make room items clickable — wrap each `<li>` in a click handler
  - [x] 6.2 On room click: emit `socket.emit('joinRoom', { roomId: room.id })`
  - [x] 6.3 Add `isJoining` local state to disable room clicks while joining
  - [x] 6.4 Handle join errors via the existing error listener (add `ROOM_FULL`, `ROOM_NOT_FOUND`, `GAME_IN_PROGRESS` codes)
  - [x] 6.5 Display error message for join failures (reuse `errorMessage` state)
  - [x] 6.6 Add visual affordance for clickable rooms (cursor: pointer, hover state already exists in CSS)
  - [x] 6.7 Show room status — if "playing", show a disabled/greyed visual indicator

- [x] Task 7: Handle `leaveRoom` in room screen placeholder (AC: #3)
  - [x] 7.1 In `packages/client/src/App.tsx`, update the room screen placeholder to include a "Leave Room" button
  - [x] 7.2 On click: emit `socket.emit('leaveRoom')`, then `setCurrentRoom(null)` and `setScreen('lobby')`
  - [x] 7.3 Note: The full RoomScreen component is Story 2-4 — this is a minimal placeholder with Leave Room functionality

- [x] Task 8: Verify acceptance criteria
  - [x] 8.1 TypeScript compilation: no errors across all packages
  - [x] 8.2 All server tests pass (new + existing)
  - [x] 8.3 Manual: click room in lobby → join, see room screen placeholder with Leave button
  - [x] 8.4 Manual: click Leave Room → return to lobby, room list updated
  - [x] 8.5 Manual: second tab sees updated player count
  - [x] 8.6 Manual: owner leaves with another player in room → verify ownership transfer

## Dev Notes

### Architecture Compliance

**CRITICAL — Follow these patterns exactly:**

- **`joinRoom` event already defined in shared types** — `ClientToServerEvents` in `packages/shared/src/types/events.ts` has `joinRoom: (data: { roomId: string }) => void`. Payload is an object `{ roomId }`, NOT a raw string.

- **`leaveRoom` event already defined** — `ClientToServerEvents` has `leaveRoom: () => void`. No payload — server infers room from `session.roomId`.

- **`roomState` event already defined** — `ServerToClientEvents` has `roomState: (room: RoomState) => void`. Used for BOTH join confirmation and room updates when players change.

- **Error codes from `@cardpal/shared`** — Use existing error codes: `ROOM_FULL`, `ROOM_NOT_FOUND`, `GAME_IN_PROGRESS`, `AUTH_ERROR`, `VALIDATION_ERROR`. These are defined in `packages/shared/src/types/errors.ts` as `ErrorCode` union type.

- **Socket.io room-scoped broadcasts** — Use `io.to(roomId).emit('roomState', ...)` to broadcast room state updates to all players IN the room. Use `io.emit('lobbyState', ...)` (via `broadcastLobbyState`) to broadcast to ALL connected clients.

- **`socket.join(roomId)` / `socket.leave(roomId)`** — These are Socket.io methods for managing room membership. Join when a player enters a room, leave when they exit. These control which sockets receive `io.to(roomId).emit()` broadcasts.

- **Session `roomId` tracking** — `updateSessionRoomId(token, roomId)` already exists in `sessions.ts`. Set to `room.id` on join, `null` on leave. Also update `socket.data.session` to keep the in-memory socket data consistent.

- **`broadcastLobbyState(io)` after join/leave** — Call this after any room membership change so all lobby viewers see updated player counts or room deletions.

- **Copy-on-return pattern** — All state getters return copies. `addPlayerToRoom` and `removePlayerFromRoom` must follow this pattern.

- **Deep-copy players** — Code review from Story 2-2 established that player objects must be deep-copied: `room.players.map((p) => ({ ...p }))`. Follow this in all new room state functions.

- **`toRoomState(room)` converts internal Room to shared RoomState** — Already exists. Use for all `roomState` emissions.

- **Scope boundary — do NOT implement in Story 2-3:**
  - Room screen UI with player list (Story 2-4)
  - Game starting (Story 3-2)
  - Disconnect handling (Story 4-3)

### Technical Stack — Relevant Versions

| Package | Version | Notes |
|---------|---------|-------|
| Node.js | 20.x LTS | `crypto.randomUUID()` available globally |
| Socket.io (server) | ^4.8.3 | `io.to(roomId).emit()` for room-scoped; `socket.join()` / `socket.leave()` |
| socket.io-client | ^4.8.3 | `socket.emit('joinRoom', { roomId })`, `socket.emit('leaveRoom')` |
| React | ^18.3.1 | Functional components, hooks |
| Zustand | ^5.0.11 | `useAppStore((s) => s.currentRoom)` selector pattern |
| TypeScript | ~5.9.3 | Strict mode; ESM with `.js` import extensions |
| Vitest | ^4.0.18 | Server test framework, 106 tests currently passing |

### Server: rooms.ts Additions

```typescript
// Add to packages/server/src/state/rooms.ts

export function addPlayerToRoom(
  roomId: string,
  playerToken: string,
  username: string,
): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  // Prevent duplicate joins
  if (room.players.some((p) => p.id === playerToken)) {
    return { ...room, players: room.players.map((p) => ({ ...p })) };
  }
  room.players.push({ id: playerToken, username, isConnected: true });
  return { ...room, players: room.players.map((p) => ({ ...p })) };
}

export function removePlayerFromRoom(
  roomId: string,
  playerToken: string,
): { room: Room | null; deleted: boolean } {
  const room = rooms.get(roomId);
  if (!room) return { room: null, deleted: false };

  room.players = room.players.filter((p) => p.id !== playerToken);

  if (room.players.length === 0) {
    rooms.delete(roomId);
    return { room: null, deleted: true };
  }

  // Transfer ownership if the leaving player was the owner
  if (room.ownerId === playerToken) {
    room.ownerId = room.players[0]!.id;
  }

  return { room: { ...room, players: room.players.map((p) => ({ ...p })) }, deleted: false };
}
```

### Server: lobbyHandlers.ts Additions

```typescript
// Add to packages/server/src/socket/handlers/lobbyHandlers.ts

import { getRoomById, addPlayerToRoom, removePlayerFromRoom, GAME_MAX_PLAYERS } from '../../state/rooms.js';

export function handleJoinRoom(
  socket: AppSocket,
  io: AppServer,
  data: { roomId: string },
): void {
  const session = socket.data.session;
  if (!session) {
    socket.emit('error', { code: 'AUTH_ERROR', message: 'Not authenticated' });
    return;
  }

  if (session.roomId) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Already in a room' });
    return;
  }

  const room = getRoomById(data.roomId);
  if (!room) {
    socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    return;
  }

  if (room.status === 'playing') {
    socket.emit('error', { code: 'GAME_IN_PROGRESS', message: 'Game in progress' });
    return;
  }

  if (room.players.length >= GAME_MAX_PLAYERS[room.gameType]) {
    socket.emit('error', { code: 'ROOM_FULL', message: 'Room is full' });
    return;
  }

  const updatedRoom = addPlayerToRoom(data.roomId, session.token, session.username);
  if (!updatedRoom) return; // should not happen after getRoomById check

  socket.join(updatedRoom.id);
  updateSessionRoomId(session.token, updatedRoom.id);
  socket.data.session = { ...session, roomId: updatedRoom.id };

  io.to(updatedRoom.id).emit('roomState', toRoomState(updatedRoom));
  broadcastLobbyState(io);

  console.log(`Player joined: ${session.username} → ${updatedRoom.name}`);
}

export function handleLeaveRoom(
  socket: AppSocket,
  io: AppServer,
): void {
  const session = socket.data.session;
  if (!session) {
    socket.emit('error', { code: 'AUTH_ERROR', message: 'Not authenticated' });
    return;
  }

  if (!session.roomId) {
    socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Not in a room' });
    return;
  }

  const roomId = session.roomId;
  const { room, deleted } = removePlayerFromRoom(roomId, session.token);

  socket.leave(roomId);
  updateSessionRoomId(session.token, null);
  socket.data.session = { ...session, roomId: null };

  if (!deleted && room) {
    io.to(roomId).emit('roomState', toRoomState(room));
  }

  broadcastLobbyState(io);
  sendLobbyState(socket); // send lobby state directly to the leaving player

  console.log(`Player left: ${session.username} ← room (${deleted ? 'room deleted' : 'room kept'})`);
}

// In registerLobbyHandlers, add:
socket.on('joinRoom', (data) => handleJoinRoom(socket, io, data));
socket.on('leaveRoom', () => handleLeaveRoom(socket, io));
```

### Client: LobbyScreen.tsx Updates

```typescript
// Key changes:
// 1. Make room items clickable (emit joinRoom on click)
// 2. Add isJoining state to prevent double-clicks
// 3. Handle join error codes in existing error listener
// 4. Show status indicator for "playing" rooms

function handleJoinRoom(roomId: string) {
  setIsJoining(true);
  setErrorMessage(null);
  socket.emit('joinRoom', { roomId });
  // roomState listener in App.tsx handles the screen transition on success
}

// Update error listener to also handle join errors:
function onError(err: ErrorPayload) {
  if (['VALIDATION_ERROR', 'AUTH_ERROR', 'ROOM_FULL', 'ROOM_NOT_FOUND', 'GAME_IN_PROGRESS'].includes(err.code)) {
    setErrorMessage(err.message);
    setIsSubmitting(false);
    setIsJoining(false);
  }
}
```

### Client: App.tsx Updates

```typescript
// Update the room screen placeholder to include a Leave Room button:
{screen === 'room' && (
  <div>
    <p>Room Screen (Story 2.4)</p>
    <button onClick={() => {
      socket.emit('leaveRoom');
      useAppStore.getState().setCurrentRoom(null);
      useAppStore.getState().setScreen('lobby');
    }}>
      Leave Room
    </button>
  </div>
)}
```

### Previous Story Intelligence (2.2, 2.1 learnings)

**From Story 2-2 (most recent):**

- **`rooms.ts` has `createRoom`, `getRoomById`, `toRoomState`, `GAME_MAX_PLAYERS`** — extend with `addPlayerToRoom`, `removePlayerFromRoom`. Do NOT create separate files.
- **`lobbyHandlers.ts` has `handleCreateRoom`, `broadcastLobbyState`, `sendLobbyState`** — add `handleJoinRoom`, `handleLeaveRoom` here.
- **`registerLobbyHandlers` has placeholder comment** — line 52: `// joinRoom, leaveRoom registered in Story 2-3.` — replace with actual registrations.
- **Deep-copy pattern** — Code review fix: `room.players.map((p) => ({ ...p }))` for player objects. Follow this in `addPlayerToRoom` and `removePlayerFromRoom`.
- **`as GameType` cast** — needed when passing Zod result to typed function. Not needed for 2-3 (no game type validation).
- **`socket.data.session` update pattern** — `socket.data.session = { ...session, roomId: room.id }` to keep socket data consistent.
- **LobbyScreen has error handling** — `useEffect` with `socket.on('error', onError)` already exists. Extend error code list to include join errors.
- **App.tsx `roomState` listener already exists** — `onRoomState` sets `currentRoom` and `screen='room'`. Join uses same mechanism — server emits `roomState` to joined socket.

**From Story 2-1:**

- **`io.to(roomId).emit()`** — Room-scoped broadcast. This is how we send `roomState` to all players in a room after join/leave.
- **Copy-on-return consistently** — All functions returning Room objects must deep-copy.

**Previous code review patterns:**
- Always test event handler registration (registerLobbyHandlers)
- Always test socket.data.session mutation
- Always handle error codes on client side

### Git Intelligence

**Recent commits:**
- `3dae192` feat: Story 1.1 - Project scaffolding & shared types with code review fixes
- `e8b583a` Initial commit: project planning artifacts and BMAD workflow setup

**Uncommitted work** includes all Stories 1.2-1.4 and 2.1-2.2. Story 2-3 builds on this.

**Commit format**: `feat: Story X.X - <description>`

### Project Structure Notes

**Files to modify:**
```
packages/server/src/state/rooms.ts                           # UPDATE: Add addPlayerToRoom, removePlayerFromRoom
packages/server/src/state/rooms.test.ts                      # UPDATE: Add tests for new functions
packages/server/src/socket/handlers/lobbyHandlers.ts         # UPDATE: Add handleJoinRoom, handleLeaveRoom, register events
packages/server/src/socket/handlers/lobbyHandlers.test.ts    # UPDATE: Add handler tests
packages/client/src/components/screens/LobbyScreen.tsx       # UPDATE: Make rooms clickable, add join flow
packages/client/src/components/screens/LobbyScreen.css       # UPDATE: Add join-related styles (clickable rooms, status)
packages/client/src/App.tsx                                  # UPDATE: Add Leave Room button to room placeholder
```

**Files NOT to modify:**
```
packages/shared/src/types/events.ts     # Already has joinRoom, leaveRoom events — no changes
packages/shared/src/types/room.ts       # Already has RoomState, PlayerInfo — no changes
packages/shared/src/types/errors.ts     # Already has ROOM_FULL, ROOM_NOT_FOUND, GAME_IN_PROGRESS — no changes
packages/client/src/store/index.ts      # Already has currentRoom, setCurrentRoom — no changes
packages/server/src/state/sessions.ts   # Already has updateSessionRoomId — no changes
```

### Testing Requirements

**Server-side (Vitest):**

`packages/server/src/state/rooms.test.ts` (extend existing):
- `addPlayerToRoom()` adds player to existing room
- `addPlayerToRoom()` returns null for non-existent room
- `addPlayerToRoom()` handles duplicate player (idempotent)
- `removePlayerFromRoom()` removes player from room
- `removePlayerFromRoom()` transfers ownership when owner leaves
- `removePlayerFromRoom()` deletes room when last player leaves
- `removePlayerFromRoom()` returns null for non-existent room

`packages/server/src/socket/handlers/lobbyHandlers.test.ts` (extend existing):
- `handleJoinRoom` valid join: emits roomState, broadcasts lobby, updates session
- `handleJoinRoom` AUTH_ERROR when not authenticated
- `handleJoinRoom` VALIDATION_ERROR when already in room
- `handleJoinRoom` ROOM_NOT_FOUND for non-existent room
- `handleJoinRoom` GAME_IN_PROGRESS for playing room
- `handleJoinRoom` ROOM_FULL at max capacity
- `handleLeaveRoom` valid leave: leaves room, broadcasts, updates session
- `handleLeaveRoom` owner leaves with others: ownership transfers
- `handleLeaveRoom` last player: room deleted
- `handleLeaveRoom` not in room: emits error
- `handleLeaveRoom` not authenticated: emits error
- `registerLobbyHandlers` registers joinRoom and leaveRoom events

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3: Join & Leave Room]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2: Lobby & Room Management]
- [Source: _bmad-output/planning-artifacts/architecture.md#Socket.io Event Architecture — joinRoom, leaveRoom events]
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling Patterns — ROOM_FULL, ROOM_NOT_FOUND, GAME_IN_PROGRESS]
- [Source: _bmad-output/planning-artifacts/architecture.md#State Boundary — expose functions, not raw data]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns — io.to(roomId).emit for room-scoped]
- [Source: packages/shared/src/types/events.ts — joinRoom, leaveRoom events]
- [Source: packages/shared/src/types/room.ts — RoomState, PlayerInfo, RoomInfo]
- [Source: packages/shared/src/types/errors.ts — ErrorCode: ROOM_FULL, ROOM_NOT_FOUND, GAME_IN_PROGRESS]
- [Source: packages/server/src/state/rooms.ts — Room, getRoomById, GAME_MAX_PLAYERS, toRoomState]
- [Source: packages/server/src/socket/handlers/lobbyHandlers.ts — registerLobbyHandlers, broadcastLobbyState, sendLobbyState]
- [Source: packages/server/src/state/sessions.ts — updateSessionRoomId]
- [Source: packages/client/src/store/index.ts — currentRoom, setCurrentRoom, setScreen]
- [Source: _bmad-output/implementation-artifacts/2-2-room-creation.md#Dev Notes — previous story patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Implemented `addPlayerToRoom` and `removePlayerFromRoom` in rooms.ts with deep-copy pattern and ownership transfer logic
- Added `handleJoinRoom` with full validation chain: auth, already-in-room, room existence, room status, capacity
- Added `handleLeaveRoom` with ownership transfer, room deletion on empty, and lobby broadcast
- Registered `joinRoom` and `leaveRoom` events in `registerLobbyHandlers`, replacing placeholder comment
- Updated LobbyScreen with clickable rooms, join flow, `isJoining` guard, status indicators for playing/full rooms
- Added Leave Room button to room screen placeholder in App.tsx
- All 128 server tests pass (22 new tests added), TypeScript compiles clean across all packages

**Code Review Fixes (2026-03-03):**
- [HIGH] Added `data.roomId` input validation in `handleJoinRoom` (typeof + empty string check)
- [MEDIUM] Fixed CSS hover applying to disabled/playing rooms (removed generic `.lobby-room-item:hover`)
- [MEDIUM] Cleaned up dead test setup code in `handleLeaveRoom` first test
- [MEDIUM] Added capacity guard in `addPlayerToRoom` (defense-in-depth)
- Added 3 new tests: roomId validation (2) and capacity guard (1) — total 131 tests passing

### Change Log

- 2026-03-03: Story 2.3 implemented — join and leave room functionality with full server handlers, client UI, and comprehensive tests
- 2026-03-03: Code review fixes — input validation, CSS hover fix, test cleanup, capacity guard (4 issues fixed, 3 tests added)

### File List

- packages/server/src/state/rooms.ts (modified — added addPlayerToRoom, removePlayerFromRoom)
- packages/server/src/state/rooms.test.ts (modified — added 12 tests for new functions)
- packages/server/src/socket/handlers/lobbyHandlers.ts (modified — added handleJoinRoom, handleLeaveRoom, registered events)
- packages/server/src/socket/handlers/lobbyHandlers.test.ts (modified — added 11 tests for join/leave handlers, updated registerLobbyHandlers test)
- packages/client/src/components/screens/LobbyScreen.tsx (modified — clickable rooms, join flow, error handling)
- packages/client/src/components/screens/LobbyScreen.css (modified — joinable/disabled room styles, join error)
- packages/client/src/App.tsx (modified — Leave Room button in room screen placeholder)
