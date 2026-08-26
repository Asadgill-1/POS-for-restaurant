/**
 * The one response shape every API route returns.
 *
 * `message` is safe to render straight to a cashier. The underlying Prisma /
 * stack detail never crosses this boundary — it goes to structured logs keyed
 * by `correlationId` (spec §58).
 */

/** Closed set. Adding a code is a deliberate act, not a typo. */
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'INSUFFICIENT_PERMISSION',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'PAYMENT_EXCEEDS_TOTAL',
  'ORDER_NOT_MODIFIABLE',
  'SHIFT_ALREADY_OPEN',
  'OFFLINE_ACTION_BLOCKED',
  'NOT_IMPLEMENTED',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ApiError = {
  code: ErrorCode;
  /** User-facing. Never contains a stack trace, SQL, or an internal identifier. */
  message: string;
  /** Field-level validation detail, keyed by form field path. */
  fields?: Record<string, string[]>;
  /** Ties a user-visible failure to the server log that explains it. */
  correlationId?: string;
};

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export const HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 422,
  UNAUTHENTICATED: 401,
  INSUFFICIENT_PERMISSION: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PAYMENT_EXCEEDS_TOTAL: 422,
  ORDER_NOT_MODIFIABLE: 409,
  SHIFT_ALREADY_OPEN: 409,
  OFFLINE_ACTION_BLOCKED: 503,
  NOT_IMPLEMENTED: 501,
  INTERNAL_ERROR: 500,
};

export function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

export function err(code: ErrorCode, message: string, extra: Omit<ApiError, 'code' | 'message'> = {}): ApiResponse<never> {
  return { ok: false, error: { code, message, ...extra } };
}
