const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
const url = `http://localhost:${PORT}/api/admin/generate-otp`;

try {
  const response = await fetch(url, { method: 'POST' });

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
      console.error(`Error: Server is not running on port ${PORT}. Start with \`pnpm dev\` first.`);
      process.exit(1);
    }
  }
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
