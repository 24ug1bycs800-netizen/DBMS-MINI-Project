import express from "express";
import cors from "cors";
import path from "path";
import * as dotenv from "dotenv";
import seatLockRoutes from "./routes/seatLockRoutes";
import authRoutes from "./routes/authRoutes";
import movieRoutes from "./routes/movieRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import groupRoutes from "./routes/groupRoutes";
import adminRoutes from "./routes/adminRoutes";
import movieNightRoutes from "./routes/movieNightRoutes";
import { startCleanupScheduler } from "./jobs/cleanupShows";
import { db } from "./db/db";
import { sql } from "drizzle-orm";

dotenv.config();

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  "/api/seat-locks",
  seatLockRoutes
);
// Static files
app.use("/images", express.static(path.join(process.cwd(), "images")));
app.use("/uploads", express.static("uploads"));
app.use("/assets", express.static("../frontend/public/assets"));
console.log({
  authRoutes,
  movieRoutes,
  bookingRoutes,
  groupRoutes,
  adminRoutes,
});
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
app.use("/api/groups", groupRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/movie-nights", movieNightRoutes);

/* ---------------- ERROR HANDLER ---------------- */

app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    error: "Internal server error occurred on API service",
  });
});

/* ---------------- START SERVER ---------------- */

const fixSequences = async () => {
  const tables = [
    "cities", "users", "movies", "theatres", "screens", "seats",
    "shows", "bookings", "booking_seats", "payments", "seat_locks",
    "reviews", "wishlist", "notifications", "group_rooms", "group_members", "votes",
    "movie_nights", "movie_night_members", "movie_night_preferences",
    "movie_night_recommendations", "movie_night_votes", "movie_night_contributions",
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
  await fixSequences();
  startCleanupScheduler();
});