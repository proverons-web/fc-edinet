-- FC EDINEȚ v2.2.3 — Public player statistics access
-- Run AFTER 036_player_season_aggregation.sql.
-- Safe to run more than once.
--
-- Public player pages may see only statistics from matches whose statistics
-- workflow has been explicitly marked COMPLETE. Draft rows remain editor-only.

-- Public users need to resolve the completed state, but can only see COMPLETE rows.
grant select on table public.match_statistics_status to anon, authenticated;

drop policy if exists "Public can read completed match statistics status" on public.match_statistics_status;
create policy "Public can read completed match statistics status"
on public.match_statistics_status for select
to public
using (status = 'complete');

-- Tighten the old v2.2.0 policy that exposed every player_match_stats row.
drop policy if exists "Public can read player match stats" on public.player_match_stats;
drop policy if exists "Public can read completed player match stats" on public.player_match_stats;
create policy "Public can read completed player match stats"
on public.player_match_stats for select
to public
using (
  exists (
    select 1
    from public.match_statistics_status mss
    where mss.match_id = player_match_stats.match_id
      and mss.status = 'complete'
  )
);

-- Editors still need draft rows while filling a match.
drop policy if exists "Editors can read all player match stats" on public.player_match_stats;
create policy "Editors can read all player match stats"
on public.player_match_stats for select
to authenticated
using (public.is_editor_or_admin());

grant select on table public.player_match_stats to anon, authenticated;
grant select on table public.player_season_statistics to anon, authenticated;
grant select on table public.player_season_totals to anon, authenticated;

notify pgrst, 'reload schema';
