-- FC EDINEȚ v2.2.1 — Player statistics match-entry workflow
-- Run AFTER 034_player_statistics_foundation.sql.
-- Safe to run more than once.

-- Every edit must refresh updated_at, not only context-changing edits.
drop trigger if exists player_match_stats_set_updated_at on public.player_match_stats;
create trigger player_match_stats_set_updated_at
before update on public.player_match_stats
for each row execute function public.set_generic_updated_at();

-- Editors need to remove a participation row when a player is unchecked
-- in the match statistics editor. The previous v2.2.0 policy allowed
-- permanent deletion only to admins, which made normal match editing impossible.
drop policy if exists "Admins delete player match stats" on public.player_match_stats;
drop policy if exists "Editors delete player match stats" on public.player_match_stats;
create policy "Editors delete player match stats"
on public.player_match_stats for delete
to authenticated
using (public.is_editor_or_admin());

notify pgrst, 'reload schema';
