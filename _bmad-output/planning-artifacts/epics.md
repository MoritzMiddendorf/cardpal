---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - prd.md
  - architecture.md
---

# cardpal - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for cardpal, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Access Control (FR1-5):**
- FR1: Admin can generate a new OTP via CLI command
- FR2: System invalidates all previous OTPs when a new one is generated
- FR3: System enforces 12-hour OTP validity period
- FR4: Users can enter an OTP to gain access to the platform
- FR5: System validates OTP and grants or denies access

**User Identity (FR6-8):**
- FR6: Users can enter a username after successful OTP validation
- FR7: System enforces username constraints (max 15 characters, no special characters)
- FR8: System associates username with the user's session

**Lobby & Room Management (FR9-16):**
- FR9: Users can view a list of all game rooms in the lobby
- FR10: Users can see player count for each room in the lobby
- FR11: Users can see the auto-generated room name for each room
- FR12: Users can create a new game room
- FR13: System generates a readable random string as the room name on creation
- FR14: Users can join a room that has not yet started a game
- FR15: System prevents users from joining rooms where a game is in progress
- FR16: Users can leave a room while in lobby state

**Game Session Control (FR17-23):**
- FR17: Room creator can select the game type when creating a room
- FR18: Room creator can change the game type while in lobby state
- FR19: System displays whether current player count matches selected game's requirements
- FR20: Room creator can start the game when player count matches game requirements
- FR21: System prevents starting the game when player count doesn't match requirements
- FR22: System transitions room from lobby state to playing state when game starts
- FR23: System transitions room from playing state to lobby state when game concludes

**Gameplay Core (FR24-30):**
- FR24: System enforces all game rules for the selected game type
- FR25: System determines and presents valid actions for the current player
- FR26: Players can perform only valid actions as determined by game rules
- FR27: System prevents any illegal game state or move
- FR28: System manages turn order according to game rules
- FR29: System detects game end conditions
- FR30: System determines and announces the winner when game concludes

**Gameplay Game-Specific (FR31-36):**
- FR31: System supports Blackjack with complete rule enforcement
- FR32: System supports Skip-Bo with complete rule enforcement
- FR33: System supports private cards (visible only to owning player)
- FR34: System supports public cards (visible to all players)
- FR35: System supports card piles (stacked cards)
- FR36: System supports different playfield layouts per game type

**Visual Feedback (FR37-39):**
- FR37: System animates card movement showing source and destination locations
- FR38: Players can visually identify where an opponent's played card originated from
- FR39: System displays player connection status to all players in the room

**Connection Resilience (FR40-44):**
- FR40: System detects when a player disconnects
- FR41: System pauses game progression when the disconnected player's turn is active
- FR42: System allows game to continue normally when disconnected player is not the active player
- FR43: Disconnected players can reconnect and resume their session
- FR44: System restores game state for reconnected players

**Concurrency (FR45):**
- FR45: System supports at least 2 concurrent game rooms with independent state

### NonFunctional Requirements

**Performance:**
- NFR1: Action propagation sub-second - other players see card plays within 1 second
- NFR2: Card animations smooth and followable
- NFR3: Reconnection instant - state restored immediately upon reconnect

**Security & Privacy:**
- NFR4: Server-enforced OTP validation (Imperative)
- NFR5: No unauthenticated access to game data (Imperative)
- NFR6: Private card data isolation - server never transmits private cards to non-owning clients (Imperative)
- NFR7: Server-authoritative game state - clients cannot manipulate game state (Imperative)

**Browser Compatibility:**
- NFR8: Chromium-based browsers only (Chrome, Edge, Brave, Opera)
- NFR9: Desktop only, minimum 1024px width

### Additional Requirements

**From Architecture - Starter Template:**
- Custom pnpm monorepo structure (packages/client, packages/server, packages/shared)
- TypeScript 5.x across all packages
- Node.js 20 LTS for server runtime

**From Architecture - Frontend Stack:**
- Vite for build tooling and dev server
- React 18 for UI components
- Zustand for client-side state management
- CSS modules or vanilla CSS for styling

