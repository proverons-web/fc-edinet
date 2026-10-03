-- FC EDINET v2.3.4
-- Rich content / visual text composer for Club page.
-- Run AFTER 042_content_page_builder.sql.

alter table public.club_profile
  add column if not exists about_rich_content jsonb,
  add column if not exists about_rich_content_ro jsonb,
  add column if not exists history_rich_content jsonb,
  add column if not exists history_rich_content_ro jsonb,
  add column if not exists stadium_rich_content jsonb,
  add column if not exists stadium_rich_content_ro jsonb;

comment on column public.club_profile.about_rich_content is 'Visual block content for /club About section (RU)';
comment on column public.club_profile.about_rich_content_ro is 'Visual block content for /club About section (RO)';
comment on column public.club_profile.history_rich_content is 'Visual block content for /club History section (RU)';
comment on column public.club_profile.history_rich_content_ro is 'Visual block content for /club History section (RO)';
comment on column public.club_profile.stadium_rich_content is 'Visual block content for /club Stadium section (RU)';
comment on column public.club_profile.stadium_rich_content_ro is 'Visual block content for /club Stadium section (RO)';

notify pgrst, 'reload schema';
