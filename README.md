# Mersal — مرسال

Peer-to-peer logistics marketplace that connects people sending documents and parcels with
verified travellers who already make the trip. Senders get a fixed price upfront and pay before
matching; the platform proposes the parcel to suitable travellers automatically; travellers are
paid weekly after a hold period that follows confirmed delivery.

Initial corridors: France ⇄ Algeria, Morocco, Tunisia. Languages: English, French, Arabic (RTL).

## Stack

| Layer    | Choice                                                                  |
| -------- | ----------------------------------------------------------------------- |
| Web      | Next.js 16 (App Router), Tailwind CSS 4, next-intl, TanStack Query      |
| API      | NestJS 11, Prisma 6, PostgreSQL 17, Redis 8 + BullMQ, OpenAPI (Swagger) |
| Shared   | `@mersal/shared` — zod schemas, enums, money/reference helpers          |
| Brand    | `@mersal/brand` — logo, colour tokens, white-label themes               |
| Payments | Stripe (test mode) with Connect for traveller payouts                   |
| Local    | Docker Compose (Postgres, Redis, Mailpit), uploads on local disk        |

## Getting started

Requirements: Node 22+, pnpm, Docker.

```bash
pnpm install
pnpm env:init        # creates apps/api/.env and apps/web/.env.local
pnpm infra:up        # Postgres, Redis, Mailpit
pnpm db:migrate      # apply migrations
pnpm db:seed         # corridors, cities, categories, tariffs, admin account
pnpm dev             # web on :3000, API on :4000
pnpm demo:seed       # optional: sample senders, travellers and parcels in every stage
```

| URL                            | What                         |
| ------------------------------ | ---------------------------- |
| http://localhost:3000          | Web app                      |
| http://localhost:3000/en/brand | Brand guide + theme switcher |
| http://localhost:4000/api/docs | API documentation (Swagger)  |
| http://localhost:58025         | Mailpit (all outgoing email) |

Seeded admin: `admin@mersal.local` / `Mersal!2026` (local development only).

## Demo mode and sample data

With `DEMO_MODE=true` (the default in `.env.example`), timers are shortened so the whole flow
fits in one sitting. The 48-hour hold lasts 2 minutes and offers expire after 3 minutes.
Email and phone codes are also shown on screen instead of needing a real inbox or phone.

`pnpm demo:seed` creates sample accounts on `@demo.mersal.local` (password `Demo2026!`). It
drives the running API like real users would, so every balance, event and notification
comes from the platform's own logic. `pnpm demo:reset` wipes the local database first.
[docs/demo-script.md](docs/demo-script.md) is a 10-minute walkthrough built on this data.

Local ports use the 5xxxx range (Postgres 55432, Redis 56379, SMTP 51025) to avoid clashing with
other projects.

## Repository layout

```
apps/api        NestJS API — src/<module> per domain, prisma/ schema + migrations
apps/web        Next.js app — src/app/[locale]/... routes, messages/ translations
packages/shared Schemas and types used by API, web and the future mobile app
packages/brand  Logo files, tokens.css and brand configuration
```

## Scripts

| Command           | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `pnpm dev`        | Run API and web in watch mode                |
| `pnpm test`       | Unit tests (Node test runner)                |
| `pnpm test:e2e`   | Playwright end-to-end tests (stack running)  |
| `pnpm typecheck`  | TypeScript across all packages               |
| `pnpm lint`       | ESLint                                       |
| `pnpm build`      | Production builds                            |
| `pnpm db:reset`   | Drop, re-migrate and re-seed the database    |
| `pnpm demo:seed`  | Add sample users and parcels (API running)   |
| `pnpm demo:reset` | Reset the database, then add the sample data |

## Conventions

- Money is stored as integers in the currency's minor unit; weights in grams; sizes in cm.
- Wallet balances are derived from an append-only ledger, never stored as a mutable number.
- Every shipment status change is recorded as a `ShipmentEvent`; admin actions write `AuditLog`.
- API errors return `{ code, message }`; clients translate `code`.

## Documentation

- [docs/architecture.md](docs/architecture.md): components, modules, the shipment state
  machine, the ledger, pricing, matching, jobs, security, and what changes for production.
- [docs/demo-script.md](docs/demo-script.md): the 10-minute product demo.
- API reference: http://localhost:4000/api/docs (generated from the code).
