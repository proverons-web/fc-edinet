-- FC EDINEȚ v2.2.6 — Seasons history and player career totals
-- Run AFTER 038_position_specific_player_statistics.sql.
-- Safe to run more than once.
-- Adds public read-only views used by the historical club statistics page
-- and by the all-time career block on player profiles.

-- Career totals across every completed statistical match for one player.
drop view if exists public.player_career_totals;
create view public.player_career_totals
with (security_invoker = true)
as
select
  pms.player_id,
  count(distinct pms.season_id) filter (where pms.season_id is not null)::integer as seasons_played,
  count(distinct pms.competition_id) filter (where pms.competition_id is not null)::integer as competitions_played,
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
  coalesce(sum(pms.fouls_won), 0)::integer as fouls_won,
  min(m.kickoff) as first_match_at,
  max(m.kickoff) as last_match_at
from public.player_match_stats pms
join public.matches m on m.id = pms.match_id
join public.match_statistics_status mss
  on mss.match_id = pms.match_id
 and mss.status = 'complete'
where m.status = 'finished'
group by pms.player_id;

-- Historical club results by season. Match results are counted independently
-- of player-stat coverage, while statistics_complete / players_with_stats show
-- how much detailed data has already been entered.
drop view if exists public.club_season_history;
create view public.club_season_history
with (security_invoker = true)
as
with club_matches as (
  select
    s.id as season_id,
    s.name as season_name,
    s.slug as season_slug,
    s.starts_on,
    s.ends_on,
    s.is_current,
    m.id as match_id,
    case when coalesce(ht.is_club, false) then coalesce(m.home_score, 0) else coalesce(m.away_score, 0) end as goals_for,
    case when coalesce(ht.is_club, false) then coalesce(m.away_score, 0) else coalesce(m.home_score, 0) end as goals_against
  from public.matches m
  join public.competitions c on c.id = m.competition_id
  join public.seasons s on s.id = c.season_id
  join public.teams ht on ht.id = m.home_team_id
  join public.teams at on at.id = m.away_team_id
  where m.status = 'finished'
    and (coalesce(ht.is_club, false) or coalesce(at.is_club, false))
),
results as (
  select
    season_id,
    max(season_name) as season_name,
    max(season_slug) as season_slug,
    max(starts_on) as starts_on,
    max(ends_on) as ends_on,
    bool_or(is_current) as is_current,
    count(*)::integer as played,
    count(*) filter (where goals_for > goals_against)::integer as wins,
    count(*) filter (where goals_for = goals_against)::integer as draws,
    count(*) filter (where goals_for < goals_against)::integer as losses,
    coalesce(sum(goals_for), 0)::integer as goals_for,
    coalesce(sum(goals_against), 0)::integer as goals_against
  from club_matches
  group by season_id
),
coverage as (
  select
    cm.season_id,
    count(distinct mss.match_id)::integer as statistics_complete
  from club_matches cm
  join public.match_statistics_status mss
    on mss.match_id = cm.match_id
   and mss.status = 'complete'
  group by cm.season_id
),
players as (
  select
    pms.season_id,
    count(distinct pms.player_id)::integer as players_with_stats
  from public.player_match_stats pms
  join public.matches m on m.id = pms.match_id
  join public.match_statistics_status mss
    on mss.match_id = pms.match_id
   and mss.status = 'complete'
  where m.status = 'finished'
    and pms.season_id is not null
  group by pms.season_id
)
select
  r.season_id,
  r.season_name,
  r.season_slug,
  r.starts_on,
  r.ends_on,
  r.is_current,
  r.played,
  r.wins,
  r.draws,
  r.losses,
  r.goals_for,
  r.goals_against,
  (r.goals_for - r.goals_against)::integer as goal_difference,
  case when r.played > 0 then round((r.wins::numeric * 100) / r.played, 1) else 0 end as win_rate,
  coalesce(c.statistics_complete, 0)::integer as statistics_complete,
  coalesce(p.players_with_stats, 0)::integer as players_with_stats
from results r
left join coverage c on c.season_id = r.season_id
left join players p on p.season_id = r.season_id;

grant select on table public.player_career_totals to anon, authenticated;
grant select on table public.club_season_history to anon, authenticated;

notify pgrst, 'reload schema';
