import { prisma } from '@mizan/db';
import { err, ok, type ApiResponse } from '@mizan/contracts';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Health = {
  status: 'ok';
  database: 'up';
  /** Number of applied Prisma migrations. 0 means the schema was never created. */
  migrations: number;
  /**
   * Rows in the global role catalogue. Proves a real table is queryable and
   * that the seed ran. Deliberately NOT a tenant table: those are behind row
   * level security, so without a tenant context they correctly return zero and
   * would make this check meaningless.
   */
  roles: number;
  version: string;
  time: string;
};

/**
 * Liveness + database reachability. Used by uptime monitoring and by the
 * deploy pipeline to confirm a release can actually reach Postgres.
 *
 * Deliberately leaks nothing: no connection string, no driver error text, no
 * schema detail. The reason a check failed goes to the server log (spec §49).
 */
export async function GET(): Promise<NextResponse<ApiResponse<Health>>> {
  const base = {
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
    time: new Date().toISOString(),
  };

  try {
    // Three levels, cheapest first. `SELECT 1` alone would report "up" for a
    // database that is reachable but has no tables -- which for a POS is a
    // total outage wearing a green badge.
    await prisma.$queryRaw`SELECT 1`;

    const [applied] = await prisma.$queryRaw<
      { count: bigint }[]
    >`SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;

    const roles = await prisma.role.count();

    return NextResponse.json(
      ok<Health>({
        status: 'ok',
        database: 'up',
        migrations: Number(applied?.count ?? 0),
        roles,
        ...base,
      }),
    );
  } catch (cause) {
    console.error('[health] database unreachable', cause);

    return NextResponse.json(
      err('INTERNAL_ERROR', 'Service is temporarily unavailable.', {
        fields: { database: classify(cause) },
      }),
      { status: 503 },
    );
  }
}

/**
 * Non-sensitive classification of a failure, for operators.
 *
 * Deliberately narrow: the error's constructor name and, for Prisma, its
 * documented error code (P1001, P2021, ...). Those are stable public
 * identifiers, not secrets.
 *
 * `message`, `stack` and Prisma's `meta` are NEVER included -- they can carry
 * the connection string, the database host, or query text (spec §49).
 */
function classify(cause: unknown): string[] {
  if (typeof cause !== 'object' || cause === null) return ['unknown'];

  const e = cause as { name?: unknown; code?: unknown; clientVersion?: unknown };
  const parts: string[] = [];

  if (typeof e.name === 'string') parts.push(`name=${e.name}`);
  // Prisma error codes are documented identifiers: pris.ly/d/error-reference
  if (typeof e.code === 'string') parts.push(`code=${e.code}`);
  if (typeof e.clientVersion === 'string') parts.push(`prisma=${e.clientVersion}`);

  parts.push(`cause=${categorise(cause)}`);

  // Presence only, never the value. Distinguishes "not configured" from
  // "configured but broken", which are opposite fixes.
  parts.push(`hasDatabaseUrl=${Boolean(process.env.DATABASE_URL)}`);
  parts.push(`hasDirectUrl=${Boolean(process.env.DATABASE_URL_UNPOOLED)}`);

  return parts;
}

/**
 * Map a Prisma initialisation failure onto a fixed category.
 *
 * Matches against the error text but NEVER returns any of it -- the message can
 * contain the connection string, host, or credentials. Only the category name,
 * which is a constant in this file, is returned.
 */
function categorise(cause: unknown): string {
  const text = cause instanceof Error ? cause.message : '';

  if (/locate the Query Engine|Query engine library|libquery_engine/i.test(text)) {
    return 'engine-binary-not-found';
  }
  if (/Environment variable not found|is not defined|Invalid `?datasource/i.test(text)) {
    return 'datasource-env-missing';
  }
  if (/[Cc]an't reach database server|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/.test(text)) {
    return 'database-unreachable';
  }
  if (/[Aa]uthentication failed|password/i.test(text)) {
    return 'auth-failed';
  }
  if (/prepared statement|pgbouncer/i.test(text)) {
    return 'pgbouncer-prepared-statement';
  }
  if (/does not exist on the database|P1003/i.test(text)) {
    return 'database-does-not-exist';
  }

  return 'unclassified';
}
