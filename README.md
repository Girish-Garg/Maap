# Maap

A mobile-first PWA that replaces an Excel-based wood measurement and quotation
workflow. Users enter Patia (planks) and Pawa (posts) into dimension grids; the
app computes cubic feet per billing bucket, applies per-project prices, and
produces a client-ready PDF quotation.

Built with Next.js 14 (App Router), TypeScript, Tailwind, PostgreSQL, Prisma,
and Auth.js, with business logos in OCI Object Storage. See `architecture.md`,
`design.md`, and `target.md` for the rationale.

## Features

- **Per-project Patia and Pawa grids** with a custom numeric keypad designed
  for fast continuous entry (digits, Enter = next cell, Tab = next length, Esc).
  Cells fill the row width on mobile; on desktop each grid splits left/right
  to avoid vertical scroll.
- **Verified calculation engine** (`src/lib/calc.ts`) - replicates the source
  Excel cell-for-cell. 100% test coverage enforced in CI.
- **Live summary** with bucket totals (Frame, Patia 1.5'-4', 4.5'-5', 5.5'+,
  Pawa) and a grand total updated as you enter values.
- **Per-project pricing**, with sensible defaults seeded from the Excel.
- **PDF export** of three kinds, mix-and-match in one document:
  - Quotation (bill): branded header, client + date, line items, total.
  - Patia details: per-length Width x Thickness reference grids.
  - Pawa details: Length x Size reference grid.
  Files are named `<project>-YYYYMMDD-HHMMSS.pdf` so repeat downloads never
  collide.
- **Snapshots / history** - manual save, auto-save before each PDF and before
  any restore. Restore runs inside a single database transaction.
- **Read-only share link** - mint an unguessable per-project link that opens a
  view-only bill, resolved server-side by an exact match on that token (no
  anonymous read path, and the project's id, owner and notes never leave the
  server).
- **Business profile** in Settings (name, address, phone, optional logo).
- **Customisable dimensions** with usage-aware removal and a reset-to-defaults.
- **Dark mode** with no-flash init.
- **PWA**: installable, app-shell caching service worker (production only).
- **Offline-capable reads** via an IndexedDB-persisted query cache; offline
  writes queue and replay on reconnect within the session.

## Stack

- **Next.js 14** App Router, TypeScript, Tailwind CSS
- **PostgreSQL 17 + Prisma** for all application data, reached only from the
  server (Server Actions); ownership is enforced in `src/lib/server/access.ts`
- **Auth.js v5** for sign-in (email + password, and Google), with accounts and
  linked identities stored in the same Postgres; sessions are signed JWT cookies
- **OCI Object Storage** for business logos, over its S3-compatible API. The
  bucket is shared with other projects and stays private: Maap writes only under
  its own `<prefix>/<user_id>/` folder, and logos are served by `/api/logo`
  rather than linked to directly
- **TanStack Query** with IndexedDB persistence for offline reads
- **react-pdf** for client-side PDF rendering
- **Vitest** for the calculation test suite

## Local setup

### 1. Environment variables

```bash
cp .env.example .env
```

`DATABASE_URL` already matches the Postgres container below, so it works as-is.
Two things still need filling in:

**`AUTH_SECRET` (required)** signs the session cookie:

```bash
npx auth secret
```

**Google sign-in (optional)** - leave `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
blank and the Google button is simply hidden, with email + password still
working. To enable it, create an OAuth client (Web application) in Google Cloud
Console under **APIs & Services -> Credentials**, and add the callback URL for
each origin you use:

```
http://localhost:3000/api/auth/callback/google
https://maap.example.com/api/auth/callback/google
```

**Logo storage (optional)** - the `OCI_*` variables in `.env.example`. Without
them everything works except uploading a business logo. Credentials are a
Customer Secret Key (OCI Console -> your user -> **Customer Secret Keys** ->
Generate); the secret is shown once. They are read only on the server, and the
browser never talks to the bucket.

The bucket can be shared with other projects. Everything Maap writes lives under
`OCI_PREFIX` (default `maap`), as `maap/<user_id>/logo.<ext>`, and nothing
outside that prefix is ever listed, written, or deleted. Replacing or removing a
logo deletes the previous object, so a user's folder holds at most one file.
Keep the bucket **private** - logos are served by `/api/logo` to the signed-in
owner, so no public access is needed.

### 2. Start PostgreSQL

```bash
docker compose up -d postgres
```

Data persists in the `postgres_data` volume, so stopping the container does not
lose anything.

### 3. Install, migrate, run

```bash
npm install
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000. Choose "Create an account", enter an email and a
password, and you'll land signed in. Visit **Settings** to fill in your
business profile (name + address + phone) - the PDF Export button stays
disabled until you do.

