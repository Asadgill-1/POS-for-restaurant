/**
 * Local Postgres without Docker: initialise (once), start, and create the
 * least-privilege application role. Idempotent -- run it whenever the server
 * is down.
 *
 * For machines where Docker cannot run (e.g. firmware virtualisation disabled).
 * Uses an installed PostgreSQL's binaries against its own data directory, so an
 * existing Postgres on 5432 is never touched.
 *
 *   node scripts/local-db.mjs
 *   pnpm --filter @mizan/db migrate:deploy && pnpm db:seed
 *
 * Env: PG_BIN (PostgreSQL bin dir), MIZAN_PGDATA (data dir).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = '5433';
const DB = 'mizan_pos';
const OWNER = 'mizan';

const bin =
  process.env.PG_BIN ?? (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/17/bin' : '');
const exe = (name) => (bin ? path.join(bin, process.platform === 'win32' ? `${name}.exe` : name) : name);

// Deliberately NOT a temp directory: temp cleanup deletes the cluster's files
// but leaves the folders, which corrupts it in a way initdb will not overwrite.
const data =
  process.env.MIZAN_PGDATA ??
  path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), '.local', 'share'), 'mizan-pos', 'pgdata');
const log = path.join(path.dirname(data), 'postgres.log');
const roleSql = path.resolve(import.meta.dirname, '../packages/db/sql/app-role.sql');

function run(name, args, capture = false, stdio = capture ? 'pipe' : 'inherit') {
  const result = spawnSync(exe(name), args, { encoding: 'utf8', stdio });
  if (result.error) {
    console.error(`[local-db] cannot run ${name}: ${result.error.message}. Set PG_BIN.`);
    process.exit(1);
  }
  return result;
}

const psql = (sql, db = 'postgres') =>
  run('psql', ['-h', '127.0.0.1', '-p', PORT, '-U', OWNER, '-d', db, '-v', 'ON_ERROR_STOP=1', '-tAc', sql], true);

if (!existsSync(path.join(data, 'PG_VERSION'))) {
  if (existsSync(data) && readdirSync(data).length > 0) {
    console.error(`[local-db] ${data} exists but is not a cluster (PG_VERSION missing).`);
    console.error('[local-db] It is corrupted; delete it and re-run. This script will not delete data.');
    process.exit(1);
  }
  mkdirSync(data, { recursive: true });
  console.log(`[local-db] initialising cluster in ${data}`);
  // Trust auth on loopback only: a throwaway local cluster, never exposed.
  const init = run('initdb', ['-D', data, '-U', OWNER, '--auth=trust', '-E', 'UTF8']);
  if (init.status !== 0) process.exit(1);
}

const ready = () => run('pg_isready', ['-h', '127.0.0.1', '-p', PORT, '-q'], true).status === 0;

if (!ready()) {
  console.log(`[local-db] starting on port ${PORT}`);
  // stdio 'ignore': the detached server would otherwise inherit our stdout and
  // hold it open forever, hanging any caller that pipes this script's output.
  // It logs to its own file regardless.
  run('pg_ctl', ['-D', data, '-l', log, '-o', `-p ${PORT}`, '-W', 'start'], false, 'ignore');
  const deadline = Date.now() + 20_000;
  while (!ready()) {
    if (Date.now() > deadline) {
      console.error(`[local-db] server did not become ready; see ${log}`);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

if (psql(`SELECT 1 FROM pg_database WHERE datname = '${DB}'`).stdout.trim() !== '1') {
  run('createdb', ['-h', '127.0.0.1', '-p', PORT, '-U', OWNER, DB]);
}

const role = run(
  'psql',
  ['-h', '127.0.0.1', '-p', PORT, '-U', OWNER, '-d', DB, '-v', 'ON_ERROR_STOP=1', '-q', '-f', roleSql],
  true,
);
if (role.status !== 0) {
  console.error(role.stderr);
  process.exit(1);
}

console.log(`[local-db] ready: postgres://127.0.0.1:${PORT}/${DB}`);
console.log(`[local-db]   runtime role  mizan_app  (RLS enforced)  -> DATABASE_URL`);
console.log(`[local-db]   owner role    ${OWNER}      (migrations)     -> DATABASE_URL_UNPOOLED`);
