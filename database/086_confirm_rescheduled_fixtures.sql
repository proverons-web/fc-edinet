-- FC Edineț v2.30.29. Confirm only fixtures with a known future replacement.
-- Existing status-change triggers retain the original date and log confirmation.
BEGIN;
UPDATE public.matches
   SET status = 'scheduled'
 WHERE status = 'postponed'
   AND original_kickoff IS NOT NULL
   AND kickoff <> original_kickoff
   AND kickoff > now();
COMMIT;
