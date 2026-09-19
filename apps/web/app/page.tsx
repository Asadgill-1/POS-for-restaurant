import { ROLE_NAMES } from '@mizan/domain';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { SignOutButton } from './sign-out-button';

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <p className="text-sm opacity-70">Signed in as</p>
          <h1 className="text-2xl font-semibold tracking-tight">{session.name}</h1>
          <p className="text-sm opacity-70">{session.email}</p>
        </div>

        <ul className="flex flex-wrap gap-2">
          {session.isSuperAdmin ? (
            <li className="rounded-full bg-brand-100 px-3 py-1 text-sm text-brand-900">
              Platform admin
            </li>
          ) : null}
          {session.roles.map((role) => (
            <li
              key={`${role.key}:${role.branchId ?? 'all'}`}
              className="rounded-full bg-brand-100 px-3 py-1 text-sm text-brand-900"
            >
              {ROLE_NAMES[role.key]}
              {role.branchId ? '' : ' · all branches'}
            </li>
          ))}
        </ul>

        {/* Not faked (spec §98): these surfaces genuinely do not exist yet. */}
        <p className="rounded-lg border border-black/10 p-4 text-sm opacity-80 dark:border-white/10">
          The POS screen arrives in milestone M5 and the owner dashboard in M13. Sign-in,
          sessions and permissions are live.
        </p>

        <SignOutButton />
      </div>
    </main>
  );
}
