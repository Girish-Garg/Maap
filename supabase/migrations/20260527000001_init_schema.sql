-- Maap initial schema (architecture.md §Data model).
-- Normalized relational model: cell-level uniqueness on entries enables
-- idempotent upsert-by-coordinate. Forward-only; rollback SQL at the bottom.

-- Business info shown on PDFs. 1:1 with auth.users.
create table user_profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  business_name  text not null default '',
  logo_url       text,
  updated_at     timestamptz not null default now()
);

-- Customizable dimension lists, scoped per user. Seeded with Excel defaults
-- (verified against "Copy of Wood Measurement.xlsx") via the new-user trigger.
create table user_dimensions (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  patia_lengths_ft     jsonb not null default
    '[1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9,9.5,10]',
  patia_widths_in      jsonb not null default
    '[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]',
  patia_thicknesses_in jsonb not null default '[1,1.5,2]',
  pawa_lengths_in      jsonb not null default '[12,15,16,18,21,24,30,36]',
  pawa_sizes           jsonb not null default '[2,2.5,3]'
);

-- Top-level project container.
create table projects (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  client_name    text,
  client_address text,
  project_date   date not null default current_date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index projects_user_updated on projects (user_id, updated_at desc);

-- One row per filled Patia grid cell. Unique on coordinates for upsert.
create table patia_entries (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  length_ft     numeric not null,
  width_in      numeric not null,
  thickness_in  numeric not null,
  quantity      integer not null check (quantity >= 0),
  unique (project_id, length_ft, width_in, thickness_in)
);

-- One row per filled Pawa grid cell.
create table pawa_entries (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  length_in   numeric not null,
  size_side   numeric not null,
  quantity    integer not null check (quantity >= 0),
  unique (project_id, length_in, size_side)
);

-- Per-project prices in INR/CFT. Defaults match the source workbook. 1:1 project.
create table price_configs (
  project_id        uuid primary key references projects(id) on delete cascade,
  frame_3_4         numeric not null default 320,
  patia_1_5_to_4    numeric not null default 420,
  patia_4_5_to_5    numeric not null default 520,
  patia_5_5_to_up   numeric not null default 620,
  pawa              numeric not null default 510
);

-- Point-in-time JSONB snapshots for history/restore.
create table project_snapshots (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  label       text,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);
create index snapshots_project_created on project_snapshots (project_id, created_at desc);

-- ── Rollback ────────────────────────────────────────────────────────────────
-- drop table if exists project_snapshots, price_configs, pawa_entries,
--   patia_entries, projects, user_dimensions, user_profiles cascade;
