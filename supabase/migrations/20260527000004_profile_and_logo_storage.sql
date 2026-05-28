-- Phase 2: business profile fields for the PDF bill header, and a Storage
-- bucket for optional business logos.

-- Address + phone shown on the quotation header (business_name already exists).
alter table user_profiles
  add column if not exists business_address text,
  add column if not exists business_phone text;

-- Public bucket for logos: a logo is not sensitive, and a public URL embeds
-- directly into the client-rendered PDF (and works offline once cached).
-- Writes are still gated to the owner's own folder; reads are public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos', 'logos', true, 1048576,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Files live under logos/<user_id>/..., so the first path segment is the owner.
create policy "logo public read" on storage.objects
  for select using (bucket_id = 'logos');

create policy "logo owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "logo owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "logo owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Rollback ────────────────────────────────────────────────────────────────
-- drop policy if exists "logo public read" on storage.objects;
-- drop policy if exists "logo owner insert" on storage.objects;
-- drop policy if exists "logo owner update" on storage.objects;
-- drop policy if exists "logo owner delete" on storage.objects;
-- delete from storage.buckets where id = 'logos';
-- alter table user_profiles drop column if exists business_address,
--   drop column if exists business_phone;
