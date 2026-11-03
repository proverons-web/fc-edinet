-- FC Edineț v2.29.2 — security: hide internal trigger helpers from the Data API.
-- These procedures are invoked by PostgreSQL triggers, not directly by site users.
-- REVOKE prevents anonymous/authenticated clients from calling them via /rpc.
-- Existing triggers remain attached and continue running under their owner.

begin;
revoke execute on function public.ensure_match_team_stat_rows() from public, anon, authenticated;
revoke execute on function public.refresh_competition_player_stats_season() from public, anon, authenticated;
revoke execute on function public.refresh_match_stats_context() from public, anon, authenticated;
revoke execute on function public.sync_match_lineup_context() from public, anon, authenticated;
revoke execute on function public.sync_match_team_stat_context() from public, anon, authenticated;
revoke execute on function public.sync_player_match_stat_context() from public, anon, authenticated;
revoke execute on function public.validate_completed_match_statistics() from public, anon, authenticated;
commit;

notify pgrst, 'reload schema';
