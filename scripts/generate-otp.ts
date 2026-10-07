// Generate a fresh OTP on a running cardpal server.
//
//   pnpm generate-otp                          # local dev server on PORT (default 3001)
//   CARDPAL_URL=https://cardpal.example.com ADMIN_SECRET=... pnpm generate-otp
//
// Generating a new OTP invalidates the previous one and signs everybody out.

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
const baseUrl = (process.env['CARDPAL_URL'] ?? `http://localhost:${PORT}`).replace(/\/+$/, '');
const adminSecret = process.env['ADMIN_SECRET'];
const url = `${baseUrl}/api/admin/generate-otp`;

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: adminSecret ? { Authorization: `Bearer ${adminSecret}` } : {},
  });

  if (response.status === 401) {
    console.error('Error: Not authorized. Set ADMIN_SECRET to the value configured on the server.');
    process.exit(1);
  }

  if (!response.ok) {
    const body = await response.text();
    console.error(`Error: Server returned ${response.status} — ${body}`);
    process.exit(1);
  }

  const data = (await response.json()) as { code: string; expiresAt: string };

  console.log();
  console.log('OTP generated successfully!');
  console.log();
  console.log(`  Code: ${data.code}`);
  console.log(`  Expires: ${data.expiresAt}`);
  console.log();
  console.log('Share this code with your friends to grant access.');
  console.log();
} catch (error: unknown) {
  if (error instanceof TypeError && (error as NodeJS.ErrnoException).cause) {
    const cause = (error as NodeJS.ErrnoException).cause as NodeJS.ErrnoException;
    if (cause.code === 'ECONNREFUSED') {
      console.error(`Error: No server reachable at ${baseUrl}. Start one with \`pnpm dev\` or set CARDPAL_URL.`);
      process.exit(1);
    }
  }
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
