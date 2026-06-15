-- Movie Nights: normalize genre preferences (1NF) + add uniqueness constraints
-- so the recommendation engine can score in pure SQL and upserts are race-free.

-- 1. Normalized genre-preference table (one row per member per genre)
CREATE TABLE IF NOT EXISTS "movie_night_preference_genres" (
  "id" serial PRIMARY KEY,
  "movie_night_id" integer NOT NULL REFERENCES "movie_nights"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "genre" varchar(50) NOT NULL
);

-- 2. Backfill from the old JSON text column (safe if column holds a JSON array)
DO $$
BEGIN
  INSERT INTO "movie_night_preference_genres" ("movie_night_id", "user_id", "genre")
  SELECT p.movie_night_id, p.user_id, trim(g.value)
  FROM "movie_night_preferences" p
  CROSS JOIN LATERAL json_array_elements_text(p.preferred_genres::json) AS g(value)
  WHERE trim(g.value) <> '';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Genre backfill skipped: %', SQLERRM;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "mn_pref_genres_uq"
  ON "movie_night_preference_genres" ("movie_night_id", "user_id", "genre");
CREATE INDEX IF NOT EXISTS "mn_pref_genres_night_idx"
  ON "movie_night_preference_genres" ("movie_night_id");

-- 3. De-duplicate any existing rows before adding unique constraints
--    (keeps the earliest row per member; deletes later duplicates)
DELETE FROM "movie_night_members" a USING "movie_night_members" b
  WHERE a.id > b.id AND a.movie_night_id = b.movie_night_id AND a.user_id = b.user_id;
DELETE FROM "movie_night_preferences" a USING "movie_night_preferences" b
  WHERE a.id > b.id AND a.movie_night_id = b.movie_night_id AND a.user_id = b.user_id;
DELETE FROM "movie_night_votes" a USING "movie_night_votes" b
  WHERE a.id > b.id AND a.movie_night_id = b.movie_night_id AND a.user_id = b.user_id;
DELETE FROM "movie_night_contributions" a USING "movie_night_contributions" b
  WHERE a.id > b.id AND a.movie_night_id = b.movie_night_id AND a.user_id = b.user_id;

-- 4. Add the unique constraints (guarded so re-runs are safe)
DO $$ BEGIN
  ALTER TABLE "movie_night_members"       ADD CONSTRAINT "mn_members_night_user_uq" UNIQUE ("movie_night_id", "user_id");
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "movie_night_preferences"   ADD CONSTRAINT "mn_prefs_night_user_uq"   UNIQUE ("movie_night_id", "user_id");
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "movie_night_votes"         ADD CONSTRAINT "mn_votes_night_user_uq"   UNIQUE ("movie_night_id", "user_id");
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "movie_night_contributions" ADD CONSTRAINT "mn_contrib_night_user_uq" UNIQUE ("movie_night_id", "user_id");
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
