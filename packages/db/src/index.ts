export { prisma } from './client.ts';
export * from './generated/client/index.js';
export { withTenant, withSuperAdmin, TenantError } from './tenant.ts';
export type { TenantContext, TenantClient } from './tenant.ts';
