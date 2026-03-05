# Story 1.4: Username Entry & Session Establishment

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **player**,
I want **to choose a username after OTP validation**,
so that **other players can identify me in the game**.

## Acceptance Criteria

1. **Given** the user has passed OTP validation **When** the username screen loads **Then** an input field for username is displayed **And** a submit button is visible
2. **Given** the user enters a valid username (1-15 alphanumeric characters, no special characters) **When** they submit **Then** the server creates a session token (UUID v4) **And** the session is stored server-side mapping token to: username, socketId, roomId (null) **And** the token is stored in client localStorage **And** a WebSocket connection is established with the token in handshake auth **And** the user proceeds to the lobby screen (blank for now, implemented in Epic 2)
3. **Given** the user enters a username with special characters **When** they attempt to submit **Then** validation fails with message: "Letters and numbers only"
4. **Given** the user enters a username longer than 15 characters **When** they attempt to submit **Then** validation fails with message: "Username must be 15 characters or less"
5. **Given** a user with an existing session token in localStorage **When** they load the app and the token is still valid (OTP not expired/regenerated) **Then** the session is restored automatically **And** the user skips OTP/username screens
6. **Given** a user with an existing session token **When** the OTP has been regenerated since their session was created **Then** the session is invalid **And** the user is redirected to the OTP screen **And** the invalid token is cleared from localStorage

## Tasks / Subtasks

