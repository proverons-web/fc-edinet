-- FC EDINEȚ v2.3.8 — Practical match protocol / public match page
-- Run AFTER 045_match_lineups.sql.
-- Safe to run more than once.

alter table public.match_reports
  add column if not exists is_published boolean not null default false;

alter table public.match_reports
  add column if not exists published_at timestamptz;

-- Public access is deliberately limited to protocols explicitly published by an editor.
grant select on table public.match_reports to anon, authenticated;
grant select on table public.match_events to anon, authenticated;
grant select on table public.match_lineup_settings to anon, authenticated;
grant select on table public.match_lineup_entries to anon, authenticated;

-- Keep editor management policies from earlier migrations and add narrow public read policies.
drop policy if exists "Public reads published match reports" on public.match_reports;
create policy "Public reads published match reports"
on public.match_reports for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Public reads events from published protocols" on public.match_events;
create policy "Public reads events from published protocols"
on public.match_events for select
to anon, authenticated
using (
  exists (
    select 1
    from public.match_reports mr
    where mr.match_id = match_events.match_id
      and mr.is_published = true
  )
);

drop policy if exists "Public reads lineup settings from published protocols" on public.match_lineup_settings;
create policy "Public reads lineup settings from published protocols"
on public.match_lineup_settings for select
to anon, authenticated
using (
  exists (
    select 1
    from public.match_reports mr
    where mr.match_id = match_lineup_settings.match_id
      and mr.is_published = true
  )
);

drop policy if exists "Public reads lineup entries from published protocols" on public.match_lineup_entries;
create policy "Public reads lineup entries from published protocols"
on public.match_lineup_entries for select
to anon, authenticated
using (
  exists (
    select 1
    from public.match_reports mr
    where mr.match_id = match_lineup_entries.match_id
      and mr.is_published = true
  )
);

notify pgrst, 'reload schema';
