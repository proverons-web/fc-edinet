-- FC Edinet v2.29.20: atomically replace club player stats and optionally
-- publish their completion status. One RPC = one PostgreSQL transaction.
-- Does not alter existing matches or player statistics when installed.
-- The caller must be a signed-in editor and satisfy underlying RLS policies.

create or replace function public.save_club_player_stats_atomic(
  p_match_id bigint,
  p_rows jsonb,
  p_status text default null,
  p_compare_revision boolean default false,
  p_expected_updated_at timestamptz default null
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_club_team_id bigint;
  v_match_status text;
  v_previous_updated_at timestamptz;
  v_row_count integer;
  v_id_count integer;
  v_saved_count integer;
  v_deleted_count integer;
  v_status text;
begin
  if v_actor is null or not coalesce((select public.is_editor_or_admin()), false) then
    raise exception 'Editor permissions required for player statistics' using errcode='42501';
  end if;
  if p_match_id is null or p_match_id <= 0 then
    raise exception 'Invalid match id' using errcode='22023';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 50 then
    raise exception 'Player statistics must be a list of at most 50 players' using errcode='22023';
  end if;
  if p_status is not null and p_status not in ('draft','complete') then
    raise exception 'Invalid statistics status' using errcode='22023';
  end if;

  -- Serialize edits for this match before checking the optimistic revision.
  select m.status, case when h.is_club then m.home_team_id
                        when a.is_club then m.away_team_id else null end
  into v_match_status, v_club_team_id
  from public.matches m
  join public.teams h on h.id = m.home_team_id
  join public.teams a on a.id = m.away_team_id
  where m.id = p_match_id for update of m;
  if not found or v_club_team_id is null then
    raise exception 'Match or club team not found' using errcode='P0002';
  end if;
  if p_status='complete' and v_match_status <> 'finished' then
    raise exception 'Only finished matches can have completed statistics' using errcode='22023';
  end if;

  select max(updated_at) into v_previous_updated_at
    from public.player_match_stats
    where match_id = p_match_id and team_id = v_club_team_id;
  if coalesce(p_compare_revision,false)
     and v_previous_updated_at is distinct from p_expected_updated_at then
    raise exception 'Player statistics were changed in another tab. Reload before saving.'
      using errcode='40001';
  end if;

  v_row_count := jsonb_array_length(p_rows);
  -- Reject malformed and duplicate IDs before any destructive operation.
  if exists (select 1 from jsonb_array_elements(p_rows) t
             where jsonb_typeof(t.value) <> 'object'
                or not (t.value ? 'player_id')
                or nullif(t.value->>'player_id','') is null) then
    raise exception 'Invalid player-statistics row' using errcode='22023';
  end if;
  select count(distinct t.player_id) into v_id_count
  from jsonb_to_recordset(p_rows) as t(player_id uuid);
  if v_id_count <> v_row_count then
    raise exception 'Duplicate player in statistics' using errcode='23505';
  end if;
  if p_status='complete' and v_row_count=0 then
    raise exception 'Completed statistics require player records' using errcode='22023';
  end if;

  -- Enforce server-derived match/team/actor. Never trust these from the form.
  -- Whitelist every writable field; no JSON-supplied id or timestamps.
  insert into public.player_match_stats (
    match_id, player_id, team_id, appearance, position, is_captain,
    minutes_played, goals, assists, own_goals, penalties_scored, penalties_missed,
    yellow_cards, red_cards, goals_conceded, saves, clean_sheet, penalties_saved,
    shots, shots_on_target, passes_attempted, passes_completed, key_passes,
    tackles_won, interceptions, clearances, blocks, fouls_committed, fouls_won,
    notes, created_by, updated_by
  )
  select p_match_id, t.player_id, v_club_team_id,
    coalesce(t.appearance,'starter'), t.position, coalesce(t.is_captain,false),
    coalesce(t.minutes_played,0), coalesce(t.goals,0), coalesce(t.assists,0),
    coalesce(t.own_goals,0), coalesce(t.penalties_scored,0), coalesce(t.penalties_missed,0),
    coalesce(t.yellow_cards,0), coalesce(t.red_cards,0), coalesce(t.goals_conceded,0),
    coalesce(t.saves,0), coalesce(t.clean_sheet,false), coalesce(t.penalties_saved,0),
    coalesce(t.shots,0), coalesce(t.shots_on_target,0),
    coalesce(t.passes_attempted,0), coalesce(t.passes_completed,0),
    coalesce(t.key_passes,0), coalesce(t.tackles_won,0), coalesce(t.interceptions,0),
    coalesce(t.clearances,0), coalesce(t.blocks,0), coalesce(t.fouls_committed,0),
    coalesce(t.fouls_won,0), left(t.notes,1000), v_actor, v_actor
  from jsonb_to_recordset(p_rows) as t (
    player_id uuid, appearance text, position text, is_captain boolean,
    minutes_played smallint, goals smallint, assists smallint, own_goals smallint,
    penalties_scored smallint, penalties_missed smallint,
    yellow_cards smallint, red_cards smallint,
    goals_conceded smallint, saves smallint, clean_sheet boolean,
    penalties_saved smallint, shots smallint, shots_on_target smallint,
    passes_attempted smallint, passes_completed smallint, key_passes smallint,
    tackles_won smallint, interceptions smallint, clearances smallint,
    blocks smallint, fouls_committed smallint, fouls_won smallint, notes text
  )
  on conflict (match_id, player_id) do update set
    team_id = excluded.team_id,
    appearance = excluded.appearance, position = excluded.position,
    is_captain = excluded.is_captain,
    minutes_played = excluded.minutes_played,
    goals = excluded.goals, assists = excluded.assists,
    own_goals = excluded.own_goals,
    penalties_scored = excluded.penalties_scored,
    penalties_missed = excluded.penalties_missed,
    yellow_cards = excluded.yellow_cards, red_cards = excluded.red_cards,
    goals_conceded = excluded.goals_conceded, saves = excluded.saves,
    clean_sheet = excluded.clean_sheet, penalties_saved = excluded.penalties_saved,
    shots = excluded.shots, shots_on_target = excluded.shots_on_target,
    passes_attempted = excluded.passes_attempted,
    passes_completed = excluded.passes_completed,
    key_passes = excluded.key_passes,
    tackles_won = excluded.tackles_won,
    interceptions = excluded.interceptions,
    clearances = excluded.clearances,
    blocks = excluded.blocks,
    fouls_committed = excluded.fouls_committed,
    fouls_won = excluded.fouls_won,
    notes = excluded.notes, updated_by = v_actor;
  get diagnostics v_saved_count = row_count;

  -- Only club statistics for this match are replaced; opponent data stays intact.
  delete from public.player_match_stats s
    where s.match_id = p_match_id and s.team_id = v_club_team_id
      and not exists (
        select 1 from jsonb_to_recordset(p_rows) as selected(player_id uuid)
        where selected.player_id = s.player_id
      );
  get diagnostics v_deleted_count = row_count;

  if p_status is not null then
    insert into public.match_statistics_status
      (match_id,status,completed_at,completed_by,updated_by)
    values (p_match_id,p_status,
      case when p_status='complete' then now() else null end,
      case when p_status='complete' then v_actor else null end,
      v_actor)
    on conflict (match_id) do update set
      status=excluded.status,
      completed_at=excluded.completed_at,
      completed_by=excluded.completed_by,
      updated_by=excluded.updated_by;
  end if;

  select s.status into v_status from public.match_statistics_status s
   where s.match_id=p_match_id;
  return jsonb_build_object('saved',true,'match_id',p_match_id,
    'team_id',v_club_team_id,'entries',v_row_count,
    'upserted',v_saved_count,'deleted',v_deleted_count,
    'status',v_status);
end;
$function$;

revoke all on function public.save_club_player_stats_atomic(bigint,jsonb,text,boolean,timestamptz)
  from public,anon,authenticated;
grant execute on function public.save_club_player_stats_atomic(bigint,jsonb,text,boolean,timestamptz)
  to authenticated;
notify pgrst,'reload schema';
