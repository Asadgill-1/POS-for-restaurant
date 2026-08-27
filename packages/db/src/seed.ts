/**
 * Development seed (spec §75, §76).
 *
 * Creates two organisations, so cross-tenant isolation has something real to be
 * tested against; the role and permission catalogue; and one demo account per
 * role with obvious development credentials.
 *
 * RLS NOTE: every tenant table has FORCE ROW LEVEL SECURITY, and a policy with
 * only a USING clause also governs INSERT. That means nothing can create the
 * first organisation from a normal tenant context -- there is no tenant yet to
 * be inside of. The whole seed therefore runs in one transaction with
 * `app.super_admin` on. This is the same escape hatch the super-admin console
 * will use, exercised here first.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

const rootEnv = path.resolve(import.meta.dirname, '../../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const { prisma } = await import('./client.ts');
const { hashPassword } = await import('@mizan/domain');
const { ROLE_KEYS, ROLE_NAMES, ROLE_PERMISSIONS, PERMISSION_KEYS } = await import('@mizan/domain');

/** Obvious, non-production credentials. Never reused anywhere real. */
const DEMO_PASSWORD = 'demo-password-1234';

function assertNotProduction(): void {
  const url = process.env.DATABASE_URL ?? '';
  const looksLocal = /localhost|127\.0\.0\.1|host\.docker\.internal/.test(url);

  if (process.env.NODE_ENV === 'production' || (!looksLocal && !process.env.ALLOW_REMOTE_SEED)) {
    throw new Error(
      'Refusing to seed: DATABASE_URL is not local. Set ALLOW_REMOTE_SEED=1 only if you are certain.',
    );
  }
}

