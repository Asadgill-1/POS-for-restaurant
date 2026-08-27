/**
 * Tenant-scoped database access.
 *
 * Postgres row level security is the enforcement (see the RLS block in the
 * auth_rbac_audit migration). It reads the current tenant from a session
 * variable, which has to be set inside the same transaction as the query --
 * `SET LOCAL` does not survive a connection being returned to the pool, and on
 * Neon every request gets a pooled connection.
 *
 * So every tenant-scoped query runs through here:
 *
 *     const branches = await withTenant({ organizationId }, (db) =>
 *       db.branch.findMany(),
 *     );
 *
 * A callback rather than a Prisma client extension, deliberately. `$extends`
 * with `$allOperations` cannot run the wrapped query inside the transaction it
 * opens -- `query(args)` still executes on the outer client -- so the session
 * variable would be set on one connection and the query would run on another,
 * silently returning nothing. An explicit callback cannot be wrong that way.
 *
 * WARNING: `prisma` exported from ./client bypasses all of this. It exists for
 * migrations, seeding and the health check. Application code that touches
 * tenant data must use withTenant, or RLS will correctly return zero rows and
 * the bug will look like missing data rather than a missing tenant context.
 */
import type { Prisma } from './generated/client/index.js';
import { prisma } from './client.ts';

/** Postgres will reject a malformed uuid, but failing early gives a better error. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TenantContext = {
  /** The organisation every query in this transaction is confined to. */
  organizationId: string;
  /** Read by the audit trigger, so audit rows cannot be attributed by app code. */
  userId?: string | undefined;
};

export class TenantError extends Error {
  override readonly name = 'TenantError';
}

/** Transaction-scoped client. Same surface as `prisma`, minus transaction control. */
export type TenantClient = Prisma.TransactionClient;

/**
 * Run `fn` with row level security pinned to one organisation.
 *
 * Everything inside is one transaction: either all of it commits or none does,
 * which is also what the order and payment flows will need later.
 */
export async function withTenant<T>(
  ctx: TenantContext,
  fn: (db: TenantClient) => Promise<T>,
): Promise<T> {
  if (!UUID.test(ctx.organizationId)) {
    throw new TenantError('organizationId must be a uuid');
  }
  if (ctx.userId !== undefined && !UUID.test(ctx.userId)) {
    throw new TenantError('userId must be a uuid when provided');
  }

  return prisma.$transaction(async (tx) => {
    // `set_config(..., true)` is transaction-local, so it cannot leak to the
    // next request that borrows this pooled connection.
    await tx.$executeRaw`SELECT set_config('app.organization_id', ${ctx.organizationId}, true)`;

    if (ctx.userId) {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${ctx.userId}, true)`;
    }

    return fn(tx);
  });
}

/**
 * Run `fn` with RLS bypassed, for platform operations that legitimately span
 * tenants (the super admin console, cross-org health checks).
 *
 * ponytail: this is a session variable the application sets, so it is only as
 * trustworthy as the application. The stronger form is a separate database role
 * with BYPASSRLS and a connection string the request path never holds; that
 * arrives with the super-admin console in M14.
 *
 * Every call must sit behind an `org.manage`-class capability check, and the
 * caller is expected to write an audit row -- crossing tenants is exactly the
 * thing an operator needs to be able to review afterwards.
 */
export async function withSuperAdmin<T>(
  ctx: { userId: string },
  fn: (db: TenantClient) => Promise<T>,
): Promise<T> {
  if (!UUID.test(ctx.userId)) {
    throw new TenantError('userId must be a uuid');
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.super_admin', 'on', true)`;
    await tx.$executeRaw`SELECT set_config('app.user_id', ${ctx.userId}, true)`;

    return fn(tx);
  });
}
