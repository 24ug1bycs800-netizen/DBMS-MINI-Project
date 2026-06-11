import { Request, Response } from "express";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../db/db";
import {
  bookings,
  cities,
  groupRooms,
  movies,
  screens,
  seats,
  seatLocks,
  shows,
  theatres,
  users,
} from "../db/schema";

const DEFAULT_PRICES = {
  regular: 150,
  premium: 250,
  recliner: 450,
};

// Default show generation times (min 2 per day as required)
const GENERATION_TIMES = ["10:00 AM", "02:00 PM"];

const parseInteger = (value: unknown) => Number.parseInt(String(value), 10);

// Per-type seat layouts — 2D: 200 seats, 3D: 156 seats, IMAX: 234 seats
const SCREEN_LAYOUTS: Record<string, Array<{ row: string; category: string; count: number }>> = {
  "2D": [
    { row: "A", category: "Regular",  count: 16 },
    { row: "B", category: "Regular",  count: 16 },
    { row: "C", category: "Regular",  count: 16 },
    { row: "D", category: "Premium",  count: 16 },
    { row: "E", category: "Premium",  count: 16 },
    { row: "F", category: "Premium",  count: 16 },
    { row: "G", category: "Premium",  count: 16 },
    { row: "H", category: "Premium",  count: 16 },
    { row: "I", category: "Premium",  count: 16 },
    { row: "J", category: "Premium",  count: 16 },
    { row: "K", category: "Recliner", count: 10 },
    { row: "L", category: "Recliner", count: 10 },
    { row: "M", category: "Recliner", count: 10 },
    { row: "N", category: "Recliner", count: 10 },
  ],
  "3D": [
    { row: "A", category: "Regular",  count: 14 },
    { row: "B", category: "Regular",  count: 14 },
    { row: "C", category: "Regular",  count: 14 },
    { row: "D", category: "Premium",  count: 14 },
    { row: "E", category: "Premium",  count: 14 },
    { row: "F", category: "Premium",  count: 14 },
    { row: "G", category: "Premium",  count: 14 },
    { row: "H", category: "Premium",  count: 14 },
    { row: "I", category: "Premium",  count: 14 },
    { row: "J", category: "Recliner", count: 10 },
    { row: "K", category: "Recliner", count: 10 },
    { row: "L", category: "Recliner", count: 10 },
  ],
  "IMAX": [
    { row: "A", category: "Regular",  count: 18 },
    { row: "B", category: "Regular",  count: 18 },
    { row: "C", category: "Regular",  count: 18 },
    { row: "D", category: "Premium",  count: 18 },
    { row: "E", category: "Premium",  count: 18 },
    { row: "F", category: "Premium",  count: 18 },
    { row: "G", category: "Premium",  count: 18 },
    { row: "H", category: "Premium",  count: 18 },
    { row: "I", category: "Premium",  count: 18 },
    { row: "J", category: "Premium",  count: 18 },
    { row: "K", category: "Premium",  count: 18 },
    { row: "L", category: "Recliner", count: 12 },
    { row: "M", category: "Recliner", count: 12 },
    { row: "N", category: "Recliner", count: 12 },
  ],
};

const buildSeatsForScreenType = (screenId: number, type: string) => {
  const key = String(type || "2D").toUpperCase().trim();
  const layout = SCREEN_LAYOUTS[key] ?? SCREEN_LAYOUTS["2D"];
  return layout.flatMap(({ row, category, count }) =>
    Array.from({ length: count }, (_, index) => ({
      screenId,
      row,
      category,
      number: index + 1,
    }))
  );
};

const normalizeMovieLanguage = (value: unknown) => {
  const values = Array.isArray(value) ? value : String(value ?? "").split(",");
  return values
    .map((item) => String(item).trim())
    .filter(Boolean)
    .join(", ");
};

