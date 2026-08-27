# Deployment

Production runs on **Vercel** with **Neon** Postgres.

## One-time Vercel setup

You run these — they need your account, and no token of yours is ever handled here.

1. **Vercel → Add New Project → import `Asadgill-1/POS-for-restaurant`.**
2. Set **Root Directory** to `apps/web`. Framework auto-detects as Next.js;
   build settings come from [`apps/web/vercel.json`](../apps/web/vercel.json).
3. **Storage → Neon** (Vercel Marketplace). This provisions the database and
   injects `DATABASE_URL` and `DATABASE_URL_UNPOOLED` automatically — no
   connection string is ever copied, pasted, or committed.
   **Pick the `aws-eu-central-1` (Frankfurt) Neon region** so it is colocated
   with the `fra1` Vercel region set in `vercel.json`. App↔database latency
   matters far more here than app↔user latency, because a POS request makes
   several round trips to Postgres and only one to the browser.
4. Add the remaining secrets in **Settings → Environment Variables**. Every key
   the app reads is listed in [`.env.example`](../.env.example) — a missing one
   fails the build rather than failing silently at 8pm on a Friday.
5. Enable **Neon database branching for preview deployments** so a preview
   deploy never touches production data.

## Do not run the build command by hand

`buildCommand` in `apps/web/vercel.json` is what **Vercel** runs, inside a
checkout of this repo. Pasting it into a terminal that is not sitting in the
repo produces `ERR_PNPM_NO_PKG_MANIFEST: No package.json found` — which is
correct and harmless. To build locally, use `pnpm build` from the repo root.

## What happens on a push

`vercel.json` runs `prisma generate` → `prisma migrate deploy` → `next build`.
A merge to `main` therefore migrates and deploys in one step. Preview branches
migrate their own Neon branch.

## Required: a least-privilege application role

Row level security is bypassed entirely by a superuser or a role with
`BYPASSRLS`, so the role in `DATABASE_URL` must be neither. See
[DECISIONS.md §4a](DECISIONS.md) for how this was discovered the hard way.

On Neon, check the role the integration injected:

```sql
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;
```

Both flags must be `f`. If they are not, create a dedicated role and point
`DATABASE_URL` at it, keeping the owner only in `DATABASE_URL_UNPOOLED` for
migrations:

```sql
CREATE ROLE mizan_app LOGIN PASSWORD '...' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO mizan_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mizan_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mizan_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mizan_app;
```

`pnpm --filter @mizan/db test` asserts both properties and fails loudly if the
connected role can bypass RLS.

## Known constraint — the Kitchen Display stream

The KDS SSE route (M7) needs `runtime = 'nodejs'` and `maxDuration = 300`, and
**300s requires a Vercel Pro plan**. On Hobby the ceiling is 60s, so the stream
reconnects every minute. It still works correctly — `Last-Event-ID` carries the
event cursor and a reconnect resumes without a gap — it is just chattier.
Worth knowing before the first kitchen test rather than during it.

## Local development

```bash
docker compose up -d          # Postgres 17 on host port 5433
cp .env.example .env          # fill DATABASE_URL* from docker-compose.yml
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`pnpm db:seed` refuses to run against a non-local `DATABASE_URL` unless
`ALLOW_REMOTE_SEED=1` is set explicitly.
