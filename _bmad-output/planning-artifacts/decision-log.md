# Decision Log & Project Status

Read this before planning or implementing anything. It records decisions made **after** the PRD,
architecture and epics were written, and where they differ, **this file wins**. Add new entries at
the top of the log when a decision changes; keep "Current status" up to date.

## Current status (2026-10-16)

- All 22 stories in `sprint-status.yaml` (epics 1–5: auth, lobby, Blackjack, connection resilience,
  Skip-Bo) are implemented. The project sat dormant for months, was revived on 2026-10-07 and merged
  to `main` via PR #1.
- **Deployed** on Northflank since 2026-10-08: https://p01--cardpal--b4kg79kl4tgd.code.run (auto-deploys `main`,
  see D10; a merge was live ~45 s later). No one has played it with real people yet. Next milestone: first
  try-out with friends.
- CI (`.github/workflows/ci.yml`) runs on every push/PR: build → typecheck (incl. test files) → unit
  tests → `pnpm smoke-test` (boots the real server, two simulated players) → Docker build, then the same
  smoke test against the running production container. Keep it green.
- 2026-10-08 readiness review: ready for the first try-out; nothing blocks it in the code. See D10 for deploys.
- Dependabot opens weekly npm PRs and monthly actions/Docker PRs.
- 2026-10-16: Epic 6 started on the owner's request: story 6.1 adds card drag & drop and the deck fly-in (D12).
- 2026-10-19: Epic 7 (legal layer) started: story 7.1 splits OTP players from everyone else on the server and adds a
  neutral edition (D13). The site is now **blank without the OTP**; friends use the secret entry path.

### Open items, in rough priority

1. Owner action: set `OTP_ENTRY_PATH` on Northflank to a path only friends know (the default `/table` is in this
   public repo), and set the GitHub repo variable `CARDPAL_URL` to the public URL so the deploy check runs (D10).
2. First try-out, then fix whatever real usage reveals ("UI polish based on real usage" in the PRD).
3. Skip-Bo plays still have no movement animation for *other* players (FR38): an opponent's played card just appears on
   the building pile. Your own moves are dragged (D12) and every draw flies in from the deck. Candidate follow-up story.
4. Post-MVP per PRD: Lovecraft Letter (third game).
5. Before switching `PUBLIC_ACCESS` on (D13): Impressum/privacy pages, and decide whether OTP rotation should still sign
   out public players (today it revokes every session).

## Decisions

### D13 — Legal layer: OTP access tier and neutral edition (story 7.1) · 2026-10-19

- **Decision:** Two server-enforced access tiers. Players who entered the OTP get the `original` edition (Skip-Bo, its
  card labels); everyone else would get the `neutral` edition: Skip-Bo is shown as **"Twelve Up"**, the wild card shows a
  star instead of "SKIP BO", and number cards use a different color scheme. Blackjack is a generic name and stays.
  Rooms belong to their creator's edition; each edition only sees and can join its own rooms (joining another edition's
  room answers `ROOM_NOT_FOUND`). The UI never mentions editions.
- **Private for now:** the service is not public yet (no Impressum). Without OTP access every page is blank (no redirect,
  no app bundle). The OTP form only exists at the secret `OTP_ENTRY_PATH` (default `/table`, set your own on deploys).
  The path is never in the client bundle: the server injects `<meta name="cardpal-entry">` when it serves that page.
  `PUBLIC_ACCESS=true` (off by default) opens `/` to everyone with the neutral edition; it is the switch for later.
- **Enforcement:** a valid OTP sets an httpOnly `SameSite=Lax` (Lax so links shared in chat apps work) cookie with an
  HS256 JWT bound to the OTP generation id and expiring with it. The signing key is random per process (state is in
  memory anyway, D10). The socket handshake reads the cookie and creates the pending session with its edition; the
  `pendingSessionId` HTTP round-trip is gone. The edition is stored on the session at username time and can't be chosen
  by the client. OTP rotation still revokes everything (D3), cookies included. Hand-rolled JWT/cookie parsing: no new
  dependency.
