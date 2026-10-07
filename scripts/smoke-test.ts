// End-to-end smoke test against the real built server: boots `packages/server/dist`,
// then drives two socket.io clients through OTP -> lobby -> room -> Blackjack round,
// a disconnect/reconnect, a host kick and an OTP rotation.
//
//   pnpm build && pnpm smoke-test

import { spawn } from 'node:child_process';
import { io, type Socket } from 'socket.io-client';

const PORT = 3990 + Math.floor(Math.random() * 9);
const BASE = `http://localhost:${PORT}`;
const ADMIN_SECRET = 'smoke-test-secret';

const server = spawn(process.execPath, ['packages/server/dist/index.js'], {
  env: { ...process.env, PORT: String(PORT), ADMIN_SECRET },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', (d: Buffer) => (serverLog += d.toString()));
server.stderr.on('data', (d: Buffer) => (serverLog += d.toString()));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(condition: unknown, message: string): void {
  console.log(`${condition ? 'ok  ' : 'FAIL'} ${message}`);
  if (!condition) failures++;
}

type Client = Socket & { received: Array<[string, ...unknown[]]> };
const last = (c: Client, event: string): any => [...c.received].reverse().find((e) => e[0] === event)?.[1];

function connect(auth: Record<string, string>): Client {
  const socket = io(BASE, { transports: ['websocket'], auth, reconnection: false }) as Client;
  socket.received = [];
  socket.onAny((event: string, ...args: unknown[]) => socket.received.push([event, ...args]));
  return socket;
}

async function generateOtp(secret = ADMIN_SECRET): Promise<Response> {
  return fetch(`${BASE}/api/admin/generate-otp`, { method: 'POST', headers: { Authorization: `Bearer ${secret}` } });
}

async function joinAs(code: string, username: string): Promise<Client> {
  const res = await fetch(`${BASE}/api/validate-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const { pendingSessionId } = (await res.json()) as { pendingSessionId: string };
  const socket = connect({ pendingSessionId });
  await new Promise((r) => socket.on('connect', () => r(undefined)));
  socket.emit('setUsername', { username });
  await sleep(150);
  return socket;
}

async function main(): Promise<void> {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) break;
    } catch { /* not up yet */ }
    await sleep(100);
  }

  check((await generateOtp('wrong')).status === 401, 'admin endpoint rejects a wrong secret');
  const { code } = (await (await generateOtp()).json()) as { code: string };
  check(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(code), 'OTP generated with admin secret');

  const alice = await joinAs(code, 'Alice');
  const bob = await joinAs(code, 'Bob');
  const bobAuth = last(bob, 'authenticated');
  check(bobAuth?.token && bobAuth?.playerId, 'authenticated carries token and public playerId');

  // Malformed payloads must not take the server down
  alice.emit('createRoom' as never);
  await sleep(100);
  check((await fetch(`${BASE}/api/health`)).ok, 'server survives malformed payloads');

  alice.emit('createRoom', { gameType: 'blackjack' as never });
  await sleep(150);
  const roomId = last(alice, 'roomState').id as string;
  bob.emit('joinRoom', { roomId });
  await sleep(150);
  alice.emit('startGame');
  await sleep(200);
  check(last(alice, 'gameState')?.status === 'playing', 'blackjack game started');
  check(!JSON.stringify(alice.received).includes(bobAuth.token), "Bob's session token never reaches Alice");

  // Bob drops out; when the turn passes to him the game pauses, then resumes on reconnect
  bob.disconnect();
  await sleep(200);
  alice.emit('gameAction', { type: 'stand', playerId: 'ignored' });
  await sleep(200);
  check(last(alice, 'gameState')?.isPaused === true, 'game pauses when the turn reaches a disconnected player');
  const bob2 = connect({ token: bobAuth.token });
  await sleep(300);
  check(last(bob2, 'gameState')?.isPaused === false, 'reconnecting with the token resumes the game');

  bob2.emit('gameAction', { type: 'stand', playerId: 'ignored' });
  await sleep(200);
  check(last(alice, 'gameState')?.status === 'finished', 'round finishes after everyone stands');

  // Host removes Bob
  alice.emit('returnToLobby');
  await sleep(150);
  alice.emit('kickPlayer', { playerId: bobAuth.playerId });
  await sleep(150);
  check(last(bob2, 'kicked')?.roomName, 'host can remove a player');
  check(last(alice, 'roomState')?.players.length === 1, 'room no longer lists the removed player');

  // Rotating the OTP signs everyone out
  await generateOtp();
  await sleep(300);
  check(!alice.connected && last(alice, 'error')?.code === 'AUTH_ERROR', 'OTP rotation revokes sessions');
}

try {
  await main();
} catch (err) {
  failures++;
  console.error(err);
} finally {
  server.kill();
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed. Server log:\n${serverLog}`);
  process.exit(1);
}
console.log('\nSmoke test passed');
process.exit(0);
