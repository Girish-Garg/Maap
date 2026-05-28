-- Maap: full schema setup. Paste into Supabase SQL Editor and run once.
-- Generated from supabase/migrations/ (run them individually if you use the CLI).

-- ============================================================
-- 20260527000001_init_schema.sql
-- ============================================================
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


-- ============================================================
-- 20260527000002_rls_policies.sql
-- ============================================================
-- Row Level Security (architecture.md §RLS policies).
-- Every user-data table is gated. Direct tables key on auth.uid() = user_id;
-- child tables (entries, prices, snapshots) check parent ownership via a
-- security-definer helper so the policy stays a single index-friendly lookup.

alter table user_profiles     enable row level security;
alter table user_dimensions   enable row level security;
alter table projects          enable row level security;
alter table patia_entries     enable row level security;
alter table pawa_entries      enable row level security;
alter table price_configs     enable row level security;
alter table project_snapshots enable row level security;

create policy "own profile"    on user_profiles   for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own dimensions" on user_dimensions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own projects"   on projects        for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Returns true when the current user owns the given project.
-- security definer so it can read projects regardless of the caller's RLS.
create or replace function owns_project(pid uuid) returns boolean
language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from projects where id = pid and user_id = auth.uid()
  )
$$;

create policy "own patia"     on patia_entries     for all
  using (owns_project(project_id)) with check (owns_project(project_id));
create policy "own pawa"      on pawa_entries      for all
  using (owns_project(project_id)) with check (owns_project(project_id));
create policy "own prices"    on price_configs     for all
  using (owns_project(project_id)) with check (owns_project(project_id));
create policy "own snapshots" on project_snapshots for all
  using (owns_project(project_id)) with check (owns_project(project_id));

-- ── Rollback ────────────────────────────────────────────────────────────────
-- drop function if exists owns_project(uuid) cascade;
-- (dropping the tables in the prior migration removes their policies.)


-- ============================================================
-- 20260527000003_seed_new_user.sql
-- ============================================================
-- Seed a profile and default dimension set the moment a user is created.
-- Runs as a trigger on auth.users so the rows exist before the client's first
-- read, avoiding a race on first sign-in. user_dimensions takes its column
-- defaults (the Excel-derived lists). security definer to bypass RLS on insert.

create or replace function handle_new_user() returns trigger
language plpgsql security definer
set search_path = public as $$
begin
  insert into public.user_profiles (user_id) values (new.id)
    on conflict (user_id) do nothing;
  insert into public.user_dimensions (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Rollback ────────────────────────────────────────────────────────────────
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop function if exists handle_new_user();


