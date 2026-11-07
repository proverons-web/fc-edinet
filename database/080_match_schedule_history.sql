-- FC Edineț v2.30.17 — scheduling history; preserves every existing match ID.
-- Apply after 079_multi_competitions.sql, before deploying the new application.
BEGIN;
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS original_kickoff timestamptz,
  ADD COLUMN IF NOT EXISTS schedule_reason_ru text,
  ADD COLUMN IF NOT EXISTS schedule_reason_ro text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.matches'::regclass AND conname='matches_schedule_reason_length') THEN
    ALTER TABLE public.matches ADD CONSTRAINT matches_schedule_reason_length
      CHECK ((schedule_reason_ru IS NULL OR char_length(schedule_reason_ru) <= 600)
         AND (schedule_reason_ro IS NULL OR char_length(schedule_reason_ro) <= 600));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.match_schedule_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  match_id bigint NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  previous_kickoff timestamptz,
  new_kickoff timestamptz NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  reason_ru text,
  reason_ro text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_schedule_history_reason_len CHECK (
    (reason_ru IS NULL OR char_length(reason_ru) <= 600)
    AND (reason_ro IS NULL OR char_length(reason_ro) <= 600))
);
CREATE INDEX IF NOT EXISTS match_schedule_history_match_changed_idx
  ON public.match_schedule_history(match_id, changed_at DESC, id DESC);
ALTER TABLE public.match_schedule_history ENABLE ROW LEVEL SECURITY;
-- Public history contains no editor identifiers or private administrative notes.
REVOKE ALL ON public.match_schedule_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.match_schedule_history TO anon, authenticated;
DROP POLICY IF EXISTS "Public reads fixture schedule history" ON public.match_schedule_history;
CREATE POLICY "Public reads fixture schedule history"
  ON public.match_schedule_history FOR SELECT TO anon, authenticated USING (true);

-- In a non-API schema so anonymous clients cannot invoke privileged functions.
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.prepare_match_schedule_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, private AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('postponed','cancelled') AND NEW.original_kickoff IS NULL THEN
      NEW.original_kickoff := NEW.kickoff;
    END IF;
  ELSIF OLD.kickoff IS DISTINCT FROM NEW.kickoff
      OR OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.original_kickoff IS NULL AND OLD.original_kickoff IS NULL
       AND (OLD.kickoff IS DISTINCT FROM NEW.kickoff OR NEW.status IN ('postponed','cancelled')) THEN
      NEW.original_kickoff := OLD.kickoff;
    ELSIF OLD.original_kickoff IS NOT NULL THEN
      NEW.original_kickoff := OLD.original_kickoff;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION private.log_match_schedule_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, private AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.status IN ('postponed','cancelled') THEN
      INSERT INTO public.match_schedule_history
        (match_id,previous_kickoff,new_kickoff,previous_status,new_status,reason_ru,reason_ro)
      VALUES (NEW.id,NULL,NEW.kickoff,NULL,NEW.status,NEW.schedule_reason_ru,NEW.schedule_reason_ro);
    END IF;
  ELSIF OLD.kickoff IS DISTINCT FROM NEW.kickoff
      OR (OLD.status IS DISTINCT FROM NEW.status AND
          (OLD.status IN ('postponed','cancelled') OR NEW.status IN ('postponed','cancelled')))
      OR (NEW.status IN ('postponed','cancelled') AND (
         OLD.schedule_reason_ru IS DISTINCT FROM NEW.schedule_reason_ru OR
         OLD.schedule_reason_ro IS DISTINCT FROM NEW.schedule_reason_ro)) THEN
    INSERT INTO public.match_schedule_history
      (match_id,previous_kickoff,new_kickoff,previous_status,new_status,reason_ru,reason_ro)
    VALUES (NEW.id,OLD.kickoff,NEW.kickoff,OLD.status,NEW.status,
            NEW.schedule_reason_ru,NEW.schedule_reason_ro);
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION private.prepare_match_schedule_change() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.log_match_schedule_change() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS match_schedule_prepare ON public.matches;
CREATE TRIGGER match_schedule_prepare
  BEFORE INSERT OR UPDATE OF kickoff,status ON public.matches
  FOR EACH ROW EXECUTE FUNCTION private.prepare_match_schedule_change();
DROP TRIGGER IF EXISTS match_schedule_log ON public.matches;
CREATE TRIGGER match_schedule_log
  AFTER INSERT OR UPDATE OF kickoff,status,schedule_reason_ru,schedule_reason_ro ON public.matches
  FOR EACH ROW EXECUTE FUNCTION private.log_match_schedule_change();
-- Existing postponed/cancelled matches (if any) retain their original dates.
UPDATE public.matches SET original_kickoff=kickoff
 WHERE status IN ('postponed','cancelled') AND original_kickoff IS NULL;
COMMIT;
