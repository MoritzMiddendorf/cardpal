---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - prd.md
workflowType: 'architecture'
project_name: 'cardpal'
user_name: 'Moritz'
date: '2026-02-05'
lastStep: 8
status: 'complete'
completedAt: '2026-02-05'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
45 FRs across 9 capability areas defining a real-time multiplayer card game platform. Core architectural drivers:
- OTP-based access control with 12-hour validity and server-side session tracking
- Game room lifecycle (create → join → play → conclude → return to lobby)
- Game engine abstraction supporting multiple games (Blackjack, Skip-Bo) with different rule complexity
- Server-authoritative action validation - clients request actions, server validates and applies
- Card visibility system distinguishing private (owner-only) from public cards
- Reconnection handling with state restoration

**Non-Functional Requirements:**

| Concern | Requirement | Architectural Impact |
|---------|-------------|---------------------|
| Performance | Sub-second action propagation | WebSocket for low-latency; no HTTP polling |
| Security | Private cards never sent to non-owners | Server filters game state per-player before transmission |
| Security | Server-authoritative state | All game logic runs server-side; client is view-only |
| Security | OTP enforced at server | All endpoints validate session; no client-side shortcuts |
| Compatibility | Chromium desktop only | No Safari/Firefox testing; no mobile responsive |

**Scale & Complexity:**
- Primary domain: Full-stack real-time web application
- Complexity level: Medium
- Estimated architectural components: ~8-10 (auth, session, lobby, room, game engine, game implementations, WebSocket layer, frontend SPA)

### Technical Constraints & Dependencies

- **No database** - All state in-memory; server restart clears everything (acceptable)
- **Single server instance** - <10 users; no horizontal scaling needed
- **Chromium-only** - Simplifies WebSocket implementation; no fallbacks needed
- **Free-tier hosting target** - Architecture must be lightweight

### Cross-Cutting Concerns Identified

| Concern | Affected Components | Resolution Approach |
|---------|--------------------|--------------------|
| Server-authoritative validation | Game engine, all game implementations | Centralized action validation via game interface |
| WebSocket connection lifecycle | Auth, lobby, rooms, gameplay | Single connection with message routing by type |
| Card visibility filtering | Game state transmission, frontend rendering | Server filters state per-player before broadcast |
| Session management | OTP validation, username, room membership | Session object tracks user state through all phases |
| Reconnection | WebSocket layer, game state | Session survives disconnect; reconnect restores state |

## Starter Template Evaluation

### Primary Technology Domain

Full-stack real-time web application (SPA + WebSocket server) based on project requirements analysis.

### Starter Options Considered

| Option | Verdict |
|--------|---------|
| T3 Stack (create-t3-app) | Rejected - includes Prisma ORM, tRPC; overkill for no-database project |
| Sairyss/fullstack-starter-template | Rejected - includes Prisma, ChakraUI; more complexity than needed |
| Next.js | Rejected - SSR unnecessary for OTP-gated private SPA |
| Custom minimal monorepo | **Selected** - right-sized for requirements |

### Selected Approach: Custom pnpm Monorepo

**Rationale:**
- No database means no ORM configuration needed
- WebSocket-first architecture doesn't benefit from tRPC
- Shared TypeScript types critical for game state consistency
- Simpler codebase = better AI-assisted development
- Easier to understand and maintain for solo developer

**Project Structure:**

```
cardpal/
├── packages/
│   ├── client/              # Vite + React + TypeScript
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── server/              # Node.js + Express + TypeScript
│   │   ├── src/
│   │   └── package.json
│   └── shared/              # Shared types & utilities
│       ├── src/
│       │   ├── types/       # Game state, messages, actions
│       │   └── index.ts
│       └── package.json
├── package.json             # Workspace root
├── pnpm-workspace.yaml
└── tsconfig.base.json       # Shared TypeScript config
```

**Initialization Commands:**

