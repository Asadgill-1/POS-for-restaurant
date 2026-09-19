/**
 * Authentication: password login, session resolution, logout.
 *
 * Deliberately free of Next.js imports -- the HTTP layer (cookies, headers,
 * status codes) lives in apps/web. What remains here is every decision that
 * matters for security, which keeps it testable against a real database.
 *
 * Sessions are opaque 256-bit tokens. The cookie holds the token; the database
 * holds only its SHA-256, so a leaked database yields no usable session.
 */
import {
  generateToken,
  hashPassword,
  hashToken,
  ROLE_KEYS,
  verifyPassword,
  type RoleKey,
} from '@mizan/domain';
import { prisma } from './client.ts';
import { withSuperAdmin, withTenant, type TenantClient } from './tenant.ts';

/**
 * ponytail: fixed 12h expiry, no sliding renewal. Sliding would mean a write on
 * every authenticated request. Revisit if staff complain about mid-shift
 * sign-outs -- POS terminals get their own device + PIN flow anyway.
 */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** Spec §6: 5 failed attempts per account per 15 minutes, then locked. */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_ACCOUNT = 5;
/**
 * Per source address. Much higher than per account because a restaurant's
 * whole staff sits behind one NAT address: 5 would let one forgetful waiter
 * lock out the entire branch.
 */
export const MAX_FAILURES_PER_IP = 30;

const USABLE_ORG_STATUSES = new Set(['TRIAL', 'ACTIVE']);
const MAX_USER_AGENT = 512;

export type LoginFailure = 'invalid_credentials' | 'rate_limited' | 'account_disabled';

export type LoginResult =
  | { ok: true; token: string; expiresAt: Date; userId: string }
  | { ok: false; reason: LoginFailure };

export type SessionRole = { key: RoleKey; branchId: string | null };

export type SessionUser = {
  sessionId: string;
  userId: string;
  /** Null only for platform super admins. */
  organizationId: string | null;
  isSuperAdmin: boolean;
  name: string;
  email: string;
  roles: SessionRole[];
};

type RequestMeta = { ipHash?: string | undefined; userAgent?: string | undefined };

type LoginRow = {
  user_id: string;
  organization_id: string | null;
  password_hash: string;
  user_status: string;
  is_super_admin: boolean;
  organization_status: string | null;
};

type SessionRow = {
  session_id: string;
  user_id: string;
  organization_id: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  user_status: string;
  is_super_admin: boolean;
  user_name: string;
  user_email: string;
  organization_status: string | null;
};

/**
 * Hash compared against when the email matches no account, so a miss costs the
 * same ~400ms of scrypt as a wrong password. Without it, response time alone
 * would reveal which emails have accounts.
 */
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword('no-such-account-timing-equaliser'));

/** Run `fn` inside the user's own tenant, or as super admin for platform users. */
function asUser<T>(
  user: { userId: string; organizationId: string | null },
  fn: (db: TenantClient) => Promise<T>,
): Promise<T> {
  return user.organizationId
    ? withTenant({ organizationId: user.organizationId, userId: user.userId }, fn)
    : withSuperAdmin({ userId: user.userId }, fn);
}

/**
 * Failures since the later of: the start of the window, or the last success.
 * A successful login clears the slate, so a user who fumbles four times and
 * then gets in is not one typo away from a lockout for the rest of the window.
 */
