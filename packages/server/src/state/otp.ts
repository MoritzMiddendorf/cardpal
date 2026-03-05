import { OTP_VALIDITY_HOURS } from '../config.js';

export interface OtpState {
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

let otpState: OtpState | null = null;

export function setOtp(code: string): OtpState {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_VALIDITY_HOURS * 60 * 60 * 1000);
  otpState = { code, expiresAt, createdAt: now };
  return { code: otpState.code, expiresAt: new Date(otpState.expiresAt), createdAt: new Date(otpState.createdAt) };
}

export function getOtp(): OtpState | null {
  if (!otpState) return null;
  return { code: otpState.code, expiresAt: new Date(otpState.expiresAt), createdAt: new Date(otpState.createdAt) };
}

export function isOtpValid(code: string): boolean {
  if (!otpState) return false;
  if (otpState.code !== code) return false;
  if (new Date() > otpState.expiresAt) return false;
  return true;
}

export function clearOtp(): void {
  otpState = null;
}
