-- FC Edinet v2.30.2 — associate published photo albums with matches.
-- Apply once in Supabase SQL editor BEFORE assigning matches to albums.
-- Existing albums remain untouched and unassigned.
ALTER TABLE public.media_albums
  ADD COLUMN IF NOT EXISTS match_id bigint REFERENCES public.matches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS media_albums_match_published_idx
  ON public.media_albums(match_id, display_order, event_date DESC)
  WHERE is_published = true AND match_id IS NOT NULL;
