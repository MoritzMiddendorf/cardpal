# cardpal

Private, OTP-gated web app for playing card games (Blackjack, Skip-Bo) with friends.
Server-authoritative: all rules are enforced server-side and private cards never leave the server for anyone but their owner.

Planning docs live in `_bmad-output/planning-artifacts/` (PRD, architecture, epics).

## Run locally

Requires Node 22+ (24 recommended, see `.nvmrc`) and pnpm.

```bash
pnpm install
pnpm build          # builds shared types first; needed once before dev/test
pnpm dev            # client on :5173, server on :3001
pnpm generate-otp   # in a second terminal: prints the access code
```

Open http://localhost:5173, enter the code, pick a username.

Checks (the same ones CI runs on every push):

```bash
pnpm build && pnpm typecheck && pnpm test && pnpm smoke-test
```

`smoke-test` boots the built server and drives two simulated players through a full round.

## Production

The `Dockerfile` builds everything into one image that serves the client and the websocket server:

```bash
docker build -t cardpal .
docker run -p 3001:3001 -e ADMIN_SECRET=change-me cardpal
```

Without Docker: `pnpm install && pnpm build && pnpm start`.

### Hosting

Recommended: **Northflank** free Developer Sandbox — always-on (no sleeping), builds the `Dockerfile` straight from GitHub.

1. Create a **combined service** from this repo, branch `main`, build type *Dockerfile* (path `/Dockerfile`, context `/`).
2. Networking: port `3001`, protocol HTTP, **public**.
3. Environment: add `ADMIN_SECRET` (long random string) as a runtime variable.
4. Health check (optional): HTTP `GET /api/health` on port `3001`.
5. Keep **CI** and **CD** enabled: every push to `main` is built and deployed automatically.

Continuous deployment: changes only reach `main` through PRs with green CI, and Northflank deploys each new `main` commit.
The *Deploy check* workflow then waits for `/api/health` to report that commit (`version`, from Northflank's
`NF_DEPLOYMENT_SHA`) and goes red if it doesn't go live within 20 minutes. Enable it by setting the repository
variable `CARDPAL_URL` to the public URL. Every deploy restarts the server, which clears the OTP and all games.

Fallback: **Render** free web service (also from the `Dockerfile`). It sleeps after 15 minutes without traffic and loses all in-memory state (including the OTP); open websocket connections keep it awake during play.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | HTTP/WebSocket port |
| `ADMIN_SECRET` | unset | **Required when deployed.** Bearer secret for OTP generation. Without it, OTPs can only be generated from localhost. |
| `GIT_SHA` | unset | Commit reported by `/api/health`; on Northflank `NF_DEPLOYMENT_SHA` is used automatically |
| `OTP_VALIDITY_HOURS` | `12` | How long an access code (and every session created with it) stays valid |

Generate a code against a deployed server:

```bash
CARDPAL_URL=https://your-host ADMIN_SECRET=... pnpm generate-otp
```

Generating a new code invalidates the previous one and signs everybody out. All state is in memory; a restart is a clean slate.
