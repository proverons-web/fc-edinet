-- FC EDINEȚ v2.2.2 — Automatic player season aggregation
-- Run AFTER 035_player_statistics_entry.sql.
-- Safe to run more than once.
-- IMPORTANT: only matches whose player statistics are marked COMPLETE
-- contribute to season totals. Drafts never affect public/admin season totals.

drop view if exists public.player_season_totals;
drop view if exists public.player_season_statistics;

create view public.player_season_statistics
with (security_invoker = true)
as
select
  pms.player_id,
  pms.season_id,
  pms.competition_id,
  count(*)::integer as appearances,
  count(*) filter (where pms.appearance = 'starter')::integer as starts,
  count(*) filter (where pms.appearance = 'substitute')::integer as substitute_appearances,
  count(*) filter (where pms.is_captain)::integer as captain_appearances,
  coalesce(sum(pms.minutes_played), 0)::integer as minutes_played,
  coalesce(sum(pms.goals), 0)::integer as goals,
  coalesce(sum(pms.assists), 0)::integer as assists,
  coalesce(sum(pms.own_goals), 0)::integer as own_goals,
  coalesce(sum(pms.penalties_scored), 0)::integer as penalties_scored,
  coalesce(sum(pms.penalties_missed), 0)::integer as penalties_missed,
  coalesce(sum(pms.yellow_cards), 0)::integer as yellow_cards,
  coalesce(sum(pms.red_cards), 0)::integer as red_cards,
  coalesce(sum(pms.goals_conceded), 0)::integer as goals_conceded,
  coalesce(sum(pms.saves), 0)::integer as saves,
  count(*) filter (where pms.clean_sheet)::integer as clean_sheets
from public.player_match_stats pms
join public.matches m on m.id = pms.match_id
join public.match_statistics_status mss
  on mss.match_id = pms.match_id
 and mss.status = 'complete'
where m.status = 'finished'
group by pms.player_id, pms.season_id, pms.competition_id;

-- Ready-to-query season totals across every tournament in the season.
create view public.player_season_totals
with (security_invoker = true)
as
select
  pms.player_id,
  pms.season_id,
  count(*)::integer as appearances,
  count(*) filter (where pms.appearance = 'starter')::integer as starts,
  count(*) filter (where pms.appearance = 'substitute')::integer as substitute_appearances,
  count(*) filter (where pms.is_captain)::integer as captain_appearances,
  count(distinct pms.competition_id) filter (where pms.competition_id is not null)::integer as competitions_played,
  coalesce(sum(pms.minutes_played), 0)::integer as minutes_played,
  coalesce(sum(pms.goals), 0)::integer as goals,
  coalesce(sum(pms.assists), 0)::integer as assists,
  coalesce(sum(pms.own_goals), 0)::integer as own_goals,
  coalesce(sum(pms.penalties_scored), 0)::integer as penalties_scored,
  coalesce(sum(pms.penalties_missed), 0)::integer as penalties_missed,
  coalesce(sum(pms.yellow_cards), 0)::integer as yellow_cards,
  coalesce(sum(pms.red_cards), 0)::integer as red_cards,
  coalesce(sum(pms.goals_conceded), 0)::integer as goals_conceded,
  coalesce(sum(pms.saves), 0)::integer as saves,
  count(*) filter (where pms.clean_sheet)::integer as clean_sheets
from public.player_match_stats pms
join public.matches m on m.id = pms.match_id
join public.match_statistics_status mss
  on mss.match_id = pms.match_id
 and mss.status = 'complete'
where m.status = 'finished'
group by pms.player_id, pms.season_id;

grant select on table public.player_season_statistics to anon, authenticated;
grant select on table public.player_season_totals to anon, authenticated;

notify pgrst, 'reload schema';
