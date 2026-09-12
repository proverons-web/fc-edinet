-- FC EDINET v1.8
-- Управление блоками главной страницы, закреплённой новостью и специальным баннером.
-- Запускать ПОСЛЕ 017_partners.sql.

create table if not exists public.homepage_sections (
  section_key text primary key,
  name text generated always as (section_key) stored,
  is_enabled boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  updated_at timestamptz not null default now(),
  constraint homepage_sections_key_check check (
    section_key in ('matches','standings','news','players','media','partners')
  )
);

insert into public.homepage_sections (section_key, is_enabled, display_order)
values
  ('matches', true, 10),
  ('standings', true, 20),
  ('news', true, 30),
  ('players', true, 40),
  ('media', true, 50),
  ('partners', true, 60)
on conflict (section_key) do nothing;

drop trigger if exists homepage_sections_set_updated_at on public.homepage_sections;
create trigger homepage_sections_set_updated_at
before update on public.homepage_sections
for each row execute function public.set_generic_updated_at();

alter table public.homepage_sections enable row level security;

grant select on table public.homepage_sections to anon, authenticated;
grant insert, update, delete on table public.homepage_sections to authenticated;

drop policy if exists "Public can read homepage sections" on public.homepage_sections;
create policy "Public can read homepage sections"
on public.homepage_sections
for select
to public
using (true);

drop policy if exists "Editors manage homepage sections" on public.homepage_sections;
drop policy if exists "Editors insert homepage sections" on public.homepage_sections;
drop policy if exists "Editors update homepage sections" on public.homepage_sections;
drop policy if exists "Editors delete homepage sections" on public.homepage_sections;

create policy "Editors insert homepage sections"
on public.homepage_sections
for insert
to authenticated
with check (public.is_editor_or_admin());

create policy "Editors update homepage sections"
on public.homepage_sections
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

create policy "Editors delete homepage sections"
on public.homepage_sections
for delete
to authenticated
using (public.is_editor_or_admin());

create table if not exists public.homepage_settings (
  id smallint primary key default 1 check (id = 1),
  show_pinned_news boolean not null default false,
  pinned_news_id bigint references public.news(id) on delete set null,

  banner_enabled boolean not null default false,
  banner_eyebrow text not null default 'FC EDINEȚ',
  banner_title text not null default 'Вместе с клубом',
  banner_text text not null default '',
  banner_button_text text not null default 'Подробнее',
  banner_button_href text not null default '/club',
  banner_image_url text,
  banner_overlay_opacity integer not null default 72
    check (banner_overlay_opacity between 0 and 95),
  banner_background_position text not null default 'center'
    check (banner_background_position in ('center','top','bottom','left','right')),

  updated_at timestamptz not null default now()
);

insert into public.homepage_settings (id)
values (1)
on conflict (id) do nothing;

drop trigger if exists homepage_settings_set_updated_at on public.homepage_settings;
create trigger homepage_settings_set_updated_at
before update on public.homepage_settings
for each row execute function public.set_generic_updated_at();

alter table public.homepage_settings enable row level security;

grant select on table public.homepage_settings to anon, authenticated;
grant insert, update, delete on table public.homepage_settings to authenticated;

drop policy if exists "Public can read homepage settings" on public.homepage_settings;
create policy "Public can read homepage settings"
on public.homepage_settings
for select
to public
using (true);

drop policy if exists "Editors manage homepage settings" on public.homepage_settings;
drop policy if exists "Editors insert homepage settings" on public.homepage_settings;
drop policy if exists "Editors update homepage settings" on public.homepage_settings;
drop policy if exists "Editors delete homepage settings" on public.homepage_settings;

create policy "Editors insert homepage settings"
on public.homepage_settings
for insert
to authenticated
with check (public.is_editor_or_admin());

create policy "Editors update homepage settings"
on public.homepage_settings
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

create policy "Editors delete homepage settings"
on public.homepage_settings
for delete
to authenticated
using (public.is_editor_or_admin());

create index if not exists homepage_settings_pinned_news_idx
  on public.homepage_settings (pinned_news_id);

-- Подключаем новые настройки к журналу действий.
drop trigger if exists audit_log_homepage_sections on public.homepage_sections;
create trigger audit_log_homepage_sections
after insert or update or delete on public.homepage_sections
for each row execute function public.write_audit_log();

drop trigger if exists audit_log_homepage_settings on public.homepage_settings;
create trigger audit_log_homepage_settings
after insert or update or delete on public.homepage_settings
for each row execute function public.write_audit_log();
