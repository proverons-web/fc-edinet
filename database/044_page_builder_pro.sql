-- FC EDINET v2.3.6
-- Page Builder Pro for Media / Partners / Academy.
-- Run AFTER 043_club_rich_content.sql.

-- Extend the site-wide Hero editor catalog with the new Academy page.
alter table public.site_page_designs drop constraint if exists site_page_designs_page_key_check;
alter table public.site_page_designs add constraint site_page_designs_page_key_check check (page_key in (
  'news','team','matches','standings','club','media','partners','academy',
  'template_news','template_player','template_album'
));

alter table public.site_page_design_drafts drop constraint if exists site_page_design_drafts_page_key_check;
alter table public.site_page_design_drafts add constraint site_page_design_drafts_page_key_check check (page_key in (
  'news','team','matches','standings','club','media','partners','academy',
  'template_news','template_player','template_album'
));

alter table public.site_page_design_versions drop constraint if exists site_page_design_versions_page_key_check;
alter table public.site_page_design_versions add constraint site_page_design_versions_page_key_check check (page_key in (
  'news','team','matches','standings','club','media','partners','academy',
  'template_news','template_player','template_album'
));

insert into public.site_page_designs (
  page_key, background_mode, hero_height_desktop, hero_height_mobile,
  overlay_opacity, overlay_style, content_width
)
values ('academy','default',390,300,66,'gradient-left',820)
on conflict (page_key) do nothing;

-- The generic content-page tables already exist from migration 042.
-- Empty JSON is intentional: the app expands it to the current safe default layout.
insert into public.content_page_layouts (page_key, draft_config, published_config, updated_at, published_at)
values
  ('media','{}'::jsonb,'{}'::jsonb,now(),now()),
  ('partners','{}'::jsonb,'{}'::jsonb,now(),now()),
  ('academy','{}'::jsonb,'{}'::jsonb,now(),now())
on conflict (page_key) do nothing;

insert into public.content_page_published (page_key, published_config, published_at)
values
  ('media','{}'::jsonb,now()),
  ('partners','{}'::jsonb,now()),
  ('academy','{}'::jsonb,now())
on conflict (page_key) do nothing;

notify pgrst, 'reload schema';
