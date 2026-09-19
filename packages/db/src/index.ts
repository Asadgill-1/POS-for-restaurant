export { prisma } from './client.ts';
export * from './generated/client/index.js';
export { withTenant, withSuperAdmin, TenantError } from './tenant.ts';
export type { TenantContext, TenantClient } from './tenant.ts';
export { login, logout, resolveSession, SESSION_TTL_MS } from './auth.ts';
export type { LoginFailure, LoginResult, SessionRole, SessionUser } from './auth.ts';