**From Architecture - Backend Stack:**
- Express.js for HTTP endpoints
- Socket.io for WebSocket communication
- In-memory state management (no database)
- Zod for all runtime validation

**From Architecture - Shared Package:**
- TypeScript interfaces for game state, player state, room state
- Message type definitions for WebSocket protocol
- Zod schemas matching types for validation

**From Architecture - Deployment:**
- Render free tier deployment target
- Single web service (Express serves static + WebSocket)
- GitHub auto-deploy on push to main

**From Architecture - Game Engine:**
- Game interface pattern: getInitialState, getValidActions, applyAction, isGameOver, getWinner
- Each game implements this interface
- Games isolated in separate directories under server/src/games/

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | Admin OTP generation via CLI |
| FR2 | Epic 1 | Invalidate previous OTPs |
| FR3 | Epic 1 | 12-hour OTP validity |
| FR4 | Epic 1 | User OTP entry |
| FR5 | Epic 1 | OTP validation |
| FR6 | Epic 1 | Username entry |
| FR7 | Epic 1 | Username constraints |
| FR8 | Epic 1 | Session association |
| FR9 | Epic 2 | View room list |
| FR10 | Epic 2 | See player count |
| FR11 | Epic 2 | See room name |
| FR12 | Epic 2 | Create room |
| FR13 | Epic 2 | Auto-generate room name |
| FR14 | Epic 2 | Join room |
| FR15 | Epic 2 | Prevent join during game |
| FR16 | Epic 2 | Leave room |
| FR17 | Epic 3 | Select game type |
| FR18 | Epic 3 | Change game type |
| FR19 | Epic 3 | Player count validation display |
| FR20 | Epic 3 | Start game |
| FR21 | Epic 3 | Prevent invalid start |
| FR22 | Epic 3 | Transition to playing |
| FR23 | Epic 3 | Transition to lobby |
| FR24 | Epic 3 | Enforce game rules |
| FR25 | Epic 3 | Present valid actions |
| FR26 | Epic 3 | Perform valid actions only |
| FR27 | Epic 3 | Prevent illegal states |
| FR28 | Epic 3 | Manage turn order |
| FR29 | Epic 3 | Detect game end |
| FR30 | Epic 3 | Announce winner |
| FR31 | Epic 3 | Blackjack implementation |
| FR32 | Epic 5 | Skip-Bo implementation |
| FR33 | Epic 3 | Private cards |
| FR34 | Epic 3 | Public cards |
| FR35 | Epic 3 | Card piles |
| FR36 | Epic 3 | Playfield layouts |
| FR37 | Epic 4 | Card movement animations |
| FR38 | Epic 4 | Card origin visibility |
| FR39 | Epic 4 | Connection status display |
| FR40 | Epic 4 | Disconnect detection |
| FR41 | Epic 4 | Pause on disconnect |
| FR42 | Epic 4 | Continue when not active |
| FR43 | Epic 4 | Reconnection support |
| FR44 | Epic 4 | State restoration |
| FR45 | Epic 2 | Concurrent rooms |

## Epic List

### Epic 1: Foundation & Authentication
**Goal:** Users can authenticate via OTP and establish their session

This epic sets up the monorepo (per architecture) and implements the complete authentication flow. After this epic, friends can enter the OTP, choose a username, and have a working WebSocket session.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8

**Architecture scope:**
- pnpm monorepo with client/server/shared packages
- Shared TypeScript types and Zod schemas
- Express server with Socket.io
- React client with Vite
- Zustand store setup
- Session token flow with localStorage persistence

---

### Epic 2: Lobby & Room Management
**Goal:** Users can see, create, and join game rooms in a lobby

After this epic, authenticated users see a lobby with available rooms, can create new rooms (with auto-generated names), join existing rooms, and leave rooms. Multiple rooms can exist concurrently.

**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR45

---

### Epic 3: Game Engine & Blackjack
**Goal:** Users can play a complete game of Blackjack with full rule enforcement

This epic implements the game engine abstraction and the first game (Blackjack). Room creators can start games, turns are managed, rules are enforced server-side, and games conclude with a winner announced.

