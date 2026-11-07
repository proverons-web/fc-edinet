-- FC Edineț v2.30.20. Apply AFTER 082_cup_bracket.sql.
-- Preserves all existing matches, results, brackets and current single-leg behavior.
BEGIN;
ALTER TABLE public.cup_bracket_ties
  ADD COLUMN IF NOT EXISTS leg_mode text NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS return_match_id bigint REFERENCES public.matches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shootout_home smallint,
  ADD COLUMN IF NOT EXISTS shootout_away smallint;

ALTER TABLE public.cup_bracket_ties DROP CONSTRAINT IF EXISTS cup_bracket_ties_leg_mode_check;
ALTER TABLE public.cup_bracket_ties ADD CONSTRAINT cup_bracket_ties_leg_mode_check
  CHECK (leg_mode IN ('single','two_leg'));
ALTER TABLE public.cup_bracket_ties DROP CONSTRAINT IF EXISTS cup_bracket_ties_legs_check;
ALTER TABLE public.cup_bracket_ties ADD CONSTRAINT cup_bracket_ties_legs_check CHECK (
  (leg_mode='two_leg' OR (return_match_id IS NULL AND shootout_home IS NULL AND shootout_away IS NULL))
  AND (return_match_id IS NULL OR (leg_mode='two_leg' AND match_id IS NOT NULL AND return_match_id<>match_id))
  AND ((shootout_home IS NULL AND shootout_away IS NULL) OR
       (leg_mode='two_leg' AND return_match_id IS NOT NULL AND shootout_home BETWEEN 0 AND 99
        AND shootout_away BETWEEN 0 AND 99 AND shootout_home<>shootout_away))
);
CREATE UNIQUE INDEX IF NOT EXISTS cup_bracket_ties_return_match_key ON public.cup_bracket_ties(return_match_id) WHERE return_match_id IS NOT NULL;

-- All matches in a tie must belong to one cup. A return leg must reverse home/away.
-- Shootout counts belong to first-leg home/away, not the second match's HOME/AWAY fields.
CREATE OR REPLACE FUNCTION private.validate_cup_bracket_legs()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,private AS $$
DECLARE first_leg public.matches%ROWTYPE;
        second_leg public.matches%ROWTYPE;
        h integer;
        a integer;
BEGIN
  -- Serialize edits within this edition so a match cannot be concurrently linked twice.
  PERFORM pg_advisory_xact_lock(833020, NEW.competition_id::integer);
  IF NEW.match_id IS NOT NULL THEN
    SELECT * INTO first_leg FROM public.matches WHERE id=NEW.match_id;
    IF NOT FOUND OR first_leg.competition_id IS DISTINCT FROM NEW.competition_id THEN
      RAISE EXCEPTION 'First match belongs to another cup';
    END IF;
    IF (NEW.home_team_id IS NOT NULL AND NEW.home_team_id<>first_leg.home_team_id)
      OR (NEW.away_team_id IS NOT NULL AND NEW.away_team_id<>first_leg.away_team_id) THEN
      RAISE EXCEPTION 'Seeds must match first leg teams';
    END IF;
  END IF;
  IF NEW.return_match_id IS NOT NULL THEN
    SELECT * INTO second_leg FROM public.matches WHERE id=NEW.return_match_id;
    IF NOT FOUND OR second_leg.competition_id IS DISTINCT FROM NEW.competition_id
       OR NEW.match_id IS NULL OR second_leg.home_team_id<>first_leg.away_team_id
       OR second_leg.away_team_id<>first_leg.home_team_id THEN
      RAISE EXCEPTION 'Return match must be in the same cup with home and away reversed';
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.cup_bracket_ties t WHERE t.id IS DISTINCT FROM NEW.id
    AND (t.match_id=NEW.return_match_id OR t.return_match_id=NEW.match_id OR t.return_match_id=NEW.return_match_id)
    AND (NEW.match_id IS NOT NULL OR NEW.return_match_id IS NOT NULL)
  ) THEN RAISE EXCEPTION 'Match is already used in another cup tie'; END IF;
  IF NEW.shootout_home IS NOT NULL THEN
    IF NEW.match_id IS NULL OR NEW.return_match_id IS NULL OR
      first_leg.status<>'finished' OR second_leg.status<>'finished' OR
      first_leg.home_score IS NULL OR first_leg.away_score IS NULL OR
      second_leg.home_score IS NULL OR second_leg.away_score IS NULL THEN
      RAISE EXCEPTION 'Both legs must be finished before entering shootout';
    END IF;
    h=first_leg.home_score + second_leg.away_score;
    a=first_leg.away_score + second_leg.home_score;
    IF h<>a THEN RAISE EXCEPTION 'Shootout only after level aggregate'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.validate_cup_bracket_legs() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS validate_cup_bracket_legs ON public.cup_bracket_ties;
CREATE TRIGGER validate_cup_bracket_legs BEFORE INSERT OR UPDATE ON public.cup_bracket_ties
FOR EACH ROW EXECUTE FUNCTION private.validate_cup_bracket_legs();

