-- FC EDINET v2.0
-- Кабинет болельщика: расширенный профиль, избранные игроки/матчи и аватары.
-- Выполнять после 020_auto_translation.sql.

-- ============================================================
-- 1. Расширяем профиль пользователя.
-- ============================================================
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists city text,
  add column if not exists preferred_language text not null default 'ru',
  add column if not exists notifications_enabled boolean not null default true;

-- Сохраняем существующие имена как отображаемые, если новое поле пустое.
update public.profiles
set display_name = full_name
where display_name is null
  and nullif(trim(coalesce(full_name, '')), '') is not null;

-- Убираем возможный старый constraint и создаём понятную проверку языка.
alter table public.profiles
  drop constraint if exists profiles_preferred_language_check;
alter table public.profiles
  add constraint profiles_preferred_language_check
  check (preferred_language in ('ru', 'ro'));

-- Пользователь по-прежнему НЕ получает UPDATE(role).
revoke update on table public.profiles from authenticated;
grant update (full_name, display_name, avatar_url, city, preferred_language, notifications_enabled)
  on table public.profiles to authenticated;

-- ============================================================
-- 2. Любимые игроки.
-- ============================================================
create table if not exists public.favorite_players (
  user_id uuid not null,
  player_id uuid not null,
  created_at timestamptz not null default now(),
  constraint favorite_players_pkey primary key (user_id, player_id),
  constraint favorite_players_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade,
  constraint favorite_players_player_id_fkey
    foreign key (player_id) references public.players(id) on delete cascade
);

create index if not exists favorite_players_player_id_idx
  on public.favorite_players (player_id);
create index if not exists favorite_players_user_created_idx
  on public.favorite_players (user_id, created_at desc);

alter table public.favorite_players enable row level security;
revoke all on table public.favorite_players from public, anon, authenticated;
grant select, insert, delete on table public.favorite_players to authenticated;

drop policy if exists "Users read own favorite players" on public.favorite_players;
create policy "Users read own favorite players"
on public.favorite_players
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users add own favorite players" on public.favorite_players;
create policy "Users add own favorite players"
on public.favorite_players
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own favorite players" on public.favorite_players;
create policy "Users delete own favorite players"
on public.favorite_players
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- ============================================================
-- 3. Сохранённые матчи.
-- ============================================================
create table if not exists public.favorite_matches (
  user_id uuid not null,
  match_id bigint not null,
  created_at timestamptz not null default now(),
  constraint favorite_matches_pkey primary key (user_id, match_id),
  constraint favorite_matches_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade,
  constraint favorite_matches_match_id_fkey
    foreign key (match_id) references public.matches(id) on delete cascade
);

create index if not exists favorite_matches_match_id_idx
  on public.favorite_matches (match_id);
create index if not exists favorite_matches_user_created_idx
  on public.favorite_matches (user_id, created_at desc);

alter table public.favorite_matches enable row level security;
revoke all on table public.favorite_matches from public, anon, authenticated;
grant select, insert, delete on table public.favorite_matches to authenticated;

drop policy if exists "Users read own favorite matches" on public.favorite_matches;
create policy "Users read own favorite matches"
on public.favorite_matches
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users add own favorite matches" on public.favorite_matches;
create policy "Users add own favorite matches"
on public.favorite_matches
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own favorite matches" on public.favorite_matches;
create policy "Users delete own favorite matches"
on public.favorite_matches
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- ============================================================
-- 4. Storage bucket для аватаров.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  3145728,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Публичное чтение аватаров.
drop policy if exists "Public can view avatars" on storage.objects;
create policy "Public can view avatars"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

-- Каждый пользователь пишет только в свою папку /<auth.uid()>/...
drop policy if exists "Users upload own avatars" on storage.objects;
create policy "Users upload own avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users update own avatars" on storage.objects;
create policy "Users update own avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users delete own avatars" on storage.objects;
create policy "Users delete own avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
