import type { Edition } from '@cardpal/shared';

/**
 * True when the server served this page as the OTP entry page. The server marks it with a meta
 * tag, so the secret entry path never appears in the bundle. In dev (Vite serves index.html) the
 * default path counts too; that branch is removed from production builds.
 */
export function isEntryPage(): boolean {
  if (document.querySelector('meta[name="cardpal-entry"]')) return true;
  return import.meta.env.DEV && window.location.pathname.replace(/\/+$/, '') === '/table';
}

/** The edition the server grants this browser right now (null: no access). */
export async function fetchAccess(): Promise<Edition | null> {
  try {
    const res = await fetch('/api/access', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const { edition } = (await res.json()) as { edition: Edition | null };
    return edition === 'original' || edition === 'neutral' ? edition : null;
  } catch {
    return null;
  }
}

/** After a successful OTP entry the address bar shows the main page, not the entry path. */
export function leaveEntryPath(): void {
  if (window.location.pathname !== '/') window.history.replaceState(null, '', '/');
}
