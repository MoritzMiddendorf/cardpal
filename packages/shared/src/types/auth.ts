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
