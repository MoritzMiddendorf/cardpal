export type SessionToken = string;

export interface OtpValidationRequest {
  code: string;
}

export interface OtpValidationResponse {
  token: string;
  username: string;
}

export interface UsernameRequest {
  username: string;
}

/**
 * Which naming and card designs a session sees. `original` is for players who entered the OTP
 * (trademarked names such as Skip-Bo); `neutral` is for everyone else. Enforced on the server: rooms
 * are only visible to sessions of the same edition. Never shown in the UI.
 */
export type Edition = 'original' | 'neutral';