**FRs covered:** FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR33, FR34, FR35, FR36

**Game Engine Interface:**
- getInitialState(players) → GameState
- getValidActions(state, player) → Action[]
- applyAction(state, action) → GameState | Error
- isGameOver(state) → boolean
- getWinner(state) → Player | null

---

### Epic 4: Visual Feedback & Connection Resilience
**Goal:** Smooth, reliable gameplay with card animations and disconnect recovery

This epic adds the polish layer: card movement animations showing source and destination, connection status indicators for all players, and robust disconnect/reconnect handling so gameplay isn't disrupted by network issues.

**FRs covered:** FR37, FR38, FR39, FR40, FR41, FR42, FR43, FR44

---

### Epic 5: Skip-Bo Implementation
**Goal:** Users can play Skip-Bo, validating the game engine extensibility

This epic proves the architecture by adding the second game type. Uses the game engine interface from Epic 3 but implements Skip-Bo's unique rules, card piles, and playfield layout.

**FRs covered:** FR32 (leverages game engine from Epic 3)

---

## Epic 1: Foundation & Authentication

**Goal:** Users can authenticate via OTP and establish their session

### Story 1.1: Project Scaffolding & Shared Types

As a **developer**,
I want **a properly structured monorepo with shared TypeScript types**,
So that **client and server can share type definitions and validation schemas**.

**Acceptance Criteria:**

**Given** a fresh project directory
**When** the scaffolding is complete
**Then** the pnpm monorepo structure exists with packages/client, packages/server, packages/shared
**And** TypeScript is configured with strict mode across all packages
**And** the shared package exports types for: SessionToken, OtpValidationRequest, OtpValidationResponse, UsernameRequest, ErrorPayload
**And** Zod schemas exist matching each shared type
**And** the client package has Vite + React 18 configured
**And** the server package has Express + Socket.io configured
**And** `pnpm dev` starts both client (port 5173) and server (port 3001) concurrently

---

### Story 1.2: OTP Generation System

As an **admin**,
I want **to generate an OTP via CLI command**,
So that **I can share the code with friends to grant them access to game night**.

**Acceptance Criteria:**

**Given** the server is running
**When** the admin runs `pnpm generate-otp`
**Then** a new OTP is generated in format like "A7X-K9M" (readable alphanumeric with separator)
**And** the OTP is displayed in the console for copying
**And** the OTP is stored in server memory with a 12-hour expiration timestamp
**And** any previously valid OTP is invalidated
**And** the OTP state includes: code, expiresAt, and creation timestamp

**Given** an OTP was generated more than 12 hours ago
**When** the system checks OTP validity
**Then** the OTP is considered expired and invalid

---

### Story 1.3: OTP Entry & Validation

As a **player**,
I want **to enter the OTP shared by the admin**,
So that **I can gain access to the cardpal platform**.

**Acceptance Criteria:**

**Given** a user navigates to the cardpal URL
**When** the OTP screen loads
**Then** a single input field is displayed for OTP entry
**And** a submit button is visible

**Given** the user enters a valid, non-expired OTP
**When** they submit the form
**Then** the server validates the OTP
**And** the user proceeds to the username screen
**And** a pending session is created server-side

**Given** the user enters an invalid or expired OTP
**When** they submit the form
**Then** an error message is displayed: "Invalid or expired code"
**And** the user remains on the OTP screen

**Given** the user enters an OTP with incorrect format
**When** they attempt to submit
**Then** client-side validation prevents submission
**And** a helpful format hint is shown

---

### Story 1.4: Username Entry & Session Establishment

As a **player**,
I want **to choose a username after OTP validation**,
So that **other players can identify me in the game**.

**Acceptance Criteria:**

**Given** the user has passed OTP validation
**When** the username screen loads
**Then** an input field for username is displayed
**And** a submit button is visible

**Given** the user enters a valid username (1-15 alphanumeric characters, no special characters)
**When** they submit
**Then** the server creates a session token (UUID v4)
**And** the session is stored server-side mapping token to: username, socketId, roomId (null)
**And** the token is stored in client localStorage
**And** a WebSocket connection is established with the token in handshake auth
**And** the user proceeds to the lobby screen (blank for now, implemented in Epic 2)

