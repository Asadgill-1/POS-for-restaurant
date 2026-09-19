/**
 * The single wrapper every API route goes through (plan §8).
 *
 * Authentication is ON BY DEFAULT. A route is public only if it says
 * `auth: 'public'` -- so forgetting an option can never silently publish an
 * endpoint. Capability checks run server-side here; hiding a button in the UI
 * is cosmetic (spec §49).
 *
 * Added when a route first needs them, not before: idempotency keys (M6
 * payments), tenant transactions wrapping the handler, outbox events (M7).
 */
import {
  err,
  HTTP_STATUS,
  ok,
  type ApiError,
  type ErrorCode,
} from '@mizan/contracts';
import type { SessionUser } from '@mizan/db';
import { rolesHavePermission, type PermissionKey } from '@mizan/domain';
import { NextResponse, type NextRequest } from 'next/server';
import type { z } from 'zod';
import { getSession, requestMeta } from './session';

type Auth = 'public' | 'session';

type RouteContext<Body, User> = {
  request: NextRequest;
  body: Body;
  session: User;
  meta: ReturnType<typeof requestMeta>;
};

export function respond<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(ok(data), init);
}

export function fail(
  code: ErrorCode,
  message: string,
  extra: Omit<ApiError, 'code' | 'message'> = {},
): NextResponse {
  return NextResponse.json(err(code, message, extra), { status: HTTP_STATUS[code] });
}

/**
 * ponytail: organisation-wide check -- a branch-scoped role passes for every
 * branch. Branch-level enforcement lands with the first branch-scoped resource
 * (M2), where the branch being acted on is actually known.
 */
export function can(session: SessionUser, permission: PermissionKey): boolean {
  return (
    session.isSuperAdmin ||
    rolesHavePermission(
      session.roles.map((role) => role.key),
      permission,
    )
  );
}

/**
 * Cross-site request forgery guard for state-changing requests.
 *
 * SameSite=Lax already stops the session cookie riding along on a cross-site
 * POST; this is the second lock. Browsers always send Origin on POST/PATCH/
 * DELETE; a request without one is not from a browser page, so it cannot be a
 * CSRF attack and is allowed through.
 */
function crossSite(request: NextRequest): boolean {
  if (request.method === 'GET' || request.method === 'HEAD') return false;
  const origin = request.headers.get('origin');
  if (!origin) return false;

  try {
    return new URL(origin).host !== request.headers.get('host');
  } catch {
    return true;
  }
}

export function withRoute<Body = undefined, A extends Auth = 'session'>(
  options: {
    auth?: A;
    body?: z.ZodType<Body, z.ZodTypeDef, unknown>;
    capability?: PermissionKey;
  },
  handler: (
    ctx: RouteContext<Body, A extends 'public' ? SessionUser | null : SessionUser>,
  ) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      if (crossSite(request)) {
        return fail('INSUFFICIENT_PERMISSION', 'This request was blocked for your security.');
      }

      const session = await getSession();
      const isPublic = options.auth === 'public';

      if (!isPublic && !session) {
        return fail('UNAUTHENTICATED', 'Your session has ended. Please sign in again.');
      }
      if (options.capability && (!session || !can(session, options.capability))) {
        return fail('INSUFFICIENT_PERMISSION', 'You do not have permission to do that.');
      }

      let body = undefined as Body;
      if (options.body) {
        const parsed = options.body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return fail('VALIDATION_FAILED', 'Check the highlighted fields.', {
            fields: parsed.error.flatten().fieldErrors as Record<string, string[]>,
          });
        }
        body = parsed.data;
      }

      return await handler({
        request,
        body,
        session: session as A extends 'public' ? SessionUser | null : SessionUser,
        meta: requestMeta(request),
      });
    } catch (cause) {
      // The user sees a correlation id; the log line carrying the same id has
      // the detail. Raw errors never reach the client (spec §58).
      const correlationId = crypto.randomUUID();
      console.error(`[api] ${request.method} ${request.nextUrl.pathname} ${correlationId}`, cause);
      return fail('INTERNAL_ERROR', 'Something went wrong. Please try again.', { correlationId });
    }
  };
}
