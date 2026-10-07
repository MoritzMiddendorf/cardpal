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

Tests: `pnpm -r test`

## Production

```bash
pnpm install && pnpm build
pnpm start          # serves the built client + websocket on $PORT
```

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | HTTP/WebSocket port |
| `ADMIN_SECRET` | unset | **Required when deployed.** Bearer secret for OTP generation. Without it, OTPs can only be generated from localhost. |
| `OTP_VALIDITY_HOURS` | `12` | How long an access code (and every session created with it) stays valid |

Generate a code against a deployed server:

```bash
CARDPAL_URL=https://your-host ADMIN_SECRET=... pnpm generate-otp
```

Generating a new code invalidates the previous one and signs everybody out. All state is in memory; a restart is a clean slate.