async function main(): Promise<void> {
  assertNotProduction();

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  // One hash reused across demo accounts: hashing is ~400ms and this is
  // throwaway development data, not a credential worth per-user salting effort.
  const pinHashes = new Map<string, string>();
  for (const pin of ['1111', '2222', '3333', '4444', '5555']) {
    pinHashes.set(pin, await hashPassword(pin));
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.super_admin', 'on', true)`;

      // ── Role and permission catalogue ────────────────────────────────────
      // Global, not tenant data: every organisation gets the same seven roles.
      for (const key of PERMISSION_KEYS) {
        await tx.permission.upsert({
          where: { key },
          update: {},
          create: { key, description: key },
        });
      }

      for (const key of ROLE_KEYS) {
        const role = await tx.role.upsert({
          where: { key },
          update: { name: ROLE_NAMES[key] },
          create: { key, name: ROLE_NAMES[key] },
        });

        // Re-derive grants from the domain catalogue every run, so editing
        // ROLE_PERMISSIONS and re-seeding actually changes the database.
        await tx.rolePermission.deleteMany({ where: { roleId: role.id } });

        const permissions = await tx.permission.findMany({
          where: { key: { in: [...ROLE_PERMISSIONS[key]] } },
          select: { id: true },
        });

        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: role.id,
            permissionId: permission.id,
          })),
          skipDuplicates: true,
        });
      }

      const roleByKey = new Map(
        (await tx.role.findMany()).map((role) => [role.key, role.id] as const),
      );

      // ── Tenant one: Dubai Food Group ─────────────────────────────────────
      const group = await tx.organization.upsert({
        where: { slug: 'dubai-food-group' },
        update: {},
        create: {
          slug: 'dubai-food-group',
          name: 'Dubai Food Group',
          trn: '100000000000003',
          status: 'ACTIVE',
          branches: {
            create: [
              {
                code: 'MAR',
                name: 'Dubai Marina',
                addressLine: 'Marina Walk, Dubai Marina, Dubai',
                phone: '+971 4 000 0001',
                // VAT-inclusive menu prices plus a 10% service charge.
                pricesInclude: ['VAT'],
                serviceChargeBps: 1000,
              },
              {
                code: 'DTN',
                name: 'Downtown Dubai',
                addressLine: 'Sheikh Mohammed bin Rashid Blvd, Downtown, Dubai',
                phone: '+971 4 000 0002',
                pricesInclude: ['VAT'],
              },
              {
                code: 'JUM',
                name: 'Jumeirah',
                addressLine: 'Jumeirah Beach Road, Dubai',
                phone: '+971 4 000 0003',
                // Net pricing, so VAT is added at the till. The other
                // configuration deliberately, so tests cover both paths.
                pricesInclude: [],
              },
            ],
          },
        },
        include: { branches: true },
      });

      const marina = group.branches.find((branch) => branch.code === 'MAR');
      if (!marina) throw new Error('seed: Marina branch missing');

      for (const branch of group.branches) {
        for (const code of ['T01', 'T02']) {
          await tx.terminal.upsert({
            where: { branchId_code: { branchId: branch.id, code } },
            update: {},
            create: {
              code,
              name: `${branch.name} — Till ${code.slice(1)}`,
              branchId: branch.id,
              organizationId: group.id,
            },
          });
        }
      }

      // ── Demo accounts, one per role (spec §76) ───────────────────────────
      const demoStaff = [
        { email: 'owner@demo.test', name: 'Aisha Al Mansoori', role: 'OWNER', pin: '1111', branch: null },
        { email: 'manager@demo.test', name: 'Rashid Khan', role: 'MANAGER', pin: '2222', branch: marina.id },
        { email: 'cashier@demo.test', name: 'Maria Santos', role: 'CASHIER', pin: '3333', branch: marina.id },
        { email: 'waiter@demo.test', name: 'Samuel Okoro', role: 'WAITER', pin: '4444', branch: marina.id },
        { email: 'kitchen@demo.test', name: 'Chen Wei', role: 'KITCHEN', pin: '5555', branch: marina.id },
      ] as const;

      for (const [index, staff] of demoStaff.entries()) {
        const user = await tx.user.upsert({
          where: { email: staff.email },
          update: {},
          create: {
            email: staff.email,
            name: staff.name,
            passwordHash,
            pinHash: pinHashes.get(staff.pin) ?? null,
            employeeCode: `E${String(index + 1).padStart(3, '0')}`,
            status: 'ACTIVE',
            organizationId: group.id,
          },
        });

        const roleId = roleByKey.get(staff.role);
        if (!roleId) throw new Error(`seed: role ${staff.role} missing`);

        // An owner gets a NULL branch, meaning every branch in the
        // organisation. Everyone else is pinned to Marina.
        const existing = await tx.userRole.findFirst({
          where: { userId: user.id, roleId, branchId: staff.branch },
        });
        if (!existing) {
          await tx.userRole.create({
            data: { userId: user.id, roleId, branchId: staff.branch },
          });
        }
      }

      // ── Tenant two: exists purely so isolation is testable (spec §94) ────
      await tx.organization.upsert({
        where: { slug: 'business-bay-eats' },
        update: {},
        create: {
          slug: 'business-bay-eats',
          name: 'Business Bay Eats',
          status: 'TRIAL',
          branches: { create: [{ code: 'BBY', name: 'Business Bay' }] },
          users: {
            create: {
              email: 'rival@demo.test',
              name: 'Omar Haddad',
              passwordHash,
              status: 'ACTIVE',
            },
          },
        },
      });
    },
    // The seed does a lot of round trips; the default 5s interactive
    // transaction timeout is not enough.
    { timeout: 120_000, maxWait: 10_000 },
  );

  // These counts must also run with RLS bypassed. organizations, branches,
  // terminals and users are all tenant tables, so from outside a tenant context
  // every one of them would report zero and the summary would be a lie.
  const { organizations, branches, terminals, users, roles, permissions } =
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.super_admin', 'on', true)`;
      return {
        organizations: await tx.organization.count(),
        branches: await tx.branch.count(),
        terminals: await tx.terminal.count(),
        users: await tx.user.count(),
        roles: await tx.role.count(),
        permissions: await tx.permission.count(),
      };
    });

  console.log(
    `Seeded: ${organizations} organizations, ${branches} branches, ${terminals} terminals, ` +
      `${users} users, ${roles} roles, ${permissions} permissions.`,
  );
  console.log('');
  console.log('Demo sign-in (development only):');
  for (const email of [
    'owner@demo.test',
    'manager@demo.test',
    'cashier@demo.test',
    'waiter@demo.test',
    'kitchen@demo.test',
  ]) {
    console.log(`  ${email.padEnd(22)} ${DEMO_PASSWORD}`);
  }
  console.log('  POS PINs: owner 1111, manager 2222, cashier 3333, waiter 4444, kitchen 5555');
}

await main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
