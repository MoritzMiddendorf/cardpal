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
