/**
 * Build preflight.
 *
 * The Vercel build runs `prisma migrate deploy`, which needs a reachable
 * database. Without DATABASE_URL, Prisma fails with a stack trace that does not
 * say what to actually do about it. This turns that into one clear sentence.
 *
 * Runs before anything else in the build. Exits non-zero on a missing
 * hard requirement so the deploy fails loudly and legibly.
 */

const REQUIRED = [
  {
    key: 'DATABASE_URL',
    why: 'Prisma runs `migrate deploy` during the build.',
    fix: 'In Vercel: Storage -> Neon (region aws-eu-central-1). It injects this automatically.',
  },
];

const RECOMMENDED = [
  {
    key: 'DATABASE_URL_UNPOOLED',
    why: 'Migrations need a direct, unpooled connection.',
    fix: 'Neon injects this alongside DATABASE_URL. Falls back to DATABASE_URL if absent.',
  },
  {
    key: 'AUTH_SECRET',
    why: 'Session signing (used from M1 onward).',
    fix: 'Generate one with: openssl rand -base64 32',
  },
];

const missingRequired = REQUIRED.filter(({ key }) => !process.env[key]);
const missingRecommended = RECOMMENDED.filter(({ key }) => !process.env[key]);

for (const { key, why, fix } of missingRecommended) {
  console.warn(`[preflight] WARNING  ${key} is not set. ${why}\n            ${fix}`);
}

if (missingRequired.length > 0) {
  console.error('\n[preflight] BUILD STOPPED — required environment variables are missing.\n');
  for (const { key, why, fix } of missingRequired) {
    console.error(`  ${key}`);
    console.error(`    why: ${why}`);
    console.error(`    fix: ${fix}\n`);
  }
  console.error('Set them in Vercel under Settings -> Environment Variables, then redeploy.');
  console.error('Every variable this project reads is listed in .env.example.\n');
  process.exit(1);
}

console.log('[preflight] environment OK');