async function recentFailures(where: { identifier: string } | { ipHash: string }): Promise<number> {
  const windowStart = new Date(Date.now() - LOGIN_WINDOW_MS);
  const lastSuccess = await prisma.loginAttempt.findFirst({
    where: { ...where, succeeded: true, createdAt: { gte: windowStart } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  return prisma.loginAttempt.count({
    where: { ...where, succeeded: false, createdAt: { gt: lastSuccess?.createdAt ?? windowStart } },
  });
}

export async function login(
  input: { email: string; password: string } & RequestMeta,
): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  const ipHash = input.ipHash ?? null;
  const userAgent = input.userAgent?.slice(0, MAX_USER_AGENT) ?? null;

  // Checked before the password is hashed: a locked-out attacker must not be
  // able to make the server burn 400ms of CPU and 64MB of memory per request.
  if ((await recentFailures({ identifier: email })) >= MAX_FAILURES_PER_ACCOUNT) {
    return { ok: false, reason: 'rate_limited' };
  }
  if (ipHash && (await recentFailures({ ipHash })) >= MAX_FAILURES_PER_IP) {
    return { ok: false, reason: 'rate_limited' };
  }

  const [row] = await prisma.$queryRaw<LoginRow[]>`SELECT * FROM auth_login_lookup(${email})`;
  const passwordOk = await verifyPassword(input.password, row?.password_hash ?? (await getDummyHash()));
  const credentialsValid = row !== undefined && passwordOk;

  await prisma.loginAttempt.create({
    data: { identifier: email, ipHash, succeeded: credentialsValid },
  });

  if (!row || !passwordOk) {
    // Unknown emails have no tenant to audit into; login_attempts records them.
    if (row) {
      await audit(row, 'auth.login_failed', { ipHash, userAgent });
    }
    // Same answer whether the email exists or not (no account enumeration).
    return { ok: false, reason: 'invalid_credentials' };
  }

  const user = { userId: row.user_id, organizationId: row.organization_id };
  const orphaned = row.organization_id === null && !row.is_super_admin;
  const orgUnusable =
    row.organization_id !== null && !USABLE_ORG_STATUSES.has(row.organization_status ?? '');

  if (row.user_status !== 'ACTIVE' || orphaned || orgUnusable) {
    await audit(row, 'auth.login_blocked', { ipHash, userAgent });
    return { ok: false, reason: 'account_disabled' };
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await asUser(user, async (db) => {
    await db.session.create({
      data: { userId: row.user_id, tokenHash: hashToken(token), expiresAt, ipHash, userAgent },
    });
    await db.user.update({ where: { id: row.user_id }, data: { lastLoginAt: new Date() } });
    await db.auditLog.create({
      data: {
        organizationId: row.organization_id,
        actorUserId: row.user_id,
        action: 'auth.login',
        entityType: 'user',
        entityId: row.user_id,
        ipHash,
        userAgent,
      },
    });
  });

  return { ok: true, token, expiresAt, userId: row.user_id };
}

async function audit(
  row: { user_id: string; organization_id: string | null },
  action: string,
  meta: { ipHash: string | null; userAgent: string | null },
): Promise<void> {
  await asUser({ userId: row.user_id, organizationId: row.organization_id }, (db) =>
    db.auditLog.create({
      data: {
        organizationId: row.organization_id,
        actorUserId: row.user_id,
        action,
        entityType: 'user',
        entityId: row.user_id,
        ipHash: meta.ipHash,
        userAgent: meta.userAgent,
      },
    }),
  );
}

async function lookupSession(token: string): Promise<SessionRow | null> {
  // A real token is 43 characters. Anything wildly longer is garbage or an
  // attempt to make us hash something large on every request.
  if (!token || token.length > 256) return null;

  const [row] = await prisma.$queryRaw<
    SessionRow[]
  >`SELECT * FROM auth_session_lookup(${hashToken(token)})`;

  if (!row) return null;
  if (row.revoked_at !== null || row.expires_at.getTime() <= Date.now()) return null;
  if (row.user_status !== 'ACTIVE') return null;
  if (row.organization_id === null && !row.is_super_admin) return null;
  if (row.organization_id !== null && !USABLE_ORG_STATUSES.has(row.organization_status ?? '')) {
    return null;
  }

  return row;
}

/**
 * The signed-in user for a session token, or null.
 *
 * Re-checks user and organisation status on every call, so suspending a user or
 * an organisation takes effect on their very next request rather than when
 * their session happens to expire.
 */
export async function resolveSession(token: string): Promise<SessionUser | null> {
  const row = await lookupSession(token);
  if (!row) return null;

  const roles = row.organization_id
    ? await withTenant({ organizationId: row.organization_id, userId: row.user_id }, (db) =>
        db.userRole.findMany({
          where: { userId: row.user_id },
          select: { branchId: true, role: { select: { key: true } } },
        }),
      )
    : [];

  return {
    sessionId: row.session_id,
    userId: row.user_id,
    organizationId: row.organization_id,
    isSuperAdmin: row.is_super_admin,
    name: row.user_name,
    email: row.user_email,
    roles: roles.flatMap(({ branchId, role }) =>
      // A role key in the database that the code does not know grants nothing.
      (ROLE_KEYS as readonly string[]).includes(role.key)
        ? [{ key: role.key as RoleKey, branchId }]
        : [],
    ),
  };
}

/** Revoke the session behind `token`. A no-op for an unknown or dead token. */
export async function logout(token: string, meta: RequestMeta = {}): Promise<void> {
  const row = await lookupSession(token);
  if (!row) return;

  await asUser({ userId: row.user_id, organizationId: row.organization_id }, async (db) => {
    await db.session.update({ where: { id: row.session_id }, data: { revokedAt: new Date() } });
    await db.auditLog.create({
      data: {
        organizationId: row.organization_id,
        actorUserId: row.user_id,
        action: 'auth.logout',
        entityType: 'session',
        entityId: row.session_id,
        ipHash: meta.ipHash ?? null,
        userAgent: meta.userAgent?.slice(0, MAX_USER_AGENT) ?? null,
      },
    });
  });
}
