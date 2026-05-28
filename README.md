# Maap

A mobile-first PWA that replaces an Excel-based wood measurement and quotation
workflow. Users enter Patia (planks) and Pawa (posts) into dimension grids; the
app computes cubic feet per billing bucket, applies per-project prices, and
produces a client-ready PDF quotation.

Built with Next.js 14 (App Router), TypeScript, Tailwind, and Supabase. See
`architecture.md`, `design.md`, and `target.md` for the rationale.

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
  any restore. Transactional restore via a Postgres RPC.
- **Read-only share link** - mint an unguessable per-project link that opens a
  view-only bill, fetched through a security-definer RPC keyed on the exact
  token (no broad anonymous read).
- **Business profile** in Settings (name, address, phone, optional logo).
- **Customisable dimensions** with usage-aware removal and a reset-to-defaults.
- **Dark mode** with no-flash init.
- **PWA**: installable, app-shell caching service worker (production only).
- **Offline-capable reads** via an IndexedDB-persisted query cache; offline
  writes queue and replay on reconnect within the session.

## Stack

- **Next.js 14** App Router, TypeScript, Tailwind CSS
- **Supabase** Postgres + Row Level Security, email + password auth
- **TanStack Query** with IndexedDB persistence for offline reads
- **react-pdf** for client-side PDF rendering
- **Vitest** for the calculation test suite

## Local setup

### 1. Create a Supabase project

At [supabase.com](https://supabase.com), create a new project, pick a region
close to you, and save the database password somewhere safe.

### 2. Fill in environment variables

```bash
cp .env.example .env.local
```

From **Project Settings -> API Keys**:

- `NEXT_PUBLIC_SUPABASE_URL` - the Project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - the publishable key
  (`sb_publishable_...`). Older projects show an "anon public" key instead;
  set `NEXT_PUBLIC_SUPABASE_ANON_KEY` for those. Either works.

Never put the `service_role` key in `.env.local`. It must not reach the browser.

### 3. Apply the database migrations

Every file in `supabase/migrations/`, in filename order:

```
20260527000001_init_schema.sql
20260527000002_rls_policies.sql
20260527000003_seed_new_user.sql
20260527000004_profile_and_logo_storage.sql
20260527000005_restore_snapshot.sql
20260527000006_project_share.sql
```

Either way:

- **Supabase CLI:** `supabase link` then `supabase db push`.
- **Dashboard:** open the **SQL Editor**, paste each file in order, run.

There's also `supabase/setup.sql` which concatenates the first three for a
single paste during initial setup.

### 4. Turn off email confirmation

Auth uses email + password (not magic links). In **Authentication -> Sign In /
Providers -> Email**, turn **Confirm email** off. Signup then creates a session
immediately with no email sent.

### 5. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. Choose "Create an account", enter an email and a
password, and you'll land signed in. Visit **Settings** to fill in your
business profile (name + address + phone) - the PDF Export button stays
disabled until you do.

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
    auth/                       sign-out action, OAuth callback
    login/                      email + password sign-in / sign-up
    share/[token]/              public read-only bill (no auth)
    manifest.ts                 PWA manifest
  components/                   UI primitives + feature components
  lib/
    calc.ts                     frozen calculation contract (100% covered)
    db/                         TanStack Query hooks per table
    pdf/                        @react-pdf document for export
    supabase/                   browser + server clients, middleware, types
    store.ts                    Zustand UI state (active length, editing cell)
public/
  icon.svg                      PWA app icon
  sw.js                         service worker (registered in production only)
supabase/migrations/            forward-only SQL migrations
```

