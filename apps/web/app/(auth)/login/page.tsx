import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  if (await getSession()) redirect('/');

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Mizan POS</h1>
          <p className="mt-1 text-sm opacity-70">Sign in to your restaurant</p>
        </div>

        <LoginForm />

        <p className="mt-8 text-center text-xs opacity-60">
          Restaurant staff on a POS terminal unlock with a PIN instead.
        </p>
      </div>
    </main>
  );
}
