-- FC EDINEȚ v2.2.7 — Statistics final QA / integrity hardening
-- Run AFTER 039_history_and_career_statistics.sql.
-- Safe to run more than once.

-- Normalize any legacy rows before enabling stricter database checks.
update public.player_match_stats
set shots_on_target = least(shots_on_target, shots)
where shots_on_target > shots;

update public.player_match_stats
set passes_completed = least(passes_completed, passes_attempted)
where passes_completed > passes_attempted;

update public.player_match_stats
set clean_sheet = false
where clean_sheet = true
  and (position is distinct from 'goalkeeper' or goals_conceded <> 0);

-- Keep impossible metric combinations out of the database even if data is
-- written outside the FC Edineț admin interface.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'player_match_stats_shots_consistency_check'
      and conrelid = 'public.player_match_stats'::regclass
  ) then
    alter table public.player_match_stats
      add constraint player_match_stats_shots_consistency_check
      check (shots_on_target <= shots);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'player_match_stats_passes_consistency_check'
      and conrelid = 'public.player_match_stats'::regclass
  ) then
    alter table public.player_match_stats
      add constraint player_match_stats_passes_consistency_check
      check (passes_completed <= passes_attempted);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'player_match_stats_clean_sheet_consistency_check'
      and conrelid = 'public.player_match_stats'::regclass
  ) then
    alter table public.player_match_stats
      add constraint player_match_stats_clean_sheet_consistency_check
      check (
        clean_sheet = false
        or (position = 'goalkeeper' and goals_conceded = 0)
      );
  end if;
end $$;

-- If an existing competition is moved to another season, refresh all already
-- entered player rows belonging to that competition.
create or replace function public.refresh_competition_player_stats_season()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.season_id is distinct from old.season_id then
    update public.player_match_stats
    set season_id = new.season_id
    where competition_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists competitions_refresh_player_stats_season on public.competitions;
create trigger competitions_refresh_player_stats_season
after update of season_id on public.competitions
for each row execute function public.refresh_competition_player_stats_season();

-- Final safety gate for a match being marked complete.
-- Drafts stay flexible, but completed statistics must have a finished match,
-- a season context and at least one player row.
create or replace function public.validate_completed_match_statistics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_status text;
  v_competition_id bigint;
  v_season_id bigint;
  v_rows integer;
begin
  if new.status = 'complete' then
    select m.status, m.competition_id, c.season_id
    into v_match_status, v_competition_id, v_season_id
    from public.matches m
    left join public.competitions c on c.id = m.competition_id
    where m.id = new.match_id;

    if v_match_status is null then
      raise exception 'Match % does not exist', new.match_id;
    end if;

    if v_match_status <> 'finished' then
      raise exception 'Only a finished match can have completed statistics';
    end if;

    if v_competition_id is null then
      raise exception 'Assign a competition to the match before completing statistics';
    end if;

    if v_season_id is null then
      raise exception 'Assign a season to the competition before completing statistics';
    end if;

    -- Refresh stored context before checking it.
    update public.player_match_stats
    set match_id = match_id
    where match_id = new.match_id;

    select count(*)::integer
    into v_rows
    from public.player_match_stats
    where match_id = new.match_id;

    if coalesce(v_rows, 0) = 0 then
      raise exception 'Completed statistics require at least one player row';
    end if;

    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
    new.completed_by := null;
  end if;

  return new;
end;
$$;

drop trigger if exists match_statistics_status_validate_complete on public.match_statistics_status;
create trigger match_statistics_status_validate_complete
before insert or update of status, match_id on public.match_statistics_status
for each row execute function public.validate_completed_match_statistics();

-- Editor-only diagnostics used by /admin/statistics. This view does not expose
-- player-level values and is not granted to anonymous visitors.
drop view if exists public.statistics_integrity_issues;
create view public.statistics_integrity_issues
with (security_invoker = true)
as
select
  'match_without_competition'::text as issue_type,
  'warning'::text as severity,
  m.id as match_id,
  'Завершённый матч не привязан к турниру'::text as message
from public.matches m
where public.is_editor_or_admin()
  and m.status = 'finished'
  and m.competition_id is null

union all

select
  'competition_without_season'::text,
  'warning'::text,
  m.id,
  'Турнир завершённого матча не привязан к сезону'::text
from public.matches m
join public.competitions c on c.id = m.competition_id
where public.is_editor_or_admin()
  and m.status = 'finished'
  and c.season_id is null

union all

select
  'complete_without_players'::text,
  'error'::text,
  mss.match_id,
  'Статистика отмечена готовой, но игроков в матче нет'::text
from public.match_statistics_status mss
where public.is_editor_or_admin()
  and mss.status = 'complete'
  and not exists (
    select 1 from public.player_match_stats pms
    where pms.match_id = mss.match_id
  )

union all

select distinct
  'context_mismatch'::text,
  'error'::text,
  pms.match_id,
  'Контекст статистики игрока не совпадает с турниром/сезоном матча'::text
from public.player_match_stats pms
join public.matches m on m.id = pms.match_id
left join public.competitions c on c.id = m.competition_id
where public.is_editor_or_admin()
  and (pms.competition_id is distinct from m.competition_id
   or pms.season_id is distinct from c.season_id)

union all

select
  'multiple_captains'::text,
  'warning'::text,
  pms.match_id,
  'В одном матче отмечено больше одного капитана'::text
from public.player_match_stats pms
where public.is_editor_or_admin()
  and pms.is_captain = true
group by pms.match_id
having count(*) > 1

union all

select distinct
  'stats_on_unfinished_match'::text,
  'warning'::text,
  pms.match_id,
  'Есть статистика игроков у матча, который больше не имеет статус «Завершён»'::text
from public.player_match_stats pms
join public.matches m on m.id = pms.match_id
where public.is_editor_or_admin()
  and m.status <> 'finished';

grant select on table public.statistics_integrity_issues to authenticated;

notify pgrst, 'reload schema';
