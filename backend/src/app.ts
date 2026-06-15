// Load environment variables FIRST, before any module that reads process.env at import time.
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import seatLockRoutes from "./routes/seatLockRoutes";
import authRoutes from "./routes/authRoutes";
import movieRoutes from "./routes/movieRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import adminRoutes from "./routes/adminRoutes";
import movieNightRoutes from "./routes/movieNightRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import { startCleanupScheduler } from "./jobs/cleanupShows";
import { db } from "./db/db";
import { sql } from "drizzle-orm";

const app = express();
const PORT = process.env.PORT || 5000;

/* ---------------- MIDDLEWARES ---------------- */

// CORS (ONLY ONCE - CORRECT POSITION)
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://dbms-mini-project-k8vk.vercel.app"
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(
  "/api/seat-locks",
  seatLockRoutes
);
// Static files
app.use("/images", express.static(path.join(process.cwd(), "images")));
app.use("/uploads", express.static("uploads"));
app.use("/assets", express.static("../frontend/public/assets"));
console.log({ authRoutes, movieRoutes, bookingRoutes, adminRoutes });
/* ---------------- HEALTH CHECK ---------------- */

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "CineCircle API",
    time: new Date(),
  });
});

/* ---------------- ROUTES ---------------- */

app.get("/", (req, res) => {
  res.send("🎬 Movie Backend is running");
});

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api", movieRoutes);        // ⚠️ IMPORTANT: /api depends on movieRoutes structure
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/movie-nights", movieNightRoutes);
app.use("/api/notifications", notificationRoutes);

/* ---------------- ERROR HANDLER ---------------- */

app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    error: "Internal server error occurred on API service",
  });
});

/* ---------------- START SERVER ---------------- */

const runMigrations = async () => {
  try {
    await db.execute(sql.raw(`
      ALTER TABLE movies
        ADD COLUMN IF NOT EXISTS tmdb_id integer UNIQUE,
        ADD COLUMN IF NOT EXISTS backdrop_url text,
        ADD COLUMN IF NOT EXISTS overview text,
        ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS last_synced_at timestamp
    `));
    console.log("✅ TMDB migration applied");
  } catch (err) {
    console.warn("⚠️  Migration skipped:", (err as Error).message);
  }

  // Performance indexes — CREATE INDEX IF NOT EXISTS is safe to re-run
  try {
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS movie_night_messages (
        id SERIAL PRIMARY KEY,
        movie_night_id INTEGER NOT NULL REFERENCES movie_nights(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS bookings_user_id_idx               ON bookings (user_id);
      CREATE INDEX IF NOT EXISTS users_email_idx                    ON users (email);
      CREATE INDEX IF NOT EXISTS movie_night_members_user_idx       ON movie_night_members (user_id);
      CREATE INDEX IF NOT EXISTS notifications_user_id_idx          ON notifications (user_id);
      CREATE INDEX IF NOT EXISTS wishlist_user_id_idx               ON wishlist (user_id);
      CREATE INDEX IF NOT EXISTS reviews_movie_id_idx               ON reviews (movie_id);
      CREATE INDEX IF NOT EXISTS movie_night_messages_night_id_idx  ON movie_night_messages (movie_night_id);
    `));
    console.log("✅ Performance indexes applied");
  } catch (err) {
    console.warn("⚠️  Index migration skipped:", (err as Error).message);
  }
};

const fixSequences = async () => {
  const tables = [
    "cities", "users", "movies", "theatres", "screens", "seats",
    "shows", "bookings", "booking_seats", "payments", "seat_locks",
    "reviews", "wishlist", "notifications",
    "movie_nights", "movie_night_members", "movie_night_preferences",
    "movie_night_recommendations", "movie_night_votes", "movie_night_contributions",
    "movie_night_messages",
  ];
  try {
    await Promise.all(
      tables.map((t) =>
        db.execute(sql.raw(
          `SELECT setval('${t}_id_seq', COALESCE((SELECT MAX(id) FROM "${t}"), 0) + 1, false)`
        ))
      )
    );
    console.log("✅ Serial sequences synced");
  } catch (err) {
    console.warn("⚠️  Sequence sync skipped:", (err as Error).message);
  }
};

app.listen(PORT, async () => {
  console.log(`🎬 CineCircle Backend running on http://localhost:${PORT}`);
  await runMigrations();
  await fixSequences();
  startCleanupScheduler();
});