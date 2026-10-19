import { OTP_VALIDITY_HOURS } from '../config.js';

export interface OtpState {
  /** Random id of this OTP generation. Access tokens are bound to it, so rotating the OTP invalidates them. */
  id: string;
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

let otpState: OtpState | null = null;

export function setOtp(code: string): OtpState {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_VALIDITY_HOURS * 60 * 60 * 1000);
  otpState = { id: crypto.randomUUID(), code, expiresAt, createdAt: now };
  return { id: otpState.id, code: otpState.code, expiresAt: new Date(otpState.expiresAt), createdAt: new Date(otpState.createdAt) };
}

export function getOtp(): OtpState | null {
  if (!otpState) return null;
  return { id: otpState.id, code: otpState.code, expiresAt: new Date(otpState.expiresAt), createdAt: new Date(otpState.createdAt) };
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
