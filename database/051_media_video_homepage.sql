-- FC EDINET v2.15.8
-- Select exactly one published YouTube video for the homepage spotlight.

alter table public.media_videos
  add column if not exists show_on_homepage boolean not null default false;

create unique index if not exists media_videos_one_homepage_idx
  on public.media_videos ((show_on_homepage))
  where show_on_homepage = true;

comment on column public.media_videos.show_on_homepage is
  'Marks the single published video selected for the homepage spotlight.';
