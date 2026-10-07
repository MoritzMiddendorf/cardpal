import { createHash, timingSafeEqual } from 'node:crypto';

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/**
 * Decide whether a request may use admin endpoints.
 *
 * - If an admin secret is configured, require `Authorization: Bearer <secret>`.
 * - Otherwise, only allow requests that originate from the machine itself
 *   (the raw socket address — proxy headers are deliberately ignored).
 */
export function isAdminRequest(
  adminSecret: string | null,
  authorizationHeader: string | undefined,
  remoteAddress: string | undefined,
): boolean {
  if (adminSecret) {
    const match = /^Bearer (.+)$/.exec(authorizationHeader ?? '');
    if (!match) return false;
    // Hash both sides so the comparison is constant-time regardless of length
    return timingSafeEqual(sha256(match[1]!), sha256(adminSecret));
  }
  return remoteAddress !== undefined && LOOPBACK_ADDRESSES.has(remoteAddress);
}
