-- FC EDINEȚ v2.17.0 — Public Match Center 2.0 statistics
-- Allows visitors to read team statistics only for explicitly published match protocols.

alter table public.match_team_statistics enable row level security;

grant select on table public.match_team_statistics to anon, authenticated;

drop policy if exists "Public reads team statistics from published protocols" on public.match_team_statistics;
create policy "Public reads team statistics from published protocols"
on public.match_team_statistics
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.match_reports mr
    where mr.match_id = match_team_statistics.match_id
      and mr.is_published = true
  )
);

notify pgrst, 'reload schema';
