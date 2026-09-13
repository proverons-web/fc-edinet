-- FC EDINET v2.1.4
-- Image Editor 2.0: independent desktop/tablet/mobile images and reusable media library.
-- Run AFTER 025_homepage_canvas_2.sql.

alter table public.homepage_hero
  add column if not exists tablet_background_image_url text;

alter table public.homepage_design_draft
  add column if not exists tablet_background_image_url text;

alter table public.site_page_designs
  add column if not exists tablet_image_url text,
  add column if not exists tablet_position_x integer not null default 50,
  add column if not exists tablet_position_y integer not null default 50,
  add column if not exists tablet_zoom_percent integer not null default 100,
  add column if not exists hero_height_tablet integer not null default 290;

alter table public.site_page_design_drafts
  add column if not exists tablet_image_url text,
  add column if not exists tablet_position_x integer not null default 50,
  add column if not exists tablet_position_y integer not null default 50,
  add column if not exists tablet_zoom_percent integer not null default 100,
  add column if not exists hero_height_tablet integer not null default 290;

-- Start Tablet from the current Desktop composition so upgrading does not shift existing pages.
update public.site_page_designs
set tablet_position_x = desktop_position_x,
    tablet_position_y = desktop_position_y,
    tablet_zoom_percent = desktop_zoom_percent,
    hero_height_tablet = round((hero_height_desktop + hero_height_mobile) / 2.0)::integer;

update public.site_page_design_drafts
set tablet_position_x = desktop_position_x,
    tablet_position_y = desktop_position_y,
    tablet_zoom_percent = desktop_zoom_percent,
    hero_height_tablet = round((hero_height_desktop + hero_height_mobile) / 2.0)::integer;


-- Image Editor 2.0 allows a little more non-destructive zoom after physical crop.
alter table public.site_page_designs drop constraint if exists site_page_designs_desktop_zoom_percent_check;
alter table public.site_page_designs add constraint site_page_designs_desktop_zoom_percent_check check (desktop_zoom_percent between 100 and 300);
alter table public.site_page_design_drafts drop constraint if exists site_page_design_drafts_desktop_zoom_percent_check;
alter table public.site_page_design_drafts add constraint site_page_design_drafts_desktop_zoom_percent_check check (desktop_zoom_percent between 100 and 300);

do $$
begin
  if not exists (select 1 from pg_constraint where conname='site_page_designs_tablet_position_x_check') then
    alter table public.site_page_designs add constraint site_page_designs_tablet_position_x_check check (tablet_position_x between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname='site_page_designs_tablet_position_y_check') then
    alter table public.site_page_designs add constraint site_page_designs_tablet_position_y_check check (tablet_position_y between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname='site_page_designs_tablet_zoom_percent_check') then
    alter table public.site_page_designs add constraint site_page_designs_tablet_zoom_percent_check check (tablet_zoom_percent between 100 and 300);
  end if;
  if not exists (select 1 from pg_constraint where conname='site_page_designs_hero_height_tablet_check') then
    alter table public.site_page_designs add constraint site_page_designs_hero_height_tablet_check check (hero_height_tablet between 180 and 950);
  end if;
  if not exists (select 1 from pg_constraint where conname='site_page_design_drafts_tablet_position_x_check') then
    alter table public.site_page_design_drafts add constraint site_page_design_drafts_tablet_position_x_check check (tablet_position_x between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname='site_page_design_drafts_tablet_position_y_check') then
    alter table public.site_page_design_drafts add constraint site_page_design_drafts_tablet_position_y_check check (tablet_position_y between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname='site_page_design_drafts_tablet_zoom_percent_check') then
    alter table public.site_page_design_drafts add constraint site_page_design_drafts_tablet_zoom_percent_check check (tablet_zoom_percent between 100 and 300);
  end if;
  if not exists (select 1 from pg_constraint where conname='site_page_design_drafts_hero_height_tablet_check') then
    alter table public.site_page_design_drafts add constraint site_page_design_drafts_hero_height_tablet_check check (hero_height_tablet between 180 and 950);
  end if;
end $$;

create table if not exists public.design_media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text not null,
  file_name text not null,
  mime_type text not null default 'image/webp',
  file_size bigint not null default 0,
  width integer,
  height integer,
  variant text check (variant is null or variant in ('desktop','tablet','mobile','source')),
  alt_ru text,
  alt_ro text,
  uploaded_by uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Register images that are already actively used by Visual Editor.
insert into public.design_media_assets (storage_path, public_url, file_name, mime_type, variant, is_active)
select distinct on (split_part(src.url, '/storage/v1/object/public/homepage/', 2))
  split_part(src.url, '/storage/v1/object/public/homepage/', 2),
  src.url,
  regexp_replace(split_part(src.url, '/storage/v1/object/public/homepage/', 2), '^.*/', ''),
  case when lower(src.url) like '%.png%' then 'image/png' when lower(src.url) like '%.jpg%' or lower(src.url) like '%.jpeg%' then 'image/jpeg' else 'image/webp' end,
  src.variant,
  true
from (
  select background_image_url as url, 'desktop'::text as variant from public.homepage_hero where background_image_url is not null
  union all select mobile_background_image_url, 'mobile' from public.homepage_hero where mobile_background_image_url is not null
  union all select desktop_image_url, 'desktop' from public.site_page_designs where desktop_image_url is not null
  union all select mobile_image_url, 'mobile' from public.site_page_designs where mobile_image_url is not null
) src
where src.url like '%/storage/v1/object/public/homepage/%'
order by split_part(src.url, '/storage/v1/object/public/homepage/', 2), src.variant
on conflict (storage_path) do update set public_url=excluded.public_url, is_active=true;

create index if not exists design_media_assets_created_idx
  on public.design_media_assets (created_at desc);
create index if not exists design_media_assets_uploaded_by_idx
  on public.design_media_assets (uploaded_by, created_at desc);

alter table public.design_media_assets enable row level security;
revoke all on table public.design_media_assets from public, anon;
grant select, insert, update, delete on table public.design_media_assets to authenticated;

drop policy if exists "Editors read design media assets" on public.design_media_assets;
create policy "Editors read design media assets"
on public.design_media_assets for select to authenticated
using (public.is_editor_or_admin());

drop policy if exists "Editors create design media assets" on public.design_media_assets;
create policy "Editors create design media assets"
on public.design_media_assets for insert to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "Editors update design media assets" on public.design_media_assets;
create policy "Editors update design media assets"
on public.design_media_assets for update to authenticated
using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

drop policy if exists "Editors delete design media assets" on public.design_media_assets;
create policy "Editors delete design media assets"
on public.design_media_assets for delete to authenticated
using (public.is_editor_or_admin());

drop trigger if exists design_media_assets_set_updated_at on public.design_media_assets;
create trigger design_media_assets_set_updated_at
before update on public.design_media_assets
for each row execute function public.set_generic_updated_at();
