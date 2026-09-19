import { logout } from '@mizan/db';
import { respond, withRoute } from '@/lib/route';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

export const runtime = 'nodejs';

// Public so that signing out always works, even with an already-dead session.
export const POST = withRoute({ auth: 'public' }, async ({ request, meta }) => {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await logout(token, meta);

  const response = respond({ redirectTo: '/login' });
  // Same attributes as when it was set, or a __Host- cookie will not clear.
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(new Date(0)));
  return response;
});
