import { PrismaClient } from './generated/client/index.js';

/**
 * Process-wide Prisma client.
 *
 * Cached on `globalThis` so Next.js hot reload does not open a new pool on
 * every edit, and so a serverless instance reuses its connection across
 * invocations.
 *
 * NOTE (M1): application code will not use this client directly. Every
 * tenant-scoped query goes through `forTenant(ctx)`, which opens a transaction
 * and issues `SET LOCAL app.organization_id` so Postgres RLS can enforce
 * isolation. This export exists for migrations, seeding, and the health check.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
