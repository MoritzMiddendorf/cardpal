# Story 2.1: Lobby Screen & Room Listing

Status: done

## Story

As a **player**,
I want **to see a list of all game rooms in the lobby**,
so that **I can find and join a game with my friends**.

## Acceptance Criteria

1. **Given** an authenticated user with an active session **When** they reach the lobby screen **Then** a list of all existing game rooms is displayed **And** each room shows: room name, game type, player count (e.g., "2/4 players") **And** the list updates in real-time when rooms are created or players join/leave
2. **Given** no rooms exist **When** the lobby screen loads **Then** an empty state message is displayed: "No rooms yet. Create one!"
3. **Given** rooms exist in the system **When** a new room is created by another user **Then** the lobby list updates automatically via WebSocket push **And** no page refresh is required

## Tasks / Subtasks

- [x] Task 1: Create server rooms state module (AC: #1, #3)
  - [x] 1.1 Create `packages/server/src/state/rooms.ts`
  - [x] 1.2 Define internal `RoomPlayer` interface: `{ id: string; username: string; isConnected: boolean }` (id = sessionToken, stable across reconnections)
  - [x] 1.3 Define internal `Room` interface: `{ id: string; name: string; gameType: GameType; status: 'lobby' | 'playing'; ownerId: string; players: RoomPlayer[] }`
  - [x] 1.4 Export `GAME_MAX_PLAYERS: Record<GameType, number>` constant: `{ [GameType.BLACKJACK]: 4, [GameType.SKIPBO]: 6 }`
  - [x] 1.5 Implement `getRooms(): RoomInfo[]` — converts all rooms in Map to RoomInfo summaries (playerCount = players.length, maxPlayers from GAME_MAX_PLAYERS)
  - [x] 1.6 Implement `getRoomById(id: string): Room | null` — returns shallow copy `{ ...room, players: [...room.players] }`
  - [x] 1.7 Implement `clearRooms(): void` — for test cleanup only
  - [x] 1.8 Write unit tests in `packages/server/src/state/rooms.test.ts`

- [x] Task 2: Create lobby socket handlers (AC: #1, #3)
  - [x] 2.1 Create `packages/server/src/socket/handlers/lobbyHandlers.ts`
  - [x] 2.2 Implement `sendLobbyState(socket: AppSocket): void` — emits `lobbyState({ rooms: getRooms() })` to one client
  - [x] 2.3 Implement `broadcastLobbyState(io: AppServer): void` — emits `lobbyState({ rooms: getRooms() })` to ALL connected clients via `io.emit()`
  - [x] 2.4 Implement `registerLobbyHandlers(socket: AppSocket, io: AppServer): void` — sends current `lobbyState` immediately if `socket.data.authType === 'token'` (returning authenticated user)

- [x] Task 3: Update authHandlers.ts to send lobbyState after authentication (AC: #1)
  - [x] 3.1 In `packages/server/src/socket/handlers/authHandlers.ts`, import `sendLobbyState` from `./lobbyHandlers.js`
  - [x] 3.2 In `handleSetUsername`, after `socket.emit('authenticated', ...)` succeeds, call `sendLobbyState(socket)` so new users receive room list immediately
  - [x] 3.3 In `registerAuthHandlers` auto-restore block (for returning users re-entering via token), after `socket.emit('authenticated', ...)`, call `sendLobbyState(socket)`

- [x] Task 4: Wire lobby handlers in server entry (AC: #1, #3)
  - [x] 4.1 In `packages/server/src/index.ts`, import `registerLobbyHandlers` from `./socket/handlers/lobbyHandlers.js`
  - [x] 4.2 In `io.on('connection')`, call `registerLobbyHandlers(socket, io)` after `registerAuthHandlers(socket, io)`

- [x] Task 5: Create LobbyScreen React component (AC: #1, #2)
  - [x] 5.1 Create `packages/client/src/components/screens/LobbyScreen.tsx`
  - [x] 5.2 Read `lobbyRooms` and `username` from Zustand store via selectors (`useAppStore((s) => s.lobbyRooms)`)
  - [x] 5.3 Render header with "cardpal" title and current `username`
  - [x] 5.4 Render "Create Room" button (disabled, `TODO: Story 2-2`) alongside "Game Rooms" heading
  - [x] 5.5 When `lobbyRooms.length === 0`: render empty state `<p className="lobby-empty">No rooms yet. Create one!</p>`
  - [x] 5.6 When rooms exist: render `<ul className="lobby-room-list">` with one `<li>` per room showing: room name, game type label (human-readable), player count `{playerCount}/{maxPlayers} players`
  - [x] 5.7 Map `GameType` enum to human-readable labels with a local constant: `{ [GameType.BLACKJACK]: 'Blackjack', [GameType.SKIPBO]: 'Skip-Bo' }`

- [x] Task 6: Create LobbyScreen styles (AC: #1, #2)
  - [x] 6.1 Create `packages/client/src/components/screens/LobbyScreen.css`
  - [x] 6.2 Full-page layout with consistent dark theme (colors: `#eaeaea` text, `#0a0e1a` page bg, `#16213e` card bg, `#0f3460` borders, `#e94560` accent)
  - [x] 6.3 Header row: title left-aligned, username right-aligned
  - [x] 6.4 Rooms section heading + Create Room button in a flex row
  - [x] 6.5 Each room as a card/row with hover background effect, name + type on left, player count on right
  - [x] 6.6 Empty state message centered, muted color

- [x] Task 7: Update App.tsx for lobby integration (AC: #1, #3)
  - [x] 7.1 In `packages/client/src/App.tsx`, import `RoomInfo` type from `@cardpal/shared`
  - [x] 7.2 Inside the global socket `useEffect`, add `lobbyState` listener: `function onLobbyState({ rooms }: { rooms: RoomInfo[] }) { useAppStore.getState().setLobbyRooms(rooms); }`
  - [x] 7.3 Register: `socket.on('lobbyState', onLobbyState)` and clean up: `socket.off('lobbyState', onLobbyState)`
  - [x] 7.4 Import `LobbyScreen` from `./components/screens/LobbyScreen.js`
  - [x] 7.5 Replace placeholder `{screen === 'lobby' && <p>Lobby Screen (Story 2.1)</p>}` with `{screen === 'lobby' && <LobbyScreen />}`

- [x] Task 8: Verify acceptance criteria
  - [x] 8.1 `pnpm --filter @cardpal/server build` — confirm no TypeScript errors on server
  - [x] 8.2 `pnpm --filter @cardpal/client build` — confirm no TypeScript errors on client
  - [x] 8.3 `pnpm --filter @cardpal/server test` — confirm all server tests pass (new rooms.test.ts + existing)
  - [ ] 8.4 Start server with `pnpm dev`, authenticate a user → confirm lobby screen renders showing "No rooms yet. Create one!"
  - [ ] 8.5 (Requires Story 2-2 for full AC#3 test) Manually confirm lobbyState event is received on connection by inspecting browser DevTools → Network → WS

## Dev Notes

### Architecture Compliance

**CRITICAL — Follow these patterns exactly:**

- **`lobbyState` event already defined in shared types** — `ServerToClientEvents` in `packages/shared/src/types/events.ts` has `lobbyState: (data: { rooms: RoomInfo[] }) => void`. Do NOT modify shared event types. Payload is `{ rooms: RoomInfo[] }` (an object, not a raw array).

- **`RoomInfo` already defined in shared types** — `packages/shared/src/types/room.ts`. Fields: `{ id, name, gameType, playerCount, maxPlayers, status }`. Import from `@cardpal/shared`.

- **Zustand store already ready** — `lobbyRooms: RoomInfo[]` and `setLobbyRooms` already exist in `packages/client/src/store/index.ts`. Do NOT add new store fields. Just use them.

- **rooms.ts state module location**: `packages/server/src/state/rooms.ts` — specified in architecture [Source: architecture.md#Server, architecture.md#State Boundary]. Follow the same module pattern as `otp.ts` and `sessions.ts`: expose functions, never export the Map.

- **lobbyHandlers.ts location**: `packages/server/src/socket/handlers/lobbyHandlers.ts` — alongside `authHandlers.ts`.

- **LobbyScreen.tsx location**: `packages/client/src/components/screens/LobbyScreen.tsx` — alongside `OtpScreen.tsx`.

- **`broadcastLobbyState` uses `io.emit()`**: This sends to ALL connected sockets (every authenticated user sees the update). Do NOT use `socket.broadcast.emit()` (that excludes the sender). `io.emit()` is correct per architecture's "Full state on change" pattern [Source: architecture.md#API & Communication Patterns].

- **`io` is NOT stored globally**: Pass `io` as a parameter to `broadcastLobbyState(io)`. Stories 2-2 and 2-3 will import and call it from their handlers where `io` is already available.

- **Scope boundary — do NOT implement in Story 2-1**:
  - Room creation (Story 2-2): no `createRoom` function, no wiring of `socket.on('createRoom', ...)`
  - Room joining/leaving (Story 2-3): no `addPlayer`/`removePlayer`, no `socket.on('joinRoom', ...)` or `socket.on('leaveRoom', ...)`
  - Room screen (Story 2-4): `RoomState` type exists but do not render `RoomScreen`
  - "Create Room" button is rendered but must remain `disabled`

- **sendLobbyState after authentication**: The server must send `lobbyState` right after a user authenticates so they immediately see the room list when the lobby screen appears. Two code paths:
  1. **New users**: `handleSetUsername` → after `socket.emit('authenticated', ...)` → call `sendLobbyState(socket)`
  2. **Returning users**: `registerAuthHandlers` auto-restore block → after `socket.emit('authenticated', ...)` → call `sendLobbyState(socket)`
  `registerLobbyHandlers` handles the returning-user case too as a fallback via `socket.data.authType === 'token'` check.

### Technical Stack — Relevant Versions

| Package | Version | Notes |
|---------|---------|-------|
| Node.js | 20.x LTS | `crypto.randomUUID()` available globally |
| Socket.io (server) | ^4.8.3 | `io.emit()` broadcasts to all; `socket.emit()` to one |
| socket.io-client | ^4.8.3 | `socket.on('lobbyState', handler)` |
| React | ^18.3.1 | Functional components, hooks |
| Zustand | ^5.0.11 | `useAppStore((s) => s.lobbyRooms)` selector pattern |
| TypeScript | ~5.9.3 | Strict mode; ESM with `.js` import extensions |
| GameType enum | @cardpal/shared | `GameType.BLACKJACK = 'blackjack'`, `GameType.SKIPBO = 'skipbo'` |

### Server: rooms.ts Design

```typescript
// packages/server/src/state/rooms.ts
import { GameType } from '@cardpal/shared';
import type { RoomInfo } from '@cardpal/shared';

// Internal-only types (not exported — handlers use rooms.ts functions, not these interfaces directly)
interface RoomPlayer {
  id: string;        // sessionToken — stable identifier across reconnections
  username: string;
  isConnected: boolean;
}

// Room is exported so Story 2-3 handlers (lobbyHandlers.ts) can return full room state
export interface Room {
  id: string;
  name: string;
  gameType: GameType;
  status: 'lobby' | 'playing';
  ownerId: string;   // sessionToken of the room owner
  players: RoomPlayer[];
}

// Max players per game type
// Blackjack: 4 players (per PRD user narrative: "1/4 players")
// Skip-Bo: 6 players (standard Skip-Bo rules)
export const GAME_MAX_PLAYERS: Record<GameType, number> = {
  [GameType.BLACKJACK]: 4,
  [GameType.SKIPBO]: 6,
};

const rooms = new Map<string, Room>();  // keyed by room id (UUID)

export function getRooms(): RoomInfo[] {
  return Array.from(rooms.values()).map((room) => ({
    id: room.id,
    name: room.name,
    gameType: room.gameType,
    playerCount: room.players.length,
    maxPlayers: GAME_MAX_PLAYERS[room.gameType],
    status: room.status,
  }));
}

export function getRoomById(id: string): Room | null {
  const room = rooms.get(id);
  if (!room) return null;
  return { ...room, players: [...room.players] };  // shallow copy of room, copy of players array
}

export function clearRooms(): void {
  rooms.clear();
}

// NOTE: createRoom(), addPlayerToRoom(), removePlayerFromRoom(), setRoomStatus()
//       are added in Stories 2-2 and 2-3. Do NOT implement them here.
```

### Server: lobbyHandlers.ts Design

```typescript
// packages/server/src/socket/handlers/lobbyHandlers.ts
import { getRooms } from '../../state/rooms.js';
import type { AppSocket, AppServer } from '../types.js';

export function sendLobbyState(socket: AppSocket): void {
  socket.emit('lobbyState', { rooms: getRooms() });
}

export function broadcastLobbyState(io: AppServer): void {
  // Sends to ALL connected sockets (including the triggering user)
  io.emit('lobbyState', { rooms: getRooms() });
}

export function registerLobbyHandlers(socket: AppSocket, _io: AppServer): void {
  // Returning authenticated users (token path) get lobby state immediately on connection.
  // New users (pending path) get lobby state from handleSetUsername after authentication.
  if (socket.data.authType === 'token') {
    sendLobbyState(socket);
  }
  // Note: socket.on('createRoom', ...), socket.on('joinRoom', ...), socket.on('leaveRoom', ...)
  //       registered in Stories 2-2 and 2-3.
}
```

### Server: authHandlers.ts Update

Add `sendLobbyState` call after authentication in both code paths:

```typescript
// In handleSetUsername — after socket.emit('authenticated', { token, username }):
sendLobbyState(socket);  // send current room list to newly authenticated user

// In registerAuthHandlers auto-restore block — after socket.emit('authenticated', { ... }):
sendLobbyState(socket);  // send current room list to reconnecting authenticated user
```

Import: `import { sendLobbyState } from './lobbyHandlers.js';`

### Server: index.ts Update

```typescript
// Add import:
import { registerLobbyHandlers } from './socket/handlers/lobbyHandlers.js';

// In io.on('connection', (socket) => { ... }):
registerAuthHandlers(socket, io);
registerLobbyHandlers(socket, io);  // ADD after auth handlers
```

### Client: LobbyScreen.tsx Component

```
Layout:
┌─────────────────────────────────────┐
│  cardpal                  [Alice]   │  ← lobby-header
├─────────────────────────────────────┤
│  Game Rooms    [Create Room (dis.)] │  ← lobby-rooms-header
│                                     │
│  ┌─────────────────────────────────┐│
│  │  Crimson Tiger    Blackjack    ││  ← lobby-room-item
│  │                    2/4 players ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │  Blue Fox         Skip-Bo      ││
│  │                    3/6 players ││
│  └─────────────────────────────────┘│
│                                     │
│  (empty state):                     │
│  No rooms yet. Create one!          │  ← lobby-empty
└─────────────────────────────────────┘
```

```typescript
// packages/client/src/components/screens/LobbyScreen.tsx
import { useAppStore } from '../../store/index.js';
import { GameType } from '@cardpal/shared';
import type { RoomInfo } from '@cardpal/shared';
import './LobbyScreen.css';

const GAME_TYPE_LABELS: Record<GameType, string> = {
  [GameType.BLACKJACK]: 'Blackjack',
  [GameType.SKIPBO]: 'Skip-Bo',
};

export function LobbyScreen() {
  const lobbyRooms = useAppStore((s) => s.lobbyRooms);
  const username = useAppStore((s) => s.username);

  return (
    <div className="lobby-screen">
      <header className="lobby-header">
        <h1 className="lobby-title">cardpal</h1>
        <span className="lobby-username">{username}</span>
      </header>

      <div className="lobby-content">
        <div className="lobby-rooms-header">
          <h2 className="lobby-rooms-title">Game Rooms</h2>
          {/* Create Room — functionality added in Story 2-2 */}
          <button className="lobby-create-btn" disabled>
            Create Room
          </button>
        </div>

        {lobbyRooms.length === 0 ? (
          <p className="lobby-empty">No rooms yet. Create one!</p>
        ) : (
          <ul className="lobby-room-list">
            {lobbyRooms.map((room: RoomInfo) => (
              <li key={room.id} className="lobby-room-item">
                <div className="lobby-room-info">
                  <span className="lobby-room-name">{room.name}</span>
                  <span className="lobby-room-type">{GAME_TYPE_LABELS[room.gameType]}</span>
                </div>
                <span className="lobby-room-players">
                  {room.playerCount}/{room.maxPlayers} players
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

### Client: App.tsx Update

```typescript
// Add import at top:
import type { RoomInfo } from '@cardpal/shared';
import { LobbyScreen } from './components/screens/LobbyScreen.js';

// Inside the global socket useEffect, add handler:
function onLobbyState({ rooms }: { rooms: RoomInfo[] }) {
  useAppStore.getState().setLobbyRooms(rooms);
}
socket.on('lobbyState', onLobbyState);

// In cleanup return:
socket.off('lobbyState', onLobbyState);

// In JSX, replace:
{screen === 'lobby' && <p>Lobby Screen (Story 2.1)</p>}
// With:
{screen === 'lobby' && <LobbyScreen />}
```

### Server Unit Tests: rooms.test.ts

```typescript
// packages/server/src/state/rooms.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getRooms, getRoomById, clearRooms, GAME_MAX_PLAYERS } from './rooms.js';
import { GameType } from '@cardpal/shared';

describe('Room State Management', () => {
  beforeEach(() => {
    clearRooms();
  });

  describe('getRooms', () => {
    it('returns empty array when no rooms exist', () => {
      expect(getRooms()).toEqual([]);
    });
    // Note: addRoom tests added in Story 2-2 (createRoom function)
  });

  describe('getRoomById', () => {
    it('returns null for non-existent room', () => {
      expect(getRoomById('non-existent')).toBeNull();
    });
  });

  describe('GAME_MAX_PLAYERS', () => {
    it('has 4 max players for Blackjack', () => {
      expect(GAME_MAX_PLAYERS[GameType.BLACKJACK]).toBe(4);
    });

    it('has 6 max players for Skip-Bo', () => {
      expect(GAME_MAX_PLAYERS[GameType.SKIPBO]).toBe(6);
    });
  });
});
```

**Note**: The test file covers what can be tested without `createRoom`. When Story 2-2 adds `createRoom`, the `rooms.test.ts` will be extended with full CRUD tests.

### Previous Story Intelligence (1.4 learnings)

**From Story 1-4 (recently completed, in review):**

- **ESM imports**: All server imports use `.js` extension, even TypeScript files: `import { getRooms } from '../../state/rooms.js'`
- **Copy-on-return pattern**: State getters must return copies to prevent external mutation. For objects with arrays, use `{ ...obj, arrayField: [...obj.arrayField] }`. Already shown in `getRoomById` design above.
- **`socket.data` typing**: `AppSocket` from `packages/server/src/socket/types.ts` — use `socket.data.authType` and `socket.data.session` for auth checks.
- **`io: AppServer`** type from `packages/server/src/socket/types.ts` — already used in `authHandlers.ts`.
- **Zustand selector pattern**: Always use `useAppStore((s) => s.field)` — never `useAppStore()` bare.
- **`useAppStore.getState()`** in event handlers (not in component render scope) — same pattern as `authenticated` handler in App.tsx.
- **Socket.io client**: Pre-configured in `packages/client/src/socket/client.ts` with `autoConnect: false`. Import `socket` from `'../../socket/client.js'` (relative path).
- **OtpScreen/UsernameScreen CSS pattern**: BEM-ish class names, self-contained CSS file, dark theme. Colors: `#eaeaea`, `#16213e`, `#0f3460`, `#e94560`.
- **`socket.on` cleanup**: Always return cleanup function from `useEffect` that calls `socket.off` for each registered listener.
- **`_io` convention**: If `io` parameter is imported but not yet used, name it `_io` to avoid unused variable lint error (TypeScript strict mode). Used in `registerLobbyHandlers` since `broadcastLobbyState` takes `io` as a parameter but `registerLobbyHandlers` doesn't call it directly in this story.

**Patterns NOT established yet (do not guess):**
- Room name generation — deferred to Story 2-2 (`utils/generateRoomId.ts` or `utils/generateRoomName.ts` per architecture)
- Room-specific Socket.io rooms (Socket.io's `socket.join(roomId)`) — deferred to Story 2-3

### Git Intelligence

**Recent commits:**
- `3dae192` feat: Story 1.1 - Project scaffolding & shared types with code review fixes
- `e8b583a` Initial commit: project planning artifacts and BMAD workflow setup

**Uncommitted work** (Stories 1.2, 1.3, 1.4) is in the working tree. Story 2-1 builds on top of this uncommitted code. All files from Stories 1.2–1.4 should be treated as the current baseline.

**Commit format**: `feat: Story X.X - <description>`

### Project Structure Notes

**Files to create:**
```
packages/server/src/state/rooms.ts                           # NEW: Room state module
packages/server/src/state/rooms.test.ts                      # NEW: Room state tests
packages/server/src/socket/handlers/lobbyHandlers.ts         # NEW: Lobby socket handlers
packages/client/src/components/screens/LobbyScreen.tsx       # NEW: Lobby screen component
packages/client/src/components/screens/LobbyScreen.css       # NEW: Lobby screen styles
```

**Files to modify:**
```
packages/server/src/socket/handlers/authHandlers.ts          # UPDATE: Call sendLobbyState after authentication
packages/server/src/index.ts                                  # UPDATE: Register lobbyHandlers
packages/client/src/App.tsx                                   # UPDATE: lobbyState listener + render LobbyScreen
```

**Files NOT to modify:**
```
packages/shared/src/types/events.ts    # Already has lobbyState event — no changes needed
packages/shared/src/types/room.ts      # Already has RoomInfo, RoomState, PlayerInfo — no changes
packages/client/src/store/index.ts     # Already has lobbyRooms, setLobbyRooms — no changes
```

**Naming conventions followed:**
- `rooms.ts`, `lobbyHandlers.ts` — camelCase server modules
- `LobbyScreen.tsx`, `LobbyScreen.css` — PascalCase React component + co-located CSS
- `GAME_MAX_PLAYERS` — UPPER_SNAKE_CASE constant (per architecture)
- `getRooms`, `sendLobbyState`, `broadcastLobbyState` — camelCase functions, verb-first

### Testing Requirements

**Server-side (Vitest) — `packages/server/src/state/rooms.test.ts`:**
- `getRooms()` returns empty array when no rooms exist
- `getRoomById()` returns null for non-existent id
- `GAME_MAX_PLAYERS[GameType.BLACKJACK]` === 4
- `GAME_MAX_PLAYERS[GameType.SKIPBO]` === 6
- `clearRooms()` can be called without throwing

**Note**: `createRoom`, `addPlayerToRoom` tests are deferred to Stories 2-2 and 2-3 when those functions are added.

**Client-side (manual verification):**
- Authenticated user sees lobby screen immediately after auth
- Empty state "No rooms yet. Create one!" shown when no rooms
- Disabled "Create Room" button visible
- `lobbyState` event in browser DevTools WebSocket inspector confirms server push

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1: Lobby Screen & Room Listing]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2: Lobby & Room Management]
- [Source: _bmad-output/planning-artifacts/architecture.md#Lobby & Room (FR9-16) — `server/src/state/rooms.ts`, `socket/handlers/lobbyHandlers.ts`, `client/src/components/screens/LobbyScreen.tsx`]
- [Source: _bmad-output/planning-artifacts/architecture.md#Socket.io Event Architecture — `lobbyState: (rooms: RoomInfo[]) => void`]
- [Source: _bmad-output/planning-artifacts/architecture.md#State Management (Zustand) — `lobbyRooms: RoomInfo[]`]
- [Source: _bmad-output/planning-artifacts/architecture.md#Screen Rendering (No Router) — `screen: 'lobby'`]
- [Source: _bmad-output/planning-artifacts/architecture.md#In-Memory State Structure — `rooms: Map<roomId, Room>`]
- [Source: _bmad-output/planning-artifacts/architecture.md#State Boundary — expose functions, not raw data]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — "Full state on change (small payload, infrequent updates)"]
- [Source: _bmad-output/planning-artifacts/prd.md#FR9: Users can view a list of all game rooms in the lobby]
- [Source: _bmad-output/planning-artifacts/prd.md#FR10: Users can see player count for each room in the lobby]
- [Source: _bmad-output/planning-artifacts/prd.md#FR11: Users can see the auto-generated room name for each room]
- [Source: _bmad-output/planning-artifacts/prd.md#Concurrent game rooms — "At least 2"]
- [Source: _bmad-output/implementation-artifacts/1-4-username-entry-and-session-establishment.md#Dev Notes]
- [Source: packages/shared/src/types/events.ts — `lobbyState: (data: { rooms: RoomInfo[] }) => void`]
- [Source: packages/shared/src/types/room.ts — `RoomInfo`, `RoomState`, `PlayerInfo`]
- [Source: packages/client/src/store/index.ts — `lobbyRooms: RoomInfo[]`, `setLobbyRooms`]
- [Source: packages/server/src/socket/types.ts — `AppSocket`, `AppServer`, `SocketData`]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no issues encountered.

### Completion Notes List

- Task 1: Created `rooms.ts` state module with `RoomPlayer`/`Room` interfaces, `GAME_MAX_PLAYERS` constant, `getRooms()`, `getRoomById()`, `clearRooms()` functions. Copy-on-return pattern applied for `getRoomById`. 5 unit tests written and passing.
- Task 2: Created `lobbyHandlers.ts` with `sendLobbyState` (single client), `broadcastLobbyState` (all clients via `io.emit()`), and `registerLobbyHandlers` (auto-sends lobby state for returning token-auth users).
- Task 3: Updated `authHandlers.ts` to call `sendLobbyState(socket)` after authentication in both `handleSetUsername` (new users) and `registerAuthHandlers` auto-restore block (returning users).
- Task 4: Wired `registerLobbyHandlers(socket, io)` in `index.ts` after `registerAuthHandlers`.
- Task 5: Created `LobbyScreen.tsx` component with header (title + username), disabled "Create Room" button, empty state message, and room list with game type labels and player counts.
- Task 6: Created `LobbyScreen.css` with dark theme matching existing screens, card-style room items with hover effects.
- Task 7: Updated `App.tsx` with `lobbyState` socket listener, cleanup, `LobbyScreen` import, and replaced lobby placeholder.
- Task 8: All builds pass (server + client), all 51 server tests pass (5 new + 46 existing, no regressions). Tasks 8.4 and 8.5 require manual verification.
- Code Review (AI): Fixed 3 MEDIUM issues — removed duplicate lobbyState emission for returning users, added positive-path tests with `_addRoomForTest` helper (12 rooms tests total), added lobbyHandlers.test.ts with 4 socket handler tests. Total: 62 server tests passing.

### Implementation Plan

Followed red-green-refactor cycle for Task 1 (rooms state module). Other tasks are primarily wiring/UI with compilation verification. All code follows established patterns from Stories 1.2–1.4: ESM `.js` imports, copy-on-return state pattern, Zustand selector pattern, `useAppStore.getState()` in event handlers, BEM-ish CSS class names with dark theme colors.

### Change Log

- 2026-03-03: Implemented Story 2.1 — Lobby Screen & Room Listing. Created server rooms state module, lobby socket handlers, updated auth flow to send lobby state after authentication, created LobbyScreen React component with styles, and wired lobby state updates through App.tsx.
- 2026-03-03: Code Review fixes — removed duplicate lobbyState for returning users (M1), added positive-path room tests with test helper (M2), added lobbyHandlers socket handler tests (M3). 3 LOW issues noted for future awareness.

### File List

**New files:**
- `packages/server/src/state/rooms.ts` — Room state module (interfaces, constants, getter functions, test helper)
- `packages/server/src/state/rooms.test.ts` — Unit tests for rooms state module (12 tests)
- `packages/server/src/socket/handlers/lobbyHandlers.ts` — Lobby socket handlers (send/broadcast/register)
- `packages/server/src/socket/handlers/lobbyHandlers.test.ts` — Unit tests for lobby handlers (4 tests)
- `packages/client/src/components/screens/LobbyScreen.tsx` — Lobby screen React component
- `packages/client/src/components/screens/LobbyScreen.css` — Lobby screen styles

**Modified files:**
- `packages/server/src/socket/handlers/authHandlers.ts` — Added sendLobbyState calls after authentication
- `packages/server/src/index.ts` — Registered lobby handlers
- `packages/client/src/App.tsx` — Added lobbyState listener and LobbyScreen rendering
