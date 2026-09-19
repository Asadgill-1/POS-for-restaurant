import { resolveSession, type SessionUser } from '@mizan/db';
import { hashIp } from '@mizan/domain';
import { cookies } from 'next/headers';

const production = process.env.NODE_ENV === 'production';

/**
 * `__Host-` in production: the browser then refuses the cookie unless it is
 * Secure, Path=/ and has no Domain, so a sibling subdomain can never set or
 * overwrite it. Dropped in development only because plain-http localhost
 * cannot satisfy it in every browser.
 */
export const SESSION_COOKIE = production ? '__Host-mizan_session' : 'mizan_session';

export const sessionCookieOptions = (expires: Date) =>
  ({
    httpOnly: true,
    secure: production,
    sameSite: 'lax',
    path: '/',
    expires,
  }) as const;

/** The signed-in user for the current request, from a server component or route. */
export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? resolveSession(token) : null;
}

/**
 * Pseudonymised client address and user agent, for rate limiting and audit.
 *
 * Vercel sets x-forwarded-for at its edge. Locally there is no proxy, so every
 * request shares one bucket -- fine for development.
 */
export function requestMeta(request: Request): { ipHash: string; userAgent: string | undefined } {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';

  return {
    ipHash: hashIp(ip, secret),
    userAgent: request.headers.get('user-agent') ?? undefined,
  };
}