```bash
mkdir cardpal && cd cardpal
pnpm init
# Create pnpm-workspace.yaml
# Create packages/client with: pnpm create vite client --template react-ts
# Create packages/server and packages/shared manually
```

### Architectural Decisions Established

**Language & Runtime:**
- TypeScript 5.x across all packages
- Node.js 20 LTS for server
- Strict TypeScript configuration for type safety

**Frontend Stack:**
- Vite for build tooling and dev server
- React 18 for UI
- CSS modules or vanilla CSS for styling (simple, no build complexity)

**Backend Stack:**
- Express.js for HTTP endpoints (OTP validation, health checks)
- Socket.io for WebSocket communication
- In-memory state management (no database)

**Shared Package:**
- TypeScript interfaces for game state, player state, room state
- Message type definitions for WebSocket protocol
- Game action types shared between client and server

**Development Experience:**
- pnpm workspaces for dependency management
- Concurrent dev servers (client on :5173, server on :3001)
- Hot reload on both client and server

### Deployment Target

**Platform:** Render (free tier)

**Rationale:**
- Free tier sufficient for <10 users
- WebSocket support confirmed
- Cold start acceptable (admin wake-up on OTP generation)
- Simple GitHub integration for deployment

**Deployment Strategy:**
- Single web service running both static frontend and WebSocket server
- Express serves built Vite assets + handles WebSocket connections
- Environment: Node.js

## Core Architectural Decisions

### Decision Summary

| Category | Decision | Rationale |
|----------|----------|-----------|
| Data Validation | Zod | Type-safe runtime validation, excellent TypeScript integration |
| Session Management | Simple session token | Lightweight; server holds all state anyway |
| Message Protocol | Socket.io typed events | Native to Socket.io, type-safe with shared types |
| State Management | Zustand | Minimal boilerplate, great DX, sufficient for server-driven state |
| Routing | None (conditional render) | Linear flow doesn't need URL routing |
| CI/CD | Render auto-deploy | Zero config, sufficient for hobby project |

### Data Architecture

**Validation Strategy:**
- **Zod** for all runtime validation
- Validate incoming Socket.io messages before processing
- Shared Zod schemas in `packages/shared` for client-server consistency

**In-Memory State Structure:**
```
Server Memory:
├── otpState: { code: string, expiresAt: Date } | null
├── sessions: Map<token, UserSession>
├── rooms: Map<roomId, Room>
└── games: Map<roomId, GameInstance>
```

### Authentication & Security

**OTP Handling:**
- Format: 6-15 character alphanumeric, readable (e.g., `A7X-K9M`)
- Generated via `crypto.randomBytes()` for security
- Stored in-memory with 12-hour TTL
- All previous sessions invalidated when new OTP generated

**Session Token Flow:**
1. User submits valid OTP + username
2. Server generates random session token (`crypto.randomUUID()`)
3. Token stored in client `localStorage`
4. Server maintains `Map<token, { username, otp, roomId, socketId }>`
5. On reconnect: client sends token in Socket.io handshake auth
6. Server restores session if token valid and OTP not expired

**Security Enforcement:**
- All Socket.io events validate session token first
- Game state filtered per-player before transmission (private cards removed)
- No game data accessible without valid session

### API & Communication Patterns

**Socket.io Event Architecture:**

```typescript
// Client → Server events
interface ClientToServerEvents {
  authenticate: (token: string) => void;
  setUsername: (username: string) => void;
  createRoom: (gameType: GameType) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  gameAction: (action: GameAction) => void;
}

// Server → Client events
interface ServerToClientEvents {
  authenticated: (session: { token: string; username: string }) => void;
  lobbyState: (rooms: RoomInfo[]) => void;
  roomState: (room: RoomState) => void;
  gameState: (state: FilteredGameState) => void;
  error: (error: { code: string; message: string }) => void;
}
```

**Error Handling:**
- Validation errors: Zod parse errors → `error` event with `VALIDATION_ERROR` code
- Game rule violations: → `error` event with `INVALID_ACTION` code
- Auth errors: → `error` event with `AUTH_ERROR` code, client redirects to OTP screen