**Given** the user enters a username with special characters
**When** they attempt to submit
**Then** validation fails with message: "Letters and numbers only"

**Given** the user enters a username longer than 15 characters
**When** they attempt to submit
**Then** validation fails with message: "Username must be 15 characters or less"

**Given** a user with an existing session token in localStorage
**When** they load the app and the token is still valid (OTP not expired/regenerated)
**Then** the session is restored automatically
**And** the user skips OTP/username screens

**Given** a user with an existing session token
**When** the OTP has been regenerated since their session was created
**Then** the session is invalid
**And** the user is redirected to the OTP screen
**And** the invalid token is cleared from localStorage

---

## Epic 2: Lobby & Room Management

**Goal:** Users can see, create, and join game rooms in a lobby

### Story 2.1: Lobby Screen & Room Listing

As a **player**,
I want **to see a list of all game rooms in the lobby**,
So that **I can find and join a game with my friends**.

**Acceptance Criteria:**

**Given** an authenticated user with an active session
**When** they reach the lobby screen
**Then** a list of all existing game rooms is displayed
**And** each room shows: room name, game type, player count (e.g., "2/4 players")
**And** the list updates in real-time when rooms are created or players join/leave

**Given** no rooms exist
**When** the lobby screen loads
**Then** an empty state message is displayed: "No rooms yet. Create one!"

**Given** rooms exist in the system
**When** a new room is created by another user
**Then** the lobby list updates automatically via WebSocket push
**And** no page refresh is required

---

### Story 2.2: Room Creation

As a **player**,
I want **to create a new game room**,
So that **my friends can join and we can play together**.

**Acceptance Criteria:**

**Given** an authenticated user in the lobby
**When** they click "Create Room"
**Then** a game type selection is presented (Blackjack, Skip-Bo)

**Given** the user selects a game type
**When** the room is created
**Then** the system generates a readable random room name (e.g., "Crimson-Tiger")
**And** the room is created with status "lobby" (not playing)
**And** the creator is automatically placed inside the room
**And** the creator is marked as the room owner
**And** the room appears in all users' lobby lists

**Given** a room is created
**When** viewing the room details
**Then** the room has: id, name, gameType, status ("lobby"), ownerId, players array
**And** the room state is stored in server memory

---

### Story 2.3: Join & Leave Room

As a **player**,
I want **to join an available room or leave a room I'm in**,
So that **I can play with friends or switch to a different game**.

**Acceptance Criteria:**

**Given** an authenticated user in the lobby
**When** they click on a room that is in "lobby" status
**Then** they join the room
**And** they are navigated to the room screen
**And** the player count updates for all users viewing the lobby
**And** their session is updated with the roomId

**Given** a room is in "playing" status (game in progress)
**When** a user attempts to join
**Then** the join is rejected
**And** an error message is displayed: "Game in progress"

**Given** a user is inside a room in "lobby" status
**When** they click "Leave Room"
**Then** they are removed from the room
**And** they return to the lobby screen
**And** the room's player count updates for all users

**Given** the room owner leaves the room
**When** other players remain
**Then** ownership transfers to the next player who joined
**And** all players in the room are notified of the new owner

**Given** the last player leaves a room
**When** the room becomes empty
**Then** the room is deleted from the server
**And** it disappears from all lobby lists

---

### Story 2.4: Room Screen & Player List

As a **player**,
I want **to see who is in my room while waiting for the game to start**,
So that **I know when everyone has joined and we're ready to play**.

**Acceptance Criteria:**

**Given** a user is inside a room
**When** the room screen loads
**Then** the room name is displayed
**And** the selected game type is shown
**And** a list of all players in the room is displayed with their usernames
**And** the room owner is visually indicated (e.g., crown icon or "Host" label)

**Given** players join or leave the room
**When** the player list changes
**Then** the room screen updates in real-time for all players in the room

**Given** two rooms exist concurrently
**When** players interact with each room
**Then** room states are completely independent
**And** actions in one room do not affect the other
**And** the server correctly routes messages to the appropriate room

