-- FC Edinet v2.30.5 — per-album hero cover focal point.
-- Additive migration: existing covers default to center; no data is deleted.
-- Use existing media_albums RLS policies from database/013_media.sql.
ALTER TABLE public.media_albums
  ADD COLUMN IF NOT EXISTS cover_position_x integer NOT NULL DEFAULT 50;
ALTER TABLE public.media_albums
  ADD COLUMN IF NOT EXISTS cover_position_y integer NOT NULL DEFAULT 50;
ALTER TABLE public.media_albums
  DROP CONSTRAINT IF EXISTS media_albums_cover_position_x_check;
ALTER TABLE public.media_albums
  ADD CONSTRAINT media_albums_cover_position_x_check CHECK (cover_position_x BETWEEN 0 AND 100);
ALTER TABLE public.media_albums
  DROP CONSTRAINT IF EXISTS media_albums_cover_position_y_check;
ALTER TABLE public.media_albums
  ADD CONSTRAINT media_albums_cover_position_y_check CHECK (cover_position_y BETWEEN 0 AND 100);
