'use client';

import { useState } from 'react';

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    // Leave regardless of the outcome: the cookie is HttpOnly, so the server is
    // the only party that can clear it, and a failed call still ends here.
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.assign('/login');
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="h-(--size-touch) w-full rounded-lg border border-black/15 px-4 font-medium transition hover:bg-black/5 disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/5"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
