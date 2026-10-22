-- FC EDINET v2.22.4 — Club CMS Pro
-- Additional structured profile fields and rich documents for leadership / achievements.
-- Run AFTER 054_club_section_pages.sql.

alter table public.club_profile
  add column if not exists official_name text,
  add column if not exists short_name text,
  add column if not exists country text,
  add column if not exists current_league text,
  add column if not exists website_url text,
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists youtube_url text;

alter table public.club_leadership
  add column if not exists bio_rich_content jsonb,
  add column if not exists bio_rich_content_ro jsonb;

alter table public.club_achievements
  add column if not exists description_rich_content jsonb,
  add column if not exists description_rich_content_ro jsonb;

comment on column public.club_profile.official_name is 'Full official club name.';
comment on column public.club_profile.short_name is 'Short public club name.';
comment on column public.club_profile.current_league is 'Current competition / division label.';
comment on column public.club_leadership.bio_rich_content is 'Rich document for leadership bio (RU).';
comment on column public.club_achievements.description_rich_content is 'Rich document for achievement description (RU).';

notify pgrst, 'reload schema';
