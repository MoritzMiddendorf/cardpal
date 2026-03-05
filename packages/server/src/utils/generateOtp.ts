import { randomBytes } from 'node:crypto';

const OTP_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const OTP_LENGTH = 6;

export function generateOtpCode(): string {
  const bytes = randomBytes(OTP_LENGTH);
  const chars: string[] = [];

  for (let i = 0; i < OTP_LENGTH; i++) {
    chars.push(OTP_ALPHABET[bytes[i]! & 0x1f]!);
  }

  return `${chars.slice(0, 3).join('')}-${chars.slice(3).join('')}`;
}
