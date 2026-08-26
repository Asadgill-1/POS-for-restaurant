import { prisma } from '@mizan/db';
import { err, ok, type ApiResponse } from '@mizan/contracts';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Health = {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
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
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(ok<Health>({ status: 'ok', database: 'up', ...base }));
  } catch (cause) {
    console.error('[health] database unreachable', cause);
    return NextResponse.json(
      err('INTERNAL_ERROR', 'Service is temporarily unavailable.'),
      { status: 503 },
    );
  }
}
