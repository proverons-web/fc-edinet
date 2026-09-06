-- FC EDINET v0.5
-- Расширяем существующую таблицу players и создаём публичный бакет фотографий.
-- Запускать после 001_players.sql.

alter table public.players
  add column if not exists preferred_foot text,
  add column if not exists hometown text,
  add column if not exists previous_club text,
  add column if not exists joined_at date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_preferred_foot_check'
  ) then
    alter table public.players
      add constraint players_preferred_foot_check
      check (
        preferred_foot is null
        or preferred_foot in ('left', 'right', 'both')
      );
  end if;
end $$;

create index if not exists players_slug_idx on public.players (slug);
create index if not exists players_active_position_order_idx
  on public.players (is_active, position, display_order);

-- Публичный бакет: фотографии можно читать без авторизации.
-- Загрузка через сайт НЕ разрешена. Пока загружаем только через Dashboard Supabase.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'players',
  'players',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can view player photos'
  ) then
    create policy "Public can view player photos"
      on storage.objects
      for select
      to public
      using (bucket_id = 'players');
  end if;
end $$;

-- Заполняем дополнительные поля у тестовых записей, если они существуют.
update public.players
set
  nationality = coalesce(nationality, 'Moldova'),
  hometown = coalesce(hometown, 'Edineț'),
  bio = coalesce(
    bio,
    'Тестовый профиль игрока. Позже здесь будет официальная биография футболиста.'
  )
where first_name ilike 'Test%';

-- Пример ручного обновления реального игрока:
-- update public.players
-- set
--   first_name = 'Ion',
--   last_name = 'Popescu',
--   slug = 'ion-popescu',
--   shirt_number = 10,
--   position = 'forward',
--   birth_date = '2001-05-12',
--   nationality = 'Moldova',
--   height_cm = 181,
--   preferred_foot = 'right',
--   hometown = 'Edineț',
--   previous_club = 'Previous Club',
--   joined_at = '2026-07-01',
--   bio = 'Короткая официальная биография.',
--   photo_url = 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/players/ion-popescu.webp',
--   display_order = 10
-- where slug = 'test-forward';
