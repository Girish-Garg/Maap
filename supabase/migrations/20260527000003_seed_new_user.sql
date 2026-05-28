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
