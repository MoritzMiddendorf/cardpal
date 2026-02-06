import { z } from 'zod';

export const otpValidationRequestSchema = z.object({
  code: z.string().min(1),
});

export const otpValidationResponseSchema = z.object({
  token: z.string().uuid(),
  username: z.string().min(1).max(15),
});

export const usernameRequestSchema = z.object({
  username: z
    .string()
    .min(1)
    .max(15)
    .regex(/^[a-zA-Z0-9]+$/, 'Letters and numbers only'),
});

export const sessionTokenSchema = z.string().uuid();
