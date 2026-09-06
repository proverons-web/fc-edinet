-- FC EDINET v0.9
-- Управление составом через собственную админ-панель.
-- Запускать ПОСЛЕ 005_editorial_news.sql.

alter table public.players enable row level security;

-- Даём authenticated технические права на таблицу.
-- Реальный доступ к строкам по-прежнему ограничивает RLS.
grant select, insert, update, delete on table public.players to authenticated;

-- Если id использует sequence, даём authenticated право получить следующий id.
do $$
declare
  seq_name text;
begin
  select pg_get_serial_sequence('public.players', 'id') into seq_name;

  if seq_name is not null then
    execute format('grant usage, select on sequence %s to authenticated', seq_name);
  end if;
end $$;

-- Editor/Admin видят и активных, и архивных игроков.
drop policy if exists "Editors can read all players" on public.players;
create policy "Editors can read all players"
on public.players
for select
to authenticated
using (public.is_editor_or_admin());

-- Editor/Admin могут добавлять игроков.
drop policy if exists "Editors can create players" on public.players;
create policy "Editors can create players"
on public.players
for insert
to authenticated
with check (public.is_editor_or_admin());

-- Editor/Admin могут изменять игроков.
drop policy if exists "Editors can update players" on public.players;
create policy "Editors can update players"
on public.players
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

-- Окончательно удалять игроков может только Admin.
drop policy if exists "Admins can delete players" on public.players;
create policy "Admins can delete players"
on public.players
for delete
to authenticated
using (
  public.current_user_role() = 'admin'::public.user_role
);

-- Storage bucket players уже создан в 002_player_profiles.sql.
-- Публичное чтение фото также уже включено.

-- Editor/Admin могут загружать фотографии в собственную user-папку.
drop policy if exists "Editors upload player photos" on storage.objects;
create policy "Editors upload player photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'players'
  and public.is_editor_or_admin()
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

-- Editor/Admin могут удалить старую фотографию игрока при замене.
drop policy if exists "Editors delete player photos" on storage.objects;
create policy "Editors delete player photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'players'
  and public.is_editor_or_admin()
);
