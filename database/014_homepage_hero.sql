-- FC EDINET v1.4.1
-- Настраиваемый hero-блок главной страницы.
-- Запускать ПОСЛЕ 013_media.sql.

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

-- Отдельный bucket для изображений главной страницы.
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