- **Known limit:** the client bundle contains both editions' strings ("Skip-Bo" is in the JS, never rendered for
  neutral sessions). Move names server-side if that ever matters legally.

### D12 — Drag & drop and deck fly-in (story 6.1) · 2026-10-16

- **Decision:** Skip-Bo cards are moved by dragging them onto their pile; click-then-click stays as the fallback. Drawn cards
  in both games fly in from a visible deck (Skip-Bo draw pile, Blackjack shoe), for every player.
- **How:** Pointer Events (not HTML5 drag & drop, which doesn't work for touch) in `useCardDrag`; a press only becomes a drag
  after 6px, so clicks are unaffected. Fly-in uses the Web Animations API from the deck's position (`FlyIn`). No new
  dependency. Both respect `prefers-reduced-motion`.
- **Server change:** each Skip-Bo player has a cumulative `drawnCount`; the client diffs it to know exactly which hand cards
  are new (a hand length diff is wrong when the last card is played and 5 are drawn in one update).
- **Touch:** drag works on touch screens too, but the app is still desktop-first (NFR9, D11).

### D11 — Desktop layout: full-width shell instead of a shrink-wrapped column · 2026-10-08

- **Decision:** Every screen fills the viewport. Lobby, room and both game screens share a full-width top bar
  (`TopBar`: brand, room · game, player avatar) and a centered content column of up to 1120px (`.app-main` in
  `index.css`). The lobby shows rooms as a card grid, the room screen has a players panel (with open seats) and a
  game/actions sidebar, Blackjack is laid out as a table (dealer top, opponents side by side, you at the bottom),
  playing cards show rank and suit in the top-left corner so they stay readable when a hand overlaps.
- **Why:** The owner found the lobby "crazily slim" on a 16:9 desktop: `#root` was a centered flex box, so every
  screen shrink-wrapped to its content (~260px) with a two-tone background. Done directly on the owner's request
  as polish (D9), without a story.
- **Unchanged:** desktop only, `body { min-width: 1024px }` (NFR9). Checked at 1920×1080 and 1280×720.

### D10 — Continuous deployment from `main` · 2026-10-08

- **Decision:** Northflank's own GitHub integration builds and deploys every commit on `main` (service CI + CD
  toggles on). No registry or API token in GitHub. `main` only changes through PRs with green CI (D9), so that
  is the gate.
- **Verification:** `.github/workflows/deploy-check.yml` runs after CI succeeds on a push to `main` and polls
  `$CARDPAL_URL/api/health` until its `version` equals the commit (Northflank injects `NF_DEPLOYMENT_SHA`;
  `GIT_SHA` overrides it on other hosts). Red = the deploy failed or is stuck. Skipped while the repo variable
  `CARDPAL_URL` is unset.
- **CI runs the real image:** the Docker job loads the image, starts it and runs `pnpm smoke-test` against it
  (`SMOKE_TEST_URL`), so a broken image (missing client files, bad paths) fails CI before it can be deployed.
- **Implication:** every merge to `main` (including Dependabot PRs) restarts the server and wipes the OTP and all
  games. Don't merge while friends are playing.

### D1 — Hosting: Northflank free Developer Sandbox (replaces Render) · 2026-10-07

- **Decision:** Deploy the `Dockerfile` to Northflank's free Developer Sandbox (always-on, no sleeping).
  Fallback: Render free web service from the same `Dockerfile`.
- **Why:** The owner's hard constraint is **zero hosting cost** for ~5 users. Render's free tier spins down
  after 15 min without traffic and loses all in-memory state, including the OTP. Since Feb 2026, Render
  counts WebSocket messages as traffic, so it no longer sleeps *during* play, but an OTP issued while
  nobody is connected is lost before friends join. Northflank's sandbox keeps services always-on for free
  (card verification may be required). Koyeb no longer has a visible free tier; Oracle Always Free was
  halved in Aug 2026 and reclaims idle VMs.