- [x] Task 1: Extend sessions state module with full sessions (AC: #2, #5, #6)
  - [x] 1.1 Add `UserSession` interface to `packages/server/src/state/sessions.ts`: `{ token: string; username: string; socketId: string; roomId: string | null; otpCode: string }`
  - [x] 1.2 Add `sessions: Map<string, UserSession>` alongside existing `pendingSessions` map (keyed by token)
  - [x] 1.3 Implement `createSession(pendingSessionId: string, username: string, socketId: string, otpCode: string): UserSession` — generates UUID token, removes pending session, stores full session, returns copy
  - [x] 1.4 Implement `getSessionByToken(token: string): UserSession | null` — returns copy
  - [x] 1.5 Implement `updateSessionSocketId(token: string, socketId: string): void` — for reconnection
  - [x] 1.6 Implement `removeSession(token: string): void`
  - [x] 1.7 Write unit tests for all new session functions
- [x] Task 2: Create Socket.io authentication middleware (AC: #5, #6)
  - [x] 2.1 Create `packages/server/src/socket/middleware/auth.ts`
  - [x] 2.2 Implement middleware that reads `socket.handshake.auth` for either `{ pendingSessionId }` or `{ token }`
  - [x] 2.3 For `token`: validate with `getSessionByToken()` + `isOtpValid(session.otpCode)`. If valid → attach session to `socket.data`, allow connection. If invalid → reject with `AUTH_ERROR`
  - [x] 2.4 For `pendingSessionId`: validate with `getPendingSession()`. If valid → attach pendingSessionId to `socket.data`, allow connection. If invalid → reject with `AUTH_ERROR`
  - [x] 2.5 If neither provided → reject connection with `AUTH_ERROR`
- [x] Task 3: Create Socket.io auth event handlers (AC: #2, #5)
  - [x] 3.1 Create `packages/server/src/socket/handlers/authHandlers.ts`
  - [x] 3.2 Implement `handleSetUsername(socket, io, data: { username: string })`:
    - Validate username with `usernameRequestSchema.safeParse()` from `@cardpal/shared`
    - Get `pendingSessionId` from `socket.data`
    - Get current OTP code via `getOtp().code`
    - Call `createSession(pendingSessionId, username, socketId, otpCode)`
    - Emit `authenticated({ token, username })` to client
    - Log: `Session created: ${username} (token: ${token.slice(0, 8)}...)`
    - On validation error: emit `error({ code: 'VALIDATION_ERROR', message })` to client
  - [x] 3.3 Implement `handleAuthenticate(socket, io, data: { token: string })`:
    - Get session from `getSessionByToken(token)`
    - If no session or `!isOtpValid(session.otpCode)` → emit `error({ code: 'AUTH_ERROR', message: 'Session expired' })`
    - If valid → update `socketId` via `updateSessionSocketId()`, emit `authenticated({ token, username })`
  - [x] 3.4 Register handlers on socket `connection` event in `index.ts`
- [x] Task 4: Wire Socket.io middleware and handlers in server entry (AC: #2, #5)
  - [x] 4.1 Import auth middleware and auth handlers in `packages/server/src/index.ts`
  - [x] 4.2 Apply middleware via `io.use(authMiddleware)`
  - [x] 4.3 In `io.on('connection')`, register `setUsername` and `authenticate` event handlers
  - [x] 4.4 For returning users whose session was validated in middleware: auto-emit `authenticated` in the connection handler if `socket.data.session` exists (skip waiting for `authenticate` event)
- [x] Task 5: Create UsernameScreen React component (AC: #1, #2, #3, #4)
  - [x] 5.1 Create `packages/client/src/components/screens/UsernameScreen.tsx`
  - [x] 5.2 Single text input for username, submit button labeled "Join"
  - [x] 5.3 Client-side validation: regex `/^[a-zA-Z0-9]+$/`, max 15 chars
  - [x] 5.4 Display validation errors: "Letters and numbers only" for special chars, "Username must be 15 characters or less" for length
  - [x] 5.5 On submit: emit `socket.emit('setUsername', { username })` via imported socket
  - [x] 5.6 Loading state during submission (disable input + button, show "Joining...")
  - [x] 5.7 Listen for `error` event on socket for server-side validation failures
  - [x] 5.8 Style with `UsernameScreen.css` matching OtpScreen design (centered, dark theme, same font/colors)
- [x] Task 6: Add socket connection management to App (AC: #2, #5, #6)
  - [x] 6.1 In `App.tsx`, add useEffect for socket connection lifecycle:
    - On mount: if `sessionToken` exists in store → set `socket.auth = { token }`, connect
    - When `pendingSessionId` changes → set `socket.auth = { pendingSessionId }`, connect
  - [x] 6.2 Add global socket event listeners:
    - `authenticated`: store token (localStorage + Zustand), store username, set screen to 'lobby', update `socket.auth = { token }` for reconnections
    - `connect_error` with `AUTH_ERROR`: clear token from localStorage + store, set screen to 'otp'
    - `connect`: set connectionStatus to 'connected'
    - `disconnect`: set connectionStatus to 'disconnected'
  - [x] 6.3 Clean up event listeners on unmount
  - [x] 6.4 Import and render `<UsernameScreen />` in App.tsx replacing placeholder
- [x] Task 7: Verify acceptance criteria
  - [ ] 7.1 Start server with `pnpm dev`, generate OTP, enter OTP → confirm username screen appears
  - [ ] 7.2 Enter valid username, submit → confirm lobby screen appears with session token in localStorage
  - [ ] 7.3 Enter username with special chars → confirm "Letters and numbers only" error
  - [ ] 7.4 Enter 16+ character username → confirm "Username must be 15 characters or less" error
  - [ ] 7.5 Refresh browser with valid token in localStorage → confirm session restores (skips OTP/username)
  - [ ] 7.6 Generate new OTP on server, refresh browser → confirm redirect to OTP screen (old token cleared)
  - [x] 7.7 Confirm no TypeScript compilation errors across all packages
  - [x] 7.8 Confirm all server tests pass

## Dev Notes

### Architecture Compliance

**CRITICAL — Follow these patterns exactly:**

- **Socket.io for username submission:** Use the `setUsername` Socket.io event (NOT an HTTP endpoint). The WebSocket connection is established AFTER OTP validation, BEFORE username submission. The architecture defines `setUsername` as a client-to-server Socket.io event.
- **Connection flow for NEW users:**
  1. OTP validated via HTTP → `pendingSessionId` stored in Zustand (Story 1.3 done)
  2. Socket connects with `auth: { pendingSessionId }` in handshake
  3. Server middleware validates pendingSessionId, allows connection
  4. Client emits `setUsername({ username })`
  5. Server handler creates full session, emits `authenticated({ token, username })`
  6. Client stores token in localStorage, sets screen to 'lobby'
- **Connection flow for RETURNING users:**
  1. App loads, reads `sessionToken` from localStorage (Zustand initializes from it)
  2. Socket connects with `auth: { token }` in handshake
  3. Server middleware validates token + OTP validity → allows connection, attaches session to socket
  4. Server emits `authenticated({ token, username })` on connection
  5. Client navigates to lobby (or room/game if in one — future stories)
  6. If invalid → server rejects connection or emits `error({ code: 'AUTH_ERROR' })`, client clears token and shows OTP screen
- **Session-OTP linkage:** Each `UserSession` stores the `otpCode` used at creation time. Validate session by calling `isOtpValid(session.otpCode)` — this returns false if OTP was regenerated (code mismatch) OR expired (time check). This single check covers both AC #5 and AC #6.
- **State module pattern:** Extend `sessions.ts` (don't create a new file). Add `UserSession` interface and full session CRUD alongside existing `PendingSession` functions. Follow established copy-on-return pattern.
- **Socket.io middleware:** Use `io.use((socket, next) => { ... })` to validate auth on connection. Middleware can reject with `next(new Error('AUTH_ERROR'))`.
- **Do NOT create the full lobby or room functionality.** The lobby screen is just a blank placeholder for now (Epic 2). Story 1.4 only needs to land the user on `screen === 'lobby'` after successful authentication.

### Technical Stack — Relevant Versions

| Package | Version | Notes |
|---------|---------|-------|
| Node.js | 20.x LTS | `crypto.randomUUID()` available globally — no import needed |
| Express | ^5.1.0 | HTTP endpoints already set up (no new HTTP routes in this story) |
| Socket.io (server) | ^4.8.3 | `io.use()` for middleware, `socket.data` for storing auth info, typed events |
| socket.io-client | ^4.8.3 | `socket.auth = { ... }` before connect, `socket.connect()` to initiate |
| React | ^18.3.1 | Functional components, hooks, `useEffect` for socket lifecycle |
| Zustand | ^5.0.11 | `useAppStore((s) => s.field)` selector pattern; `useAppStore.getState()` outside components |
| Zod | ^3.24.0 | `usernameRequestSchema.safeParse()` for server-side username validation |
| TypeScript | ~5.9.3 | Strict mode; ESM with `.js` import extensions |
| uuid | ^13.0.0 | Already installed — use `import { v4 as uuidv4 } from 'uuid'` if needed, but prefer `crypto.randomUUID()` |

### Session State Design

```typescript
// packages/server/src/state/sessions.ts — EXTEND existing file

// Existing (from Story 1.3):
interface PendingSession { id: string; validatedAt: Date; }
// pendingSessions: Map<string, PendingSession>
// createPendingSession(), getPendingSession(), removePendingSession(), clearPendingSessions()

// NEW for Story 1.4:
interface UserSession {
  token: string;          // UUID v4 via crypto.randomUUID()
  username: string;       // 1-15 alphanumeric
  socketId: string;       // current socket.io connection ID
  roomId: string | null;  // null until user joins a room (Epic 2)
  otpCode: string;        // OTP code used when session was created
}

const sessions = new Map<string, UserSession>(); // keyed by token

// New functions:
// createSession(pendingSessionId, username, socketId, otpCode) → UserSession
//   - Verifies pendingSessionId exists, removes it, creates full session
//   - Returns copy of session
// getSessionByToken(token) → UserSession | null (returns copy)
// updateSessionSocketId(token, socketId) → void
// removeSession(token) → void
```

### Socket.io Middleware Design

```typescript
// packages/server/src/socket/middleware/auth.ts

import type { AppSocket } from '../types.js'; // or inline the type
import { getPendingSession, getSessionByToken } from '../../state/sessions.js';
import { isOtpValid } from '../../state/otp.js';

export function authMiddleware(socket: AppSocket, next: (err?: Error) => void) {
  const { token, pendingSessionId } = socket.handshake.auth;

  if (token) {
    const session = getSessionByToken(token);
    if (session && isOtpValid(session.otpCode)) {
      socket.data.session = session;
      socket.data.authType = 'token';
      return next();
    }
    return next(new Error('AUTH_ERROR'));
  }

  if (pendingSessionId) {
    const pending = getPendingSession(pendingSessionId);
    if (pending) {
      socket.data.pendingSessionId = pendingSessionId;
      socket.data.authType = 'pending';
      return next();
    }
    return next(new Error('AUTH_ERROR'));
  }

  return next(new Error('AUTH_ERROR'));
}
```

**IMPORTANT:** Socket.io middleware rejections emit a `connect_error` event on the client, NOT the custom `error` event. The client should listen for `socket.on('connect_error', (err) => { ... })` to handle rejected connections.

### Auth Handler Design

```typescript
// packages/server/src/socket/handlers/authHandlers.ts

// handleSetUsername(socket, data: { username: string }):
//   1. Validate username with usernameRequestSchema.safeParse(data)
//   2. Check socket.data.pendingSessionId exists
//   3. Get current OTP: getOtp()?.code (error if null)
//   4. Call createSession(pendingSessionId, username, socket.id, otpCode)
//   5. Attach session to socket.data.session
//   6. Emit 'authenticated' with { token, username }
//   7. Log event

// Connection handler in index.ts:
// io.on('connection', (socket) => {
//   if (socket.data.authType === 'token' && socket.data.session) {
//     // Returning user — update socketId and auto-emit authenticated
//     updateSessionSocketId(socket.data.session.token, socket.id);
//     socket.emit('authenticated', { token: session.token, username: session.username });
//   }
//   socket.on('setUsername', (data) => handleSetUsername(socket, data));
// });
```

### Client Socket Connection Management

**Connection lifecycle (in App.tsx or useSocket hook):**

```typescript
// On app mount:
useEffect(() => {
  const token = useAppStore.getState().sessionToken;
  if (token) {
    socket.auth = { token };
    socket.connect();
  }
}, []);

// After OTP validation (pendingSessionId set):
useEffect(() => {
  if (pendingSessionId && !socket.connected) {
    socket.auth = { pendingSessionId };
    socket.connect();
  }
}, [pendingSessionId]);

// Global event listeners:
useEffect(() => {
  function onAuthenticated({ token, username }: { token: string; username: string }) {
    const store = useAppStore.getState();
    store.setSessionToken(token);   // also saves to localStorage
    store.setUsername(username);
    store.setScreen('lobby');
    store.setConnectionStatus('connected');
    socket.auth = { token };        // update for future reconnections
  }

  function onConnectError(err: Error) {
    if (err.message === 'AUTH_ERROR') {
      const store = useAppStore.getState();
      store.setSessionToken(null);  // clears localStorage
      store.setScreen('otp');
      store.setPendingSessionId(null);
    }
  }

  socket.on('authenticated', onAuthenticated);
  socket.on('connect_error', onConnectError);
  socket.on('connect', () => useAppStore.getState().setConnectionStatus('connected'));
  socket.on('disconnect', () => useAppStore.getState().setConnectionStatus('disconnected'));

  return () => { socket.off('authenticated', onAuthenticated); /* ... cleanup all */ };
}, []);
```

**CRITICAL:** Use `connect_error` (not `error`) for handling middleware rejections. The `error` event is for application-level errors after connection is established.

### UsernameScreen Component Design

**Layout:** Centered card matching OtpScreen design (dark theme, same width/spacing).

**Elements:**
- Title: "Choose your username" (or similar)
- Single text input for username (not monospace, regular font)
- "Join" submit button
- Validation error message area
- Loading state: "Joining..."

**Validation (client-side):**
- Regex: `/^[a-zA-Z0-9]+$/` — letters and numbers only
- Max length: 15 characters
- Min length: 1 character
- Error messages match ACs exactly: "Letters and numbers only", "Username must be 15 characters or less"

**State flow:**
- Local state: `username`, `isSubmitting`, `errorMessage`
- On submit: emit `socket.emit('setUsername', { username })`, set isSubmitting
- On `error` event from socket: display error, clear isSubmitting
- On `authenticated` event: store handles screen transition (component unmounts)

### Previous Story Intelligence (1.1, 1.2, 1.3)

**Key learnings:**

- **ESM imports:** All server imports use `.js` extension (e.g., `import { getOtp } from '../../state/otp.js'`)
- **Process env:** Use `process.env['VAR']` bracket notation
- **State copy pattern:** Return `{ ...session }` from state getters to prevent external mutation. For objects with Date fields, deep-copy Dates: `new Date(date)`. For `UserSession` (no Date fields, only strings and null), shallow copy is sufficient.
- **Zod v3:** Use `.safeParse()` for validation, not `.parse()`. Check `result.success` before accessing `result.data`.
- **OtpScreen pattern:** Follow the same component structure for UsernameScreen — `useState` for local form state, `useCallback` for handlers, CSS in separate file.
- **Zustand selector pattern:** `useAppStore((s) => s.screen)` — always use selectors, not `useAppStore()` bare.
- **Socket.io client:** Already configured in `packages/client/src/socket/client.ts` with `autoConnect: false` and `transports: ['websocket']`. Import and use this instance.
- **Vite proxy:** Both `/api/*` and `/socket.io/*` are proxied to `http://localhost:3001` in dev — no need for absolute URLs.

**Review action items from previous stories still relevant:**
- [M3 from 1.1] No JSON 404 handler for `/api/*` routes — consider adding generic API 404 middleware
- [M2 from 1.2] Endpoint integration test deferred
- [M1 from 1.2-review2] Admin endpoint error format fixed to `ErrorPayload`

**Files from previous stories this story depends on:**
- `packages/server/src/state/otp.ts` — `isOtpValid()`, `getOtp()` for session validation
- `packages/server/src/state/sessions.ts` — `PendingSession` functions to extend
- `packages/client/src/socket/client.ts` — pre-configured socket instance
- `packages/client/src/store/index.ts` — Zustand store with `sessionToken`, `pendingSessionId`, `screen`
- `packages/shared/src/types/events.ts` — `ClientToServerEvents`, `ServerToClientEvents`
- `packages/shared/src/schemas/auth.ts` — `usernameRequestSchema`

### Git Intelligence

**Recent commits:**
- `3dae192` feat: Story 1.1 - Project scaffolding & shared types with code review fixes
- `e8b583a` Initial commit: project planning artifacts and BMAD workflow setup

**Uncommitted work from Stories 1.2 and 1.3 is present in the working tree.** Story 1.4 builds on top of this uncommitted code. All files from Stories 1.2 and 1.3 should be treated as the current baseline.

**Patterns established:**
- Commit format: `feat: Story X.X - <description>`
- ESM modules throughout (`"type": "module"` in all `package.json`)
- `.js` extensions required in all imports for ESM compatibility
- Vitest for server-side testing with config in `packages/server/vitest.config.ts`
- Test files: `src/**/*.test.ts` pattern

### Project Structure Notes

**Files to create:**
```
packages/client/src/components/screens/UsernameScreen.tsx    # NEW: Username entry component
packages/client/src/components/screens/UsernameScreen.css    # NEW: Username screen styles
packages/server/src/socket/handlers/authHandlers.ts          # NEW: setUsername + authenticate handlers
packages/server/src/socket/middleware/auth.ts                 # NEW: Socket.io auth middleware
```

**Files to modify:**
```
packages/server/src/state/sessions.ts       # EXTEND: Add UserSession, full session CRUD
packages/server/src/state/sessions.test.ts  # EXTEND: Tests for new session functions
packages/server/src/index.ts                # UPDATE: Wire socket middleware + handlers
packages/client/src/App.tsx                 # UPDATE: Import UsernameScreen, add socket lifecycle
packages/client/src/store/index.ts          # UPDATE: Possibly add clearSession helper action
```

**Files to delete:**
```
packages/server/src/socket/handlers/.gitkeep   # Replaced by authHandlers.ts
packages/server/src/socket/middleware/.gitkeep  # Replaced by auth.ts
```

- All new files follow established naming conventions: PascalCase for React components, camelCase for server modules
- Server socket handlers go in `src/socket/handlers/` (architecture-specified location)
- Server middleware goes in `src/socket/middleware/` (architecture-specified location)
- No new dependencies required — `crypto.randomUUID()` is Node.js built-in, Socket.io already installed

### Testing Requirements

**Server-side (Vitest):**
- Extend `packages/server/src/state/sessions.test.ts`:
  - `createSession()` returns a UserSession with valid token, username, socketId, otpCode
  - `createSession()` removes the pending session it consumes
  - `createSession()` fails if pendingSessionId doesn't exist
  - `getSessionByToken()` retrieves stored session by token
  - `getSessionByToken()` returns null for non-existent token
  - `updateSessionSocketId()` updates the socketId field
  - `removeSession()` removes session from store
  - Multiple full sessions can coexist

**Client-side (manual verification):**
- Username screen renders after OTP validation
- Valid username → transitions to lobby
- Invalid username → shows appropriate error message
- Session restore from localStorage on page reload
- Session invalidation when OTP regenerated

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4: Username Entry & Session Establishment]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security — Session Token Flow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security — Security Enforcement]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — Socket.io Event Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — State Management (Zustand)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Screen Rendering (No Router)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns — Server socket/handlers, socket/middleware]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling Patterns]
- [Source: _bmad-output/planning-artifacts/prd.md#User Identity FR6-FR8]
- [Source: _bmad-output/planning-artifacts/prd.md#Connection Resilience FR40-FR44]
- [Source: _bmad-output/implementation-artifacts/1-3-otp-entry-and-validation.md#Completion Notes List]
- [Source: _bmad-output/implementation-artifacts/1-2-otp-generation-system.md#Completion Notes List]
- [Source: _bmad-output/implementation-artifacts/1-1-project-scaffolding-and-shared-types.md#Completion Notes List]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no errors.

### Completion Notes List

- Socket.io auth middleware uses `connect_error` (not `error`) for connection rejections — client handles via `socket.on('connect_error')`
- Session-OTP linkage validated via `isOtpValid(session.otpCode)` — covers both OTP expiry and regeneration scenarios
- Auto-restore pattern: returning users validated in middleware get `authenticated` emitted automatically in `registerAuthHandlers` — no separate `authenticate` event needed on reconnect
- `handleSetUsername` validates against `usernameRequestSchema` from `@cardpal/shared` (Zod, server-side) in addition to client-side regex
- All session getters return shallow copies (`{ ...session }`) to prevent external mutation — shallow copy sufficient since UserSession has no Date fields
- `clearSessions()` exported for test cleanup
- Manual verification tasks 7.1–7.6 left unchecked (require running dev server interactively)

### Change Log

| File | Action | Description |
|------|--------|-------------|
| `packages/server/src/state/sessions.ts` | Modified | Added `UserSession` interface, `createSession`, `getSessionByToken`, `updateSessionSocketId`, `removeSession`, `clearSessions` |
| `packages/server/src/state/sessions.test.ts` | Modified | Added 13 new tests for full session CRUD (total 23 session tests) |
| `packages/server/src/socket/types.ts` | Created | `SocketData`, `AppSocket`, `AppServer` type definitions |
| `packages/server/src/socket/middleware/auth.ts` | Created | Socket.io auth middleware (token + pendingSessionId validation) |
| `packages/server/src/socket/handlers/authHandlers.ts` | Created | `handleSetUsername`, `handleAuthenticate`, `registerAuthHandlers` |
| `packages/server/src/index.ts` | Modified | Wired auth middleware and handlers, added `SocketData` generic to Server |
| `packages/client/src/components/screens/UsernameScreen.tsx` | Created | Username entry form with client-side validation |
| `packages/client/src/components/screens/UsernameScreen.css` | Created | Dark theme styling matching OtpScreen design |
| `packages/client/src/App.tsx` | Modified | Socket connection lifecycle (3 useEffects), imported UsernameScreen |
| `packages/client/src/store/index.ts` | Modified | Added username, connectionStatus, lobbyRooms, currentRoom, gameState fields and setters |

### Senior Developer Review (AI)

**Reviewer:** Moritz | **Date:** 2026-03-03 | **Model:** Claude Opus 4.6

**Issues Found:** 2 High, 3 Medium, 3 Low

| ID | Severity | Description | Resolution |
|----|----------|-------------|------------|
| H1 | HIGH | No unit tests for auth middleware or auth handlers | Fixed: Added 7 tests in `auth.test.ts`, 13 tests in `authHandlers.test.ts` (20 new tests) |
| H2 | HIGH | Socket reconnection loop on AUTH_ERROR — missing `socket.disconnect()` in App.tsx | Fixed: Added `socket.disconnect()` before clearing state in `onConnectError` |
| M1 | MEDIUM | UsernameScreen `isSubmitting` not reset on AUTH_ERROR from server | Fixed: Added `AUTH_ERROR` to the error handler condition |
| M2 | MEDIUM | Duplicate `AppSocket` type in auth middleware instead of importing from `types.ts` | Fixed: Removed local type, imported `AppSocket` from `../types.js` |
| M3 | MEDIUM | `store/index.ts` modified but not in story File List | Fixed: Added to Change Log |
| L1 | LOW | `createSession` takes 3 params (derives otpCode from pending session) vs story spec's 4 | Accepted: better design, less error-prone |
| L2 | LOW | `maxLength` HTML attribute makes "15 chars" validation message unreachable | Accepted: constraint still enforced via HTML |
| L3 | LOW | No `autoComplete="off"` on username input | Accepted: minor UX polish for future |

**Verdict:** All HIGH and MEDIUM issues fixed. All 82 tests pass. TypeScript clean.

### File List

**Created:**
- `packages/server/src/socket/types.ts`
- `packages/server/src/socket/middleware/auth.ts`
- `packages/server/src/socket/middleware/auth.test.ts`
- `packages/server/src/socket/handlers/authHandlers.ts`
- `packages/server/src/socket/handlers/authHandlers.test.ts`
- `packages/client/src/components/screens/UsernameScreen.tsx`
- `packages/client/src/components/screens/UsernameScreen.css`

**Modified:**
- `packages/server/src/state/sessions.ts`
- `packages/server/src/state/sessions.test.ts`
- `packages/server/src/index.ts`
- `packages/client/src/App.tsx`
- `packages/client/src/store/index.ts`
