-- FC EDINEȚ v2.1.9 — Global Design System

-- Expand the global builder registry with Design System.
alter table public.site_global_designs drop constraint if exists site_global_designs_component_key_check;
alter table public.site_global_designs add constraint site_global_designs_component_key_check check (component_key in ('header','footer','design_system'));

alter table public.site_global_design_drafts drop constraint if exists site_global_design_drafts_component_key_check;
alter table public.site_global_design_drafts add constraint site_global_design_drafts_component_key_check check (component_key in ('header','footer','design_system'));

alter table public.site_global_design_versions drop constraint if exists site_global_design_versions_component_key_check;
alter table public.site_global_design_versions add constraint site_global_design_versions_component_key_check check (component_key in ('header','footer','design_system'));

insert into public.site_global_designs(component_key, config)
values ('design_system', '{
  "primary":"#0f63ff",
  "navy":"#06162e",
  "navy_alt":"#0a2245",
  "accent":"#f4c842",
  "text":"#162033",
  "muted":"#68758a",
  "surface":"#f5f8fc",
  "line":"#e6ebf2",
  "white":"#ffffff",
  "font_body":"arial",
  "font_heading":"arial",
  "body_size":16,
  "body_line_height":1.6,
  "heading_weight":900,
  "heading_letter_spacing":-2,
  "h1_scale":100,
  "h2_scale":100,
  "h3_scale":100,
  "container_max":1200,
  "page_gutter_desktop":40,
  "page_gutter_mobile":28,
  "radius_small":10,
  "radius_medium":16,
  "radius_large":24,
  "card_shadow":"soft",
  "button_height":42,
  "spacing_unit":8
}'::jsonb)
on conflict (component_key) do nothing;
