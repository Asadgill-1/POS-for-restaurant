/**
 * Development seed (spec §75).
 *
 * M0 seeds the tenancy spine only: two organizations (so multi-tenant isolation
 * has something real to be tested against) with branches and terminals.
 * Staff accounts arrive in M1 with Argon2id hashing — this script deliberately
 * does not invent a password hash it cannot generate securely.
 * Menu, tables, inventory and backdated orders arrive in M4/M5/M11.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

const rootEnv = path.resolve(import.meta.dirname, '../../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const { prisma } = await import('./client.ts');

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

  const dubaiFoodGroup = await prisma.organization.upsert({
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
            // Marina runs VAT-inclusive menu prices and a 10% service charge.
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
            // Jumeirah prices net, so VAT is added at the till — the other
            // configuration, deliberately, so tests cover both paths.
            pricesInclude: [],
          },
        ],
      },
    },
    include: { branches: true },
  });

  // A second tenant exists purely so cross-tenant isolation is testable (spec §94).
  await prisma.organization.upsert({
    where: { slug: 'business-bay-eats' },
    update: {},
    create: {
      slug: 'business-bay-eats',
      name: 'Business Bay Eats',
      status: 'TRIAL',
      branches: { create: [{ code: 'BBY', name: 'Business Bay' }] },
    },
  });

  for (const branch of dubaiFoodGroup.branches) {
    for (const code of ['T01', 'T02']) {
      await prisma.terminal.upsert({
        where: { branchId_code: { branchId: branch.id, code } },
        update: {},
        create: {
          code,
          name: `${branch.name} — Till ${code.slice(1)}`,
          branchId: branch.id,
          organizationId: dubaiFoodGroup.id,
        },
      });
    }
  }

  const [organizations, branches, terminals] = await Promise.all([
    prisma.organization.count(),
    prisma.branch.count(),
    prisma.terminal.count(),
  ]);

  console.log(`Seeded ${organizations} organizations, ${branches} branches, ${terminals} terminals.`);
  console.log('Staff accounts are seeded in M1, once Argon2id password hashing exists.');
}

await main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
