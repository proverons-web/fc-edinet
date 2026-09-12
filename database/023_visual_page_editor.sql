-- FC EDINET v2.1.1
-- Visual Page Editor: precise hero framing, desktop/mobile variants,
-- design drafts and publication history.
-- Run AFTER 022_comments_moderation_translation_diagnostics.sql.

alter table public.homepage_hero
  add column if not exists desktop_position_x integer,
  add column if not exists desktop_position_y integer,
  add column if not exists desktop_zoom_percent integer,
  add column if not exists mobile_background_image_url text,
  add column if not exists mobile_position_x integer,
  add column if not exists mobile_position_y integer,
  add column if not exists mobile_zoom_percent integer,
  add column if not exists hero_height_desktop integer,
  add column if not exists hero_height_mobile integer,
  add column if not exists text_alignment text,
  add column if not exists show_match_card boolean;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'homepage_hero_desktop_position_x_check'
  ) then
    alter table public.homepage_hero add constraint homepage_hero_desktop_position_x_check
      check (desktop_position_x is null or desktop_position_x between 0 and 100);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'homepage_hero_desktop_position_y_check'
  ) then
    alter table public.homepage_hero add constraint homepage_hero_desktop_position_y_check
      check (desktop_position_y is null or desktop_position_y between 0 and 100);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'homepage_hero_desktop_zoom_percent_check'
  ) then
    alter table public.homepage_hero add constraint homepage_hero_desktop_zoom_percent_check
      check (desktop_zoom_percent is null or desktop_zoom_percent between 100 and 240);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'homepage_hero_mobile_position_x_check'
  ) then
    alter table public.homepage_hero add constraint homepage_hero_mobile_position_x_check
      check (mobile_position_x is null or mobile_position_x between 0 and 100);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'homepage_hero_mobile_position_y_check'
  ) then
    alter table public.homepage_hero add constraint homepage_hero_mobile_position_y_check
      check (mobile_position_y is null or mobile_position_y between 0 and 100);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'homepage_hero_mobile_zoom_percent_check'
  ) then
    alter table public.homepage_hero add constraint homepage_hero_mobile_zoom_percent_check
      check (mobile_zoom_percent is null or mobile_zoom_percent between 100 and 300);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'homepage_hero_height_desktop_check'
  ) then
    alter table public.homepage_hero add constraint homepage_hero_height_desktop_check
      check (hero_height_desktop is null or hero_height_desktop between 420 and 900);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'homepage_hero_height_mobile_check'
  ) then
    alter table public.homepage_hero add constraint homepage_hero_height_mobile_check
      check (hero_height_mobile is null or hero_height_mobile between 360 and 850);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'homepage_hero_text_alignment_check'
  ) then
    alter table public.homepage_hero add constraint homepage_hero_text_alignment_check
      check (text_alignment is null or text_alignment in ('left','center','right'));
  end if;
end $$;

create table if not exists public.homepage_design_draft (
  id smallint primary key default 1 check (id = 1),
  background_image_url text,
  mobile_background_image_url text,
  desktop_position_x integer not null default 50 check (desktop_position_x between 0 and 100),
  desktop_position_y integer not null default 50 check (desktop_position_y between 0 and 100),
  desktop_zoom_percent integer not null default 100 check (desktop_zoom_percent between 100 and 240),
  mobile_position_x integer not null default 50 check (mobile_position_x between 0 and 100),
  mobile_position_y integer not null default 50 check (mobile_position_y between 0 and 100),
  mobile_zoom_percent integer not null default 100 check (mobile_zoom_percent between 100 and 300),
  hero_height_desktop integer not null default 650 check (hero_height_desktop between 420 and 900),
  hero_height_mobile integer not null default 520 check (hero_height_mobile between 360 and 850),
  overlay_opacity integer not null default 72 check (overlay_opacity between 0 and 95),
  text_alignment text not null default 'left' check (text_alignment in ('left','center','right')),
  show_match_card boolean not null default true,
  section_order jsonb not null default '["matches","standings","news","players","media","partners"]'::jsonb,
  section_visibility jsonb not null default '{"matches":true,"standings":true,"news":true,"players":true,"media":true,"partners":true}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_design_versions (
  id bigint generated by default as identity primary key,
  label text,
  snapshot jsonb not null,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists homepage_design_draft_updated_by_idx
  on public.homepage_design_draft (updated_by);
create index if not exists homepage_design_versions_created_idx
  on public.homepage_design_versions (created_at desc);
create index if not exists homepage_design_versions_published_by_idx
  on public.homepage_design_versions (published_by, created_at desc);

alter table public.homepage_design_draft enable row level security;
alter table public.homepage_design_versions enable row level security;

revoke all on table public.homepage_design_draft from public, anon;
revoke all on table public.homepage_design_versions from public, anon;
grant select, insert, update, delete on table public.homepage_design_draft to authenticated;
grant select, insert on table public.homepage_design_versions to authenticated;
grant usage, select on sequence public.homepage_design_versions_id_seq to authenticated;

drop policy if exists "Editors manage homepage design draft" on public.homepage_design_draft;
create policy "Editors manage homepage design draft"
on public.homepage_design_draft
for all
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "Editors read homepage design versions" on public.homepage_design_versions;
create policy "Editors read homepage design versions"
on public.homepage_design_versions
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "Editors create homepage design versions" on public.homepage_design_versions;
create policy "Editors create homepage design versions"
on public.homepage_design_versions
for insert
to authenticated
with check (public.is_editor_or_admin());

-- No public policies are created for drafts/history. Published values remain in
-- homepage_hero/homepage_sections, which already have their normal public read policies.
