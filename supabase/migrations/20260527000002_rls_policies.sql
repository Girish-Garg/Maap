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