### Frontend Architecture

**State Management (Zustand):**

```typescript
interface AppState {
  // Auth
  sessionToken: string | null;
  username: string | null;

  // Connection
  connectionStatus: 'connecting' | 'connected' | 'disconnected';

  // UI State (determines which screen to render)
  screen: 'otp' | 'username' | 'lobby' | 'room' | 'game';

  // Server-pushed state
  lobbyRooms: RoomInfo[];
  currentRoom: RoomState | null;
  gameState: FilteredGameState | null;
}
```

**Screen Rendering (No Router):**
- Single `<App>` component with switch on `screen` state
- Screen transitions triggered by server events or user actions
- Zustand persists `sessionToken` to localStorage for reconnection

### Infrastructure & Deployment

**Deployment Pipeline:**
- GitHub repo connected to Render
- Auto-deploy on push to `main` branch
- Build command: `pnpm install && pnpm build`
- Start command: `pnpm start`

**Environment Variables:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | (Render-assigned) | Server port |
| `OTP_VALIDITY_HOURS` | `12` | OTP expiration time |

**Build Output:**
- Vite builds client to `packages/client/dist`
- Express serves static files from client dist
- Single Render web service handles both static + WebSocket

## Implementation Patterns & Consistency Rules

### Purpose

These patterns ensure AI agents write compatible, consistent code. Without these rules, different agents could make different choices that cause conflicts.

### Naming Patterns

**File Naming:**

| Type | Convention | Example |
|------|------------|---------|
| React components | PascalCase | `GameBoard.tsx` |
| Hooks | camelCase with `use` prefix | `useGameState.ts` |
| Utilities | camelCase | `generateOtp.ts` |
| Types/Interfaces | PascalCase | `GameState.ts` |
| Constants file | camelCase | `constants.ts` |

**Code Naming:**

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userId`, `roomState` |
| Functions | camelCase | `getValidActions()`, `handleCardPlay()` |
| Constants | UPPER_SNAKE_CASE | `MAX_PLAYERS`, `OTP_LENGTH` |
| Booleans | `is`/`has`/`can` prefix | `isConnected`, `hasStarted`, `canPlay` |
| Types/Interfaces | PascalCase | `GameState`, `PlayerAction` |

**JSON Fields:**
- Always camelCase: `roomId`, `playerCount`, `gameState`

### Structure Patterns

**Client (`packages/client/src/`):**
```
src/
├── components/
│   ├── screens/       # OtpScreen, LobbyScreen, RoomScreen, GameScreen
│   └── ui/            # Card, PlayerList, Button, etc.
├── hooks/             # useSocket, useGameState
├── store/             # Zustand store definition
├── socket/            # Socket.io client setup
├── assets/            # Card images, logo
└── App.tsx
```

**Server (`packages/server/src/`):**
```
src/
├── index.ts           # Entry point
├── socket/
│   ├── handlers/      # joinRoom.ts, playCard.ts, etc.
│   └── middleware/    # auth.ts
├── state/
│   ├── sessions.ts    # Session token map
│   ├── rooms.ts       # Room management
│   └── games.ts       # Active game instances
├── games/
│   ├── engine.ts      # Game interface
│   ├── blackjack/     # Blackjack implementation
│   └── skipbo/        # Skip-Bo implementation
└── utils/             # generateOtp.ts, generateRoomId.ts
```

**Shared (`packages/shared/src/`):**
```
src/
├── types/
│   ├── game.ts        # GameState, Action, Card
│   ├── room.ts        # Room, Player, RoomState
│   └── events.ts      # ClientToServerEvents, ServerToClientEvents
├── schemas/           # Zod schemas matching types
└── index.ts           # Re-exports
```

### Communication Patterns

**Socket.io Event Naming:**

| Direction | Convention | Examples |
|-----------|------------|----------|
| Client → Server | verb-first action | `joinRoom`, `playCard`, `startGame` |
| Server → Client | noun-first state | `roomState`, `gameState`, `lobbyState` |
| Errors | noun | `error` |

**Payload Rules:**
- All payloads are objects, never raw primitives
- All payloads have corresponding Zod schemas in shared package

```typescript
// Correct
socket.emit('joinRoom', { roomId: 'abc123' });

