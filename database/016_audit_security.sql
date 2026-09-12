-- FC EDINET v1.6.2
-- Журнал действий, усиление безопасности и небольшое исправление production-схемы.
-- Запускать ПОСЛЕ 015_admin_users.sql.

-- ============================================================
-- 1. Production repair: homepage_hero мог не попасть в рабочую БД.
-- Блок идемпотентный: если v1.4.1 уже применена, данные не перезапишутся.
-- ============================================================
create table if not exists public.homepage_hero (
  id smallint primary key default 1 check (id = 1),
  eyebrow text not null default 'ЕДИНЕЦ • МОЛДОВА',
  title_main text not null default 'ВМЕСТЕ',
  title_accent text not null default 'ЗА ЕДИНЕЦ',
  description text not null default
    'Новости клуба, матчи, состав, история и медиаконтент — в одном официальном пространстве.',
  primary_button_text text not null default 'Смотреть матчи',
  primary_button_href text not null default '/matches',
  secondary_button_text text not null default 'Последние новости',
  secondary_button_href text not null default '/news',
  background_image_url text,
  overlay_opacity integer not null default 72
    check (overlay_opacity between 0 and 95),
  background_position text not null default 'center'
    check (background_position in ('center','top','bottom','left','right')),
  show_primary_button boolean not null default true,
  show_secondary_button boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.homepage_hero (id)
values (1)
on conflict (id) do nothing;

drop trigger if exists homepage_hero_set_updated_at on public.homepage_hero;
create trigger homepage_hero_set_updated_at
before update on public.homepage_hero
for each row execute function public.set_generic_updated_at();

alter table public.homepage_hero enable row level security;

grant select on table public.homepage_hero to anon, authenticated;
grant insert, update, delete on table public.homepage_hero to authenticated;

drop policy if exists "Public can read homepage hero" on public.homepage_hero;
create policy "Public can read homepage hero"
on public.homepage_hero
for select
to public
using (true);

drop policy if exists "Editors manage homepage hero" on public.homepage_hero;
create policy "Editors manage homepage hero"
on public.homepage_hero
for all
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'homepage',
  'homepage',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view homepage images" on storage.objects;
create policy "Public can view homepage images"
on storage.objects
for select
to public
using (bucket_id = 'homepage');

drop policy if exists "Editors upload homepage images" on storage.objects;
create policy "Editors upload homepage images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'homepage'
  and public.is_editor_or_admin()
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
);

drop policy if exists "Editors delete homepage images" on storage.objects;
create policy "Editors delete homepage images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'homepage'
  and public.is_editor_or_admin()
);

-- ============================================================
-- 2. Security hardening найденных Supabase Advisor замечаний.
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Эти helper-функции не обязаны обходить RLS: authenticated и так может
-- прочитать собственный profiles. SECURITY INVOKER уменьшает поверхность атаки.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security invoker
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
security invoker
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
security invoker
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

-- Trigger function регистрации не должна быть RPC endpoint для клиента.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.set_profile_updated_at() from public, anon, authenticated;
revoke all on function public.set_generic_updated_at() from public, anon, authenticated;

revoke all on function public.current_user_role() from public, anon;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_editor_or_admin() from public, anon;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_editor_or_admin() to authenticated;

