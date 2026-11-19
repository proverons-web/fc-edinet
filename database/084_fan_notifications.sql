-- FC Edinet v2.30.25 — private in-account notifications for favorite fixtures.
-- Apply AFTER 083_cup_two_leg_ties.sql. Does not backfill historic changes.
BEGIN;

CREATE TABLE IF NOT EXISTS public.fan_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  match_id bigint NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('postponed','cancelled','rescheduled','confirmed','result')),
  previous_kickoff timestamptz,
  new_kickoff timestamptz,
  home_score integer,
  away_score integer,
  home_penalties integer,
  away_penalties integer,
  reason_ru text,
  reason_ro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT fan_notifications_match_id_fkey FOREIGN KEY (match_id)
    REFERENCES public.matches(id) ON DELETE CASCADE,
  CONSTRAINT fan_notifications_favorite_fkey FOREIGN KEY (user_id, match_id)
    REFERENCES public.favorite_matches(user_id, match_id) ON DELETE CASCADE,
  CONSTRAINT fan_notifications_event_unique UNIQUE (user_id, event_id)
);
CREATE INDEX IF NOT EXISTS fan_notifications_user_feed_idx
  ON public.fan_notifications(user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS fan_notifications_unread_idx
  ON public.fan_notifications(user_id, created_at DESC) WHERE read_at IS NULL;
ALTER TABLE public.fan_notifications ENABLE ROW LEVEL SECURITY;

-- No client inserts or modifications of event content; only the read_at column can change.
REVOKE ALL ON public.fan_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.fan_notifications TO authenticated;
GRANT UPDATE (read_at) ON public.fan_notifications TO authenticated;
DROP POLICY IF EXISTS "Owner reads fan notifications" ON public.fan_notifications;
CREATE POLICY "Owner reads fan notifications" ON public.fan_notifications
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Owner marks fan notifications as read" ON public.fan_notifications;
CREATE POLICY "Owner marks fan notifications as read" ON public.fan_notifications
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.create_fan_match_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, private AS $$
DECLARE
  v_type text;
  v_event uuid;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;

  -- Order is deliberate: cancellation/postponement supersede a simultaneous time change.
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_type := 'cancelled';
  ELSIF NEW.status = 'postponed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_type := 'postponed';
  ELSIF OLD.status = 'postponed' AND NEW.status = 'scheduled' THEN
    v_type := 'confirmed';
  ELSIF NEW.status IN ('scheduled','postponed')
       AND NEW.kickoff IS DISTINCT FROM OLD.kickoff THEN
    v_type := 'rescheduled';
  ELSIF NEW.status = 'finished' AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL
    AND (OLD.status IS DISTINCT FROM NEW.status
      OR OLD.home_score IS DISTINCT FROM NEW.home_score
      OR OLD.away_score IS DISTINCT FROM NEW.away_score
      OR OLD.home_penalties IS DISTINCT FROM NEW.home_penalties
      OR OLD.away_penalties IS DISTINCT FROM NEW.away_penalties) THEN
    v_type := 'result';
  ELSE
    RETURN NEW;
  END IF;

  v_event := gen_random_uuid();
  INSERT INTO public.fan_notifications (
    event_id, user_id, match_id, event_type,
    previous_kickoff, new_kickoff, home_score, away_score,
    home_penalties, away_penalties, reason_ru, reason_ro
  )
  SELECT v_event, fm.user_id, NEW.id, v_type,
         CASE WHEN v_type = 'result' THEN NULL ELSE OLD.kickoff END,
         CASE
           WHEN v_type = 'postponed' AND NEW.kickoff IS NOT DISTINCT FROM OLD.kickoff THEN NULL
           WHEN v_type = 'cancelled' OR v_type = 'result' THEN NULL
           ELSE NEW.kickoff
         END,
         CASE WHEN v_type = 'result' THEN NEW.home_score ELSE NULL END,
         CASE WHEN v_type = 'result' THEN NEW.away_score ELSE NULL END,
         CASE WHEN v_type = 'result' THEN NEW.home_penalties ELSE NULL END,
         CASE WHEN v_type = 'result' THEN NEW.away_penalties ELSE NULL END,
         CASE WHEN v_type IN ('postponed','cancelled','rescheduled','confirmed') THEN NEW.schedule_reason_ru ELSE NULL END,
         CASE WHEN v_type IN ('postponed','cancelled','rescheduled','confirmed') THEN NEW.schedule_reason_ro ELSE NULL END
    FROM public.favorite_matches AS fm
    JOIN public.profiles AS p ON p.id = fm.user_id
    WHERE fm.match_id = NEW.id AND p.notifications_enabled IS TRUE
  ON CONFLICT (user_id, event_id) DO NOTHING;
  RETURN NEW;
END;
$$;
-- Function stays in non-exposed private schema and is only executed by the match trigger.
REVOKE ALL ON FUNCTION private.create_fan_match_notification() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS zz_fan_match_notification ON public.matches;
CREATE TRIGGER zz_fan_match_notification
AFTER UPDATE OF kickoff, status, home_score, away_score, home_penalties, away_penalties
ON public.matches FOR EACH ROW EXECUTE FUNCTION private.create_fan_match_notification();
COMMIT;