// Incorrect
socket.emit('joinRoom', 'abc123');
```

### Error Handling Patterns

**Error Codes:**

```typescript
type ErrorCode =
  | 'AUTH_ERROR'        // Invalid/expired token or OTP
  | 'VALIDATION_ERROR'  // Zod validation failed
  | 'INVALID_ACTION'    // Game rule violation
  | 'ROOM_FULL'         // Room at capacity
  | 'ROOM_NOT_FOUND'    // Room doesn't exist
  | 'NOT_AUTHORIZED'    // Action not permitted (e.g., non-creator starting game)
  | 'GAME_IN_PROGRESS'  // Can't join/modify during active game
  | 'UNKNOWN_ERROR';    // Fallback
```

**Error Payload Structure:**

```typescript
interface ErrorPayload {
  code: ErrorCode;
  message: string;  // Human-readable
}
```

**Client Error Handling:**
- `AUTH_ERROR` → Clear localStorage token, navigate to OTP screen
- `VALIDATION_ERROR` / `INVALID_ACTION` → Display message, remain on current screen
- Other errors → Display message, handle contextually

### Data Format Patterns

**ID Formats:**

| Type | Format | Example |
|------|--------|---------|
| Session token | UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |
| Room ID | 6 alphanumeric | `abc123` |
| OTP | Readable with separator | `A7X-K9M` |

**Timestamps:**
- Always ISO 8601 strings: `2026-02-05T14:30:00.000Z`

### Enforcement Guidelines

**All AI Agents MUST:**
1. Follow naming conventions exactly - no variations
2. Place files in the designated directories
3. Use Zod schemas from shared package for all validation
4. Return errors using the standardized ErrorPayload structure
5. Use camelCase for all JSON fields
6. Never emit raw primitives via Socket.io - always use object payloads

**Pattern Violations:**
- ESLint rules will enforce naming conventions
- TypeScript strict mode catches type mismatches
- Shared Zod schemas ensure payload consistency

## Project Structure & Boundaries

### Complete Project Directory Structure

```
cardpal/
├── .gitignore
├── .nvmrc                          # Node version (20)
├── package.json                    # Workspace root
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json              # Shared TS config
├── README.md
│
├── packages/
│   ├── client/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── main.tsx
│   │       ├── index.css
│   │       ├── vite-env.d.ts
│   │       ├── components/
│   │       │   ├── screens/
│   │       │   │   ├── OtpScreen.tsx
│   │       │   │   ├── UsernameScreen.tsx
│   │       │   │   ├── LobbyScreen.tsx
│   │       │   │   ├── RoomScreen.tsx
│   │       │   │   └── GameScreen.tsx
│   │       │   └── ui/
│   │       │       ├── Button.tsx
│   │       │       ├── Input.tsx
│   │       │       ├── Card.tsx
│   │       │       ├── CardPile.tsx
│   │       │       ├── PlayerList.tsx
│   │       │       ├── ConnectionStatus.tsx
│   │       │       └── ErrorToast.tsx
│   │       ├── hooks/
│   │       │   ├── useSocket.ts
│   │       │   └── usePersistedState.ts
│   │       ├── store/
│   │       │   ├── index.ts
│   │       │   └── slices/
│   │       │       ├── authSlice.ts
│   │       │       ├── lobbySlice.ts
│   │       │       └── gameSlice.ts
│   │       ├── socket/
│   │       │   ├── client.ts
│   │       │   └── handlers.ts
│   │       └── assets/
│   │           ├── cards/
│   │           │   ├── standard/
│   │           │   ├── skipbo/
│   │           │   └── back.png
│   │           └── logo.png
│   │
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── config.ts
│   │       ├── socket/
│   │       │   ├── index.ts
│   │       │   ├── middleware/
│   │       │   │   └── auth.ts
│   │       │   └── handlers/
│   │       │       ├── authHandlers.ts
│   │       │       ├── lobbyHandlers.ts
│   │       │       └── gameHandlers.ts
│   │       ├── state/
│   │       │   ├── otp.ts
│   │       │   ├── sessions.ts
│   │       │   ├── rooms.ts
│   │       │   └── games.ts
│   │       ├── games/
│   │       │   ├── engine.ts
│   │       │   ├── blackjack/
│   │       │   │   ├── index.ts
│   │       │   │   ├── types.ts
│   │       │   │   └── rules.ts
│   │       │   └── skipbo/
│   │       │       ├── index.ts
│   │       │       ├── types.ts
│   │       │       └── rules.ts
│   │       └── utils/
│   │           ├── generateOtp.ts
│   │           ├── generateRoomId.ts
│   │           └── filterGameState.ts
│   │
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── types/
│           │   ├── auth.ts
│           │   ├── room.ts
│           │   ├── game.ts
│           │   ├── events.ts
│           │   └── errors.ts
│           └── schemas/
│               ├── auth.ts
│               ├── room.ts
│               └── game.ts
│
└── scripts/
    └── generate-otp.ts
