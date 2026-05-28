-- Read-only public share links for a project.
--
-- A project carries an optional unguessable token (public_share_id). The
-- public bill is fetched ONLY through a security-definer RPC keyed on that
-- exact token - there is deliberately no broad anonymous SELECT policy, so a
-- visitor can never enumerate or read projects they don't have the link for.

alter table projects add column if not exists public_share_id uuid unique;

create or replace function get_shared_project(share_token uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'project', jsonb_build_object(
      'name', p.name,
      'client_name', p.client_name,
      'client_address', p.client_address,
      'project_date', p.project_date
    ),
    'business', (
      select jsonb_build_object(
        'business_name', up.business_name,
        'business_address', up.business_address,
        'business_phone', up.business_phone,
        'logo_url', up.logo_url
      )
      from user_profiles up
      where up.user_id = p.user_id
    ),
    'prices', (
      select jsonb_build_object(
        'frame_3_4', pc.frame_3_4,
        'patia_1_5_to_4', pc.patia_1_5_to_4,
        'patia_4_5_to_5', pc.patia_4_5_to_5,
        'patia_5_5_to_up', pc.patia_5_5_to_up,
        'pawa', pc.pawa
      )
      from price_configs pc
      where pc.project_id = p.id
    ),
    'patia', coalesce((
      select jsonb_agg(jsonb_build_object(
        'length_ft', e.length_ft, 'width_in', e.width_in,
        'thickness_in', e.thickness_in, 'quantity', e.quantity))
      from patia_entries e where e.project_id = p.id
    ), '[]'::jsonb),
    'pawa', coalesce((
      select jsonb_agg(jsonb_build_object(
        'length_in', e.length_in, 'size_side', e.size_side, 'quantity', e.quantity))
      from pawa_entries e where e.project_id = p.id
    ), '[]'::jsonb)
  )
  from projects p
  where p.public_share_id = share_token
  limit 1;
$$;

grant execute on function get_shared_project(uuid) to anon, authenticated;

-- ── Rollback ────────────────────────────────────────────────────────────────
-- drop function if exists get_shared_project(uuid);
-- alter table projects drop column if exists public_share_id;
