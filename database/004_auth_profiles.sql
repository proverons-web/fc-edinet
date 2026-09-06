-- FC EDINET v0.7
-- Пользовательские профили, роли и базовые staff-права.
-- Запускать ПОСЛЕ 003_news.sql.

-- 1. Роли пользователей.
do $$
begin
  create type public.user_role as enum ('fan', 'author', 'editor', 'admin');
exception
  when duplicate_object then null;
end $$;

-- 2. Публичная профильная таблица, связанная с auth.users.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'fan',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 3. Обновление updated_at.
create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profile_updated_at on public.profiles;
create trigger set_profile_updated_at
before update on public.profiles
for each row execute function public.set_profile_updated_at();

-- 4. Автоматически создаём profile после регистрации в Supabase Auth.
-- security definer нужен, чтобы Auth-триггер мог писать в public.profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    'fan'::public.user_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 5. Если пользователи уже существовали до v0.7 — создаём им profiles.
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
  'fan'::public.user_role
from auth.users u
on conflict (id) do nothing;

-- 6. Helper-функции для будущих RLS-политик редакции.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
  limit 1;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.current_user_role() in (
      'author'::public.user_role,
      'editor'::public.user_role,
      'admin'::public.user_role
    ),
    false
  );
$$;

create or replace function public.is_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.current_user_role() in (
      'editor'::public.user_role,
      'admin'::public.user_role
    ),
    false
  );
$$;

-- 7. Убираем лишние права и выдаём минимум необходимого.
revoke all on table public.profiles from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name, avatar_url) on table public.profiles to authenticated;

-- Пользователь видит только свой профиль.
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

-- Пользователь может менять только свою строку.
-- Колонка role дополнительно защищена column-level GRANT:
-- authenticated НЕ имеет UPDATE(role).
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- 8. Сотрудники могут читать все новости, включая draft/review.
-- Существующая public policy по-прежнему показывает гостям только published.
drop policy if exists "Staff can read all news" on public.news;
create policy "Staff can read all news"
on public.news
for select
to authenticated
using (public.is_staff());

-- Категории staff также может читать вне зависимости от is_active.
drop policy if exists "Staff can read all news categories" on public.news_categories;
create policy "Staff can read all news categories"
on public.news_categories
for select
to authenticated
using (public.is_staff());

-- В v0.7 мы ещё НЕ выдаём staff права INSERT/UPDATE/DELETE news.
-- Это будет v0.8, когда создадим полноценный редактор новостей.

-- ПРИМЕР: как владельцу проекта вручную назначить себе admin.
-- ЗАМЕНИТЕ email на свой и выполните отдельно:
--
-- update public.profiles
-- set role = 'admin'
-- where email = 'your@email.com';
