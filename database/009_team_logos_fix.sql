-- FC EDINET v1.1.1
-- FIX: гарантированно создаём/обновляем Storage bucket для логотипов команд.
-- Запускать после 008_team_logos.sql. Можно запускать повторно.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'teams',
  'teams',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Политики делаем повторяемыми.
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

-- Контрольная проверка: после Run должна вернуться одна строка teams.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'teams';
