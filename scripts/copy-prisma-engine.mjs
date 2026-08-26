/**
 * Copy the Prisma query engine to where Prisma actually looks for it.
 *
 * The generated client lives in packages/db, outside apps/web. Next traces the
 * engine into the deployed bundle, but preserves its repo-relative path --
 * /var/task/packages/db/src/generated/client -- which is NOT one of the
 * locations Prisma searches at runtime. It searches, in order:
 *
 *   /var/task/apps/web/src/generated/client        <- this script targets this
 *   /var/task/apps/web/.next/server/app/api
 *   /vercel/path0/packages/db/src/generated/client <- build-time only, gone at runtime
 *   /var/task/apps/web/.next/server/.prisma/client
 *   /tmp/prisma-engines
 *
 * So the engine ships but cannot be found, and the function fails with
 * PrismaClientInitializationError. Copying it under apps/web puts it on the
 * first search path and inside the traced root, which fixes both halves.
 *
 * Runs after `prisma generate` in the Vercel build. Idempotent.
 */
import { cp, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const from = path.join(repoRoot, 'packages/db/src/generated/client');
const to = path.join(repoRoot, 'apps/web/src/generated/client');

if (!existsSync(from)) {
  console.error(`[copy-prisma-engine] generated client not found at ${from}`);
  console.error('[copy-prisma-engine] run `prisma generate` first');
  process.exit(1);
}

await mkdir(to, { recursive: true });

// Engine filename is platform-specific: libquery_engine-rhel-openssl-3.0.x.so.node
// on Vercel, query_engine-windows.dll.node locally. Copy whatever is there.
const wanted = (await readdir(from)).filter(
  (f) => f.endsWith('.node') || f.endsWith('.wasm') || f === 'schema.prisma',
);

if (wanted.length === 0) {
  console.error(`[copy-prisma-engine] no engine files found in ${from}`);
  process.exit(1);
}

for (const file of wanted) {
  await cp(path.join(from, file), path.join(to, file));
}

console.log(`[copy-prisma-engine] copied ${wanted.length} file(s) -> apps/web/src/generated/client`);
console.log(`[copy-prisma-engine]   ${wanted.join(', ')}`);
