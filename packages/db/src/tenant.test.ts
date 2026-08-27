/**
 * Integration tests for tenant isolation (spec §4, §94).
 *
 * These run against a real Postgres, because the thing under test IS Postgres:
 * row level security, the audit-log triggers, and the partial unique indexes.
 * Asserting them against a mock would prove nothing.
 *
 * Requires a migrated, seeded database at DATABASE_URL. Skipped if unreachable
 * so `pnpm test` still passes on a machine without one -- but the skip is loud,
 * because a silently-skipped isolation suite is worse than no suite.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const rootEnv = path.resolve(import.meta.dirname, '../../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const { prisma } = await import('./client.ts');
const { withTenant, withSuperAdmin, TenantError } = await import('./tenant.ts');

let reachable = false;
let groupId = '';
let rivalId = '';
let ownerId = '';

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    reachable = true;
  } catch {
    console.warn('\n  ⚠ tenant.test.ts SKIPPED: no database at DATABASE_URL\n');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.super_admin', 'on', true)`;
    const group = await tx.organization.findUniqueOrThrow({ where: { slug: 'dubai-food-group' } });
    const rival = await tx.organization.findUniqueOrThrow({ where: { slug: 'business-bay-eats' } });
    const owner = await tx.user.findUniqueOrThrow({ where: { email: 'owner@demo.test' } });
    groupId = group.id;
    rivalId = rival.id;
    ownerId = owner.id;
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const withDb = (name: string, fn: () => Promise<void>) =>
  it(name, async () => {
    if (!reachable) return;
    await fn();
  });

describe('the connected role', () => {
  // This suite exists because of a real failure. The first run of these tests
  // showed complete tenant leakage while pg_class reported rowsecurity=t,
  // forcerowsecurity=t and every policy present. Nothing was wrong with the
  // schema: the connection was a SUPERUSER, and Postgres exempts superusers
  // from RLS unconditionally -- FORCE does not apply to them.
  //
  // The same is true of BYPASSRLS. So isolation depends on a property of the
  // ROLE, not just the schema, and that property has to be asserted or the
  // whole RLS suite can pass while protecting nothing.
  withDb('must not be able to bypass row level security', async () => {
    const [role] = await prisma.$queryRaw<
      { rolname: string; rolsuper: boolean; rolbypassrls: boolean }[]
    >`SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;

    expect(role, 'current_user not found in pg_roles').toBeDefined();
    expect(role?.rolsuper, `${role?.rolname} is a SUPERUSER: RLS is silently disabled`).toBe(false);
    expect(role?.rolbypassrls, `${role?.rolname} has BYPASSRLS: RLS is silently disabled`).toBe(
      false,
    );
  });

  withDb('must not own the tenant tables', async () => {
    // An owner bypasses RLS unless FORCE is set. FORCE is set here, so this is
    // defence in depth rather than a live hole -- but an owning application
    // role is one forgotten FORCE away from a breach.
    const [owned] = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM pg_tables
      WHERE schemaname = 'public' AND tableowner = current_user
    `;

    expect(Number(owned?.count ?? 0)).toBe(0);
  });
});

describe('row level security', () => {
  withDb('returns nothing at all without a tenant context', async () => {
    // The bare client sets no session variable, so every policy predicate is
    // false. This is the failure mode developers must recognise: not an error,
    // just an empty result.
    expect(await prisma.branch.count()).toBe(0);
    expect(await prisma.organization.count()).toBe(0);
    expect(await prisma.user.count()).toBe(0);
  });

  withDb('scopes reads to the current organisation', async () => {
    const branches = await withTenant({ organizationId: groupId }, (db) =>
      db.branch.findMany({ select: { code: true } }),
    );

    expect(branches.map((b) => b.code).sort()).toEqual(['DTN', 'JUM', 'MAR']);
  });

  withDb('the other tenant sees only its own branch', async () => {
    const branches = await withTenant({ organizationId: rivalId }, (db) =>
      db.branch.findMany({ select: { code: true } }),
    );

    expect(branches.map((b) => b.code)).toEqual(['BBY']);
  });

  withDb('cannot read another tenant by guessing its id — the core attack', async () => {
    // A valid session for org A, asking for a resource id belonging to org B.
    // This is exactly what a broken authorisation check would allow.
    const stolen = await withTenant({ organizationId: rivalId }, (db) =>
      db.organization.findUnique({ where: { id: groupId } }),
    );

    expect(stolen).toBeNull();
  });

  withDb('cannot read another tenant\'s users', async () => {
    const users = await withTenant({ organizationId: rivalId }, (db) =>
      db.user.findMany({ where: { email: 'owner@demo.test' } }),
    );

    expect(users).toEqual([]);
  });

  withDb('cannot write into another tenant', async () => {
    await expect(
      withTenant({ organizationId: rivalId }, (db) =>
        db.branch.create({
          data: { organizationId: groupId, code: 'HACK', name: 'Injected' },
        }),
      ),
    ).rejects.toThrow();
  });

  withDb('cannot update another tenant\'s row', async () => {
    const updated = await withTenant({ organizationId: rivalId }, (db) =>
      db.branch.updateMany({ where: { code: 'MAR' }, data: { name: 'Renamed by rival' } }),
    );

    expect(updated.count).toBe(0);
  });

  withDb('super admin crosses tenants deliberately', async () => {
    const organizations = await withSuperAdmin({ userId: ownerId }, (db) =>
      db.organization.findMany({ select: { slug: true } }),
    );

    expect(organizations.map((o) => o.slug).sort()).toEqual([
      'business-bay-eats',
      'dubai-food-group',
    ]);
  });

  withDb('the tenant variable does not leak to the next transaction', async () => {
    // set_config(..., true) is transaction-local. If it were session-level, a
    // pooled connection would carry one request's tenant into the next one --
    // the worst possible bug in a multi-tenant system.
    await withTenant({ organizationId: groupId }, (db) => db.branch.findMany());

    expect(await prisma.branch.count()).toBe(0);
  });

  it('rejects a non-uuid organisation id before touching the database', async () => {
    await expect(
      withTenant({ organizationId: "' OR 1=1 --" }, async () => undefined),
    ).rejects.toThrow(TenantError);
  });
});

describe('audit log immutability (spec §48)', () => {
  withDb('accepts inserts', async () => {
    await withTenant({ organizationId: groupId, userId: ownerId }, async (db) => {
      // Tables are snake_case (@@map) but columns are camelCase -- Prisma only
      // maps table names by default -- so raw SQL has to quote them.
      await db.$executeRaw`
        INSERT INTO audit_logs (id, "organizationId", "actorUserId", action, "entityType", "entityId")
        VALUES (gen_random_uuid(), ${groupId}::uuid, ${ownerId}::uuid, 'test.write', 'test', ${ownerId})
      `;
    });

    const count = await withTenant({ organizationId: groupId }, (db) =>
      db.auditLog.count({ where: { action: 'test.write' } }),
    );
    expect(count).toBeGreaterThan(0);
  });

  withDb('refuses updates', async () => {
    await expect(
      withSuperAdmin({ userId: ownerId }, (db) =>
        db.$executeRaw`UPDATE audit_logs SET action = 'tampered' WHERE action = 'test.write'`,
      ),
    ).rejects.toThrow();
  });

  withDb('refuses deletes', async () => {
    await expect(
      withSuperAdmin({ userId: ownerId }, (db) =>
        db.$executeRaw`DELETE FROM audit_logs WHERE action = 'test.write'`,
      ),
    ).rejects.toThrow();
  });
});
