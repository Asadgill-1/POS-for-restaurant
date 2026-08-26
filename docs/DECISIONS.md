# Architecture decisions

Short records of choices that are expensive to reverse. Full reasoning lives in
the build plan; this file is what a new engineer reads first.

## 1. Money is an integer count of fils

`1 AED = 100 fils`. `AED 73.50` is the number `7350`. Every monetary database
column is `Int`. Rates are `Int` basis points (5% = `500`).

No `Float`, no `Decimal`, no `decimal.js`. Prisma's `Decimal` works but
serialises awkwardly to the client and invites a `Number()` cast somewhere at
2am; integers cannot be got wrong that way.

**There is deliberately no "AED number" type anywhere.** AED exists only as a
formatted string at the UI edge (`formatAed`) and as validated user input at the
admin edge (`parseAedToFils`). Everything between is fils.

See `packages/domain/src/money.ts`.

## 2. Rounding is half-away-from-zero, and happens in exactly one function

`roundHalfUp(numerator, denominator)` is the only place a division rounds.

Half-away-from-zero rather than banker's rounding, for two reasons: it is what a
customer verifies against a printed receipt, and it makes a refund the exact
negative of the charge, which banker's rounding does not guarantee.

Order totals are the **sum of already-rounded lines**, never a re-derivation
from the order subtotal. That is what guarantees the printed lines add up to the
printed total — a stray fil there is the most common POS support ticket there is.

Any split across N parts (equal bill split, pro-rata order discount) uses
`allocate()`, which distributes leftover fils by largest remainder.
`sum(allocate(total, weights)) === total` is enforced by a 10 000-case property
test, not by hope.

## 3. `packages/domain` is pure

It may not import Prisma, React, or Next. It takes plain objects and returns
plain objects.

This is the rule that stops order-total logic from being reimplemented inside a
React component (spec §52, §89), and it is what makes the money tests run in
milliseconds with no database.

## 4. Tenant isolation is enforced by Postgres, not by application code

Row-Level Security on every tenant table, with the tenant set per request via
`SET LOCAL app.organization_id` inside a transaction (M1).

Application-level `where organizationId` filtering is ergonomics, not
enforcement — one forgotten clause would be a cross-tenant breach, and a public
SaaS cannot rely on nobody ever forgetting.

## 5. Business date is not calendar date

Restaurants trade past midnight; a 01:30 order belongs to the previous night's
service. Every order carries a `business_date`, derived from the branch's IANA
timezone and its `businessDayCutoffMinutes` (default 04:00).

Reports group by `business_date`, **never** by `created_at::date`. This is the
difference between "today's sales" being correct and being an argument with the
owner every morning.

## 6. RTL is enforced from day one

All Tailwind direction utilities must be logical (`ps-`/`pe-`/`ms-`/`me-`/
`text-start`/`text-end`). The physical variants are an ESLint error — see
`apps/web/eslint.config.mjs`.

Arabic ships later (spec §81), but retrofitting direction into 200 components
does not happen in practice. Enforcing it while there are three components costs
nothing.

## 7. Realtime is a cursor table, not a message broker

`outbox_events` with a `BIGSERIAL` cursor, written inside the same transaction
as the change it describes — so a rolled-back order can never emit a phantom
kitchen ticket.

`LISTEN`/`NOTIFY` does not survive transaction-mode connection pooling, which is
what Neon gives a serverless app, so the SSE handler polls that table
server-side on a 1s tick and streams deltas. One long-lived connection per
kitchen screen instead of ~150 requests a minute of client polling.

No Redis, no queue broker. Add infrastructure when a measurement demands it.

## 8. Integrations get an interface and a mock, never a fake

If a payment terminal, printer, delivery platform, or tax provider is not
actually connected, the code says so (spec §98). Each seam is a typed interface
with a working mock and a clearly marked production TODO.

Notably: **UAE VAT support is configuration, not certification.** The system is
designed to support UAE VAT rules; it is not certified compliant, and every
operator needs their setup validated by a UAE tax advisor.