**Given** the user is not the room owner
**When** viewing the room screen
**Then** the "Start Game" button is not visible or is disabled

---

## Epic 3: Game Engine & Blackjack

**Goal:** Users can play a complete game of Blackjack with full rule enforcement

### Story 3.1: Game Engine Interface & Shared Types

As a **developer**,
I want **a well-defined game engine interface and shared types**,
So that **multiple games can be implemented consistently and the client/server stay in sync**.

**Acceptance Criteria:**

**Given** the shared package
**When** game types are defined
**Then** the following interfaces exist:
- `GameEngine` interface with methods: `getInitialState(players)`, `getValidActions(state, playerId)`, `applyAction(state, action)`, `isGameOver(state)`, `getWinner(state)`
- `Card` type with: suit, rank, faceUp boolean
- `GameState` base type with: players, currentPlayerIndex, status
- `GameAction` type with: type, playerId, payload
- `PlayerGameState` for filtered per-player view

**And** Zod schemas exist for all game-related types
**And** a `GameType` enum exists with: BLACKJACK, SKIPBO
**And** server can import and use the GameEngine interface
**And** client can import types for rendering game state

---

### Story 3.2: Game Session Control

As a **room owner**,
I want **to configure and start the game when everyone is ready**,
So that **we can begin playing with the right settings and player count**.

**Acceptance Criteria:**

**Given** a room owner in a room with "lobby" status
**When** they view the room screen
**Then** they can see the currently selected game type
**And** they can change the game type via a dropdown/selector
**And** the game type change is broadcast to all players in the room

**Given** a room with players
**When** viewing the room screen
**Then** the current player count is displayed (e.g., "3 players")
**And** the required player count for the selected game is shown (e.g., "Blackjack: 2-7 players")
**And** a visual indicator shows if the count is valid (green) or invalid (red)

**Given** the player count matches the game requirements
**When** the room owner clicks "Start Game"
**Then** the room status changes from "lobby" to "playing"
**And** a new game instance is created using the GameEngine
**And** all players receive the initial game state (filtered per-player)
**And** the game screen is displayed for all players

**Given** the player count does NOT match game requirements
**When** the room owner attempts to start the game
**Then** the start is prevented
**And** an error message is shown: "Need X-Y players for this game"

**Given** a game concludes (handled in Story 3.6)
**When** the game is over
**Then** the room status transitions from "playing" back to "lobby"
**And** players return to the room screen

---

### Story 3.3: Blackjack Core Rules & State

As a **player**,
I want **the Blackjack rules to be enforced correctly**,
So that **the game is fair and plays like real Blackjack**.

**Acceptance Criteria:**

**Given** a Blackjack game starts
**When** the initial state is created
**Then** a standard 52-card deck is shuffled
**And** each player receives 2 cards (both face-up)
**And** the dealer receives 2 cards (1 face-up, 1 face-down)
**And** the first player becomes the current player

**Given** a player's hand
**When** calculating hand value
**Then** number cards (2-10) count as face value
**And** face cards (J, Q, K) count as 10
**And** Aces count as 11, or 1 if 11 would bust
**And** the best non-busting value is calculated

**Given** a player's turn
**When** requesting valid actions
**Then** "Hit" is available if hand value < 21
**And** "Stand" is always available
**And** no other actions are permitted

**Given** a player performs an invalid action
**When** the server validates the action
**Then** the action is rejected with error code "INVALID_ACTION"
**And** the game state remains unchanged
**And** the client displays an error message

**Given** a player hits and their hand exceeds 21
**When** the action is applied
**Then** the player is marked as "bust"
**And** their turn ends automatically
**And** they cannot take further actions this round

---

### Story 3.4: Blackjack Turn Flow & Actions

As a **player**,
I want **to take my turn and see others take theirs in order**,
So that **the game flows correctly and I know when to act**.

**Acceptance Criteria:**

**Given** a player's turn
**When** they choose "Hit"
**Then** one card is dealt from the deck to their hand (face-up)
**And** the new hand value is calculated
**And** all players see the card dealt (public information)
**And** if not bust, the player can act again

