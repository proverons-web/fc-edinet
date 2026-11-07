-- FC Edinet v2.30.4 — classify videos and connect them to match protocols.
-- Apply AFTER 074_media_match_albums.sql. Existing videos stay published/unlinked.
ALTER TABLE public.media_videos
  ADD COLUMN IF NOT EXISTS match_id bigint REFERENCES public.matches(id) ON DELETE SET NULL;
ALTER TABLE public.media_videos
  ADD COLUMN IF NOT EXISTS video_kind text NOT NULL DEFAULT 'other';
-- Validation on new and existing rows (legacy rows default to 'other').
ALTER TABLE public.media_videos
  DROP CONSTRAINT IF EXISTS media_videos_kind_check;
ALTER TABLE public.media_videos
  ADD CONSTRAINT media_videos_kind_check
  CHECK (video_kind IN ('highlights','full_match','interview','other'));
CREATE INDEX IF NOT EXISTS media_videos_match_published_idx
  ON public.media_videos (match_id, display_order, published_at DESC)
  WHERE is_published = true AND match_id IS NOT NULL;
-- Existing RLS on media_videos (013_media.sql) remains in effect.
