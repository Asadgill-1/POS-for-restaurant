import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// The Prisma CLI only looks for `.env` beside the schema. In a monorepo the env
// file lives at the repo root, so load it explicitly.
// `process.loadEnvFile` is built into Node >=20 — no dotenv dependency needed.
// On Vercel and in CI there is no file and the real environment already holds
// these values, hence the guard.
const rootEnv = path.resolve(import.meta.dirname, '../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({
  schema: path.join(import.meta.dirname, 'prisma', 'schema.prisma'),
});
