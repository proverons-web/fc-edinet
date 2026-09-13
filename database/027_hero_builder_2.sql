-- FC EDINET v2.1.5
-- Hero Builder 2.0: persistent layer visibility, locks and ordering for all managed Hero blocks.
-- Run AFTER 026_image_editor_2.sql.

alter table public.homepage_hero
  add column if not exists hero_layer_config jsonb not null default jsonb_build_object(
    'background', jsonb_build_object('visible', true, 'locked', true, 'order', 10),
    'intro', jsonb_build_object('visible', true, 'locked', false, 'order', 20),
    'match_card', jsonb_build_object('visible', true, 'locked', false, 'order', 30)
  );

alter table public.homepage_design_draft
  add column if not exists hero_layer_config jsonb not null default jsonb_build_object(
    'background', jsonb_build_object('visible', true, 'locked', true, 'order', 10),
    'intro', jsonb_build_object('visible', true, 'locked', false, 'order', 20),
    'match_card', jsonb_build_object('visible', true, 'locked', false, 'order', 30)
  );

alter table public.site_page_designs
  add column if not exists layer_config jsonb not null default '{}'::jsonb;

alter table public.site_page_design_drafts
  add column if not exists layer_config jsonb not null default '{}'::jsonb;

-- Make existing rows explicit so the database remains understandable outside the application too.
update public.site_page_designs
set layer_config = case
  when page_key in ('news','team','matches','standings','media','partners') then
    '{"background":{"visible":true,"locked":true,"order":10},"eyebrow":{"visible":true,"locked":false,"order":20},"title":{"visible":true,"locked":false,"order":30},"description":{"visible":true,"locked":false,"order":40}}'::jsonb
  when page_key = 'club' then
    '{"background":{"visible":true,"locked":true,"order":10},"intro":{"visible":true,"locked":false,"order":20},"facts":{"visible":true,"locked":false,"order":30}}'::jsonb
  when page_key = 'template_news' then
    '{"background":{"visible":true,"locked":true,"order":10},"navigation":{"visible":true,"locked":false,"order":20},"title":{"visible":true,"locked":false,"order":30},"description":{"visible":true,"locked":false,"order":40},"author":{"visible":true,"locked":false,"order":50}}'::jsonb
  when page_key = 'template_player' then
    '{"background":{"visible":true,"locked":true,"order":10},"photo":{"visible":true,"locked":false,"order":20},"intro":{"visible":true,"locked":false,"order":30}}'::jsonb
  when page_key = 'template_album' then
    '{"background":{"visible":true,"locked":true,"order":10},"navigation":{"visible":true,"locked":false,"order":20},"title":{"visible":true,"locked":false,"order":30},"description":{"visible":true,"locked":false,"order":40},"count":{"visible":true,"locked":false,"order":50}}'::jsonb
  else layer_config
end
where layer_config = '{}'::jsonb or layer_config is null;

update public.site_page_design_drafts d
set layer_config = p.layer_config
from public.site_page_designs p
where p.page_key = d.page_key
  and (d.layer_config = '{}'::jsonb or d.layer_config is null);

-- Guard the basic JSON shape while keeping room for future layer properties.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'homepage_hero_layer_config_object_check') then
    alter table public.homepage_hero
      add constraint homepage_hero_layer_config_object_check
      check (jsonb_typeof(hero_layer_config) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'homepage_design_draft_layer_config_object_check') then
    alter table public.homepage_design_draft
      add constraint homepage_design_draft_layer_config_object_check
      check (jsonb_typeof(hero_layer_config) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'site_page_designs_layer_config_object_check') then
    alter table public.site_page_designs
      add constraint site_page_designs_layer_config_object_check
      check (jsonb_typeof(layer_config) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'site_page_design_drafts_layer_config_object_check') then
    alter table public.site_page_design_drafts
      add constraint site_page_design_drafts_layer_config_object_check
      check (jsonb_typeof(layer_config) = 'object');
  end if;
end $$;
