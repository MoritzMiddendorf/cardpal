# Story 7.1: OTP Access Tier and Neutral Game Edition

Status: done

## Story

As **the owner**,
I want **OTP users to be told apart from everyone else on the server, and non-OTP lobbies to use neutral game names and card designs**,
so that **the service can go public later without trademark problems while friends keep playing "Skip-Bo"**.

Source: owner request in the project thread on 2026-10-19 (two messages: the "legal layer" ask and the follow-up "also build the
legal compliant version for skip-bo in this step"). Recorded as decision log D13.

## Acceptance Criteria

1. **Blank default page.** With public access switched off (the default, `PUBLIC_ACCESS` unset), any GET that is not an API
   route, a static asset or the secret entry path returns a blank HTML page (200, empty body, no app bundle, no OTP form, no
   redirect) unless the request carries a valid access token cookie.
2. **Secret entry path.** `OTP_ENTRY_PATH` (env, default `/table`) serves the app in "entry" mode: the OTP form. The path is
   never written into the client bundle; the server marks entry mode by injecting `<meta name="cardpal-entry">` into the
   served `index.html`. A visitor who already has a valid access token at the entry path skips straight to the app.
3. **Server-enforced OTP tier.** A valid `POST /api/validate-otp` sets an httpOnly, `SameSite=Lax` cookie (Lax, not Strict: see Change Log) (`Secure` when
   the request is HTTPS) holding an HS256 JWT signed with a per-process random key, bound to the current OTP generation and
   expiring with it. The client never sees or stores this token. A forged, tampered, expired or rotated-OTP token is
   treated exactly like no token. After a successful entry the URL becomes `/` (history.replaceState) and the user goes on
   to the username screen, then the lobby.
4. **Socket tier.** The socket handshake (no session token) derives the tier from the cookie: valid token → `original`
   edition; no valid token and public access on → `neutral`; otherwise `AUTH_ERROR`. The tier is stored on the session
   (`edition`) when the username is set and can't be changed by the client afterwards. The `pendingSessionId` HTTP
   round-trip is removed (the cookie replaces it).
5. **Edition-separated lobbies.** Rooms carry the creator's edition. `lobbyState` only lists rooms of the receiving
   session's edition; joining a room of another edition fails with `ROOM_NOT_FOUND` (does not reveal that it exists).
6. **Neutral naming and card design.** In the `neutral` edition, Skip-Bo is shown as **"Twelve Up"** everywhere (lobby game
   picker and room cards, room screen, top bar during play), the wild card shows a star instead of "SKIP BO", and the number
   cards use a different color scheme. Blackjack is a generic name and stays. The `original` edition is unchanged.
7. **No advertising.** No UI text mentions editions, tiers, OTP-vs-public or the entry path. A revoked OTP user (OTP rotated
   while the page is open) sees the OTP form again (they already know it); a fresh visitor never does unless at the entry
   path.
8. **Extensibility.** `PUBLIC_ACCESS=true` makes `/` serve the app to everyone and lets non-OTP visitors pick a username and
   play neutral rooms. Off by default; stays off until Impressum etc. exist.
9. Tests cover token signing/verification (tamper, expiry, rotation), the HTTP gate (blank vs app vs entry), tier derivation
   in the socket middleware, edition filtering on list/join, and the client naming helpers. The smoke test drives the cookie
   flow and checks the blank page.

## Tasks / Subtasks

- [x] Task 1: Access token (AC: 3)
  - [x] `packages/server/src/utils/accessToken.ts`: `signAccessToken(payload, expiresAt)`, `verifyAccessToken(token)` (HS256 via
        `node:crypto`, `timingSafeEqual`, per-process `randomBytes(32)` key). No new dependency.
  - [x] `state/otp.ts`: add a random `id` (generation) to `OtpState`.
  - [x] `utils/access.ts`: cookie name, tiny cookie parser, `getAccessEdition(cookieHeader)` → `'original' | 'neutral' | null`.
- [x] Task 2: HTTP gate (AC: 1, 2, 3, 8)
  - [x] `config.ts`: `OTP_ENTRY_PATH` (normalized, default `/table`), `PUBLIC_ACCESS`.
  - [x] `index.ts`: `express.static(clientDist, { index: false })`; SPA fallback serves blank / app / entry-mode html.
  - [x] `/api/validate-otp` sets the cookie; responds `{ ok: true }`.
  - [x] `GET /api/access` → `{ edition }` for the client to decide what to render (null → render nothing).
  - [x] Admin generate-otp also returns `entryPath`; `scripts/generate-otp.ts` prints the entry link.
- [x] Task 3: Session tier (AC: 4, 5)
  - [x] `Edition` type in shared; `authenticated` event carries `edition`.
  - [x] Pending session created in the socket middleware from the cookie tier; `UserSession.edition`, `otpCode: string | null`.
  - [x] `isSessionValid(session)`: original → OTP still valid; neutral → `PUBLIC_ACCESS`.
  - [x] Rooms store `edition`; `getRooms(edition)`; lobby broadcast per edition channel; join checks edition.
- [x] Task 4: Client (AC: 2, 3, 6, 7)
  - [x] `utils/editions.ts`: `gameName(type, edition)`, taglines, Skip-Bo card skin.
  - [x] Boot: read entry meta, `GET /api/access`, decide screen (`blank` | `otp` | `username` | reconnect with token).
  - [x] OtpScreen: on success replace URL with `/`, connect socket (cookie), go to username screen.
  - [x] Revocation: previously-original session → OTP screen; otherwise blank.
  - [x] Lobby, Room, Skip-Bo screen and SkipBoCard use the edition.
- [x] Task 5: Tests, smoke test, docs (AC: 9)
  - [x] Update tests that used `pendingSessionId` from HTTP / handshake.
  - [x] Decision log D13, README if it documents the OTP flow.

## Dev Notes

### Current auth flow (read before changing it)

- `POST /api/validate-otp` → `createPendingSession(code)` → `{ pendingSessionId }`; client connects the socket with
  `auth: { pendingSessionId }`; `authMiddleware` accepts it; `setUsername` turns the pending session into a `UserSession`
  with a secret `token` (localStorage) and public `playerId` (D4). Reconnects use `auth: { token }`.
- Sessions are already server-side and bound to `otpCode`; OTP rotation/expiry revokes everything (D3). Keep that.
- The session token stays the identity credential. The new cookie is the *access* credential (proof of OTP), used for the
  HTML gate and to create sessions. Both server-side; nothing the client can set grants the original tier.

### Guardrails

- D4: never broadcast `token`. The JWT lives only in an httpOnly cookie.
- D5: socket handlers via `safeHandler`, validate payloads defensively.
- D10: in-memory state, restarts wipe the OTP. A per-process signing key is therefore correct (old cookies die with the
  OTP they were bound to). Don't add a secret env var for it.
- `trust proxy` is 1 (Northflank), so `req.secure` reflects `X-Forwarded-Proto` for the `Secure` flag.
- Socket.io websocket transport is same-origin, so the browser sends the cookie in the handshake
  (`socket.handshake.headers.cookie`). The Vite dev proxy forwards cookies too.
- In dev (Vite on 5173) the server doesn't serve `index.html`; the client treats `/table` as entry path only when
  `import.meta.env.DEV` (dead-code-eliminated from the production bundle).
- No new runtime dependencies (no jsonwebtoken, no cookie-parser).
- `body { min-width: 1024px }` desktop-first stays (D11).

### Files to touch

Server: `config.ts`, `index.ts`, `state/otp.ts`, `state/sessions.ts`, `state/rooms.ts`, `socket/middleware/auth.ts`,
`socket/handlers/authHandlers.ts`, `socket/handlers/lobbyHandlers.ts`, `socket/types.ts`, new `utils/accessToken.ts`,
`utils/access.ts`, `utils/clientHtml.ts`.
Shared: `types/auth.ts` (Edition), `types/events.ts`, `index.ts` exports.
Client: `App.tsx`, `store/index.ts`, `OtpScreen.tsx`, `LobbyScreen.tsx`, `RoomScreen.tsx`, `SkipBoGameScreen.tsx`,
`SkipBoCard.tsx/.css`, new `utils/editions.ts`.
Scripts: `smoke-test.ts`, `generate-otp.ts`.

### Testing standards

Vitest, co-located `*.test.ts`. Server handler tests use mock sockets/io (see `authHandlers.test.ts`). Run
`pnpm build && pnpm typecheck && pnpm test && pnpm smoke-test` (CI order, D8).

### References

- [Source: _bmad-output/planning-artifacts/decision-log.md#D3, D4, D5, D10, D11]
- [Source: packages/server/src/index.ts] current HTTP routes and static serving
- [Source: packages/server/src/socket/middleware/auth.ts] handshake auth

## Dev Agent Record

### Agent Model Used

Claude (Claude Code, cloud session)

### Debug Log References

- Browser run (Playwright, `PUBLIC_ACCESS=true`): first attempt showed the entry page skipping the OTP form when public
  access was on (the visitor already had `neutral` access). Fixed: the entry page shows the OTP form unless the visitor
  already has `original` access, both at boot and after access is lost.

### Completion Notes List

- Server: `utils/accessToken.ts` (HS256 JWT, per-process key, timing-safe compare), `utils/access.ts` (cookie parsing,
  `getAccessEdition`, `isSessionValid`, `issueAccessToken`), `utils/clientHtml.ts` (blank / app / entry / redirect).
  `OtpState.id` is the generation the token is bound to. Static files are served with `index: false` so `/` goes
  through the gate. `/api/validate-otp` now sets the cookie and returns `{ ok: true }`; `GET /api/access` returns the
  edition. The admin endpoint returns `entryPath` and `pnpm generate-otp` prints the link.
- Socket: handshake without token derives the edition from the cookie (or public access) and creates the pending
  session; the client can no longer send a `pendingSessionId`. Pending sessions are removed on disconnect. Sessions
  carry `edition`; lobby lists are sent per edition channel (`edition:original` / `edition:neutral`), never globally.
- Client: boot decides blank / OTP / username / token reconnect; `editions.ts` holds names, taglines and the wild card
  label; `SkipBoCard` gets the neutral color scheme via `.skipbo-card-neutral`. The entry path is not in the
  production bundle (checked with grep on `dist`).
- Tests: 490 server (new: accessToken, access, clientHtml, middleware tier, edition filtering, join across editions,
  neutral session creation), 49 client (new: editions), 40 shared. Smoke test: blank page, entry page, forged cookie,
  cookie on main page, redirect from entry path, cookie revoked by rotation. Screenshots of both editions checked.

### File List

- README.md
- _bmad-output/planning-artifacts/decision-log.md
- _bmad-output/planning-artifacts/epics.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/7-1-otp-access-tier-and-neutral-game-edition.md
- packages/shared/src/index.ts
- packages/shared/src/types/auth.ts
- packages/shared/src/types/events.ts
- packages/server/src/config.ts
- packages/server/src/index.ts
- packages/server/src/state/otp.ts
- packages/server/src/state/otp.test.ts
- packages/server/src/state/sessions.ts
- packages/server/src/state/rooms.ts
- packages/server/src/state/rooms.test.ts
- packages/server/src/socket/middleware/auth.ts
- packages/server/src/socket/middleware/auth.test.ts
- packages/server/src/socket/handlers/authHandlers.ts
- packages/server/src/socket/handlers/authHandlers.test.ts
- packages/server/src/socket/handlers/lobbyHandlers.ts
- packages/server/src/socket/handlers/lobbyHandlers.test.ts
- packages/server/src/socket/handlers/gameHandlers.test.ts
- packages/server/src/socket/handlers/hardening.test.ts
- packages/server/src/socket/handlers/kickAndNames.test.ts
- packages/server/src/utils/accessToken.ts (new)
- packages/server/src/utils/accessToken.test.ts (new)
- packages/server/src/utils/access.ts (new)
- packages/server/src/utils/access.test.ts (new)
- packages/server/src/utils/clientHtml.ts (new)
- packages/server/src/utils/clientHtml.test.ts (new)
- packages/client/src/App.tsx
- packages/client/src/store/index.ts
- packages/client/src/socket/session.ts (new)
- packages/client/src/utils/access.ts (new)
- packages/client/src/utils/editions.ts (new)
- packages/client/src/utils/editions.test.ts (new)
- packages/client/src/components/screens/OtpScreen.tsx
- packages/client/src/components/screens/LobbyScreen.tsx
- packages/client/src/components/screens/RoomScreen.tsx
- packages/client/src/components/screens/SkipBoGameScreen.tsx
- packages/client/src/components/ui/SkipBoCard.tsx
- packages/client/src/components/ui/SkipBoCard.css
- scripts/smoke-test.ts
- scripts/generate-otp.ts

## Senior Developer Review (AI)

- **Date:** 2026-10-19 · **Outcome:** Approved after fixes (all HIGH and MEDIUM fixed automatically)
- **ACs:** 1–9 implemented. Tasks verified against the code; File List matches git.

### Action Items

- [x] [HIGH] AC1 bypass: `express.static` still served `/index.html` directly, handing the app to strangers. Now rewritten
  to `/` so it goes through the access gate; smoke test checks it. [packages/server/src/index.ts]
- [x] [MEDIUM] Usernames were unique across editions, so a public player picking an OTP player's name got "already
  taken", revealing the other edition (AC7). Uniqueness is now per edition; test added.
  [packages/server/src/state/sessions.ts, authHandlers.ts, kickAndNames.test.ts]
- [x] [MEDIUM] Socket middleware used `getOtp()!` and `handshake.headers.cookie` without guards; now defensive.
  [packages/server/src/socket/middleware/auth.ts]
- [ ] [LOW] Dev-only entry path `/table` in `client/src/utils/access.ts` duplicates the server default; only matters in
  `pnpm dev` with a custom `OTP_ENTRY_PATH`. Left as is.
- [ ] [LOW] `normalizeEntryPath` rejects any path starting with `/api` (e.g. `/apiary`). Harmless; left as is.

## Change Log

- 2026-10-19: Implemented story 7.1. The access cookie is `SameSite=Lax` instead of the planned `Strict`: with
  Strict, opening the site from a link in a chat app sends no cookie on that first navigation and the page is blank.
  Lax still blocks cross-site POSTs.
- 2026-10-19: Code review: fixed 1 HIGH and 2 MEDIUM findings (direct `/index.html`, per-edition usernames, defensive
  handshake parsing). Status done.
