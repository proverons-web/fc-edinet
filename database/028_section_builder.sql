-- FC EDINEȚ v2.1.6 — Section Builder
-- Adds per-section visual/layout settings to published homepage sections
-- and to the Visual Editor draft snapshot.

alter table public.homepage_sections
  add column if not exists design_config jsonb not null default '{}'::jsonb;

alter table public.homepage_design_draft
  add column if not exists section_config jsonb not null default '{}'::jsonb;

-- Preserve the current public look as the initial Section Builder configuration.
update public.homepage_sections
set design_config = case section_key
  when 'matches' then jsonb_build_object(
    'width','container','background','inherit','padding_top',0,'padding_bottom',0,
    'item_limit',3,'columns_desktop',3,'columns_tablet',2,'columns_mobile',1,
    'show_heading',false,'show_action',false
  )
  when 'standings' then jsonb_build_object(
    'width','container','background','inherit','padding_top',88,'padding_bottom',88,
    'item_limit',5,'columns_desktop',1,'columns_tablet',1,'columns_mobile',1,
    'show_heading',true,'show_action',true
  )
  when 'news' then jsonb_build_object(
    'width','container','background','inherit','padding_top',88,'padding_bottom',88,
    'item_limit',4,'columns_desktop',4,'columns_tablet',2,'columns_mobile',1,
    'show_heading',true,'show_action',true
  )
  when 'players' then jsonb_build_object(
    'width','container','background','inherit','padding_top',88,'padding_bottom',88,
    'item_limit',4,'columns_desktop',4,'columns_tablet',2,'columns_mobile',1,
    'show_heading',true,'show_action',true
  )
  when 'media' then jsonb_build_object(
    'width','container','background','inherit','padding_top',88,'padding_bottom',88,
    'item_limit',5,'columns_desktop',5,'columns_tablet',3,'columns_mobile',1,
    'show_heading',true,'show_action',true
  )
  when 'partners' then jsonb_build_object(
    'width','container','background','inherit','padding_top',88,'padding_bottom',88,
    'item_limit',12,'columns_desktop',6,'columns_tablet',3,'columns_mobile',2,
    'show_heading',true,'show_action',true
  )
  else '{}'::jsonb
end
where design_config = '{}'::jsonb;
