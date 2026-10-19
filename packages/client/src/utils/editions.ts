import { GameType } from '@cardpal/shared';
import type { Edition } from '@cardpal/shared';

/**
 * Game names and card designs per edition (decision log D13). `original` is only ever used for
 * sessions the server verified as OTP users; anything unknown falls back to `neutral`, so a
 * trademarked name is never shown by mistake.
 */

const GAME_NAMES: Record<Edition, Record<GameType, string>> = {
  original: {
    [GameType.BLACKJACK]: 'Blackjack',
    [GameType.SKIPBO]: 'Skip-Bo',
  },
  neutral: {
    [GameType.BLACKJACK]: 'Blackjack',
    [GameType.SKIPBO]: 'Twelve Up',
  },
};

const GAME_TAGLINES: Record<GameType, string> = {
  [GameType.BLACKJACK]: '2–4 players · beat the dealer to 21',
  [GameType.SKIPBO]: '2–6 players · empty your stock pile first',
};

export function gameName(gameType: GameType, edition: Edition | null): string {
  return GAME_NAMES[edition ?? 'neutral'][gameType];
}

export function gameTagline(gameType: GameType): string {
  return GAME_TAGLINES[gameType];
}

/** Face of a Skip-Bo wild card: the original two-line label, or a star in the neutral design. */
export function wildCardLabel(edition: Edition | null): string[] {
  return edition === 'original' ? ['SKIP', 'BO'] : ['★'];
}