const getFirstLanguage = (value: unknown) =>
  normalizeMovieLanguage(value).split(",").map((item) => item.trim()).find(Boolean) || "Hindi";

const normalizeYouTubeUrl = (value: unknown) => {
  const url = String(value ?? "").trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    let videoId: string | null = null;

    if (host === "youtu.be") {
      videoId = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/").filter(Boolean)[1] ?? null;
      } else if (parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/").filter(Boolean)[1] ?? null;
      } else {
        videoId = parsed.searchParams.get("v");
      }
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  } catch {
    return url;
  }
};

const buildUpcomingDates = (days: number, startDate?: string) => {
  const dates: string[] = [];
  const base = startDate ? new Date(startDate) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());

  for (let index = 0; index < days; index += 1) {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    dates.push(next.toISOString().slice(0, 10));
  }

  return dates;
};

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const [confirmedRows, totalUsersResult, activeRoomsResult, bookedRoomsResult] =
      await Promise.all([
        db
          .select({
            bookingId: bookings.id,
            totalAmount: bookings.totalAmount,
            createdAt: bookings.createdAt,
            movieTitle: movies.title,
            cityName: cities.name,
          })
          .from(bookings)
          .innerJoin(shows, eq(bookings.showId, shows.id))
          .innerJoin(movies, eq(shows.movieId, movies.id))
          .innerJoin(screens, eq(shows.screenId, screens.id))
          .innerJoin(theatres, eq(screens.theatreId, theatres.id))
          .innerJoin(cities, eq(theatres.cityId, cities.id))
          .where(eq(bookings.status, "confirmed")),
        db.select({ count: sql<number>`count(*)::int` }).from(users),
        db.select({ count: sql<number>`count(*)::int` }).from(groupRooms),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(groupRooms)
          .where(eq(groupRooms.status, "booked")),
      ]);

    const totalRevenue = confirmedRows.reduce(
      (sum, booking) => sum + booking.totalAmount,
      0
    );

    const kpi = {
      totalRevenue,
      totalBookings: confirmedRows.length,
      totalUsers: totalUsersResult[0]?.count ?? 0,
      activeGroupRooms: activeRoomsResult[0]?.count ?? 0,
    };

    const datesMap: Record<string, { bookings: number; revenue: number }> = {};
    const movieMap: Record<string, { bookings: number; revenue: number }> = {};
    const cityMap: Record<string, number> = {};

    confirmedRows.forEach((booking) => {
      const dateStr = booking.createdAt
        ? new Date(booking.createdAt).toISOString().substring(0, 10)
        : new Date().toISOString().substring(0, 10);

      if (!datesMap[dateStr]) datesMap[dateStr] = { bookings: 0, revenue: 0 };
      datesMap[dateStr].bookings += 1;
      datesMap[dateStr].revenue += booking.totalAmount;

      const movieTitle = booking.movieTitle || "Unknown Movie";
      if (!movieMap[movieTitle]) movieMap[movieTitle] = { bookings: 0, revenue: 0 };
      movieMap[movieTitle].bookings += 1;
      movieMap[movieTitle].revenue += booking.totalAmount;

      const cityName = booking.cityName || "Unknown City";
      cityMap[cityName] = (cityMap[cityName] || 0) + 1;
    });

    const dailyBookings = Object.entries(datesMap)
      .map(([date, value]) => ({ date, bookings: value.bookings, revenue: value.revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const popularMovies = Object.entries(movieMap)
      .map(([title, value]) => ({ title, bookings: value.bookings, revenue: value.revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    const popularCities = Object.entries(cityMap)
      .map(([name, bookingsCount]) => ({ name, bookings: bookingsCount }))
      .sort((a, b) => b.bookings - a.bookings);

    const bookedRoomCount = bookedRoomsResult[0]?.count ?? 0;
    const groupBookingUsage = [
      { name: "Individual Bookings", value: Math.max(0, confirmedRows.length - bookedRoomCount * 3) },
      { name: "Group Bookings", value: bookedRoomCount * 3 || 0 },
    ];

    return res.status(200).json({
      kpi,
      charts: { dailyBookings, popularMovies, popularCities, groupBookingUsage },
    });
  } catch (err) {
    console.error("Fetch dashboard stats error:", err);
    return res.status(500).json({ error: "Internal server error fetching admin stats" });
  }
};

// ─── MOVIES ───────────────────────────────────────────────────────────────────

export const addMovie = async (req: Request, res: Response) => {
  try {
    const {
      title, description, genre, language, durationMins,
      rating, ratingValue, releaseDate, trailerUrl, posterUrl, isNowShowing,
    } = req.body;
    const movieLanguage = normalizeMovieLanguage(language);
    const movieTrailerUrl = normalizeYouTubeUrl(trailerUrl);

    if (!title || !description || !genre || !movieLanguage || !durationMins || !rating || !releaseDate || !posterUrl) {
      return res.status(400).json({ error: "Missing required movie fields" });
    }

    const inserted = await db
      .insert(movies)
      .values({
        title, description, genre, language: movieLanguage,
        durationMins: parseInteger(durationMins),
        rating,
        ratingValue: ratingValue || "4.5",
        releaseDate, trailerUrl: movieTrailerUrl, posterUrl,
        isNowShowing: isNowShowing === undefined ? true : isNowShowing === "true" || isNowShowing === true,
      })
      .returning();

    return res.status(201).json({ message: "Movie added successfully", movie: inserted[0] });
  } catch (err) {
    console.error("Admin add movie error:", err);
    return res.status(500).json({ error: "Internal server error adding movie" });
  }
};

export const updateMovie = async (req: Request, res: Response) => {
  try {
    const id = parseInteger(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid movie ID" });

    const {
      title, description, genre, language, durationMins,
      rating, ratingValue, releaseDate, trailerUrl, posterUrl, isNowShowing,
    } = req.body;

    const updates: Partial<typeof movies.$inferInsert> = {};
    if (title !== undefined) updates.title = String(title).trim();
    if (description !== undefined) updates.description = String(description).trim();
    if (genre !== undefined) updates.genre = String(genre).trim();
    if (language !== undefined) updates.language = normalizeMovieLanguage(language);
    if (durationMins !== undefined) updates.durationMins = parseInteger(durationMins);
    if (rating !== undefined) updates.rating = String(rating);
    if (ratingValue !== undefined) updates.ratingValue = String(ratingValue);
    if (releaseDate !== undefined) updates.releaseDate = String(releaseDate);
    if (trailerUrl !== undefined) updates.trailerUrl = normalizeYouTubeUrl(trailerUrl);
    if (posterUrl !== undefined) updates.posterUrl = String(posterUrl).trim();
    if (isNowShowing !== undefined) updates.isNowShowing = isNowShowing === "true" || isNowShowing === true;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const updated = await db
      .update(movies)
      .set(updates)
      .where(eq(movies.id, id))
      .returning();

    if (!updated[0]) return res.status(404).json({ error: "Movie not found" });
    return res.status(200).json({ message: "Movie updated successfully", movie: updated[0] });
  } catch (err) {
    console.error("Update movie error:", err);
    return res.status(500).json({ error: "Internal server error updating movie" });
  }
};

export const deleteMovie = async (req: Request, res: Response) => {
  try {
    const id = parseInteger(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid movie ID" });
    await db.delete(movies).where(eq(movies.id, id));
    return res.status(200).json({ message: "Movie deleted successfully" });
  } catch (err) {
    console.error("Delete movie error:", err);
    return res.status(500).json({ error: "Internal server error deleting movie" });
  }
};

export const getAllMovies = async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(movies).orderBy(asc(movies.title));
    return res.status(200).json(data);
  } catch (err) {
    console.error("Get movies error:", err);
    return res.status(500).json({ error: "Failed to fetch movies" });
  }
};

// ─── SHOWS (SINGLE) ───────────────────────────────────────────────────────────

export const addShow = async (req: Request, res: Response) => {
  try {
    const { movieId, screenId, language, startTime, date, priceRegular, pricePremium, priceRecliner } = req.body;

    const parsedMovieId = parseInteger(movieId);
    const parsedScreenId = parseInteger(screenId);

    if (!movieId || !screenId || !startTime || !date) {
      return res.status(400).json({ error: "movieId, screenId, startTime, and date are required" });
    }
    if (Number.isNaN(parsedMovieId) || Number.isNaN(parsedScreenId)) {
      return res.status(400).json({ error: "movieId and screenId must be valid numbers" });
    }

    const [movie, screen] = await Promise.all([
      db.select({ id: movies.id, language: movies.language }).from(movies).where(eq(movies.id, parsedMovieId)).limit(1),
      db.select({ id: screens.id }).from(screens).where(eq(screens.id, parsedScreenId)).limit(1),
    ]);

    if (!movie[0]) return res.status(400).json({ error: `Movie ${parsedMovieId} does not exist` });
    if (!screen[0]) return res.status(400).json({ error: `Screen ${parsedScreenId} does not exist` });

    // Prevent duplicate show on same screen/date/time
    const existing = await db
      .select({ id: shows.id })
      .from(shows)
      .where(and(eq(shows.screenId, parsedScreenId), eq(shows.date, date), eq(shows.startTime, startTime)))
      .limit(1);

    if (existing[0]) {
      return res.status(409).json({ error: "A show already exists on this screen at this date and time" });
    }

    const inserted = await db
      .insert(shows)
      .values({
        movieId: parsedMovieId,
        screenId: parsedScreenId,
        language: normalizeMovieLanguage(language) || getFirstLanguage(movie[0].language),
        startTime, date,
        priceRegular: Number.isNaN(parseInteger(priceRegular)) ? DEFAULT_PRICES.regular : parseInteger(priceRegular),
        pricePremium: Number.isNaN(parseInteger(pricePremium)) ? DEFAULT_PRICES.premium : parseInteger(pricePremium),
        priceRecliner: Number.isNaN(parseInteger(priceRecliner)) ? DEFAULT_PRICES.recliner : parseInteger(priceRecliner),
        status: "active",
      })
      .returning();

    return res.status(201).json({ message: "Showtime added successfully", show: inserted[0] });
  } catch (err) {
    console.error("[admin:addShow] failed", err);
    return res.status(500).json({ error: "Internal server error adding showtime", details: String(err) });
  }
};

export const addTheatre = async (req: Request, res: Response) => {
  try {
    const { name, cityId, address } = req.body;
    const parsedCityId = parseInteger(cityId);

    if (!name || !address || Number.isNaN(parsedCityId)) {
      return res.status(400).json({ error: "Theatre name, city, and address are required" });
    }

    const city = await db
      .select({ id: cities.id })
      .from(cities)
      .where(eq(cities.id, parsedCityId))
      .limit(1);

    if (!city[0]) return res.status(400).json({ error: "Selected city does not exist" });

    const inserted = await db
      .insert(theatres)
      .values({
        name: String(name).trim(),
        cityId: parsedCityId,
        address: String(address).trim(),
      })
      .returning();

    return res.status(201).json({ message: "Theatre added successfully", theatre: inserted[0] });
  } catch (err) {
    const cause = (err as any)?.cause;
    console.error("Add theatre error:", err);
    console.error("Add theatre cause:", cause);
    const pgMsg: string =
      (cause?.message as string | undefined) ??
      ((err as any)?.message as string | undefined) ??
      "Unknown DB error";
    return res.status(500).json({ error: pgMsg });
  }
};

export const addScreen = async (req: Request, res: Response) => {
  try {
    const { theatreId, number, type } = req.body;
    const parsedTheatreId = parseInteger(theatreId);
    const parsedNumber = parseInteger(number);

    if (Number.isNaN(parsedTheatreId) || Number.isNaN(parsedNumber) || parsedNumber < 1) {
      return res.status(400).json({ error: "Theatre and valid screen number are required" });
    }

    const theatre = await db
      .select({ id: theatres.id })
      .from(theatres)
      .where(eq(theatres.id, parsedTheatreId))
      .limit(1);

    if (!theatre[0]) return res.status(400).json({ error: "Selected theatre does not exist" });

    const existing = await db
      .select({ id: screens.id })
      .from(screens)
      .where(and(eq(screens.theatreId, parsedTheatreId), eq(screens.number, parsedNumber)))
      .limit(1);

    if (existing[0]) {
      return res.status(409).json({ error: "That screen number already exists in this theatre" });
    }

    const inserted = await db
      .insert(screens)
      .values({
        theatreId: parsedTheatreId,
        number: parsedNumber,
        type: String(type || "2D").trim(),
      })
      .returning();

    await db.insert(seats).values(buildSeatsForScreenType(inserted[0].id, inserted[0].type));

    return res.status(201).json({ message: "Screen added successfully", screen: inserted[0] });
  } catch (err) {
    console.error("Add screen error:", err);
    return res.status(500).json({ error: "Internal server error adding screen" });
  }
};

export const addBulkScreens = async (req: Request, res: Response) => {
  try {
    const { theatreId, count, type = "2D" } = req.body;
    const parsedTheatreId = parseInteger(theatreId);
    const parsedCount = Math.max(1, Math.min(parseInteger(count) || 1, 10));

    if (Number.isNaN(parsedTheatreId)) {
      return res.status(400).json({ error: "Valid theatre ID is required" });
    }

    const theatre = await db
      .select({ id: theatres.id })
      .from(theatres)
      .where(eq(theatres.id, parsedTheatreId))
      .limit(1);

    if (!theatre[0]) return res.status(400).json({ error: "Theatre not found" });

    const existingScreens = await db
      .select({ number: screens.number })
      .from(screens)
      .where(eq(screens.theatreId, parsedTheatreId))
      .orderBy(desc(screens.number));

    const maxNumber = existingScreens[0]?.number ?? 0;
    const created: number[] = [];

    for (let i = 1; i <= parsedCount; i++) {
      const screenNumber = maxNumber + i;
      const inserted = await db
        .insert(screens)
        .values({ theatreId: parsedTheatreId, number: screenNumber, type: String(type).trim() })
        .returning();
      await db.insert(seats).values(buildSeatsForScreenType(inserted[0].id, inserted[0].type));
      created.push(screenNumber);
    }

    return res.status(201).json({
      message: `${created.length} screen${created.length !== 1 ? "s" : ""} added successfully (Screen${created.length !== 1 ? "s" : ""} ${created.join(", ")})`,
      screens: created,
    });
  } catch (err) {
    console.error("Bulk add screens error:", err);
    return res.status(500).json({ error: "Internal server error adding screens" });
  }
};

export const deleteShow = async (req: Request, res: Response) => {
  try {
    const id = parseInteger(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid show ID" });

    await db.delete(seatLocks).where(eq(seatLocks.showId, id));
    await db.update(groupRooms).set({ selectedShowId: null }).where(eq(groupRooms.selectedShowId, id));
    await db.delete(shows).where(eq(shows.id, id));

    return res.status(200).json({ message: "Show deleted successfully" });
  } catch (err) {
    console.error("[admin:deleteShow] failed", err);
    return res.status(500).json({ error: "Internal server error deleting show" });
  }
};

// ─── BULK DELETE SHOWS ────────────────────────────────────────────────────────
// scope: 'screen' | 'theatre' | 'city'
// scopeId: the ID of the entity at that scope

export const bulkDeleteShows = async (req: Request, res: Response) => {
  try {
    const { scope, scopeId } = req.body;
    const parsedScopeId = parseInteger(scopeId);

    if (!scope || Number.isNaN(parsedScopeId)) {
      return res.status(400).json({ error: "scope and scopeId are required" });
    }

    // Resolve all target screenIds for the given scope
    let targetScreenIds: number[] = [];

    if (scope === "screen") {
      targetScreenIds = [parsedScopeId];
    } else if (scope === "theatre") {
      const rows = await db
        .select({ id: screens.id })
        .from(screens)
        .where(eq(screens.theatreId, parsedScopeId));
      targetScreenIds = rows.map((r) => r.id);
    } else if (scope === "city") {
      const theatreRows = await db
        .select({ id: theatres.id })
        .from(theatres)
        .where(eq(theatres.cityId, parsedScopeId));
      const theatreIds = theatreRows.map((r) => r.id);
      if (theatreIds.length > 0) {
        const screenRows = await db
          .select({ id: screens.id })
          .from(screens)
          .where(inArray(screens.theatreId, theatreIds));
        targetScreenIds = screenRows.map((r) => r.id);
      }
    } else {
      return res.status(400).json({ error: "scope must be 'screen', 'theatre', or 'city'" });
    }

    if (targetScreenIds.length === 0) {
      return res.status(200).json({ message: "No shows found for deletion", deleted: 0 });
    }

    // Get all show IDs for the resolved screens
    const showRows = await db
      .select({ id: shows.id })
      .from(shows)
      .where(inArray(shows.screenId, targetScreenIds));
    const showIds = showRows.map((r) => r.id);

    if (showIds.length === 0) {
      return res.status(200).json({ message: "No shows found for deletion", deleted: 0 });
    }

    // Clean up dependencies before hard delete
    await db.delete(seatLocks).where(inArray(seatLocks.showId, showIds));
    await db
      .update(groupRooms)
      .set({ selectedShowId: null })
      .where(inArray(groupRooms.selectedShowId as any, showIds));
    await db.delete(shows).where(inArray(shows.id, showIds));

    return res.status(200).json({ message: `${showIds.length} shows deleted`, deleted: showIds.length });
  } catch (err) {
    console.error("[admin:bulkDeleteShows] failed", err);
    return res.status(500).json({ error: "Internal server error during bulk delete" });
  }
};

// ─── EXPIRE PAST SHOWS ────────────────────────────────────────────────────────
// Marks all shows whose date < today as status='expired' (soft delete).
// Does NOT delete bookings — preserves history and analytics.

export const expireShows = async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const result = await db
      .update(shows)
      .set({ status: "expired" })
      .where(and(sql`${shows.date} < ${today}`, ne(shows.status, "expired")))
      .returning({ id: shows.id });

    return res.status(200).json({
      message: `${result.length} past shows marked as expired`,
      expired: result.length,
    });
  } catch (err) {
    console.error("[admin:expireShows] failed", err);
    return res.status(500).json({ error: "Internal server error expiring shows" });
  }
};

// ─── GENERATE SHOWS (WEEKLY SCHEDULING) ──────────────────────────────────────
// Generates shows for 7 days (default) across selected city/theatre/screens.
// Minimum 2 shows/day guaranteed by GENERATION_TIMES default.
// Prevents duplicates via composite key check.

export const generateShows = async (req: Request, res: Response) => {
  try {
    const {
      movieId,
      cityIds = [],
      theatreIds = [],
      screenIds = [],
      startTimes = GENERATION_TIMES,
      priceRegular,
      pricePremium,
      priceRecliner,
      language,
      days = 7,         // default: 7-day weekly schedule
      startDate,        // optional: start from specific date (defaults to today)
    } = req.body;

    const parsedMovieId = parseInteger(movieId);
    const parsedCityIds = Array.isArray(cityIds)
      ? cityIds.map((v: unknown) => parseInteger(v)).filter(Number.isFinite)
      : [];
    const parsedTheatreIds = Array.isArray(theatreIds)
      ? theatreIds.map((v: unknown) => parseInteger(v)).filter(Number.isFinite)
      : [];
    const parsedScreenIds = Array.isArray(screenIds)
      ? screenIds.map((v: unknown) => parseInteger(v)).filter(Number.isFinite)
      : [];
    const safeStartTimes =
      Array.isArray(startTimes) && startTimes.length >= 2
        ? startTimes.map((v: unknown) => String(v))
        : GENERATION_TIMES;

    if (Number.isNaN(parsedMovieId)) {
      return res.status(400).json({ error: "A valid movie selection is required" });
    }
    if (parsedCityIds.length === 0) {
      return res.status(400).json({ error: "Select at least one city before generating shows" });
    }

    const [movie] = await db
      .select({ id: movies.id, title: movies.title, language: movies.language })
      .from(movies)
      .where(eq(movies.id, parsedMovieId))
      .limit(1);

    if (!movie) return res.status(404).json({ error: "Selected movie was not found" });
    const showLanguage = normalizeMovieLanguage(language) || getFirstLanguage(movie.language);

    // Resolve target screens based on city/theatre/screen filters
    let screenQuery = db
      .select({
        screenId: screens.id,
        screenNumber: screens.number,
        theatreId: theatres.id,
        cityId: cities.id,
      })
      .from(screens)
      .innerJoin(theatres, eq(screens.theatreId, theatres.id))
      .innerJoin(cities, eq(theatres.cityId, cities.id))
      .where(inArray(cities.id, parsedCityIds))
      .$dynamic();

    if (parsedTheatreIds.length > 0) {
      screenQuery = screenQuery.where(inArray(theatres.id, parsedTheatreIds));
    }
    if (parsedScreenIds.length > 0) {
      screenQuery = screenQuery.where(inArray(screens.id, parsedScreenIds));
    }

    const availableScreens = await screenQuery.orderBy(
      asc(cities.name),
      asc(theatres.name),
      asc(screens.number)
    );

    if (availableScreens.length === 0) {
      return res.status(400).json({ error: "No screens matched the selected locations" });
    }

    const targetScreenIds = availableScreens.map((s) => s.screenId);
    const parsedDays = Math.max(1, Math.min(parseInteger(days) || 7, 30));
    const upcomingDates = buildUpcomingDates(parsedDays, startDate);

    // Fetch only active (non-expired) shows to check for duplicate slots.
    // Expired shows no longer occupy the slot, so new movies can use that time.
    const existingShows = await db
      .select({ screenId: shows.screenId, date: shows.date, startTime: shows.startTime })
      .from(shows)
      .where(and(inArray(shows.screenId, targetScreenIds), ne(shows.status, "expired")));

    const existingKeys = new Set(
      existingShows.map((s) => `${s.screenId}::${s.date}::${s.startTime}`)
    );

    const valuesToInsert: Array<typeof shows.$inferInsert> = [];
    let skipped = 0;

    for (const screen of availableScreens) {
      for (const date of upcomingDates) {
        for (const startTime of safeStartTimes) {
          const key = `${screen.screenId}::${date}::${startTime}`;
          if (existingKeys.has(key)) {
            skipped += 1;
            continue;
          }
          valuesToInsert.push({
            movieId: parsedMovieId,
            screenId: screen.screenId,
            language: showLanguage,
            date,
            startTime,
            priceRegular: Number.isNaN(parseInteger(priceRegular)) ? DEFAULT_PRICES.regular : parseInteger(priceRegular),
            pricePremium: Number.isNaN(parseInteger(pricePremium)) ? DEFAULT_PRICES.premium : parseInteger(pricePremium),
            priceRecliner: Number.isNaN(parseInteger(priceRecliner)) ? DEFAULT_PRICES.recliner : parseInteger(priceRecliner),
            status: "active",
          });
          existingKeys.add(key);
        }
      }
    }

    if (valuesToInsert.length > 0) {
      await db.insert(shows).values(valuesToInsert);
    }

    return res.status(200).json({
      message: "Show generation completed",
      created: valuesToInsert.length,
      skipped,
      screens: availableScreens.length,
      days: parsedDays,
      timesPerDay: safeStartTimes.length,
    });
  } catch (err) {
    console.error("[admin:generateShows] failed", err);
    return res.status(500).json({ error: "Internal server error generating shows" });
  }
};

// ─── READ QUERIES ─────────────────────────────────────────────────────────────

export const getAllCities = async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(cities).orderBy(asc(cities.name));
    return res.status(200).json(data);
  } catch (err) {
    console.error("Get cities error:", err);
    return res.status(500).json({ error: "Failed to fetch cities" });
  }
};

export const getAllTheatres = async (req: Request, res: Response) => {
  try {
    const cityId = req.query.cityId ? parseInteger(req.query.cityId) : NaN;

    const query = db
      .select({ id: theatres.id, name: theatres.name, cityId: theatres.cityId, address: theatres.address })
      .from(theatres)
      .$dynamic();

    const data = Number.isNaN(cityId)
      ? await query.orderBy(asc(theatres.name))
      : await query.where(eq(theatres.cityId, cityId)).orderBy(asc(theatres.name));

    return res.status(200).json(data);
  } catch (err) {
    console.error("Get theatres error:", err);
    return res.status(500).json({ error: "Failed to fetch theatres" });
  }
};

export const getAllScreens = async (req: Request, res: Response) => {
  try {
    const theatreId = req.query.theatreId ? parseInteger(req.query.theatreId) : NaN;

    const query = db
      .select({ id: screens.id, number: screens.number, type: screens.type, theatreId: screens.theatreId })
      .from(screens)
      .$dynamic();

    const data = Number.isNaN(theatreId)
      ? await query.orderBy(asc(screens.number), asc(screens.id))
      : await query.where(eq(screens.theatreId, theatreId)).orderBy(asc(screens.number), asc(screens.id));

    return res.status(200).json(data);
  } catch (err) {
    console.error("Get screens error:", err);
    return res.status(500).json({ error: "Failed to fetch screens" });
  }
};

// Returns full show list with city/theatre/screen/movie info — used by admin manage tab.
// Includes poster + language for show cards. Includes status for lifecycle display.
export const getAllShows = async (_req: Request, res: Response) => {
  try {
    const data = await db
      .select({
        id: shows.id,
        movieId: shows.movieId,
        movieTitle: movies.title,
        moviePosterUrl: movies.posterUrl,
        movieLanguage: movies.language,
        language: shows.language,
        screenId: shows.screenId,
        screenNumber: screens.number,
        screenType: screens.type,
        theatreId: theatres.id,
        theatreName: theatres.name,
        cityId: cities.id,
        cityName: cities.name,
        startTime: shows.startTime,
        date: shows.date,
        priceRegular: shows.priceRegular,
        pricePremium: shows.pricePremium,
        priceRecliner: shows.priceRecliner,
        status: shows.status,
      })
      .from(shows)
      .innerJoin(movies, eq(shows.movieId, movies.id))
      .innerJoin(screens, eq(shows.screenId, screens.id))
      .innerJoin(theatres, eq(screens.theatreId, theatres.id))
      .innerJoin(cities, eq(theatres.cityId, cities.id))
      .orderBy(
        asc(cities.name),
        asc(theatres.name),
        asc(screens.number),
        asc(shows.date),
        asc(shows.startTime)
      );

    return res.status(200).json(data);
  } catch (err) {
    console.error("Get shows error:", err);
    return res.status(500).json({ error: "Failed to fetch shows" });
  }
};