```

### Architectural Boundaries

**Client ↔ Server Boundary:**
- All communication via Socket.io typed events
- Client never directly accesses server state
- Server pushes filtered state; client renders
- Shared types ensure payload consistency

**Shared Package Boundary:**
- Contains only types and Zod schemas
- No runtime logic or side effects
- Both client and server import from `@cardpal/shared`
- Single source of truth for all data structures

**Game Engine Boundary:**
- Each game implements `GameEngine` interface from `engine.ts`
- Server orchestrates; engine handles rules
- Games are fully isolated - no cross-game imports
- New games added by creating new directory under `games/`

**State Boundary:**
- All server state in `state/` directory
- State modules expose functions, not raw data
- No direct state mutation from handlers - always via state module functions

### Requirements to Structure Mapping

| FR Category | Primary Location(s) |
|-------------|---------------------|
| Access Control (FR1-5) | `server/src/state/otp.ts`, `server/src/utils/generateOtp.ts`, `scripts/generate-otp.ts` |
| User Identity (FR6-8) | `server/src/socket/handlers/authHandlers.ts`, `shared/src/schemas/auth.ts` |
| Lobby & Room (FR9-16) | `server/src/state/rooms.ts`, `server/src/socket/handlers/lobbyHandlers.ts`, `client/src/components/screens/LobbyScreen.tsx` |
| Game Session (FR17-23) | `server/src/state/games.ts`, `server/src/socket/handlers/gameHandlers.ts`, `client/src/components/screens/RoomScreen.tsx` |
| Gameplay Core (FR24-30) | `server/src/games/engine.ts`, `shared/src/types/game.ts` |
| Game-Specific (FR31-36) | `server/src/games/blackjack/`, `server/src/games/skipbo/` |
| Visual Feedback (FR37-39) | `client/src/components/ui/Card.tsx`, `client/src/components/ui/CardPile.tsx` |
| Connection (FR40-44) | `server/src/socket/middleware/auth.ts`, `client/src/hooks/useSocket.ts`, `client/src/store/slices/authSlice.ts` |

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────────────┐  │
│  │ Zustand  │◄───│ Socket   │◄───│ Socket.io Connection     │  │
│  │ Store    │    │ Handlers │    │                          │  │
│  └────┬─────┘    └──────────┘    └──────────────────────────┘  │
│       │                                      ▲                  │
│       ▼                                      │                  │
│  ┌──────────┐                                │                  │
│  │ React    │────── User Actions ────────────┘                  │
│  │ Screens  │                                                   │
│  └──────────┘                                                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                     Socket.io Events
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ SERVER                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │ Socket       │───►│ Handlers     │───►│ State Modules    │  │
│  │ Middleware   │    │ (auth/lobby/ │    │ (otp/sessions/   │  │
│  │ (auth check) │    │  game)       │    │  rooms/games)    │  │
│  └──────────────┘    └──────┬───────┘    └──────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│                      ┌──────────────┐                          │
│                      │ Game Engine  │                          │
│                      │ (blackjack/  │                          │
│                      │  skipbo)     │                          │
│                      └──────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### Development Workflow

**Local Development:**
```bash
# Install dependencies
pnpm install

