import type { ErrorCode } from '@mizan/contracts';
import { LoginSchema } from '@mizan/contracts';
import { login, type LoginFailure } from '@mizan/db';
import { fail, respond, withRoute } from '@/lib/route';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

export const runtime = 'nodejs';

const FAILURES: Record<LoginFailure, [ErrorCode, string]> = {
  // Identical for a wrong password and an unknown email: telling them apart
  // would let anyone test which addresses have accounts.
  invalid_credentials: ['UNAUTHENTICATED', 'Email or password is incorrect.'],
  rate_limited: ['RATE_LIMITED', 'Too many sign-in attempts. Wait 15 minutes and try again.'],
  account_disabled: ['INSUFFICIENT_PERMISSION', 'This account is disabled. Contact your manager.'],
};

export const POST = withRoute({ auth: 'public', body: LoginSchema }, async ({ body, meta }) => {
  const result = await login({ ...body, ...meta });

  if (!result.ok) {
    const [code, message] = FAILURES[result.reason];
    return fail(code, message);
  }

  // Role-based landing surfaces (/pos, /dashboard) arrive in M5 and M13.
  const response = respond({ redirectTo: '/' });
  response.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions(result.expiresAt));
  return response;
});
