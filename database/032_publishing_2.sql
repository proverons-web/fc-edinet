-- FC EDINEȚ v2.1.10 — Publishing 2.0
-- Autosave metadata + version change summaries.
-- Run AFTER 031_design_system.sql.

alter table public.homepage_design_draft
  add column if not exists autosaved_at timestamptz,
  add column if not exists autosave_revision bigint not null default 0;

alter table public.site_page_design_drafts
  add column if not exists autosaved_at timestamptz,
  add column if not exists autosave_revision bigint not null default 0;

alter table public.site_global_design_drafts
  add column if not exists autosaved_at timestamptz,
  add column if not exists autosave_revision bigint not null default 0;

alter table public.homepage_design_versions
  add column if not exists change_summary jsonb not null default '[]'::jsonb;

alter table public.site_page_design_versions
  add column if not exists change_summary jsonb not null default '[]'::jsonb;

alter table public.site_global_design_versions
  add column if not exists change_summary jsonb not null default '[]'::jsonb;

-- No new public policies are needed. Draft/history RLS remains unchanged.
