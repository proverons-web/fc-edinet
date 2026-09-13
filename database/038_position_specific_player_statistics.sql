-- FC EDINEȚ v2.2.4 — Position-specific extended player statistics
-- Run AFTER 037_public_player_statistics.sql.
-- Safe to run more than once.
-- Adds extended match metrics and refreshes season aggregation views.

alter table public.player_match_stats
  add column if not exists shots smallint not null default 0 check (shots between 0 and 40),
  add column if not exists shots_on_target smallint not null default 0 check (shots_on_target between 0 and 40),
  add column if not exists passes_attempted smallint not null default 0 check (passes_attempted between 0 and 400),
  add column if not exists passes_completed smallint not null default 0 check (passes_completed between 0 and 400),
  add column if not exists key_passes smallint not null default 0 check (key_passes between 0 and 60),
  add column if not exists tackles_won smallint not null default 0 check (tackles_won between 0 and 60),
  add column if not exists interceptions smallint not null default 0 check (interceptions between 0 and 60),
  add column if not exists clearances smallint not null default 0 check (clearances between 0 and 80),
  add column if not exists blocks smallint not null default 0 check (blocks between 0 and 60),
  add column if not exists fouls_committed smallint not null default 0 check (fouls_committed between 0 and 30),
  add column if not exists fouls_won smallint not null default 0 check (fouls_won between 0 and 30),
  add column if not exists penalties_saved smallint not null default 0 check (penalties_saved between 0 and 10);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'player_match_stats_shots_target_check'
  ) then
    alter table public.player_match_stats
      add constraint player_match_stats_shots_target_check
      check (shots_on_target <= shots);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'player_match_stats_passes_check'
  ) then
    alter table public.player_match_stats
      add constraint player_match_stats_passes_check
      check (passes_completed <= passes_attempted);
  end if;
end $$;

-- Recreate aggregation views so all new fields are immediately available
-- in admin summaries and on public player profiles.
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
  count(*) filter (where pms.clean_sheet)::integer as clean_sheets,
  coalesce(sum(pms.penalties_saved), 0)::integer as penalties_saved,
  coalesce(sum(pms.shots), 0)::integer as shots,
  coalesce(sum(pms.shots_on_target), 0)::integer as shots_on_target,
  coalesce(sum(pms.passes_attempted), 0)::integer as passes_attempted,
  coalesce(sum(pms.passes_completed), 0)::integer as passes_completed,
  coalesce(sum(pms.key_passes), 0)::integer as key_passes,
  coalesce(sum(pms.tackles_won), 0)::integer as tackles_won,
  coalesce(sum(pms.interceptions), 0)::integer as interceptions,
  coalesce(sum(pms.clearances), 0)::integer as clearances,
  coalesce(sum(pms.blocks), 0)::integer as blocks,
  coalesce(sum(pms.fouls_committed), 0)::integer as fouls_committed,
  coalesce(sum(pms.fouls_won), 0)::integer as fouls_won
from public.player_match_stats pms
join public.matches m on m.id = pms.match_id
join public.match_statistics_status mss
  on mss.match_id = pms.match_id
 and mss.status = 'complete'
where m.status = 'finished'
group by pms.player_id, pms.season_id, pms.competition_id;

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
  count(*) filter (where pms.clean_sheet)::integer as clean_sheets,
  coalesce(sum(pms.penalties_saved), 0)::integer as penalties_saved,
  coalesce(sum(pms.shots), 0)::integer as shots,
  coalesce(sum(pms.shots_on_target), 0)::integer as shots_on_target,
  coalesce(sum(pms.passes_attempted), 0)::integer as passes_attempted,
  coalesce(sum(pms.passes_completed), 0)::integer as passes_completed,
  coalesce(sum(pms.key_passes), 0)::integer as key_passes,
  coalesce(sum(pms.tackles_won), 0)::integer as tackles_won,
  coalesce(sum(pms.interceptions), 0)::integer as interceptions,
  coalesce(sum(pms.clearances), 0)::integer as clearances,
  coalesce(sum(pms.blocks), 0)::integer as blocks,
  coalesce(sum(pms.fouls_committed), 0)::integer as fouls_committed,
  coalesce(sum(pms.fouls_won), 0)::integer as fouls_won
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
