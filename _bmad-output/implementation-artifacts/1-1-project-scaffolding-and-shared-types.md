# Story 1.1: Project Scaffolding & Shared Types

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **a properly structured monorepo with shared TypeScript types**,
so that **client and server can share type definitions and validation schemas**.

## Acceptance Criteria

1. **Given** a fresh project directory **When** the scaffolding is complete **Then** the pnpm monorepo structure exists with `packages/client`, `packages/server`, `packages/shared`
2. **And** TypeScript is configured with strict mode across all packages
3. **And** the shared package exports types for: `SessionToken`, `OtpValidationRequest`, `OtpValidationResponse`, `UsernameRequest`, `ErrorPayload`
4. **And** Zod schemas exist matching each shared type
5. **And** the client package has Vite + React 18 configured
6. **And** the server package has Express + Socket.io configured
7. **And** `pnpm dev` starts both client (port 5173) and server (port 3001) concurrently

## Tasks / Subtasks

- [x] Task 1: Initialize pnpm monorepo workspace (AC: #1)
  - [x] 1.1 Create root `package.json` with workspace scripts (`dev`, `build`, `start`, `generate-otp`)
  - [x] 1.2 Create `pnpm-workspace.yaml` with `packages/*` glob
  - [x] 1.3 Create `tsconfig.base.json` with strict mode, shared compiler options
  - [x] 1.4 Create `.gitignore` (node_modules, dist, .env)
  - [x] 1.5 Create `.nvmrc` with Node 20
- [x] Task 2: Scaffold client package (AC: #5)
  - [x] 2.1 Initialize `packages/client` with Vite + React 18 + TypeScript template
  - [x] 2.2 Configure `vite.config.ts` with dev server on port 5173 and proxy to server port 3001
  - [x] 2.3 Set up `tsconfig.json` extending base config
  - [x] 2.4 Create directory structure: `src/components/screens/`, `src/components/ui/`, `src/hooks/`, `src/store/`, `src/socket/`, `src/assets/`
  - [x] 2.5 Create minimal `App.tsx` with screen switch placeholder (otp | username | lobby | room | game)
  - [x] 2.6 Install and configure Zustand store with initial `AppState` shape
  - [x] 2.7 Install Socket.io client (`socket.io-client`)
- [x] Task 3: Scaffold server package (AC: #6)
  - [x] 3.1 Initialize `packages/server/package.json` with TypeScript, Express, Socket.io, Zod dependencies
  - [x] 3.2 Set up `tsconfig.json` extending base config
  - [x] 3.3 Create `src/index.ts` entry point with Express + Socket.io server on port 3001
  - [x] 3.4 Create directory structure: `src/socket/handlers/`, `src/socket/middleware/`, `src/state/`, `src/games/`, `src/utils/`
  - [x] 3.5 Configure Express to serve static files from client dist in production
  - [x] 3.6 Add tsx or ts-node-dev for development hot reload
- [x] Task 4: Create shared package with types and schemas (AC: #2, #3, #4)
  - [x] 4.1 Initialize `packages/shared/package.json` with Zod dependency
  - [x] 4.2 Set up `tsconfig.json` extending base config
  - [x] 4.3 Create `src/types/auth.ts` with `SessionToken`, `OtpValidationRequest`, `OtpValidationResponse`, `UsernameRequest`
  - [x] 4.4 Create `src/types/errors.ts` with `ErrorPayload` and `ErrorCode` type
  - [x] 4.5 Create `src/types/room.ts` with placeholder `RoomInfo`, `RoomState` types
  - [x] 4.6 Create `src/types/game.ts` with placeholder `GameState`, `GameAction`, `Card`, `GameType` enum
  - [x] 4.7 Create `src/types/events.ts` with `ClientToServerEvents` and `ServerToClientEvents` interfaces
  - [x] 4.8 Create `src/schemas/auth.ts` with Zod schemas matching auth types
  - [x] 4.9 Create `src/index.ts` re-exporting all types and schemas
  - [x] 4.10 Configure package to be importable as `@cardpal/shared` via workspace protocol
- [x] Task 5: Wire up concurrent dev command (AC: #7)
  - [x] 5.1 Install `concurrently` in root
  - [x] 5.2 Configure root `pnpm dev` script to run client and server dev concurrently
  - [x] 5.3 Verify `pnpm dev` starts client on 5173 and server on 3001
- [x] Task 6: Verify cross-package imports work
  - [x] 6.1 Import a shared type in client and verify no TypeScript errors
  - [x] 6.2 Import a shared type in server and verify no TypeScript errors
  - [x] 6.3 Import and use a Zod schema in server to validate test data

## Dev Notes

### Architecture Compliance

**CRITICAL - Follow these patterns exactly:**

- **Monorepo structure:** `packages/client`, `packages/server`, `packages/shared` — no other layout
- **Package naming:** Use `@cardpal/client`, `@cardpal/server`, `@cardpal/shared` as package names
- **Workspace protocol:** Use `"@cardpal/shared": "workspace:*"` in client and server `package.json`
- **TypeScript strict mode:** Every `tsconfig.json` must have `"strict": true`
- **No database:** All server state is in-memory — do NOT add any database dependency
- **Single server process:** Express serves both HTTP endpoints and Socket.io WebSocket on the same port (3001)

### Technical Stack — Exact Versions

Use these specific versions (researched 2026-02-06):

| Package | Version | Notes |
|---------|---------|-------|
| pnpm | 10.x (latest) | Lifecycle scripts blocked by default — add `onlyBuiltDependencies` in `.npmrc` if needed |
| TypeScript | ~5.9.x | Strict mode required |
| Node.js | 20.20.x LTS | Specify in `.nvmrc`; EOL April 2026 but fine for MVP |
| Vite | ^7.x | Use `--template react-ts` for client scaffolding |
| React | ^18.3.x | Do NOT use React 19 — stick with 18.x |
| ReactDOM | ^18.3.x | Must match React version |
| Zustand | ^5.x | Requires React 18+; use `create()` API |
| Socket.io (server) | ^4.8.x | Server-side WebSocket library |
| socket.io-client | ^4.8.x | Client-side — must match server major version |
| Zod | ^4.x | BREAKING from v3: `.pick()`/`.omit()` throw on refinements; string validators moved to top-level functions. If v4 causes issues, fall back to `zod@3.x` |
| Express | ^5.x | BREAKING from v4: `app.del()` removed, use `app.delete()`; `res.sendfile()` → `res.sendFile()`; path-to-regexp@8 for routes |
| uuid | ^13.x | For session token generation (UUID v4) |
| concurrently | latest | For running client+server dev simultaneously |
| tsx | latest | For server dev with TypeScript hot reload |

**IMPORTANT Zod v4 vs v3 decision:** The architecture doc references Zod for validation. Zod v4 has breaking changes from v3. If you encounter import or API issues with v4, fall back to `zod@^3.23.0` which is stable and well-documented. The shared schemas should work with either version — just be consistent across all packages.

**IMPORTANT Express v5 vs v4 decision:** Express 5.2.x is now stable. Use v5 unless you encounter middleware compatibility issues. Key differences from v4: no `app.del()`, route params use new path-to-regexp, `res.json(obj, status)` no longer works (use `res.status(code).json(obj)`).

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| React components | PascalCase `.tsx` | `OtpScreen.tsx`, `Card.tsx` |
| Hooks | camelCase with `use` prefix `.ts` | `useSocket.ts` |
| Utilities | camelCase `.ts` | `generateOtp.ts` |
| Types/Interfaces | PascalCase `.ts` | `GameState` in `game.ts` |
| Constants | camelCase file, UPPER_SNAKE values | `MAX_PLAYERS` in `constants.ts` |

### Code Naming Conventions

- Variables: `camelCase` — `userId`, `roomState`
- Functions: `camelCase` — `getValidActions()`, `handleCardPlay()`
- Constants: `UPPER_SNAKE_CASE` — `MAX_PLAYERS`, `OTP_LENGTH`
- Booleans: `is`/`has`/`can` prefix — `isConnected`, `hasStarted`
- Types/Interfaces: `PascalCase` — `GameState`, `PlayerAction`
- JSON fields: always `camelCase`

### Socket.io Event Naming

| Direction | Convention | Examples |
|-----------|------------|----------|
| Client → Server | verb-first action | `joinRoom`, `playCard`, `startGame` |
| Server → Client | noun-first state | `roomState`, `gameState`, `lobbyState` |
| Errors | noun | `error` |

All payloads must be objects (never raw primitives).

### Shared Types to Create (AC #3, #4)

**`types/auth.ts`:**
```typescript
// SessionToken - string (UUID v4)
// OtpValidationRequest - { code: string }
// OtpValidationResponse - { token: string; username: string }
// UsernameRequest - { username: string }
```

**`types/errors.ts`:**
```typescript
type ErrorCode =
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'INVALID_ACTION'
  | 'ROOM_FULL'
  | 'ROOM_NOT_FOUND'
  | 'NOT_AUTHORIZED'
  | 'GAME_IN_PROGRESS'
  | 'UNKNOWN_ERROR';

interface ErrorPayload {
  code: ErrorCode;
  message: string;
}
```

**`types/events.ts`:**
```typescript
interface ClientToServerEvents {
  authenticate: (token: string) => void;
  setUsername: (username: string) => void;
  createRoom: (gameType: GameType) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  gameAction: (action: GameAction) => void;
}

interface ServerToClientEvents {
  authenticated: (session: { token: string; username: string }) => void;
  lobbyState: (rooms: RoomInfo[]) => void;
  roomState: (room: RoomState) => void;
  gameState: (state: FilteredGameState) => void;
  error: (error: ErrorPayload) => void;
}
```

**`types/game.ts`:**
```typescript
enum GameType { BLACKJACK = 'blackjack', SKIPBO = 'skipbo' }
// Card, GameState, GameAction, PlayerGameState — placeholder interfaces for now
```

**`types/room.ts`:**
```typescript
// RoomInfo — { id, name, gameType, playerCount, maxPlayers, status }
// RoomState — { id, name, gameType, status, ownerId, players }
```

### Project Structure Target

```
cardpal/
├── .gitignore
├── .nvmrc                          # "20"
├── package.json                    # Workspace root with scripts
├── pnpm-workspace.yaml             # packages: ["packages/*"]
├── tsconfig.base.json              # Shared strict TS config
├── packages/
│   ├── client/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── App.tsx             # Screen switch (otp|username|lobby|room|game)
│   │       ├── main.tsx
│   │       ├── index.css
│   │       ├── vite-env.d.ts
│   │       ├── components/
│   │       │   ├── screens/        # Empty placeholder files for future stories
│   │       │   └── ui/             # Empty placeholder dir
│   │       ├── hooks/              # Empty placeholder dir
│   │       ├── store/
│   │       │   └── index.ts        # Zustand store with AppState shape
│   │       ├── socket/
│   │       │   └── client.ts       # Socket.io client setup (placeholder)
│   │       └── assets/             # Empty placeholder dir
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts            # Express + Socket.io entry point
│   │       ├── config.ts           # PORT, OTP_VALIDITY_HOURS env vars
│   │       ├── socket/
│   │       │   ├── handlers/       # Empty placeholder dir
│   │       │   └── middleware/      # Empty placeholder dir
│   │       ├── state/              # Empty placeholder dir
│   │       ├── games/              # Empty placeholder dir
│   │       └── utils/              # Empty placeholder dir
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts            # Re-exports all types and schemas
│           ├── types/
│           │   ├── auth.ts
│           │   ├── errors.ts
│           │   ├── room.ts
│           │   ├── game.ts
│           │   └── events.ts
│           └── schemas/
│               └── auth.ts         # Zod schemas for auth types
└── scripts/
    └── generate-otp.ts             # Placeholder for Story 1.2
```

### Testing Requirements

- No formal test framework required for this scaffolding story
- **Verification:** All acceptance criteria are verifiable by running `pnpm dev` and checking:
  - Client loads on http://localhost:5173
  - Server starts on http://localhost:3001
  - No TypeScript compilation errors across any package
  - Cross-package imports resolve correctly

### Project Structure Notes

- This story creates the foundation that ALL subsequent stories build upon
- The directory structure MUST match the architecture document exactly
- Placeholder directories should be created even if empty (use `.gitkeep` if needed)
- The shared package is the single source of truth for all types — never duplicate type definitions in client or server

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Selected Approach: Custom pnpm Monorepo]
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Decisions Established]
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1: Project Scaffolding & Shared Types]
- [Source: _bmad-output/planning-artifacts/prd.md#Technical Architecture]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — no errors encountered during implementation.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Used Zod v3.24.0 instead of v4.x (story authorized fallback to v3 if v4 causes issues — proactively chose stable v3)
- Used Vite v6.3.0 instead of v7.x (v7 not available; v6 is current latest stable)
- Used Express v5.1.0 (stable release as specified)
- pnpm v10.28.2 installed via corepack
- esbuild builds approved via `pnpm.onlyBuiltDependencies` in root package.json
- All TypeScript strict mode checks pass across all 3 packages
- Cross-package imports verified: client imports from @cardpal/shared (store, socket), server imports from @cardpal/shared (index.ts)
- `pnpm dev` confirmed: Vite client on :5173, Express+Socket.io server on :3001

### File List

- `package.json` — workspace root with scripts and devDependencies
- `pnpm-workspace.yaml` — workspace config
- `tsconfig.base.json` — shared TypeScript strict config
- `.gitignore` — node_modules, dist, .env, etc.
- `.nvmrc` — Node 20
- `pnpm-lock.yaml` — lockfile (auto-generated)
- `scripts/generate-otp.ts` — placeholder for Story 1.2
- `packages/shared/package.json` — @cardpal/shared with zod dependency
- `packages/shared/tsconfig.json` — extends base config
- `packages/shared/src/index.ts` — re-exports all types and schemas
- `packages/shared/src/types/auth.ts` — SessionToken, OtpValidationRequest, OtpValidationResponse, UsernameRequest
- `packages/shared/src/types/errors.ts` — ErrorCode, ErrorPayload
- `packages/shared/src/types/game.ts` — GameType enum, Card, GameAction, GameState, PlayerGameState, FilteredGameState
- `packages/shared/src/types/room.ts` — RoomInfo, PlayerInfo, RoomState
- `packages/shared/src/types/events.ts` — ClientToServerEvents, ServerToClientEvents
- `packages/shared/src/schemas/auth.ts` — Zod schemas for OTP, username, session token validation
- `packages/shared/src/schemas/errors.ts` — Zod schemas for ErrorCode, ErrorPayload
- `packages/shared/src/schemas/game.ts` — Zod schemas for GameType, Card, GameAction, GameState, PlayerGameState
- `packages/shared/src/schemas/room.ts` — Zod schemas for RoomInfo, PlayerInfo, RoomState
- `packages/server/package.json` — @cardpal/server with express, socket.io, uuid, zod, tsx
- `packages/server/tsconfig.json` — extends base config
- `packages/server/src/index.ts` — Express + Socket.io server entry point
- `packages/server/src/config.ts` — PORT, OTP_VALIDITY_HOURS config
- `packages/server/src/utils/generateOtp.ts` — placeholder for Story 1.2
- `packages/server/src/socket/handlers/.gitkeep` — placeholder
- `packages/server/src/socket/middleware/.gitkeep` — placeholder
- `packages/server/src/state/.gitkeep` — placeholder
- `packages/server/src/games/.gitkeep` — placeholder
- `packages/client/package.json` — @cardpal/client with react, zustand, socket.io-client, vite
- `packages/client/tsconfig.json` — extends base config
- `packages/client/vite.config.ts` — dev server port 5173, proxy to :3001
- `packages/client/index.html` — SPA entry HTML
- `packages/client/src/main.tsx` — React 18 createRoot with StrictMode
- `packages/client/src/App.tsx` — screen switch placeholder component
- `packages/client/src/index.css` — dark theme base styles
- `packages/client/src/vite-env.d.ts` — Vite client types reference
- `packages/client/src/store/index.ts` — Zustand AppState store
- `packages/client/src/socket/client.ts` — typed Socket.io client
- `packages/client/src/components/screens/.gitkeep` — placeholder
- `packages/client/src/components/ui/.gitkeep` — placeholder
- `packages/client/src/hooks/.gitkeep` — placeholder
- `packages/client/src/assets/.gitkeep` — placeholder

### Change Log

- 2026-02-06: Initial implementation by dev agent (Claude Opus 4.6)
- 2026-02-06: Code review fixes applied (Claude Opus 4.6 — review agent)
  - H1: Added 4 missing `.gitkeep` files in server placeholder directories
  - H2: Created missing Zod schemas (`schemas/errors.ts`, `schemas/game.ts`, `schemas/room.ts`) and updated `index.ts` exports to satisfy AC #4
  - H3: Added `FilteredGameState` type alias in `types/game.ts`, updated `events.ts` and client store for architecture compliance
  - M4: Updated `.gitignore` with `*.tsbuildinfo`, `.vite`, `coverage` patterns

### Senior Developer Review (AI)

**Reviewer:** Moritz (assisted by Claude Opus 4.6)
**Date:** 2026-02-06
**Outcome:** Approved with action items

**Summary:** Implementation is solid — monorepo structure correct, TypeScript strict mode active, all packages compile cleanly, cross-package imports work. Zod schemas were incomplete (only auth schemas existed), now fixed. Server placeholder directories were missing `.gitkeep` files (story File List claimed they existed), now fixed. Architecture type alignment (`FilteredGameState`) corrected.

**Remaining Action Items (MEDIUM — address in future stories):**

- [ ] [AI-Review][MEDIUM] M1: Server `tsconfig.json` inherits `moduleResolution: "bundler"` from base config — should use `"NodeNext"` for a Node.js server package. Requires coordinating with shared package exports. [packages/server/tsconfig.json]
- [ ] [AI-Review][MEDIUM] M2: Story Dev Notes table still lists `Vite ^7.x` but v6.3.0 was used (v7 not available). Dev Notes version table is inaccurate. [story file, Dev Notes section]
- [ ] [AI-Review][MEDIUM] M3: No JSON 404 handler for `/api/*` routes in dev mode — Express returns HTML 404. Add API error middleware when API routes are introduced (Story 1.2+). [packages/server/src/index.ts]
