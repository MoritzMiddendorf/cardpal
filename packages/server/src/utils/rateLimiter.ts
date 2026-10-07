/**
 * Minimal fixed-window rate limiter keyed by an arbitrary string (e.g. client IP).
 * In-memory only, which is fine for a single-instance server.
 */
export function createRateLimiter(maxAttempts: number, windowMs: number, now: () => number = Date.now) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return {
    /** Records an attempt; returns false if the key has exceeded its budget for the current window. */
    attempt(key: string): boolean {
      const t = now();
      // Opportunistic cleanup so the map can't grow without bound
      if (windows.size > 1000) {
        for (const [k, w] of windows) if (w.resetAt <= t) windows.delete(k);
      }
      const entry = windows.get(key);
      if (!entry || entry.resetAt <= t) {
        windows.set(key, { count: 1, resetAt: t + windowMs });
        return true;
      }
      entry.count++;
      return entry.count <= maxAttempts;
    },
    reset(): void {
      windows.clear();
    },
  };
}
