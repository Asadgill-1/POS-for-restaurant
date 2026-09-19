/**
 * Integration tests for authentication (spec §6, §94), against real Postgres.
 *
 * Every test names an attack or a failure it rules out. Requires a migrated,
 * seeded database (`pnpm db:local`, migrate, seed); skipped loudly if absent.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const rootEnv = path.resolve(import.meta.dirname, '../../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const { prisma } = await import('./client.ts');
const { withTenant } = await import('./tenant.ts');
const { login, logout, resolveSession, MAX_FAILURES_PER_ACCOUNT, MAX_FAILURES_PER_IP } =
  await import('./auth.ts');

const PASSWORD = 'demo-password-1234';
const TEST_IP = 'test-ip-hash';
const TEST_EMAILS = ['owner@demo.test', 'waiter@demo.test', 'cashier@demo.test', 'nobody@demo.test'];

let reachable = false;
let groupId = '';
let cashierId = '';

async function clearAttempts(): Promise<void> {
  await prisma.loginAttempt.deleteMany({
    where: { OR: [{ identifier: { in: TEST_EMAILS } }, { ipHash: TEST_IP }] },
  });
}

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    reachable = true;
  } catch {
    console.warn('\n  ⚠ auth.test.ts SKIPPED: no database at DATABASE_URL\n');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.super_admin', 'on', true)`;
    groupId = (await tx.organization.findUniqueOrThrow({ where: { slug: 'dubai-food-group' } })).id;
    cashierId = (await tx.user.findUniqueOrThrow({ where: { email: 'cashier@demo.test' } })).id;
  });
});

beforeEach(async () => {
  if (reachable) await clearAttempts();
});

afterAll(async () => {
  if (reachable) await clearAttempts();
  await prisma.$disconnect();
});

const withDb = (name: string, fn: () => Promise<void>) =>
  it(name, async () => {
    if (!reachable) return;
    await fn();
  });

describe('login', () => {
  withDb('issues a session for correct credentials', async () => {
    const result = await login({ email: 'owner@demo.test', password: PASSWORD });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  withDb('treats email case-insensitively', async () => {
    const result = await login({ email: '  OWNER@Demo.Test ', password: PASSWORD });
    expect(result.ok).toBe(true);
  });

  withDb('stores only the token hash, never the token', async () => {
    const result = await login({ email: 'owner@demo.test', password: PASSWORD });
    if (!result.ok) throw new Error('login failed');

    const leaked = await withTenant({ organizationId: groupId }, (db) =>
      db.session.count({ where: { tokenHash: result.token } }),
    );
    expect(leaked).toBe(0);
  });

  withDb('gives the same answer for a wrong password and an unknown email (no enumeration)', async () => {
    const wrongPassword = await login({ email: 'owner@demo.test', password: 'not-the-password' });
    const unknownEmail = await login({ email: 'nobody@demo.test', password: PASSWORD });

    expect(wrongPassword).toEqual({ ok: false, reason: 'invalid_credentials' });
    expect(unknownEmail).toEqual({ ok: false, reason: 'invalid_credentials' });
  });

  withDb('spends real hashing time on an unknown email (no timing enumeration)', async () => {
    // A miss that returned instantly would reveal which emails have accounts
    // just as surely as a different error message would.
    const started = performance.now();
    await login({ email: 'nobody@demo.test', password: PASSWORD });
    expect(performance.now() - started).toBeGreaterThan(150);
  });

  withDb('locks the account after too many failures, even with the right password', async () => {
    for (let i = 0; i < MAX_FAILURES_PER_ACCOUNT; i += 1) {
      await login({ email: 'waiter@demo.test', password: 'wrong-password' });
    }

    const result = await login({ email: 'waiter@demo.test', password: PASSWORD });
    expect(result).toEqual({ ok: false, reason: 'rate_limited' });
  });

  withDb('a lockout on one account does not lock out another', async () => {
    for (let i = 0; i < MAX_FAILURES_PER_ACCOUNT; i += 1) {
      await login({ email: 'waiter@demo.test', password: 'wrong-password' });
    }

    expect((await login({ email: 'cashier@demo.test', password: PASSWORD })).ok).toBe(true);
  });

  withDb('a successful login clears earlier failures', async () => {
    for (let i = 0; i < MAX_FAILURES_PER_ACCOUNT - 1; i += 1) {
      await login({ email: 'waiter@demo.test', password: 'wrong-password' });
    }
    expect((await login({ email: 'waiter@demo.test', password: PASSWORD })).ok).toBe(true);

    await login({ email: 'waiter@demo.test', password: 'wrong-password' });
    expect((await login({ email: 'waiter@demo.test', password: PASSWORD })).ok).toBe(true);
  });

  withDb('rate limits a source address spraying many accounts', async () => {
    // Password spraying: one attempt per account, many accounts, one source.
    // The per-account limit never trips; the per-address one must.
    await prisma.loginAttempt.createMany({
      data: Array.from({ length: MAX_FAILURES_PER_IP }, (_, i) => ({
        identifier: `sprayed-${i}@example.test`,
        ipHash: TEST_IP,
        succeeded: false,
      })),
    });

    const result = await login({ email: 'owner@demo.test', password: PASSWORD, ipHash: TEST_IP });
    expect(result).toEqual({ ok: false, reason: 'rate_limited' });

    await prisma.loginAttempt.deleteMany({ where: { identifier: { startsWith: 'sprayed-' } } });
  });

  withDb('refuses a suspended user even with the right password', async () => {
    await withTenant({ organizationId: groupId }, (db) =>
      db.user.update({ where: { id: cashierId }, data: { status: 'SUSPENDED' } }),
    );
    try {
      const result = await login({ email: 'cashier@demo.test', password: PASSWORD });
      expect(result).toEqual({ ok: false, reason: 'account_disabled' });
    } finally {
      await withTenant({ organizationId: groupId }, (db) =>
        db.user.update({ where: { id: cashierId }, data: { status: 'ACTIVE' } }),
      );
    }
  });

  withDb('does not leak the RLS bypass out of the lookup function', async () => {
    // auth_login_lookup lifts RLS internally. If it failed to restore the
    // setting, every later query on this connection would see every tenant.
    await login({ email: 'owner@demo.test', password: PASSWORD });
    expect(await prisma.user.count()).toBe(0);
  });
});

describe('sessions', () => {
  withDb('resolves a live session to its user and roles', async () => {
    const result = await login({ email: 'owner@demo.test', password: PASSWORD });
    if (!result.ok) throw new Error('login failed');

    const session = await resolveSession(result.token);
    expect(session?.email).toBe('owner@demo.test');
    expect(session?.organizationId).toBe(groupId);
    expect(session?.roles).toEqual([{ key: 'OWNER', branchId: null }]);
  });

  withDb('scopes branch roles to their branch', async () => {
    const result = await login({ email: 'cashier@demo.test', password: PASSWORD });
    if (!result.ok) throw new Error('login failed');

    const session = await resolveSession(result.token);
    expect(session?.roles).toHaveLength(1);
    expect(session?.roles[0]?.key).toBe('CASHIER');
    expect(session?.roles[0]?.branchId).not.toBeNull();
  });

  withDb('rejects a forged token', async () => {
    expect(await resolveSession('A'.repeat(43))).toBeNull();
    expect(await resolveSession('')).toBeNull();
    expect(await resolveSession('x'.repeat(10_000))).toBeNull();
  });

  withDb('rejects a session after logout', async () => {
    const result = await login({ email: 'owner@demo.test', password: PASSWORD });
    if (!result.ok) throw new Error('login failed');

    await logout(result.token);
    expect(await resolveSession(result.token)).toBeNull();
  });

  withDb('rejects an expired session', async () => {
    const result = await login({ email: 'owner@demo.test', password: PASSWORD });
    if (!result.ok) throw new Error('login failed');

    const session = await resolveSession(result.token);
    await withTenant({ organizationId: groupId }, (db) =>
      db.session.update({
        where: { id: session!.sessionId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      }),
    );

    expect(await resolveSession(result.token)).toBeNull();
  });

  withDb('suspending a user kills their existing session on the next request', async () => {
    const result = await login({ email: 'cashier@demo.test', password: PASSWORD });
    if (!result.ok) throw new Error('login failed');

    await withTenant({ organizationId: groupId }, (db) =>
      db.user.update({ where: { id: cashierId }, data: { status: 'SUSPENDED' } }),
    );
    try {
      expect(await resolveSession(result.token)).toBeNull();
    } finally {
      await withTenant({ organizationId: groupId }, (db) =>
        db.user.update({ where: { id: cashierId }, data: { status: 'ACTIVE' } }),
      );
    }
  });

  withDb('writes an audit trail for login and logout', async () => {
    const result = await login({ email: 'owner@demo.test', password: PASSWORD });
    if (!result.ok) throw new Error('login failed');
    await logout(result.token);

    const actions = await withTenant({ organizationId: groupId }, (db) =>
      db.auditLog.findMany({
        where: { actorUserId: result.userId },
        orderBy: { createdAt: 'desc' },
        take: 2,
        select: { action: true },
      }),
    );
    expect(actions.map((a) => a.action)).toEqual(['auth.logout', 'auth.login']);
  });
});
