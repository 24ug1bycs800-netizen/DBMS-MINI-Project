-- TMDB Integration: add metadata columns to movies table
ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS tmdb_id integer UNIQUE,
  ADD COLUMN IF NOT EXISTS backdrop_url text,
  ADD COLUMN IF NOT EXISTS overview text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamp;