Accounts are created immediately - there is no confirmation email. Passwords are
hashed with bcrypt and stored in the `users` table; signing in with Google
adopts an existing account with the same address rather than making a second
one.

The profile and dimension rows that Supabase used to create from a trigger on
`auth.users` are now created on first use, so a new account needs no seeding.

### Running everything in Docker

To run the app itself in Docker alongside the database:

```bash
docker compose up -d
```

The app waits for Postgres's healthcheck, applies migrations, and comes up on
http://localhost:3000.

## Scripts

| Command             | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Start the dev server                           |
| `npm run build`     | Production build                               |
| `npm run start`     | Run the production build locally               |
| `npm run test`      | Run the calculation test suite                 |
| `npm run coverage`  | Tests with coverage (100% required on calc.ts) |
| `npm run typecheck` | `tsc --noEmit`                                 |
| `npm run lint`      | ESLint                                         |
| `npm run db:generate` | Regenerate the Prisma client                 |
| `npm run db:migrate`  | Create/apply a migration in development      |
| `npm run db:migrate:deploy` | Apply pending migrations (production)  |
| `npm run db:studio`   | Browse the database in Prisma Studio         |

## Deployment

The VPS already runs a shared `shared-postgres` container; Maap connects to it
using its own `maap` database and never starts a Postgres of its own.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Set these in the VPS `.env` next to that file (never in Git):

- `DATABASE_URL` - e.g. `postgresql://maap:<password>@shared-postgres:5432/maap`
- `AUTH_SECRET` - signs session cookies; changing it signs everyone out
- `AUTH_URL` - the public origin (e.g. `https://maap.example.com`). Required
  behind a reverse proxy, where Auth.js cannot infer it from the request.
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` - only if Google sign-in is enabled.
  The production callback URL must be registered in Google Cloud Console.
- `OCI_BUCKET`, `OCI_NAMESPACE`, `OCI_REGION`, `OCI_ACCESS_KEY_ID`,
  `OCI_SECRET_ACCESS_KEY` - only if logo upload is used; `OCI_PREFIX` if this
  project should use a folder other than `maap`
- `POSTGRES_NETWORK` - only if the shared Postgres network isn't named
  `shared-postgres`

On start the container runs `prisma migrate deploy` and refuses to serve if it
fails, so a broken migration never reaches users. Migrations only play forward -
no deploy drops a database or a volume. `/api/health` round-trips a query to
Postgres and backs the container healthcheck.

## The calculation module

`src/lib/calc.ts` is the frozen calculation contract, verified cell-by-cell
against the source Excel workbook. It is pure and dependency-free, with 100%
test coverage enforced in `vitest.config.ts`. The formulas:

- **Patia volume:** `qty * width_in * thickness_in * length_ft / 144`
- **Frame bucket:** any Patia with width 3" or 4", billed separately and never
  also counted in a length bucket
- **Length buckets (non-Frame):** `<= 4 ft`, `4.5-5 ft`, `5.5 ft+`
- **Pawa volume:** `qty * size_side^2 * length_in / 1728`
- **Grand total:** sum of each bucket's CFT times its rate

## Project structure

```
src/
  app/                          Next App Router routes
    (app)/                      authenticated app shell (sidebar / bottom nav)
      projects/                 list, new, detail, edit, pricing, history
      settings/                 profile, dimensions, theme, account
    auth/                       sign-in / sign-up / sign-out actions
    login/                      email + password sign-in / sign-up
    share/[token]/              public read-only bill (no auth)
    manifest.ts                 PWA manifest
  components/                   UI primitives + feature components
    api/auth/[...nextauth]/     Auth.js endpoints (sign-in, Google callback)
    api/health/                 database-backed healthcheck for the container
    api/logo/                   serves the owner's logo from the private bucket
  auth.ts                       Auth.js: providers, Prisma adapter
  auth.config.ts                the edge-safe half, imported by middleware
  middleware.ts                 route gating
  lib/
    calc.ts                     frozen calculation contract (100% covered)
    db/                         TanStack Query hooks + client-facing row types
    server/                     Server Actions: Prisma queries, ownership checks
    server/object-storage.ts    S3-compatible client, scoped to this project
    prisma.ts                   the shared Prisma client (server-only)
    query-cache.ts              offline cache keys + clearing on user change
    pdf/                        @react-pdf document for export
    store.ts                    Zustand UI state (active length, editing cell)
public/
  icon.svg                      PWA app icon
  sw.js                         service worker (registered in production only)
prisma/
  schema.prisma                 the data model
  migrations/                   forward-only Prisma migrations
Dockerfile                      production image (build, migrate, serve)
docker-compose.yml              local Postgres (+ optional app container)
docker-compose.prod.yml         VPS app container, external shared Postgres
```

