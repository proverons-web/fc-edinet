-- FC Edinet v1.9.1 — automatic RU -> RO translation metadata.
-- Translation itself is performed server-side by Next.js using OPENAI_API_KEY.
-- These columns let the app avoid unnecessary repeated translations and allow
-- editors to lock a manually corrected Romanian version.

alter table public.news
  add column if not exists ro_translation_locked boolean not null default false,
  add column if not exists ro_translation_source_hash text,
  add column if not exists ro_translation_updated_at timestamptz;

alter table public.players
  add column if not exists ro_translation_locked boolean not null default false,
  add column if not exists ro_translation_source_hash text,
  add column if not exists ro_translation_updated_at timestamptz;

alter table public.club_profile
  add column if not exists ro_translation_locked boolean not null default false,
  add column if not exists ro_translation_source_hash text,
  add column if not exists ro_translation_updated_at timestamptz;

alter table public.club_leadership
  add column if not exists ro_translation_locked boolean not null default false,
  add column if not exists ro_translation_source_hash text,
  add column if not exists ro_translation_updated_at timestamptz;

alter table public.club_achievements
  add column if not exists ro_translation_locked boolean not null default false,
  add column if not exists ro_translation_source_hash text,
  add column if not exists ro_translation_updated_at timestamptz;

alter table public.homepage_hero
  add column if not exists ro_translation_locked boolean not null default false,
  add column if not exists ro_translation_source_hash text,
  add column if not exists ro_translation_updated_at timestamptz;

alter table public.homepage_settings
  add column if not exists ro_translation_locked boolean not null default false,
  add column if not exists ro_translation_source_hash text,
  add column if not exists ro_translation_updated_at timestamptz;

alter table public.partners
  add column if not exists ro_translation_locked boolean not null default false,
  add column if not exists ro_translation_source_hash text,
  add column if not exists ro_translation_updated_at timestamptz;

comment on column public.news.ro_translation_locked is
  'When true, automatic RU->RO translation must not overwrite manually edited RO fields.';
comment on column public.news.ro_translation_source_hash is
  'Hash of the Russian source fields used for the most recent successful automatic translation.';
comment on column public.news.ro_translation_updated_at is
  'Timestamp of the most recent successful automatic Romanian translation.';
