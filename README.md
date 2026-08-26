# Mizan POS

Restaurant point-of-sale for the UAE. Multi-tenant SaaS: dine-in, takeaway and
delivery, table floor plan, kitchen display, split payments, UAE VAT,
recipe-based inventory, cashier shifts, reporting, and a full audit trail.

> **Status: M0 — foundation.** The tenancy schema, money engine, CI and a
> deployable skeleton are in place. Authentication lands in M1. Anything not
> implemented says so rather than pretending; see the milestone table below.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind v4 ·
Prisma 6 · PostgreSQL 17 (Neon) · Vitest · pnpm workspaces · Vercel

## Layout

| Path | What it is |
|---|---|
| `apps/web` | The Next.js app — POS, kitchen display, admin, API routes |
| `packages/domain` | **Pure** TypeScript money and order maths. No Prisma, no React. |
| `packages/db` | Prisma schema, migrations, seed |
| `packages/contracts` | Zod schemas and the shared API response envelope |
| `docs/MASTER_PROMPT.md` | The original product specification |
| `docs/DECISIONS.md` | Why the expensive-to-reverse choices were made |
| `docs/DEPLOYMENT.md` | Vercel + Neon setup |

## Getting started

```bash
corepack enable
pnpm install
cp .env.example .env      # fill DATABASE_URL* — docker-compose.yml has the local values
docker compose up -d
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev
```

Then open <http://localhost:3000>. `GET /api/health` reports database
reachability.

## Verify

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

The money engine carries a 95% branch-coverage floor. It is roughly 150 lines
and every branch of it is a dirham:

```bash
pnpm --filter @mizan/domain exec vitest run --coverage
```

## Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Monorepo, tenancy schema, money engine, CI, deployable skeleton | ✅ done |
| M1 | Auth, RBAC, Postgres RLS, device enrolment, PIN unlock, audit log | next |
| M2 | Organizations, branches, terminals, settings, timezone, business date | |
| M3 | Order calculation engine + full test suite | |
| M4 | Menu, categories, variants, modifiers, kitchen stations | |
| M5 | POS screen, order lifecycle, search, barcode | |
| M6 | Payments, split bills, cash drawer, shifts, receipts, refunds | |
| M7 | Kitchen display, stations, realtime | |
| M8 | Tables and floor plan | |
| M9 | Print agent (ESC/POS) | |
| M10 | Offline-first sync | |
| M11 | Inventory, recipes, suppliers, purchase orders | |
| M12 | Customers and delivery flow | |
| M13 | Dashboard, reports, exports | |
| M14 | Super admin, subscriptions | |
| M15 | Hardening, observability, launch | |

## A note on VAT

This system is **designed to support** UAE VAT configuration. It is **not
certified compliant**, and nothing here is tax advice. Every operator must have
their tax configuration validated by a qualified UAE tax advisor before relying
on it for filing.
