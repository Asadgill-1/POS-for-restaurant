/**
 * Run Prisma migrations only where it is safe to do so.
 *
 * This project has ONE Neon database shared by Production and Preview -- the
 * DATABASE_URL variable is scoped to both. Running `migrate deploy` on every
 * build therefore means any preview deployment, from any branch, migrates the
 * production database. A half-finished schema on a feature branch would land
 * in production the moment someone opened a pull request.
 *
 * So: migrate on production deploys, skip on previews, and say which.
 *
 * Escape hatch: set RUN_MIGRATIONS_ON_PREVIEW=1 to migrate from a preview
 * anyway. Deliberate, opt-in, and logged -- for when you actually do want to
 * test a migration before merging.
 */
import { spawnSync } from 'node:child_process';

const env = process.env.VERCEL_ENV ?? 'local';
const optIn = process.env.RUN_MIGRATIONS_ON_PREVIEW === '1';
const shouldMigrate = env === 'production' || env === 'local' || optIn;

if (!shouldMigrate) {
  console.log(`[migrate] VERCEL_ENV=${env} -- skipping migrations.`);
  console.log('[migrate] Preview and Production share one database here, so a');
  console.log('[migrate] preview build must not migrate it. Set');
  console.log('[migrate] RUN_MIGRATIONS_ON_PREVIEW=1 to override deliberately.');
  process.exit(0);
}

if (optIn && env !== 'production') {
  console.log(`[migrate] RUN_MIGRATIONS_ON_PREVIEW=1 set on VERCEL_ENV=${env}.`);
  console.log('[migrate] Migrating the SHARED database from a preview build.');
}

console.log(`[migrate] VERCEL_ENV=${env} -- running prisma migrate deploy`);

const result = spawnSync('pnpm', ['--filter', '@mizan/db', 'migrate:deploy'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
