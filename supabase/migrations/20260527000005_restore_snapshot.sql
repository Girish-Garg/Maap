-- Transactional snapshot restore (architecture.md §Restore snapshot).
-- Runs as one function call = one transaction, so the delete-then-insert can
-- never leave the project half-restored. security definer to bypass RLS, with
-- an explicit ownership check so a user can only restore their own projects.

create or replace function restore_snapshot(snapshot_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
  d   jsonb;
begin
  select project_id, data into pid, d
  from project_snapshots
  where id = snapshot_id;

  if pid is null then
    raise exception 'snapshot % not found', snapshot_id;
  end if;

  if not exists (
    select 1 from projects where id = pid and user_id = auth.uid()
  ) then
    raise exception 'not authorized to restore this snapshot';
  end if;

  -- Replace current cell data wholesale.
  delete from patia_entries where project_id = pid;
  delete from pawa_entries  where project_id = pid;

  insert into patia_entries (project_id, length_ft, width_in, thickness_in, quantity)
  select pid,
         (e->>'length_ft')::numeric,
         (e->>'width_in')::numeric,
         (e->>'thickness_in')::numeric,
         (e->>'quantity')::int
  from jsonb_array_elements(coalesce(d->'patia', '[]'::jsonb)) e;

  insert into pawa_entries (project_id, length_in, size_side, quantity)
  select pid,
         (e->>'length_in')::numeric,
         (e->>'size_side')::numeric,
         (e->>'quantity')::int
  from jsonb_array_elements(coalesce(d->'pawa', '[]'::jsonb)) e;

  -- Restore prices when the snapshot carries them.
  if d ? 'prices' then
    update price_configs set
      frame_3_4       = coalesce((d->'prices'->>'frame_3_4')::numeric, frame_3_4),
      patia_1_5_to_4  = coalesce((d->'prices'->>'patia_1_5_to_4')::numeric, patia_1_5_to_4),
      patia_4_5_to_5  = coalesce((d->'prices'->>'patia_4_5_to_5')::numeric, patia_4_5_to_5),
      patia_5_5_to_up = coalesce((d->'prices'->>'patia_5_5_to_up')::numeric, patia_5_5_to_up),
      pawa            = coalesce((d->'prices'->>'pawa')::numeric, pawa)
    where project_id = pid;
  end if;

  update projects set updated_at = now() where id = pid;
end;
$$;

-- ── Rollback ────────────────────────────────────────────────────────────────
-- drop function if exists restore_snapshot(uuid);
