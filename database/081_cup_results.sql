-- FC Edineț v2.30.18 — cup match extra time and penalty shootouts.
-- Run AFTER 080_match_schedule_history.sql. Existing fixture IDs and results remain untouched.
BEGIN;
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS extra_time_played boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS home_penalties integer,
  ADD COLUMN IF NOT EXISTS away_penalties integer;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.matches'::regclass AND conname = 'matches_cup_shootout_valid') THEN
    ALTER TABLE public.matches ADD CONSTRAINT matches_cup_shootout_valid
      CHECK (
        (home_penalties IS NULL AND away_penalties IS NULL)
        OR (status = 'finished' AND home_score IS NOT NULL AND away_score IS NOT NULL
          AND home_score = away_score
          AND home_penalties IS NOT NULL AND away_penalties IS NOT NULL
          AND home_penalties BETWEEN 0 AND 99 AND away_penalties BETWEEN 0 AND 99
          AND home_penalties <> away_penalties)
      );
  END IF;
END $$;
-- Direct SQL edits are checked too; only cup competitions may have a shootout.
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.guard_cup_match_result()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, private AS $$
BEGIN
  IF NEW.extra_time_played OR NEW.home_penalties IS NOT NULL OR NEW.away_penalties IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.competitions
      WHERE id = NEW.competition_id AND competition_type = 'cup') THEN
      RAISE EXCEPTION 'Extra time and penalty shootout fields require a cup competition';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_cup_match_result() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_cup_match_result ON public.matches;
CREATE TRIGGER guard_cup_match_result
BEFORE INSERT OR UPDATE OF competition_id,extra_time_played,home_penalties,away_penalties
ON public.matches FOR EACH ROW EXECUTE FUNCTION private.guard_cup_match_result();

COMMENT ON COLUMN public.matches.extra_time_played IS
  'The match played extra time; official home_score/away_score includes extra-time goals.';
COMMENT ON COLUMN public.matches.home_penalties IS
  'Converted shootout penalties for home team; not match goals/player penalties_scored.';
COMMENT ON COLUMN public.matches.away_penalties IS
  'Converted shootout penalties for away team; not match goals/player penalties_scored.';

-- Separate competition results. A shootout can decide qualification, but its
-- kicks never count as scored match goals or player goals.
CREATE OR REPLACE VIEW public.club_competition_results
WITH (security_invoker = true)
AS
WITH club_matches AS (
  SELECT
    c.id AS competition_id,
    c.season_id,
    CASE WHEN ht.is_club THEN m.home_score ELSE m.away_score END AS goals_for,
    CASE WHEN ht.is_club THEN m.away_score ELSE m.home_score END AS goals_against,
    CASE
      WHEN (CASE WHEN ht.is_club THEN m.home_score ELSE m.away_score END)
         > (CASE WHEN ht.is_club THEN m.away_score ELSE m.home_score END) THEN 1
      WHEN (CASE WHEN ht.is_club THEN m.home_score ELSE m.away_score END)
         < (CASE WHEN ht.is_club THEN m.away_score ELSE m.home_score END) THEN -1
      WHEN c.competition_type = 'cup' AND m.home_penalties IS NOT NULL
         AND m.away_penalties IS NOT NULL AND m.home_penalties <> m.away_penalties THEN
        CASE WHEN (ht.is_club AND m.home_penalties > m.away_penalties)
                    OR (at.is_club AND m.away_penalties > m.home_penalties)
             THEN 1 ELSE -1 END
      ELSE 0
    END AS result
  FROM public.matches m
    JOIN public.competitions c ON c.id = m.competition_id
    JOIN public.teams ht ON ht.id = m.home_team_id
    JOIN public.teams at ON at.id = m.away_team_id
  WHERE m.status = 'finished'
    AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL
    AND (ht.is_club OR at.is_club)
)
SELECT competition_id, season_id,
  count(*)::integer AS played,
  count(*) FILTER (WHERE result = 1)::integer AS wins,
  count(*) FILTER (WHERE result = 0)::integer AS draws,
  count(*) FILTER (WHERE result = -1)::integer AS losses,
  coalesce(sum(goals_for),0)::integer AS goals_for,
  coalesce(sum(goals_against),0)::integer AS goals_against
FROM club_matches
GROUP BY competition_id, season_id;
REVOKE ALL ON public.club_competition_results FROM PUBLIC;
GRANT SELECT ON public.club_competition_results TO anon, authenticated;
COMMIT;