**Given** a player's turn
**When** they choose "Stand"
**Then** their turn ends
**And** the next player becomes the current player
**And** all players are notified of the turn change

**Given** a player is not the current player
**When** they attempt to take an action
**Then** the action is rejected
**And** an error is returned: "Not your turn"

**Given** all players have completed their turns (stood or bust)
**When** the last player finishes
**Then** the dealer reveals their face-down card
**And** the dealer draws cards according to standard rules (hit on 16 or less, stand on 17+)
**And** all dealer actions are visible to all players

**Given** a player is disconnected (to be handled in Epic 4)
**When** it's their turn
**Then** the game waits (basic behavior, enhanced in Epic 4)

---

### Story 3.5: Card Visibility & Game UI

As a **player**,
I want **to see the cards clearly with proper visibility rules**,
So that **I can make informed decisions and the game is visually clear**.

**Acceptance Criteria:**

**Given** a Blackjack game in progress
**When** rendering the game screen
**Then** my cards are displayed in my hand area (all face-up, visible to me)
**And** other players' cards are displayed in their areas (all face-up, public)
**And** the dealer's cards show: first card face-up, second card face-down (until reveal)

**Given** a card is face-down
**When** the server sends game state
**Then** the card data is NOT included for non-owning players (NFR6 compliance)
**And** the client renders a card back placeholder

**Given** the Blackjack playfield layout
**When** rendering the game
**Then** the dealer area is at the top
**And** player areas are arranged around the table
**And** each area shows: player name, cards, hand value (for face-up cards)
**And** the current player is highlighted

**Given** cards in a hand (pile)
**When** rendering
**Then** cards are visually stacked/fanned so all are visible
**And** the number of cards in the pile is clear

**Given** the filtered game state sent to a player
**When** comparing to full server state
**Then** only public cards and owned private cards are included
**And** opponent face-down cards are represented as `{ faceUp: false }` with no suit/rank

---

### Story 3.6: Game End & Results

As a **player**,
I want **to see who won when the game ends**,
So that **the outcome is clear and we can play again**.

**Acceptance Criteria:**

**Given** the dealer has completed their turn
**When** checking game end conditions
**Then** `isGameOver()` returns true

**Given** the game is over
**When** determining the winner
**Then** players who bust lose regardless of dealer
**And** players with higher hand value than dealer (without busting) win
**And** players with same value as dealer push (tie)
**And** if dealer busts, all non-bust players win

**Given** the game has ended
**When** results are calculated
**Then** each player's outcome is determined: "win", "lose", or "push"
**And** the results are sent to all players

**Given** results are received by clients
**When** rendering the game end screen
**Then** the winner(s) are announced prominently
**And** final hands and values are displayed for all players
**And** the dealer's full hand is revealed
**And** a "Return to Lobby" or "Play Again" button is shown

**Given** the room owner clicks "Play Again" or similar
**When** a new game is requested
**Then** the room remains in "playing" status
**And** a fresh game is initialized with the same players

**Given** the room owner clicks "Return to Lobby"
**When** leaving the game
**Then** the room status changes to "lobby"
**And** all players return to the room screen
**And** the game instance is cleared from memory

---

## Epic 4: Visual Feedback & Connection Resilience

**Goal:** Smooth, reliable gameplay with card animations and disconnect recovery

### Story 4.1: Card Movement Animations

As a **player**,
I want **to see cards animate when they move**,
So that **I can follow the action and understand where cards came from**.

**Acceptance Criteria:**

**Given** a card is dealt or played
**When** the game state updates
**Then** the card animates from its source location to its destination
**And** the animation is smooth (CSS transition, ~300-500ms)
**And** the source location is visually clear (deck, player hand, etc.)

**Given** a player hits in Blackjack
**When** a card is dealt to them
**Then** the card visually moves from the deck area to the player's hand
**And** other players can see this animation

**Given** the dealer draws cards
**When** dealer actions occur
**Then** cards animate from deck to dealer's hand
**And** face-up/face-down state is respected during animation