# Start development (from root)
pnpm dev  # Runs client (5173) and server (3001) concurrently

# Generate OTP for testing
pnpm generate-otp
```

**Build & Deploy:**
```bash
# Build all packages
pnpm build

# Start production server (serves client + WebSocket)
pnpm start
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices (TypeScript, React, Vite, Node.js, Express, Socket.io, Zod, Zustand) are well-established, compatible, and commonly used together in production applications.

**Pattern Consistency:**
Implementation patterns (camelCase naming, typed events, Zod validation, state isolation) align with technology choices and reinforce each other.

**Structure Alignment:**
Project structure directly supports architectural decisions - monorepo enables shared types, game engine folder structure supports extensibility, clear boundaries between client/server/shared.

### Requirements Coverage ✅

**Functional Requirements:**
All 45 FRs have identified architectural components and file locations. Every capability from the PRD maps to specific code locations.

**Non-Functional Requirements:**
- Performance: WebSocket architecture enables sub-second communication
- Security: Server-authoritative design with state filtering prevents data leaks
- Compatibility: No special handling needed for Chromium-only support

### Implementation Readiness ✅

**AI Agent Guidance:**
Architecture provides sufficient detail for consistent implementation:
- Named patterns prevent conflicting choices
- File structure eliminates ambiguity about where code belongs
- Typed events and schemas enforce consistency
- Examples clarify complex patterns

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (Medium)
- [x] Technical constraints identified (no DB, Chromium-only, free hosting)
- [x] Cross-cutting concerns mapped (auth, state filtering, reconnection)

**✅ Architectural Decisions**
- [x] Technology stack fully specified with rationale
- [x] Data validation approach defined (Zod)
- [x] Authentication/session approach defined (simple tokens)
- [x] State management defined (Zustand, server-authoritative)

**✅ Implementation Patterns**
- [x] Naming conventions established (camelCase, PascalCase for components)
- [x] Structure patterns defined (monorepo, feature directories)
- [x] Communication patterns specified (Socket.io typed events)
- [x] Error handling standardized (ErrorCode enum, ErrorPayload)

**✅ Project Structure**
- [x] Complete directory structure defined (~50 files)
- [x] Component boundaries established (client/server/shared)
- [x] Game engine abstraction defined
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Server-authoritative design ensures security and consistency
- Shared types package prevents client/server drift
- Game engine abstraction enables easy addition of new games
- Simple technology choices optimize for AI-assisted development

**Areas for Future Enhancement:**
- Testing infrastructure (can add as needed)
- Monitoring/logging (add if issues arise in production)
- Admin web UI (Phase 2 if CLI proves inconvenient)

### Implementation Handoff

**AI Agent Guidelines:**
1. Follow all architectural decisions exactly as documented
2. Use implementation patterns consistently across all components
3. Respect project structure and boundaries
4. Use shared types/schemas - never duplicate type definitions
5. Refer to this document for all architectural questions

**First Implementation Steps:**
```bash
# 1. Initialize monorepo
mkdir cardpal && cd cardpal
pnpm init
echo 'packages:\n  - "packages/*"' > pnpm-workspace.yaml

# 2. Create client package
mkdir -p packages/client
cd packages/client
pnpm create vite . --template react-ts
cd ../..

# 3. Create server and shared packages
mkdir -p packages/server/src packages/shared/src

# 4. Set up workspace dependencies and tsconfig
```
