import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/db";
import { groupRooms, movieNightRecommendations, movies, seatLocks, shows } from "../db/schema";

const getToday = () => new Date().toISOString().slice(0, 10);

// Converts "06:30 PM" → minutes since midnight (e.g. 1110)
const timeToMinutes = (t: string): number => {
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return 0;
  let h = parseInt(m[1]);
  const mins = parseInt(m[2]);
  const period = m[3].toUpperCase();
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return h * 60 + mins;
};

// Hard-deletes all shows that are in the past:
//   • shows from previous dates
//   • shows from today whose startTime ended ≥30 minutes ago
// Cleans up seat locks and group room references first.
export const deletePastShows = async () => {
  const today = getToday();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  try {
    // Shows from previous dates
    const pastDateShows = await db
      .select({ id: shows.id })
      .from(shows)
      .where(sql`${shows.date} < ${today}`);

    // Today's shows whose start time is more than 30 minutes in the past
    const todayShows = await db
      .select({ id: shows.id, startTime: shows.startTime })
      .from(shows)
      .where(eq(shows.date, today));

    const expiredTodayIds = todayShows
      .filter(s => timeToMinutes(s.startTime) < nowMinutes - 30)
      .map(s => s.id);

    const allExpiredIds = [
      ...pastDateShows.map(s => s.id),
      ...expiredTodayIds,
    ];

    if (allExpiredIds.length === 0) return;

    await db.delete(seatLocks).where(inArray(seatLocks.showId, allExpiredIds));
    await db
      .update(groupRooms)
      .set({ selectedShowId: null })
      .where(inArray(groupRooms.selectedShowId as any, allExpiredIds));
    // Remove movie night recommendations referencing these shows before deleting
    await db.delete(movieNightRecommendations).where(
      inArray(movieNightRecommendations.showId, allExpiredIds)
    );
    await db.delete(shows).where(inArray(shows.id, allExpiredIds));

    console.log(`[cleanup] Deleted ${allExpiredIds.length} expired show(s) at ${now.toLocaleTimeString()}`);
  } catch (err) {
    console.error("[cleanup] Failed to delete expired shows:", err);
  }
};

// Flips isNowShowing = true for any movie whose releaseDate has arrived.
export const promoteReleasedMovies = async () => {
  const today = getToday();
  try {
    const result = await db
      .update(movies)
      .set({ isNowShowing: true })
      .where(
        and(
          eq(movies.isNowShowing, false),
          sql`${movies.releaseDate} <= ${today}`
        )
      )
      .returning({ id: movies.id, title: movies.title });

    if (result.length > 0) {
      console.log(`[release] ${result.length} movie(s) now showing: ${result.map(m => m.title).join(", ")}`);
    }
  } catch (err) {
    console.error("[release] Failed to promote released movies:", err);
  }
};

// Runs both jobs on startup, then:
//   • deletePastShows  — every hour (catches intraday expired shows)
//   • promoteReleasedMovies — once at midnight every day
export const startCleanupScheduler = () => {
  deletePastShows();
  promoteReleasedMovies();

  // Expire shows every hour
  setInterval(deletePastShows, 60 * 60 * 1000);

  // Promote movies at midnight daily
  const scheduleMidnightPromotion = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntil = midnight.getTime() - now.getTime();
    setTimeout(() => {
      promoteReleasedMovies();
      setInterval(promoteReleasedMovies, 24 * 60 * 60 * 1000);
    }, msUntil);
  };
  scheduleMidnightPromotion();

  console.log("[scheduler] Started — show cleanup runs every hour, movie promotion runs at midnight");
};