**Given** an opponent plays a card
**When** viewing their action
**Then** I can visually identify where the card originated from
**And** the animation makes the game flow easy to follow

**Given** multiple cards are dealt quickly (e.g., initial deal)
**When** animating
**Then** cards are dealt with slight stagger delays
**And** the sequence is visually clear

---

### Story 4.2: Connection Status Display

As a **player**,
I want **to see the connection status of all players**,
So that **I know if someone is having connection issues**.

**Acceptance Criteria:**

**Given** a game room with players
**When** viewing the room or game screen
**Then** each player has a connection status indicator
**And** connected players show a green indicator or "online" status
**And** disconnected players show a red/orange indicator or "disconnected" status

**Given** a player's connection status changes
**When** the server detects the change
**Then** all other players receive the status update via WebSocket
**And** their UI updates in real-time

**Given** viewing the player list
**When** a player is disconnected
**Then** their username is visually dimmed or marked
**And** it's clear they are not currently connected

**Given** I am the disconnected player
**When** my connection is lost
**Then** I see a "Reconnecting..." overlay or indicator
**And** the UI shows my connection state

---

### Story 4.3: Disconnect Detection & Game Pause

As a **player**,
I want **the game to handle disconnections gracefully**,
So that **a brief network issue doesn't ruin the game**.

**Acceptance Criteria:**

**Given** a WebSocket connection
**When** the server detects a disconnection (socket close, ping timeout)
**Then** the player is marked as disconnected in server state
**And** other players are notified of the status change
**And** the player's session is preserved (not deleted)

**Given** a player disconnects during a game
**When** it is their turn
**Then** the game is paused
**And** all players see a message: "[Player] disconnected - waiting for reconnection"
**And** no other player can take actions
**And** the turn timer (if any) is paused

**Given** a player disconnects during a game
**When** it is NOT their turn
**Then** the game continues normally
**And** other players can take their turns
**And** the disconnected player's status is shown but doesn't block play

**Given** a paused game waiting for a disconnected player
**When** viewing the game screen
**Then** a clear indicator shows the game is paused
**And** the reason (waiting for [Player]) is displayed

---

### Story 4.4: Reconnection & State Restoration

As a **player**,
I want **to reconnect and resume where I left off**,
So that **a brief disconnection doesn't lose my game progress**.

**Acceptance Criteria:**

**Given** a player was disconnected
**When** they reconnect (browser still open, connection restored)
**Then** the WebSocket automatically reconnects
**And** the session token is sent in the handshake auth
**And** the server validates the token and restores the session

**Given** a valid reconnection occurs
**When** the player was in a room
**Then** they are placed back in the same room
**And** they receive the current room state

**Given** a valid reconnection occurs
**When** a game was in progress
**Then** they receive the current game state (filtered for their view)
**And** the game screen is restored
**And** they can continue playing

