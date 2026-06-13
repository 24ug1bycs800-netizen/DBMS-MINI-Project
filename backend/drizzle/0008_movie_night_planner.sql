-- Movie Nights tables for Smart Movie Night Planner feature

CREATE TABLE "movie_nights" (
  "id" serial PRIMARY KEY,
  "title" varchar(255) NOT NULL,
  "description" text,
  "organizer_id" integer NOT NULL REFERENCES "users"("id"),
  "invite_code" varchar(100) NOT NULL UNIQUE,
  "status" varchar(50) NOT NULL DEFAULT 'COLLECTING_PREFERENCES',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "movie_night_members" (
  "id" serial PRIMARY KEY,
  "movie_night_id" integer NOT NULL REFERENCES "movie_nights"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" varchar(50) NOT NULL DEFAULT 'MEMBER',
  "joined_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "movie_night_preferences" (
  "id" serial PRIMARY KEY,
  "movie_night_id" integer NOT NULL REFERENCES "movie_nights"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "preferred_genres" text NOT NULL DEFAULT '[]',
  "preferred_time" varchar(20) NOT NULL,
  "budget_limit" integer NOT NULL,
  "preferred_location" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "movie_night_recommendations" (
  "id" serial PRIMARY KEY,
  "movie_night_id" integer NOT NULL REFERENCES "movie_nights"("id") ON DELETE CASCADE,
  "movie_id" integer NOT NULL REFERENCES "movies"("id"),
  "show_id" integer NOT NULL REFERENCES "shows"("id"),
  "genre_score" integer NOT NULL,
  "time_score" integer NOT NULL,
  "budget_score" integer NOT NULL,
  "location_score" integer NOT NULL,
  "compatibility_score" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "movie_night_votes" (
  "id" serial PRIMARY KEY,
  "movie_night_id" integer NOT NULL REFERENCES "movie_nights"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "vote" varchar(20) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "movie_night_contributions" (
  "id" serial PRIMARY KEY,
  "movie_night_id" integer NOT NULL REFERENCES "movie_nights"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "contribution_amount" integer NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'PENDING',
  "payment_id" text,
  "paid_at" timestamp
);

-- Indexes for common queries
CREATE INDEX "mn_members_night_idx" ON "movie_night_members"("movie_night_id");
CREATE INDEX "mn_members_user_idx" ON "movie_night_members"("user_id");
CREATE INDEX "mn_prefs_night_idx" ON "movie_night_preferences"("movie_night_id");
CREATE INDEX "mn_votes_night_idx" ON "movie_night_votes"("movie_night_id");
CREATE INDEX "mn_contrib_night_idx" ON "movie_night_contributions"("movie_night_id");
