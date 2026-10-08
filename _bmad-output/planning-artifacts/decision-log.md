# Decision Log & Project Status

Read this before planning or implementing anything. It records decisions made **after** the PRD,
architecture and epics were written, and where they differ, **this file wins**. Add new entries at
the top of the log when a decision changes; keep "Current status" up to date.

## Current status (2026-10-08)

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

### Open items, in rough priority

1. Owner action: set the GitHub repo variable `CARDPAL_URL` to the public URL so the deploy check runs (D10).
2. First try-out, then fix whatever real usage reveals ("UI polish based on real usage" in the PRD).
3. Skip-Bo has no card-movement animations (FR37/FR38 are only met for Blackjack). Accepted for the
   first try-out; a candidate story afterwards.
4. Post-MVP per PRD: Lovecraft Letter (third game).

## Decisions

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
