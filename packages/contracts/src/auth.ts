import { z } from 'zod';

/** Shared by the login form and the login route — one definition, no drift. */
export const LoginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/** POS terminals unlock with a short PIN on an already-enrolled device (M1). */
export const PinUnlockSchema = z.object({
  employeeId: z.string().uuid(),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits'),
});

export type PinUnlockInput = z.infer<typeof PinUnlockSchema>;
