---
stepsCompleted: [step-01-init, step-02-discovery, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
inputDocuments:
  - pitch.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 0
  pitch: 1
classification:
  projectType: Real-Time Multiplayer Platform
  domain: Interactive Gaming
  complexity: Medium
  projectContext: greenfield
---

# Product Requirements Document - cardpal

**Author:** Moritz
**Date:** 2026-02-04

## Success Criteria

### User Success

- **Core "Aha!" Moment:** Playing a complete game where all rules are enforced correctly
- **Problem Solved:** Friends who live far apart can play card games together that aren't available online elsewhere
- **Trust Requirement:** The server is authoritative - no player can see others' private cards, no illegal moves are permitted by the system
- **Session Flow:** Smooth experience from OTP entry → username → lobby → game room → gameplay → back to lobby

### Business Success

- **Validation Target:** Successful game sessions on multiple different days with the friend group
- **Extensibility Goal:** Adding a new game should be straightforward (AI-assisted with provided rules/assets)
- **Maintenance Goal:** "Set it and forget it" - once deployed, requires minimal ongoing attention
- **Completeness Threshold:** ~3 working games (Blackjack, Skip-Bo, Lovecraft Letter)

### Technical Success

- **Reconnection Handling:** Other players wait for a disconnected user to rejoin (no timeout kicks)
- **Crash Recovery:** Not required - server restart means clean slate (no active rooms, no valid OTPs)
- **Latency:** No strict requirement for MVP - functional correctness over speed optimization
- **Hosting:** Cloud-hosted, ideally free tier given low user count (<10)

### Measurable Outcomes

| Metric | Target |
|--------|--------|
| Rule enforcement accuracy | 100% - no illegal states or moves permitted |
| Games supported | 3 (Blackjack → Skip-Bo → Lovecraft Letter) |
| Concurrent game rooms | At least 2 |
| Successful remote sessions | Multiple across different days |

## Product Scope

### MVP - Minimum Viable Product

- OTP-based access control (admin CLI command, 12-hour validity)
- Username entry (max 15 chars, no special characters)
- Game room creation and joining (auto-generated room names)
- Room states: Idle (lobby) and Playing
- **Blackjack implementation** with full rule enforcement
- **Skip-Bo implementation** with full rule enforcement
- Card movement animations (source → destination visibility)
- Basic disconnect handling (game waits on disconnected player's turn)
- Chromium desktop support only

### Growth Features (Post-MVP)

- **Lovecraft Letter implementation**
- UI polish based on real usage feedback
- Admin web UI if CLI proves cumbersome

### Vision (Future)

- Extensible game addition pattern (rules + assets → working game)
- AI-assisted game rule implementation
- Additional games based on group interest

## User Journeys

### Journey 1: Admin - Game Night Setup

**Persona:** Moritz (Server Admin)
**Situation:** It's Saturday evening, friends are online in Discord, time for card games.

**Opening Scene:**
Moritz opens a terminal or admin interface connected to the cardpal server. The server is idle - no active sessions, no valid OTPs.

**Rising Action:**
He runs a command (or clicks a button) to initiate a new session. The backend generates a secure OTP and displays it. Moritz copies the code.

**Climax:**
He pastes the OTP into the Discord group chat: "Game night! Use this code: `A7X-K9M`"

**Resolution:**
Friends start joining. Moritz navigates to the webapp himself, enters the OTP and his username, creates a room called "Blackjack Table", and waits for others to appear in the lobby.

**Requirements Revealed:**
- Admin authentication mechanism (CLI or minimal UI)
- OTP generation endpoint
- OTP display/copy functionality
- 12-hour OTP validity with server-side tracking

---

### Journey 2: Player - Joining a Game (Happy Path)

**Persona:** Alex (Friend)
**Situation:** Sees Moritz's Discord message with the OTP. Wants to join game night.

**Opening Scene:**
Alex clicks the cardpal link and sees a simple OTP entry screen. Nothing confusing - just a single input field.

**Rising Action:**
Alex enters the OTP. It's valid. Now prompted for a username - types "Alex" (under 15 chars, no special characters). Submits.

**Climax:**
The lobby appears showing a list of game rooms. One room exists: "Blackjack Table" with 1/4 players (Moritz). Alex clicks to join and sees Moritz's username in the room. They're in!

**Resolution:**
More friends trickle in. When all 4 players are present, Moritz (room creator) hits "Start Game". The Blackjack table appears and the game begins.

**Requirements Revealed:**
- OTP entry screen (minimal, clear)
- Username entry with validation
- Game room lobby listing all rooms
- Room details: name, game type, player count, players inside
- Join room functionality
- Room creator "Start Game" control

---

### Journey 3: Player - Creating a Second Room

**Persona:** Sam (Friend)
**Situation:** The group has 6 people tonight. They want to split into two games.

**Opening Scene:**
Sam enters OTP and username, reaches the lobby. Sees Moritz's Blackjack room already has 4 players.

**Rising Action:**
Sam clicks "Create Room", selects "Skip-Bo" from the game list. The system generates a readable room name automatically.

**Climax:**
The new room appears in the lobby. Sam is automatically inside as the room creator. Another friend, Jordan, sees both rooms and joins Sam's room.

**Resolution:**
Two concurrent games run: Blackjack in one room, Skip-Bo in another. Everyone's playing.

**Requirements Revealed:**
- Create room functionality
- Game selection when creating room
- Auto-generated room names
- Multiple concurrent rooms supported
- Room creator role assignment

---

### Journey 4: Player - Disconnection Recovery

**Persona:** Alex (Friend)
**Situation:** WiFi blips mid-game. Alex's browser loses connection.

**Opening Scene:**
Alex is mid-Blackjack hand. Suddenly, the connection drops. Screen shows a "Reconnecting..." state.

**Rising Action:**
Other players see Alex's status change to "Disconnected". The game pauses - no one can act. They wait.

**Climax:**
Alex's WiFi recovers. The browser reconnects automatically. Alex is back in the game, same state, same hand.

**Resolution:**
Game resumes seamlessly. No data lost, no confusion. The hand continues.

**Requirements Revealed:**
- Connection status tracking per player
- Game pause on player disconnect
- Automatic reconnection with state restoration
- Visual indicator for disconnected players

---

### Journey Requirements Summary

| Capability Area | Revealed By Journey |
|----------------|---------------------|
| Admin OTP generation | Journey 1 |
| OTP entry & validation | Journey 2 |
| Username entry & validation | Journey 2 |
| Game room lobby | Journey 2, 3 |
| Room creation with game selection | Journey 3 |
| Room joining | Journey 2 |
| Start game (room creator only) | Journey 2 |
| Multiple concurrent rooms | Journey 3 |
| Player connection status | Journey 4 |
| Reconnection handling | Journey 4 |
| Game state persistence during disconnect | Journey 4 |

## Technical Architecture

### Project-Type Overview

cardpal is a **Single Page Application (SPA)** serving as a real-time multiplayer card game platform. The architecture prioritizes:
- Persistent WebSocket connections for real-time state sync
- Server-authoritative game logic (anti-cheat by design)
- Session-based ephemeral state (no database persistence)
- Simple deployment for low-maintenance operation

### Technical Architecture Considerations

#### Browser Support

| Browser Type | Support Level |
|--------------|---------------|
| Chrome | Full support |
| Edge (Chromium) | Full support |
| Brave | Full support |
| Opera | Full support |
| Firefox | Not supported |
| Safari | Not supported |

**Rationale:** Chromium-only simplifies testing and ensures consistent WebSocket behavior across all supported browsers.

#### Real-Time Communication

**Recommended Approach:** WebSocket with a lightweight abstraction library

| Option | Recommendation |
|--------|----------------|
| Protocol | WebSockets (native, no polling fallback needed for Chromium) |
| Library | Socket.io or native WebSocket API - architecture decision |
| Reconnection | Built-in reconnect with session resumption |
| Heartbeat | Server-side ping to detect disconnected clients |

#### State Management Strategy

**Hybrid approach recommended:**
- **Lobby/Room state:** Full state on change (small payload, infrequent updates)
- **Game state:** Event-driven with periodic full-state sync for consistency checks
- **Rationale:** Game complexity varies - Blackjack has minimal state, Skip-Bo has more. Architecture should support both patterns.

#### Server Architecture

| Concern | Approach |
|---------|----------|
| Game rooms | In-memory room objects, isolated state per room |
| Player sessions | Map of connection ID → player info → room reference |
| OTP validation | In-memory with 12-hour TTL, cleared on new initiation |
| Concurrency | Single server instance sufficient for <10 users |

### Frontend Architecture

| Concern | Approach |
|---------|----------|
| Framework | SPA framework (React, Vue, Svelte - architecture decision) |
| Routing | Client-side: OTP screen → Username → Lobby → Game Room |
| State | Local component state + server-pushed game state |
| Animations | CSS transitions for card movements, minimal JS animation |

### Game Engine Abstraction

To support multiple games (Blackjack, Skip-Bo, Lovecraft Letter), the architecture should define:

```
Game Interface:
- getInitialState(players) → GameState
- getValidActions(state, player) → Action[]
- applyAction(state, action) → GameState | Error
- isGameOver(state) → boolean
- getWinner(state) → Player | null
```

Each game implements this interface. The server validates actions against `getValidActions()` before applying - ensuring rule enforcement.

### Implementation Considerations

| Area | Decision |
|------|----------|
| SEO | Not needed (OTP-gated, private app) |
| Accessibility | Basic keyboard navigation, no WCAG compliance required |
| Responsive design | Desktop-only, fixed minimum viewport (e.g., 1024px) |
| Performance targets | Sub-second action response, smooth card animations |
| Offline support | None - requires active connection |

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Platform MVP - validate the game engine abstraction works by implementing two distinct games (Blackjack and Skip-Bo) with different complexity levels.

**Validation Goal:** If Skip-Bo can be added without major refactoring of Blackjack infrastructure, the architecture is proven.

**Resource Requirements:** Solo developer, hobby project pace. Architecture optimized for minimal maintenance.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Admin game night setup (CLI-based OTP generation)
- Player joining (OTP → username → lobby → room)
- Room creation with game selection
- Disconnection recovery (pause on disconnected player's turn)

**Must-Have Capabilities:**
- OTP-based access control (admin CLI command, 12-hour validity)
- Username entry (max 15 chars, no special characters)
- Game room lobby with room listing
- Room creation with game type selection
- Support for 2 concurrent game rooms
- Blackjack implementation with full rule enforcement
- Skip-Bo implementation with full rule enforcement
- Card movement animations (source → destination visibility for gameplay clarity)
- Basic disconnect handling (game waits when disconnected player's turn, continues otherwise)
- Chromium desktop browser support only

### Post-MVP Features

**Phase 2 (Growth):**
- Lovecraft Letter implementation
- UI polish based on real usage feedback
- Admin web UI if CLI proves cumbersome

**Phase 3 (Vision):**
- Extensible game addition pattern (rules + assets → working game)
- AI-assisted game rule implementation
- Additional games based on group interest

### Risk Mitigation Strategy

| Risk Type | Risk | Mitigation |
|-----------|------|------------|
| Technical | Game engine abstraction may not generalize | Build Blackjack first, validate abstraction with Skip-Bo early |
| Resource | Solo hobby project, limited time | Lean MVP scope, no database, Chromium-only, no mobile |
| Market | N/A - private friend group app | None needed |

## Functional Requirements

### Access Control

- **FR1:** Admin can generate a new OTP via CLI command
- **FR2:** System invalidates all previous OTPs when a new one is generated
- **FR3:** System enforces 12-hour OTP validity period
- **FR4:** Users can enter an OTP to gain access to the platform
- **FR5:** System validates OTP and grants or denies access

### User Identity

- **FR6:** Users can enter a username after successful OTP validation
- **FR7:** System enforces username constraints (max 15 characters, no special characters)
- **FR8:** System associates username with the user's session

### Lobby & Room Management

- **FR9:** Users can view a list of all game rooms in the lobby
- **FR10:** Users can see player count for each room in the lobby
- **FR11:** Users can see the auto-generated room name for each room
- **FR12:** Users can create a new game room
- **FR13:** System generates a readable random string as the room name on creation
- **FR14:** Users can join a room that has not yet started a game
- **FR15:** System prevents users from joining rooms where a game is in progress
- **FR16:** Users can leave a room while in lobby state (game not started)

### Game Session Control

- **FR17:** Room creator can select the game type when creating a room
- **FR18:** Room creator can change the game type while in lobby state
- **FR19:** System displays whether current player count matches selected game's requirements
- **FR20:** Room creator can start the game when player count matches game requirements
- **FR21:** System prevents starting the game when player count doesn't match requirements
- **FR22:** System transitions room from lobby state to playing state when game starts
- **FR23:** System transitions room from playing state to lobby state when game concludes

### Gameplay - Core

- **FR24:** System enforces all game rules for the selected game type
- **FR25:** System determines and presents valid actions for the current player
- **FR26:** Players can perform only valid actions as determined by game rules
- **FR27:** System prevents any illegal game state or move
- **FR28:** System manages turn order according to game rules
- **FR29:** System detects game end conditions
- **FR30:** System determines and announces the winner when game concludes

### Gameplay - Game-Specific

- **FR31:** System supports Blackjack with complete rule enforcement
- **FR32:** System supports Skip-Bo with complete rule enforcement
- **FR33:** System supports private cards (visible only to owning player)
- **FR34:** System supports public cards (visible to all players)
- **FR35:** System supports card piles (stacked cards)
- **FR36:** System supports different playfield layouts per game type

### Visual Feedback

- **FR37:** System animates card movement showing source and destination locations
- **FR38:** Players can visually identify where an opponent's played card originated from
- **FR39:** System displays player connection status to all players in the room

### Connection Resilience

- **FR40:** System detects when a player disconnects
- **FR41:** System pauses game progression when the disconnected player's turn is active
- **FR42:** System allows game to continue normally when disconnected player is not the active player
- **FR43:** Disconnected players can reconnect and resume their session
- **FR44:** System restores game state for reconnected players

### Concurrency

- **FR45:** System supports at least 2 concurrent game rooms with independent state

## Non-Functional Requirements

### Performance

| Requirement | Target |
|-------------|--------|
| Action propagation | Sub-second - other players see card plays within 1 second |
| Card animations | Smooth and followable (no specific fps target) |
| Reconnection | Instant - state restored immediately upon reconnect |

### Security & Privacy

| Requirement | Criticality | Rationale |
|-------------|-------------|-----------|
| Server-enforced OTP validation | **Imperative** | Licensing requires only authorized users access game content |
| No unauthenticated access to game data | **Imperative** | All game endpoints require valid session from OTP |
| Private card data isolation | **Imperative** | Server never transmits private cards to non-owning clients |
| Server-authoritative game state | **Imperative** | Clients cannot manipulate game state; all actions validated server-side |

### Browser Compatibility

| Requirement | Specification |
|-------------|---------------|
| Supported browsers | Chromium-based only (Chrome, Edge, Brave, Opera) |
| Unsupported browsers | Firefox, Safari - no testing or compatibility effort |
| Minimum viewport | Desktop only, minimum 1024px width |

### Explicitly Out of Scope

The following NFR categories are intentionally not addressed:
- **Scalability** - Fixed user base (<10), no growth planning needed
- **Accessibility** - Private friend group app, no WCAG compliance
- **Reliability/Uptime** - Server restart acceptable, no SLA required
- **Data persistence** - Ephemeral sessions only, no backup/recovery
