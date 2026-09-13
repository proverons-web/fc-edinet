-- FC EDINET v2.1.3
-- Canvas 2.0 for homepage Hero: draggable text/match card, tablet viewport,
-- safe zones and snapping preferences.
-- Run AFTER 024_sitewide_visual_editor.sql.

alter table public.homepage_hero
  add column if not exists canvas_config jsonb;

alter table public.homepage_design_draft
  add column if not exists canvas_config jsonb;

comment on column public.homepage_hero.canvas_config is
  'Visual Editor Canvas 2.0 viewport positions, safe zones and match-card layout.';
comment on column public.homepage_design_draft.canvas_config is
  'Draft Visual Editor Canvas 2.0 configuration.';