**Given** the game was paused waiting for this player
**When** they reconnect
**Then** the game unpauses
**And** all players are notified: "[Player] reconnected"
**And** play resumes (it's now their turn)

**Given** a player reconnects
**When** the OTP has been regenerated since their session was created
**Then** the reconnection fails (session invalid)
**And** they are redirected to the OTP screen

**Given** a player refreshes their browser during a game
**When** the page reloads
**Then** the session token is read from localStorage
**And** the reconnection flow restores their game state
**And** they are back in the game within seconds

---

## Epic 5: Skip-Bo Implementation

**Goal:** Users can play Skip-Bo, validating the game engine extensibility

### Story 5.1: Skip-Bo Game Rules & State

As a **player**,
I want **to play Skip-Bo with correct rules**,
So that **the game plays like the real card game**.

**Acceptance Criteria:**

**Given** a Skip-Bo game starts
**When** the initial state is created
**Then** a Skip-Bo deck is created (144 cards: 12 each of 1-12, plus 18 Skip-Bo wild cards)
**And** the deck is shuffled
**And** each player receives a stock pile (30 cards for 2-4 players, 20 cards for 5+ players)
**And** only the top card of each stock pile is face-up
**And** each player receives 5 cards in their hand
**And** 4 building piles are initialized (empty, in center)
**And** each player has 4 empty discard piles
**And** the first player is determined

**Given** the game state
**When** examining card values
**Then** numbered cards (1-12) have their face value
**And** Skip-Bo cards are wild and can represent any number 1-12

**Given** a building pile
**When** cards are played to it
**Then** it must start with a 1 (or Skip-Bo wild)
**And** cards must be played in sequential order (1, 2, 3... 12)
**And** when a pile reaches 12, it is cleared and shuffled back into the draw pile

**Given** the Skip-Bo game engine
**When** registering with the server
**Then** it implements the GameEngine interface from Epic 3
**And** it can be selected as a game type when creating a room

---

### Story 5.2: Skip-Bo Turn Flow & Actions

As a **player**,
I want **to take my turn with valid Skip-Bo actions**,
So that **I can strategically play cards and try to win**.

**Acceptance Criteria:**

**Given** a player's turn begins
**When** their hand has fewer than 5 cards
**Then** they draw from the draw pile until they have 5 cards

**Given** a player's turn
**When** requesting valid actions
**Then** they can play the top card of their stock pile to a valid building pile
**And** they can play a card from their hand to a valid building pile
**And** they can play the top card of any of their discard piles to a valid building pile
**And** they can discard one card from their hand to one of their 4 discard piles (ends turn)

**Given** a player plays a card to a building pile
**When** the card is valid (next sequential number or Skip-Bo wild)
**Then** the card is moved to the building pile
**And** the player can continue playing more cards
**And** their turn does not end

**Given** a player discards a card
**When** they place it on one of their discard piles
**Then** their turn ends
**And** the next player's turn begins

**Given** a player attempts an invalid action
**When** the server validates the action
**Then** it is rejected with "INVALID_ACTION"
**And** the game state remains unchanged

**Given** a player plays all 5 cards from their hand without discarding
**When** their hand is empty
**Then** they draw 5 new cards
**And** they can continue playing

---

### Story 5.3: Skip-Bo UI & Playfield Layout

As a **player**,
I want **to see the Skip-Bo game layout clearly**,
So that **I can see all piles and make strategic decisions**.

**Acceptance Criteria:**

**Given** a Skip-Bo game in progress
**When** rendering the game screen
**Then** the 4 building piles are displayed in the center
**And** each building pile shows the top card (or empty state)
**And** the current value needed for each pile is clear

**Given** my player area
**When** rendering
**Then** my stock pile is shown with the top card face-up and count visible
**And** my hand of up to 5 cards is displayed (private, only I see)
**And** my 4 discard piles are shown with top cards visible

**Given** other players' areas
**When** rendering
**Then** their stock pile top card and count are visible
**And** their hand is shown as card backs (private cards hidden)
**And** their 4 discard piles are visible with top cards shown

**Given** the playfield layout
**When** arranging elements
**Then** building piles are central and prominent
**And** player areas are arranged around the building piles
**And** the current player is highlighted
**And** it's clear whose turn it is

**Given** a card in a discard pile or stock pile
**When** it can be played
**Then** a visual affordance indicates it's playable (highlight, glow, etc.)

---

### Story 5.4: Skip-Bo Win Condition

As a **player**,
I want **the game to end when someone wins**,
So that **we have a clear winner and can play again**.

**Acceptance Criteria:**

**Given** a player plays the last card from their stock pile
**When** the stock pile becomes empty
**Then** `isGameOver()` returns true
**And** that player is declared the winner

**Given** the game ends
**When** determining results
**Then** the winner is the player who emptied their stock pile
**And** all other players lose
**And** the results are sent to all players

**Given** results are displayed
**When** rendering the game end screen
**Then** the winner is announced prominently
**And** each player's remaining stock pile count is shown
**And** "Play Again" and "Return to Lobby" options are available

**Given** the draw pile runs out
**When** players need to draw
**Then** completed building piles (that reached 12) are reshuffled into the draw pile
**And** play continues

**Given** the room owner clicks "Play Again"
**When** a new Skip-Bo game starts
**Then** a fresh game is initialized with the same players
**And** stock piles are re-dealt
