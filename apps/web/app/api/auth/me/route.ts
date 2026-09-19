import { PERMISSION_KEYS } from '@mizan/domain';
import { can, respond, withRoute } from '@/lib/route';

export const runtime = 'nodejs';

/** The signed-in user and what they may do. The UI hides; the server enforces. */
export const GET = withRoute({}, async ({ session }) =>
  respond({
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      organizationId: session.organizationId,
      isSuperAdmin: session.isSuperAdmin,
    },
    roles: session.roles,
    permissions: PERMISSION_KEYS.filter((permission) => can(session, permission)),
  }),
);