- **Implications:** `architecture.md` "Deployment Target" and "Infrastructure & Deployment" mention
  Render; read them as superseded by this entry. The owner may make the site public later; Northflank
  scales to paid plans without a migration. Re-check free-tier terms if anything changes; they move fast.

### D2 — Container-based deploys · 2026-10-07

- Multi-stage `Dockerfile` (Node 24 alpine). The server serves the built client from `../../client/dist`
  whenever that directory exists (no `NODE_ENV` gating). Host-agnostic on purpose.

### D3 — Admin authentication for OTP generation · 2026-10-07

- `POST /api/admin/generate-otp` requires `Authorization: Bearer $ADMIN_SECRET`. If `ADMIN_SECRET` is
  unset, only requests from loopback are accepted (local dev). `ADMIN_SECRET` **must** be set on any
  deployment.
- Generate a code remotely: `CARDPAL_URL=https://… ADMIN_SECRET=… pnpm generate-otp`.
- Generating a new OTP, or the OTP expiring (checked every minute), **revokes everything**: sessions,
  rooms and games are cleared and all sockets are disconnected. This is how "previous OTPs are
  invalidated" from the pitch is enforced for already-connected clients.
- OTP validation is rate limited: 10 attempts per IP per 10 minutes (`app.set('trust proxy', 1)`).

### D4 — Session token vs public player ID · 2026-10-07

- Every session has a secret `token` (bearer credential, stored in the client's localStorage) and a
  public `playerId`. **Rooms, game state, ownership and turn order use `playerId` only.** The token
  must never be sent to anyone but its owner (it was previously broadcast as the player ID, allowing
  session hijacking). A test in `hardening.test.ts` and the smoke test assert this.
- `authenticated` events carry `{ token, playerId, username, roomId? }`; the client compares
  `room.ownerId` against `playerId`.

### D5 — Server robustness rules · 2026-10-07

- Every socket handler is registered through `safeHandler(...)`; a throw inside a socket.io handler
  otherwise crashes the whole process. Validate payloads defensively (`data?.field`).
- `socket.data.session` is a snapshot. A `socket.use` middleware refreshes it from the session store
  before every event. Don't rely on it being current after you mutate state for *another* player.
- Pause state is derived, not toggled: `syncPauseState` (called inside `broadcastGameState`) pauses
  whenever the active player is disconnected and resumes when they're back.
- Disconnect events from a superseded socket (fast reconnect) are ignored.

### D6 — Room & lobby rules added after the epics · 2026-10-07

- Players cannot leave a room while its game is in progress.
- **Host can remove players** (`kickPlayer`): any non-host player in the lobby; during a game only
  **disconnected** players, which ends the game and returns the room to the lobby. This is the escape
  hatch for the PRD rule "no timeout kicks": a no-show never blocks a table forever.
- Usernames are unique per OTP, case-insensitively.

### D7 — Game rules scope for the first try-out · 2026-10-07

- **Blackjack** stays simplified: no betting, double, split or insurance; the dealer stands on soft 17.
  A natural (two-card 21) beats any other 21. The owner accepted this for the first test.
- **Skip-Bo:** a player with no legal move (possible once the draw pile runs out, likely with 5–6
  players) is skipped automatically. If nobody can move, the game ends in a stalemate; the smallest
  stock pile wins, and a tie means nobody wins.
- Skip-Bo without animations: accepted for the first test (see open items).

### D8 — Toolchain baseline · 2026-10-07

- Node 24 LTS (`.nvmrc`; `engines` allows >=22), pnpm 10 (pinned via `packageManager`), TypeScript 7,
  React 19, Vite 8, Vitest 5, Zod 4, Express 5, Socket.io 4.
- `@cardpal/shared` must be built before typechecking/testing the other packages (`pnpm build` first).

### D9 — Process · 2026-10-07

- The project is maintained by AI agents only. Feature work follows the BMAD story flow described
  in `CLAUDE.md`. One-off maintenance asked for directly by the owner (revival, dependency bumps,
  infra) may be done without a story, but must be recorded here.
- Default branch is `main`. All changes land via PR with green CI.
