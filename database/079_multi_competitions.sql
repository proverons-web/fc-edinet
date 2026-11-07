-- v2.30.16 — Existing Liga 2 and 19 matches remain unchanged.
BEGIN;
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS competition_type text NOT NULL DEFAULT 'league',
  ADD COLUMN IF NOT EXISTS name_ro text,
  ADD COLUMN IF NOT EXISTS logo_url text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.competitions'::regclass AND conname = 'competitions_type_check') THEN
    ALTER TABLE public.competitions ADD CONSTRAINT competitions_type_check
      CHECK (competition_type IN ('league','cup','friendly','other'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS competitions_type_active_idx ON public.competitions(competition_type,is_active,season_id);
-- Existing RLS policies for competitions remain unchanged; no new public write grants.
COMMIT;