-- ============================================================
-- 3. Журнал действий.
-- ============================================================
create table if not exists public.audit_log (
  id bigint generated by default as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  actor_role public.user_role,
  action text not null check (action in ('insert','update','delete')),
  entity_type text not null,
  entity_id text,
  entity_label text,
  changed_fields text[] not null default '{}',
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_at_idx
  on public.audit_log (created_at desc);
create index if not exists audit_log_actor_idx
  on public.audit_log (actor_user_id, created_at desc);
create index if not exists audit_log_entity_idx
  on public.audit_log (entity_type, created_at desc);
create index if not exists audit_log_action_idx
  on public.audit_log (action, created_at desc);

alter table public.audit_log enable row level security;

revoke all on table public.audit_log from public, anon, authenticated;
grant select on table public.audit_log to authenticated;

-- Sequence используется только SECURITY DEFINER trigger-функцией.
revoke all on sequence public.audit_log_id_seq from public, anon, authenticated;

drop policy if exists "Admins can read audit log" on public.audit_log;
create policy "Admins can read audit log"
on public.audit_log
for select
to authenticated
using (public.current_user_role() = 'admin'::public.user_role);

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_email text;
  v_actor_role public.user_role;
  v_old jsonb;
  v_new jsonb;
  v_snapshot jsonb;
  v_entity_id text;
  v_entity_label text;
  v_changed_fields text[] := array[]::text[];
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_snapshot := v_new;
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_snapshot := v_new;

    select coalesce(array_agg(key order by key), array[]::text[])
    into v_changed_fields
    from (
      select key from jsonb_object_keys(coalesce(v_old, '{}'::jsonb)) as old_keys(key)
      union
      select key from jsonb_object_keys(coalesce(v_new, '{}'::jsonb)) as new_keys(key)
    ) keys
    where key not in ('updated_at', 'created_at')
      and (v_old -> key) is distinct from (v_new -> key);

    -- Не засоряем журнал update-событиями, где поменялся только updated_at.
    if coalesce(cardinality(v_changed_fields), 0) = 0 then
      return new;
    end if;

    -- Для profiles нас интересует именно изменение прав. Изменение своего имени
    -- пользователем не является административным событием.
    if tg_table_name = 'profiles'
      and not ('role' = any(v_changed_fields))
    then
      return new;
    end if;
  elsif tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_snapshot := v_old;
  else
    return null;
  end if;

  if v_actor is not null then
    select p.email, p.role
    into v_actor_email, v_actor_role
    from public.profiles p
    where p.id = v_actor;
  end if;

  v_entity_id := coalesce(
    v_snapshot ->> 'id',
    v_snapshot ->> 'slug',
    v_snapshot ->> 'email'
  );

  v_entity_label := coalesce(
    nullif(v_snapshot ->> 'title', ''),
    nullif(v_snapshot ->> 'name', ''),
    nullif(v_snapshot ->> 'full_name', ''),
    nullif(v_snapshot ->> 'club_name', ''),
    nullif(v_snapshot ->> 'slug', ''),
    case
      when v_entity_id is not null then 'ID ' || v_entity_id
      else null
    end
  );

  insert into public.audit_log (
    actor_user_id,
    actor_email,
    actor_role,
    action,
    entity_type,
    entity_id,
    entity_label,
    changed_fields,
    old_data,
    new_data
  )
  values (
    v_actor,
    v_actor_email,
    v_actor_role,
    lower(tg_op),
    tg_table_name,
    v_entity_id,
    v_entity_label,
    v_changed_fields,
    v_old,
    v_new
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function public.write_audit_log() from public, anon, authenticated;

-- ============================================================
-- 4. Подключаем журнал к ключевым CMS-таблицам.
-- ============================================================
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'news',
    'news_categories',
    'players',
    'competitions',
    'teams',
    'matches',
    'standings',
    'club_profile',
    'club_leadership',
    'club_achievements',
    'media_albums',
    'media_photos',
    'media_videos',
    'homepage_hero'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format(
        'drop trigger if exists %I on public.%I',
        'audit_log_' || table_name,
        table_name
      );

      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.write_audit_log()',
        'audit_log_' || table_name,
        table_name
      );
    end if;
  end loop;
end $$;

-- ============================================================
-- 5. Индексы по FK, которые были отмечены Supabase Advisor.
-- ============================================================
create index if not exists matches_competition_id_idx
  on public.matches (competition_id);
create index if not exists matches_home_team_id_idx
  on public.matches (home_team_id);
create index if not exists matches_away_team_id_idx
  on public.matches (away_team_id);
create index if not exists news_published_by_idx
  on public.news (published_by);
create index if not exists standings_team_id_idx
  on public.standings (team_id);
