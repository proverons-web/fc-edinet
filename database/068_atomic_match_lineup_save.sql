-- FC Edineț v2.29.16 — atomic lineup + formation/coach save.
-- One PostgREST RPC = one PostgreSQL transaction. Existing rows are retained
-- if validation, insert, or settings update fails. Safe to apply once/reapply.
-- No public EXECUTE: only an authenticated editor/admin may call it.

begin;

create or replace function public.save_match_lineup_atomic(
  p_match_id bigint,
  p_side text,
  p_formation text,
  p_coach_name text,
  p_rows jsonb,
  p_compare_revision boolean default false,
  p_expected_updated_at timestamptz default null
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_team_id bigint;
  v_home bigint;
  v_away bigint;
  v_settings_exists boolean;
  v_updated_at timestamptz;
  v_item jsonb;
  v_role text;
  v_slot integer;
  v_player_id uuid;
  v_player_name text;
  v_position text;
  v_shirt_number integer;
  v_captain boolean;
  v_row_count integer := 0;
  v_captains integer := 0;
  v_keys text[] := array[]::text[];
  v_players uuid[] := array[]::uuid[];
  v_key text;
begin
  if v_actor is null or not coalesce((select public.is_editor_or_admin()),false) then
    raise exception 'Editor permissions required for lineup saving' using errcode='42501';
  end if;

  if p_match_id is null or p_match_id <= 0 or p_side is null or p_side not in ('home','away') then
    raise exception 'Invalid match or lineup side' using errcode='22023';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array'
     or jsonb_array_length(p_rows) > 23 then
    raise exception 'Lineup must be an array of at most 23 players' using errcode='22023';
  end if;
  if length(coalesce(p_formation,'')) > 40 or length(coalesce(p_coach_name,'')) > 160 then
    raise exception 'Lineup settings are too long' using errcode='22023';
  end if;

  -- Serializes changes to either side of the same match. Prevents interleaved
  -- delete/insert sequences from parallel saves.
  select home_team_id,away_team_id into v_home,v_away
  from public.matches where id=p_match_id for update;
  if not found then
    raise exception 'Match not found' using errcode='P0002';
  end if;
  v_team_id := case when p_side='home' then v_home else v_away end;

  select true, updated_at into v_settings_exists,v_updated_at
    from public.match_lineup_settings
    where match_id=p_match_id and side=p_side;
  if coalesce(p_compare_revision,false) and
     (coalesce(v_settings_exists,false) <> (p_expected_updated_at is not null)
        or v_updated_at is distinct from p_expected_updated_at) then
    raise exception 'Lineup was changed in another tab. Reload before saving.'
      using errcode='40001';
  end if;

  -- Prevalidate the entire payload before removing a single existing row.
  for v_item in select value from jsonb_array_elements(p_rows) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Invalid lineup item' using errcode='22023';
    end if;
    v_role := v_item->>'lineup_role';
    v_slot := (v_item->>'slot_number')::integer;
    v_player_id := nullif(v_item->>'player_id','')::uuid;
    v_player_name := nullif(btrim(v_item->>'player_name'),'');
    v_position := nullif(v_item->>'position','');
    v_shirt_number := nullif(v_item->>'shirt_number','')::integer;
    v_captain := coalesce((v_item->>'is_captain')::boolean,false);

    if v_role not in ('starter','substitute')
       or v_slot is null
       or v_slot < 1
       or (v_role='starter' and v_slot>11)
       or (v_role='substitute' and v_slot>12)
       or v_position is not null and v_position not in ('goalkeeper','defender','midfielder','forward')
       or v_shirt_number is not null and (v_shirt_number < 0 or v_shirt_number > 99) then
      raise exception 'Invalid lineup slot, position or shirt number' using errcode='22023';
    end if;

    if v_player_id is not null then
      -- Do not trust a form-supplied name for an existing player.
      select btrim(first_name || ' ' || last_name) into v_player_name
        from public.players where id=v_player_id;
      if not found then
        raise exception 'Selected player does not exist' using errcode='23503';
      end if;
      if v_player_id=any(v_players) then
        raise exception 'Player is selected twice in this lineup' using errcode='23505';
      end if;
      v_players:=array_append(v_players,v_player_id);
    end if;
    if v_player_name is null or length(v_player_name)>120 then
      raise exception 'Player name is missing or too long' using errcode='22023';
    end if;
    v_key:=v_role||':'||v_slot::text;
    if v_key=any(v_keys) then
      raise exception 'Duplicate lineup slot' using errcode='23505';
    end if;
    v_keys:=array_append(v_keys,v_key);
    v_row_count:=v_row_count+1;
    if v_captain then v_captains:=v_captains+1; end if;
  end loop;
  if v_row_count>0 and v_captains<>1 then
    raise exception 'Select exactly one captain for the lineup' using errcode='22023';
  end if;

  insert into public.match_lineup_settings
    (match_id,team_id,side,formation,coach_name,created_by,updated_by)
  values (p_match_id,v_team_id,p_side,nullif(p_formation,''),nullif(p_coach_name,''),v_actor,v_actor)
  on conflict (match_id,side)
  do update set team_id=excluded.team_id,formation=excluded.formation,
    coach_name=excluded.coach_name,updated_by=excluded.updated_by;

  delete from public.match_lineup_entries
    where match_id=p_match_id and side=p_side;

  for v_item in select value from jsonb_array_elements(p_rows) loop
    v_player_id:=nullif(v_item->>'player_id','')::uuid;
    v_player_name:=nullif(btrim(v_item->>'player_name'),'');
    if v_player_id is not null then
      select btrim(first_name || ' ' || last_name) into v_player_name
        from public.players where id=v_player_id;
    end if;
    insert into public.match_lineup_entries
      (match_id,team_id,side,lineup_role,slot_number,player_id,player_name,
       shirt_number,position,is_captain,sort_order,created_by,updated_by)
    values
      (p_match_id,v_team_id,p_side,v_item->>'lineup_role',
       (v_item->>'slot_number')::smallint,v_player_id,v_player_name,
       nullif(v_item->>'shirt_number','')::smallint,
       nullif(v_item->>'position',''),coalesce((v_item->>'is_captain')::boolean,false),
       coalesce((v_item->>'sort_order')::integer,(v_item->>'slot_number')::integer),v_actor,v_actor);
  end loop;

  return jsonb_build_object('saved',true,'match_id',p_match_id,
      'side',p_side,'entries',v_row_count);
end;
$function$;

revoke all on function public.save_match_lineup_atomic(bigint,text,text,text,jsonb,boolean,timestamptz)
  from public,anon,authenticated;
grant execute on function public.save_match_lineup_atomic(bigint,text,text,text,jsonb,boolean,timestamptz)
  to authenticated;

commit;
notify pgrst,'reload schema';
