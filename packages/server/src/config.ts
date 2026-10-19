export const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

const parsedOtpHours = parseInt(process.env['OTP_VALIDITY_HOURS'] ?? '12', 10);
export const OTP_VALIDITY_HOURS = Number.isFinite(parsedOtpHours) && parsedOtpHours > 0 ? parsedOtpHours : 12;

/**
 * Shared secret for admin endpoints (OTP generation). Required for any
 * deployment that is reachable from the internet. When unset, admin endpoints
 * only accept requests from localhost.
 */
export const ADMIN_SECRET = process.env['ADMIN_SECRET'] || null;

/** OTP validation attempts allowed per client IP per window (brute-force protection). */
export const OTP_ATTEMPTS_PER_WINDOW = 10;
export const OTP_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

/** Commit the running build was made from, reported by /api/health. Northflank injects NF_DEPLOYMENT_SHA. */
export const DEPLOYED_VERSION = process.env['GIT_SHA'] || process.env['NF_DEPLOYMENT_SHA'] || null;

/**
 * Secret path where the OTP form is shown. Never written into the client bundle; only people
 * who were told about it know it. Set it on any deployment (the default is in the public repo).
 */
export const OTP_ENTRY_PATH = normalizeEntryPath(process.env['OTP_ENTRY_PATH']);

/**
 * When false (the default) the app is private: without a valid OTP access token every page is
 * blank and no session can be created. When true, visitors without the OTP can play rooms of
 * the neutral edition. Keep it off until the legal pages (Impressum etc.) exist.
 */
export function isPublicAccess(): boolean {
  return process.env['PUBLIC_ACCESS'] === 'true';
}

export function normalizeEntryPath(value: string | undefined): string {
  const trimmed = (value ?? '').trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === '/' || trimmed.startsWith('/api') || trimmed.startsWith('/socket.io') || trimmed.startsWith('/assets')) {
    return '/table';
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
