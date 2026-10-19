import { OTP_ENTRY_PATH } from '../config.js';
import { getAccessEdition } from './access.js';

/**
 * What a page request gets:
 * - `entry`: the app in OTP-entry mode (only at the secret entry path),
 * - `app`: the app (the visitor has OTP access, or the app is public),
 * - `toApp`: redirect to `/` (entry path visited by someone who already has OTP access),
 * - `blank`: an empty page. The private app must not reveal itself to strangers.
 */
export type PageKind = 'entry' | 'app' | 'toApp' | 'blank';

export function choosePage(path: string, cookieHeader: string | undefined): PageKind {
  const edition = getAccessEdition(cookieHeader);
  if (isEntryPath(path)) return edition === 'original' ? 'toApp' : 'entry';
  return edition ? 'app' : 'blank';
}

export function isEntryPath(path: string): boolean {
  return path === OTP_ENTRY_PATH || path === `${OTP_ENTRY_PATH}/`;
}

export const BLANK_PAGE = '<!doctype html><html><head><meta charset="utf-8"><title></title></head><body></body></html>';

/** Marks the served index.html as the OTP entry page. The entry path itself never reaches the client bundle. */
export function toEntryHtml(indexHtml: string): string {
  return indexHtml.replace('<head>', '<head><meta name="cardpal-entry" content="otp">');
}
