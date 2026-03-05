# Story 1.2: OTP Generation System

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want **to generate an OTP via CLI command**,
so that **I can share the code with friends to grant them access to game night**.

## Acceptance Criteria

1. **Given** the server is running **When** the admin runs `pnpm generate-otp` **Then** a new OTP is generated in format like "A7X-K9M" (readable alphanumeric with separator)
2. **And** the OTP is displayed in the console for copying
3. **And** the OTP is stored in server memory with a 12-hour expiration timestamp
4. **And** any previously valid OTP is invalidated
5. **And** the OTP state includes: `code`, `expiresAt`, and `createdAt` timestamp
6. **Given** an OTP was generated more than 12 hours ago **When** the system checks OTP validity **Then** the OTP is considered expired and invalid

## Tasks / Subtasks

- [x] Task 1: Create OTP state management module (AC: #3, #4, #5, #6)
  - [x] 1.1 Create `packages/server/src/state/otp.ts` with in-memory OTP state
  - [x] 1.2 Implement `OtpState` interface: `{ code: string; expiresAt: Date; createdAt: Date } | null`
  - [x] 1.3 Implement `setOtp(code: string)` — stores new OTP, computes expiration from `OTP_VALIDITY_HOURS`, invalidates any previous OTP
  - [x] 1.4 Implement `getOtp()` — returns current OTP state or null
  - [x] 1.5 Implement `isOtpValid(code: string): boolean` — checks code matches AND not expired
  - [x] 1.6 Implement `clearOtp()` — sets state to null (for future use when OTP is consumed or admin resets)
- [x] Task 2: Implement OTP code generation utility (AC: #1)
  - [x] 2.1 Update `packages/server/src/utils/generateOtp.ts` — replace placeholder with real generation logic
  - [x] 2.2 Use `crypto.randomBytes()` for cryptographically secure random values
  - [x] 2.3 Use custom alphabet excluding ambiguous characters: `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (no 0/O, 1/I/L)
  - [x] 2.4 Generate 6 characters, format as `XXX-XXX` (3 + hyphen + 3)
  - [x] 2.5 Export as pure function `generateOtpCode(): string` — no side effects
- [x] Task 3: Add admin HTTP endpoint for OTP generation (AC: #1, #2, #3, #4)
  - [x] 3.1 Add `POST /api/admin/generate-otp` route in `packages/server/src/index.ts`
  - [x] 3.2 Endpoint calls `generateOtpCode()` to create new code
  - [x] 3.3 Endpoint calls `setOtp(code)` to store in server memory (invalidates previous)
  - [x] 3.4 Endpoint returns JSON: `{ code: string; expiresAt: string }`
  - [x] 3.5 Log OTP generation event to console: `OTP generated: XXX-XXX (expires: <ISO timestamp>)`
- [x] Task 4: Implement CLI script (AC: #1, #2)
  - [x] 4.1 Update `scripts/generate-otp.ts` — replace placeholder with HTTP client
  - [x] 4.2 Use Node.js built-in `fetch` (available in Node 20) to POST to `http://localhost:${PORT}/api/admin/generate-otp`
  - [x] 4.3 Read PORT from env var or default to 3001 (match server config)
  - [x] 4.4 Display generated OTP prominently in console output for easy copying
  - [x] 4.5 Handle error: server not running → clear message: "Error: Server is not running on port ${PORT}. Start with `pnpm dev` first."
  - [x] 4.6 Handle error: non-200 response → display error message from response body
- [x] Task 5: Wire up pnpm script (AC: #1)
  - [x] 5.1 Update root `package.json` script: `"generate-otp": "tsx scripts/generate-otp.ts"`
  - [x] 5.2 Remove server-package-level `generate-otp` script (it pointed to the old placeholder; the root script now calls the CLI directly)
  - [x] 5.3 Verify `pnpm generate-otp` works end-to-end with running server
- [x] Task 6: Verify acceptance criteria
  - [x] 6.1 Start server with `pnpm dev`, run `pnpm generate-otp`, confirm OTP displayed
  - [x] 6.2 Run `pnpm generate-otp` again, confirm new OTP generated (old one implicitly invalidated)
  - [x] 6.3 Confirm OTP format matches `XXX-XXX` pattern (readable alphanumeric)
  - [x] 6.4 Confirm server logs show OTP generation events
  - [x] 6.5 Confirm no TypeScript compilation errors across all packages

## Dev Notes

### Architecture Compliance

**CRITICAL — Follow these patterns exactly:**

- **In-memory state:** OTP is stored in server process memory via `state/otp.ts`. There is NO database. Server restart clears all state — this is by design.
- **State module pattern:** State modules export functions, not raw data. No direct state mutation from handlers. Always use the state module's API (`setOtp`, `getOtp`, `isOtpValid`).
- **Single active OTP:** Only one OTP can be valid at any time. Generating a new one replaces the old one entirely (FR2).
- **CLI-to-server communication:** The CLI script (`scripts/generate-otp.ts`) runs as a separate process and communicates with the running server via HTTP POST. It cannot access server in-memory state directly.
- **No new dependencies needed:** Use `crypto` (Node built-in) for OTP generation and `fetch` (Node 20 built-in) in the CLI script.

### Technical Stack — Relevant Versions

| Package | Version | Notes |
|---------|---------|-------|
| Node.js | 20.x LTS | `fetch` is stable globally — no import needed |
| Express | ^5.1.0 | Use `res.status(code).json(obj)` pattern (not `res.json(obj, status)`) |
| TypeScript | ~5.9.3 | Strict mode |
| tsx | ^4.19.0 | Used to run `scripts/generate-otp.ts` directly |
| Zod | ^3.24.0 | Project uses v3, NOT v4 |

### OTP Generation — Implementation Details

**Format:** `A7X-K9M` — 3 uppercase alphanumeric chars, hyphen, 3 uppercase alphanumeric chars.

**Alphabet:** `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (32 characters)
- Excludes `0` (confused with `O`), `1` (confused with `I`), `I`, `O` — `L` is intentionally **kept** to reach exactly 32 chars
- 32 chars = power of 2 → avoids modulo bias when using `crypto.randomBytes()`

**Generation approach:** Since alphabet has exactly 32 characters (2^5), each random byte provides enough entropy for one character using a 5-bit mask (`byte & 0x1F`). Use rejection sampling if the masked value exceeds alphabet length (not needed here since 32 = 2^5 maps perfectly).

**Security:** `crypto.randomBytes()` is CSPRNG. With 6 characters from 32-char alphabet, there are 32^6 = ~1 billion possible codes. More than sufficient for a private friend-group app.

### Admin Endpoint Design

**Route:** `POST /api/admin/generate-otp`
- No authentication required on this endpoint — **security model: obscurity + scope**
- In local dev, runs on localhost only (inaccessible from outside)
- On Render free tier, the endpoint **is publicly accessible over the internet** (no automatic firewall) — this is an **accepted risk** for a small friend-group app where the admin controls the URL and the blast radius of an attack (generating a new OTP) is minimal
- Returns `{ code: string; expiresAt: string }` as JSON
- If the threat model changes (public-facing app), add an `Authorization` header check or restrict to `req.ip === '127.0.0.1'` for production environments with SSH access

### OTP State Interface

```typescript
// packages/server/src/state/otp.ts
interface OtpState {
  code: string;      // e.g., "A7X-K9M"
  expiresAt: Date;   // createdAt + OTP_VALIDITY_HOURS
  createdAt: Date;   // timestamp of generation
}
// Module-level variable: let otpState: OtpState | null = null;
```

This matches the architecture's in-memory state structure: `otpState: { code: string, expiresAt: Date } | null` (plus `createdAt` per AC #5).

### CLI Script Behavior

**Success output:**
```
OTP generated successfully!

  Code: A7X-K9M
  Expires: 2026-02-07T02:30:00.000Z

Share this code with your friends to grant access.
```

**Error output (server not running):**
```
Error: Server is not running on port 3001. Start with `pnpm dev` first.
```

### Previous Story Intelligence (1.1)

**Key learnings from Story 1.1:**
- Used Zod v3.24.0 (not v4) — continue using v3 for consistency
- Used Express v5.1.0 — use `res.status(code).json(obj)` pattern
- Used Vite v6.3.0 (not v7 — v7 not available)
- Server entry point is `packages/server/src/index.ts` with ESM (`"type": "module"`)
- All server imports use `.js` extension (ESM requirement): `import { PORT } from './config.js'`
- Project uses `process.env['VAR']` bracket notation (not `process.env.VAR`)

**Review action items from Story 1.1 relevant to this story:**
- [M3] No JSON 404 handler for `/api/*` routes — consider adding basic API error middleware when adding the admin endpoint

**Files created in 1.1 that this story extends:**
- `packages/server/src/index.ts` — Add admin endpoint here
- `packages/server/src/config.ts` — `OTP_VALIDITY_HOURS` already exported
- `packages/server/src/utils/generateOtp.ts` — Replace placeholder
- `packages/server/src/state/.gitkeep` — Replace with `otp.ts`
- `scripts/generate-otp.ts` — Replace placeholder
- `package.json` (root) — Update `generate-otp` script

**Existing shared types already available:**
- `OtpValidationRequest` in `@cardpal/shared` — `{ code: string }` (for use in Story 1.3)
- `otpValidationRequestSchema` — Zod schema validating `{ code: string }` (for use in Story 1.3)
- `ErrorPayload` / `ErrorCode` types — standard error structure

### Git Intelligence

**Recent commits:**
- `3dae192` feat: Story 1.1 - Project scaffolding & shared types with code review fixes
- `e8b583a` Initial commit: project planning artifacts and BMAD workflow setup

**Patterns established:**
- Commit format: `feat: Story X.X - <description>`
- ESM modules throughout (all `package.json` have `"type": "module"`)
- `.js` extensions in imports required for ESM compatibility

### Project Structure Notes

**Files to create:**
```
packages/server/src/state/otp.ts       # NEW: OTP state management
```

**Files to modify:**
```
packages/server/src/utils/generateOtp.ts  # UPDATE: Replace placeholder with generation logic
packages/server/src/index.ts              # UPDATE: Add POST /api/admin/generate-otp endpoint
scripts/generate-otp.ts                   # UPDATE: Replace placeholder with CLI HTTP client
package.json (root)                       # UPDATE: Change generate-otp script path
packages/server/package.json              # UPDATE: Remove generate-otp script
```

**Files to delete:**
```
packages/server/src/state/.gitkeep        # Replaced by otp.ts
```

- All new files follow existing naming conventions: camelCase for utilities, camelCase for state modules
- No new directories needed — `state/` and `utils/` already exist
- No new dependencies needed — `crypto` and `fetch` are Node.js built-ins

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2: OTP Generation System]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security — OTP Handling]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — In-Memory State Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping — Access Control FR1-5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling Patterns]
- [Source: _bmad-output/planning-artifacts/prd.md#Access Control FR1-FR5]
- [Source: _bmad-output/implementation-artifacts/1-1-project-scaffolding-and-shared-types.md#Completion Notes List]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

No issues encountered — all implementation was already in place from a previous session; validation confirmed correctness.

### Completion Notes List

- **Task 1 (OTP State Management):** Created `packages/server/src/state/otp.ts` with `OtpState` interface, `setOtp()`, `getOtp()`, `isOtpValid()`, and `clearOtp()` functions. Uses `OTP_VALIDITY_HOURS` from config for 12-hour expiration. Single active OTP pattern enforced — `setOtp()` replaces previous state entirely. 12 unit tests cover all functions including expiration via fake timers.
- **Task 2 (OTP Generation Utility):** Updated `packages/server/src/utils/generateOtp.ts` with `crypto.randomBytes()` CSPRNG, 32-character alphabet (no ambiguous chars 0/O/1/I), 5-bit masking for bias-free selection, `XXX-XXX` format output. 6 unit tests cover format, alphabet, uniqueness, and purity.
- **Task 3 (Admin Endpoint):** Added `POST /api/admin/generate-otp` in `packages/server/src/index.ts`. Calls `generateOtpCode()` → `setOtp(code)` → returns `{ code, expiresAt }` JSON. Logs generation event to console.
- **Task 4 (CLI Script):** Updated `scripts/generate-otp.ts` with `fetch`-based HTTP client. Reads PORT from env (default 3001). Handles ECONNREFUSED with user-friendly message. Handles non-200 responses.
- **Task 5 (pnpm Script):** Root `package.json` script points to `tsx scripts/generate-otp.ts`. Server-level `generate-otp` script removed.
- **Task 6 (Verification):** All 18 tests pass (12 state + 6 generation). Full project build clean across shared, client, and server packages. No TypeScript errors.

### Change Log

- 2026-02-17: Story 1.2 implementation validated and completed — OTP generation system with state management, admin endpoint, CLI script, and comprehensive test suite
- 2026-02-17: Code review fixes applied — [H1] vitest config to prevent dist/ test duplication, [H2] tsconfig excludes test files from build, [M1] state functions return immutable copies, [M3] admin endpoint error handling, [L2] tightened test regex. [M2] endpoint integration test deferred (requires app refactor for testability).
- 2026-02-25: Code review 2 fixes applied — [M1] admin endpoint error response now uses ErrorPayload format, [M2] deep-copy Date objects in setOtp()/getOtp(), [M3] OTP_VALIDITY_HOURS env var validated with fallback to 12.
- 2026-03-02: Code review 3 fixes applied — [M1] added config.ts to File List, [M2] corrected admin endpoint security docs (accepted-risk model), [M3] noted index.ts forward contamination from stories 1-3/1-4, [L7] afterEach now restores fake timers, [L8] corrected alphabet doc (L kept intentionally), [L9] tests use OTP_VALIDITY_HOURS constant instead of hardcoded 12.

### File List

**New files:**
- `packages/server/src/state/otp.ts` — OTP state management module
- `packages/server/src/state/otp.test.ts` — OTP state unit tests (12 tests)
- `packages/server/src/utils/generateOtp.test.ts` — OTP generation unit tests (6 tests)
- `packages/server/vitest.config.ts` — Vitest config limiting test discovery to src/ [code review fix H1]

**Modified files:**
- `packages/server/src/utils/generateOtp.ts` — Replaced placeholder with CSPRNG generation logic
- `packages/server/src/index.ts` — Added POST /api/admin/generate-otp endpoint, added try/catch error handling [code review fix M3]; **NOTE: also contains forward changes from stories 1-3/1-4 (validate-otp endpoint, Socket.io auth setup) that will be documented in those stories' file lists**
- `packages/server/src/config.ts` — Added OTP_VALIDITY_HOURS validation with NaN/negative guard [code review fix M3 from review 2]
- `packages/server/src/state/otp.ts` — State functions return shallow copies to prevent external mutation [code review fix M1]
- `packages/server/src/utils/generateOtp.test.ts` — Tightened format regex to match actual alphabet [code review fix L2]
- `packages/server/tsconfig.json` — Excluded test files from build output [code review fix H2]
- `scripts/generate-otp.ts` — Replaced placeholder with HTTP client CLI
- `package.json` (root) — Updated generate-otp script path
- `packages/server/package.json` — Removed server-level generate-otp script
- `pnpm-lock.yaml` — Updated lockfile

**Deleted files:**
- `packages/server/src/state/.gitkeep` — Replaced by otp.ts

## Senior Developer Review (AI)

**Review Date:** 2026-02-17
**Reviewer:** Claude Opus 4.6 (code-review workflow)
**Outcome:** Changes Requested → Fixed

### Action Items (Review 1 — 2026-02-17)

- [x] [H1] Create vitest.config.ts to prevent dist/ test duplication (was running 36 tests instead of 18)
- [x] [H2] Exclude test files from tsconfig.json build output (test .d.ts and .js in dist/)
- [x] [M1] State functions setOtp()/getOtp() return shallow copies to prevent external mutation of internal state
- [ ] [M2] Add integration test for POST /api/admin/generate-otp endpoint (requires app refactor for testability — deferred)
- [x] [M3] Add try/catch error handling to admin endpoint (was returning HTML on error)
- [x] [L2] Tighten generateOtp test format regex to match actual alphabet (was accepting 0, O, 1, I)

### Action Items (Review 2 — 2026-02-25)

- [x] [M1] Admin endpoint error response uses `{ error }` instead of architecture's `ErrorPayload` format `{ code, message }` [index.ts:51]
- [x] [M2] Shallow copy in setOtp()/getOtp() doesn't deep-copy Date objects — external mutation still possible (Review 1 M1 fix was incomplete) [otp.ts:15,19]
- [x] [M3] No validation on `OTP_VALIDITY_HOURS` env var — NaN makes OTP never expire, violating AC6 [config.ts:2]

### Unaddressed Items (Review 1 & 2)

- [L1] isOtpValid doesn't clean expired state from memory (functionally harmless)
- [L2] OTP comparison is case-sensitive — could cause issues in Story 1.3 [otp.ts:24]
- [L3] Unvalidated JSON response body cast in CLI script [generate-otp.ts:13]
- [L4] getOtp() returns expired OTPs without indication [otp.ts:18-20]
- [L5] "Pure function" test doesn't actually verify purity [generateOtp.test.ts:48-54]
- [L6] Story 1.1 review finding [M3] API 404 handler not added (not in this story's scope)

### Action Items (Review 3 — 2026-03-02)

- [x] [M1] config.ts missing from story File List — added to Modified files
- [x] [M2] Admin endpoint security claim inaccurate ("behind firewall" on Render) — corrected to accurately describe accepted-risk model
- [x] [M3] index.ts contains undocumented story 1-3/1-4 forward changes — noted in file list
- [x] [L7] Fake timer not restored in afterEach — vi.useRealTimers() added to afterEach [otp.test.ts:10]
- [x] [L8] Story dev notes incorrectly stated alphabet excludes L — corrected to show L is kept intentionally for 32-char power-of-2 alphabet
- [x] [L9] Expiration tests hardcoded 12h instead of using OTP_VALIDITY_HOURS — now import and use config constant [otp.test.ts:27,86]