-- Prevent breaking a published two-leg tie by swapping team IDs on an official match.
CREATE OR REPLACE FUNCTION private.guard_cup_match_teams()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,private AS $$
BEGIN
 IF (NEW.home_team_id IS DISTINCT FROM OLD.home_team_id OR NEW.away_team_id IS DISTINCT FROM OLD.away_team_id)
   AND EXISTS(SELECT 1 FROM public.cup_bracket_ties WHERE match_id=NEW.id OR return_match_id=NEW.id) THEN
   RAISE EXCEPTION 'Remove match from cup bracket before changing its participants';
 END IF;
 IF NEW.competition_id IS DISTINCT FROM OLD.competition_id
   AND EXISTS(SELECT 1 FROM public.cup_bracket_ties WHERE return_match_id=NEW.id) THEN
   RAISE EXCEPTION 'Remove return match from cup bracket before changing its competition';
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_cup_match_teams() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_cup_match_teams ON public.matches;
CREATE TRIGGER guard_cup_match_teams BEFORE UPDATE OF home_team_id,away_team_id,competition_id ON public.matches
FOR EACH ROW EXECUTE FUNCTION private.guard_cup_match_teams();

-- Fast, atomic automatic linking of existing first-round ties into the NEXT defined stage.
-- No match records or teams are created or changed. Manual nonmatching links are rejected.
CREATE OR REPLACE FUNCTION public.auto_link_cup_bracket_round(p_competition_id bigint, p_stage_order smallint)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE next_stage smallint;
        source_ids bigint[];
        dest_ids bigint[];
        i integer;
        dest bigint;
        side text;
        old_target bigint;
        old_slot text;
        result_count integer:=0;
BEGIN
 IF NOT (SELECT public.is_editor_or_admin()) THEN
   RAISE EXCEPTION 'Editor permission required';
 END IF;
 PERFORM pg_advisory_xact_lock(833020, p_competition_id::integer);
 PERFORM 1 FROM public.cup_bracket_ties WHERE competition_id=p_competition_id FOR UPDATE;
 SELECT min(stage_order) INTO next_stage FROM public.cup_bracket_ties
    WHERE competition_id=p_competition_id AND stage_order>p_stage_order;
 IF next_stage IS NULL THEN RAISE EXCEPTION 'No later round exists'; END IF;
 SELECT array_agg(id ORDER BY sort_order,id) INTO source_ids FROM public.cup_bracket_ties
    WHERE competition_id=p_competition_id AND stage_order=p_stage_order;
 SELECT array_agg(id ORDER BY sort_order,id) INTO dest_ids FROM public.cup_bracket_ties
    WHERE competition_id=p_competition_id AND stage_order=next_stage;
 IF coalesce(array_length(source_ids,1),0)=0 OR
    array_length(source_ids,1)<>2*coalesce(array_length(dest_ids,1),0) THEN
   RAISE EXCEPTION 'Requires exactly two source ties per next-round tie';
 END IF;
 FOR i IN 1..array_length(source_ids,1) LOOP
   dest:=dest_ids[((i+1)/2)::integer];
   side:=CASE WHEN i%2=1 THEN 'home' ELSE 'away' END;
   SELECT next_tie_id,next_slot INTO old_target,old_slot
   FROM public.cup_bracket_ties WHERE id=source_ids[i];
   IF old_target IS NOT NULL AND (old_target<>dest OR old_slot<>side) THEN
     RAISE EXCEPTION 'A manual link conflicts with the calculated bracket';
   END IF;
   -- Updates go through RLS and the v2.30.19 forward-progression trigger.
   UPDATE public.cup_bracket_ties SET next_tie_id=dest,next_slot=side
   WHERE id=source_ids[i] AND next_tie_id IS DISTINCT FROM dest;
   GET DIAGNOSTICS result_count=ROW_COUNT;
 END LOOP;
 RETURN array_length(source_ids,1);
END;
$$;
REVOKE ALL ON FUNCTION public.auto_link_cup_bracket_round(bigint,smallint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.auto_link_cup_bracket_round(bigint,smallint) TO authenticated;
COMMENT ON FUNCTION public.auto_link_cup_bracket_round(bigint,smallint) IS 'Atomically links two preceding cup ties to the next stage without modifying matches or lineups.';
-- Also protect stored tie shootouts from subsequent official match edits.
CREATE OR REPLACE FUNCTION private.guard_two_leg_shootout_after_match_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,private AS $$
DECLARE t record;
        first_leg public.matches%ROWTYPE;
        second_leg public.matches%ROWTYPE;
BEGIN
 FOR t IN SELECT match_id,return_match_id FROM public.cup_bracket_ties
    WHERE (match_id=NEW.id OR return_match_id=NEW.id) AND shootout_home IS NOT NULL
 LOOP
   SELECT * INTO first_leg FROM public.matches WHERE id=t.match_id;
   SELECT * INTO second_leg FROM public.matches WHERE id=t.return_match_id;
   IF t.match_id=NEW.id THEN first_leg:=NEW; END IF;
   IF t.return_match_id=NEW.id THEN second_leg:=NEW; END IF;
   IF first_leg.status<>'finished' OR second_leg.status<>'finished'
      OR first_leg.home_score IS NULL OR first_leg.away_score IS NULL
      OR second_leg.home_score IS NULL OR second_leg.away_score IS NULL
      OR first_leg.home_score+second_leg.away_score <> first_leg.away_score+second_leg.home_score THEN
     RAISE EXCEPTION 'Clear cup tie shootout before changing the official match score or status';
   END IF;
 END LOOP;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_two_leg_shootout_after_match_edit() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS guard_two_leg_shootout_after_match_edit ON public.matches;
CREATE TRIGGER guard_two_leg_shootout_after_match_edit
BEFORE UPDATE OF home_score,away_score,status ON public.matches
FOR EACH ROW EXECUTE FUNCTION private.guard_two_leg_shootout_after_match_edit();
COMMIT;
