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

## What happens on a push

`vercel.json` runs `prisma generate` → `prisma migrate deploy` → `next build`.
A merge to `main` therefore migrates and deploys in one step. Preview branches
migrate their own Neon branch.

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
