-- FC Edinet v1.9 — RU / RO content fields.
-- Existing Russian content stays untouched. Romanian fields are optional;
-- public pages fall back to the existing value until a Romanian translation is filled in.

alter table public.news_categories
  add column if not exists name_ro text;

alter table public.news
  add column if not exists title_ro text,
  add column if not exists excerpt_ro text,
  add column if not exists content_ro text;

alter table public.players
  add column if not exists bio_ro text;

alter table public.club_profile
  add column if not exists club_name_ro text,
  add column if not exists city_ro text,
  add column if not exists club_colors_ro text,
  add column if not exists motto_ro text,
  add column if not exists about_text_ro text,
  add column if not exists history_text_ro text,
  add column if not exists address_ro text,
  add column if not exists stadium_name_ro text,
  add column if not exists stadium_address_ro text,
  add column if not exists stadium_description_ro text;

alter table public.club_leadership
  add column if not exists role_ro text,
  add column if not exists bio_ro text;

alter table public.club_achievements
  add column if not exists title_ro text,
  add column if not exists description_ro text;

alter table public.homepage_hero
  add column if not exists eyebrow_ro text,
  add column if not exists title_main_ro text,
  add column if not exists title_accent_ro text,
  add column if not exists description_ro text,
  add column if not exists primary_button_text_ro text,
  add column if not exists secondary_button_text_ro text;

alter table public.homepage_settings
  add column if not exists banner_eyebrow_ro text,
  add column if not exists banner_title_ro text,
  add column if not exists banner_text_ro text,
  add column if not exists banner_button_text_ro text;

alter table public.partners
  add column if not exists description_ro text;

comment on column public.news.title_ro is 'Romanian title; falls back to title when null.';
comment on column public.news.content_ro is 'Romanian article body; falls back to content when null.';
comment on column public.club_profile.about_text_ro is 'Romanian club description.';
comment on column public.homepage_hero.title_main_ro is 'Romanian homepage hero main title.';
comment on column public.homepage_settings.banner_title_ro is 'Romanian homepage banner title.';

-- Known built-in news categories: provide Romanian labels without touching custom categories.
update public.news_categories
set name_ro = case slug
  when 'matches' then 'Meciuri'
  when 'team' then 'Echipa'
  when 'interviews' then 'Interviuri'
  when 'club' then 'Club'
  when 'transfers' then 'Transferuri'
  when 'academy' then 'Academia'
  else name_ro
end
where slug in ('matches','team','interviews','club','transfers','academy')
  and (name_ro is null or btrim(name_ro) = '');
