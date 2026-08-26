import { err, LoginSchema, type ApiResponse } from '@mizan/contracts';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * TODO(M1): real authentication.
 *
 * Not implemented yet, and deliberately not faked (spec §98). M1 adds:
 *   - Argon2id verification against `users.password_hash`
 *   - rate limiting (5 attempts / 15 min, per identity and per IP) + lockout
 *   - an HttpOnly, Secure, SameSite=Lax session cookie
 *   - an `audit_logs` row for both success and failure
 *
 * Until then this route validates its input and returns an honest 501 rather
 * than pretending a session exists.
 */
export async function POST(request: Request): Promise<NextResponse<ApiResponse<never>>> {
  const parsed = LoginSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      err('VALIDATION_FAILED', 'Check the highlighted fields.', {
        fields: parsed.error.flatten().fieldErrors,
      }),
      { status: 422 },
    );
  }

  return NextResponse.json(
    err('NOT_IMPLEMENTED', 'Sign-in is not available yet — authentication ships in the next milestone.'),
    { status: 501 },
  );
}
