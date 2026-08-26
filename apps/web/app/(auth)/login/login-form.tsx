'use client';

import { LoginSchema, type ApiResponse } from '@mizan/contracts';
import { useState } from 'react';

type FieldErrors = Partial<Record<'email' | 'password', string[]>>;

export function LoginForm() {
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return; // never double-submit a credential check (spec §91)

    setFormError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const parsed = LoginSchema.safeParse({
      email: form.get('email'),
      password: form.get('password'),
    });

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors as FieldErrors);
      return;
    }

    setPending(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json()) as ApiResponse<{ redirectTo: string }>;

      if (!body.ok) {
        setFormError(body.error.message);
        setFieldErrors((body.error.fields ?? {}) as FieldErrors);
        return;
      }
      window.location.assign(body.data.redirectTo);
    } catch {
      setFormError('Cannot reach the server. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        errors={fieldErrors.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        errors={fieldErrors.password}
      />

      {formError ? (
        <p role="alert" className="text-sm text-[var(--color-status-danger)]">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-(--size-touch) w-full rounded-lg bg-brand-600 px-4 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  errors,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  errors?: string[] | undefined;
}) {
  const errorId = `${name}-error`;
  const invalid = Boolean(errors?.length);

  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        {...input}
        id={name}
        name={name}
        required
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        className="h-(--size-touch) w-full rounded-lg border border-black/15 bg-white/60 px-3 outline-none focus-visible:border-brand-600 dark:border-white/15 dark:bg-white/5"
      />
      {invalid ? (
        <p id={errorId} className="mt-1 text-sm text-[var(--color-status-danger)]">
          {errors?.[0]}
        </p>
      ) : null}
    </div>
  );
}
