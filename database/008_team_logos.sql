-- FC EDINET v1.1
-- Логотипы команд (Storage + RLS).
-- Запускать ПОСЛЕ 007_matches.sql.

insert into storage.buckets (id, name, public)
values ('teams', 'teams', true)
on conflict (id) do nothing;

drop policy if exists "Public can view team logos" on storage.objects;
create policy "Public can view team logos"
on storage.objects
for select
to public
using (bucket_id = 'teams');

drop policy if exists "Editors upload team logos" on storage.objects;
create policy "Editors upload team logos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'teams'
  and public.is_editor_or_admin()
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'svg')
);

drop policy if exists "Editors update team logos" on storage.objects;
create policy "Editors update team logos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'teams'
  and public.is_editor_or_admin()
)
with check (
  bucket_id = 'teams'
  and public.is_editor_or_admin()
);

drop policy if exists "Editors delete team logos" on storage.objects;
create policy "Editors delete team logos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'teams'
  and public.is_editor_or_admin()
);
