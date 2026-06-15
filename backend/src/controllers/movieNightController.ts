import { Request, Response } from "express";
import crypto from "crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/db";
import {
  movieNights, movieNightMembers, movieNightPreferences, movieNightPreferenceGenres,
  movieNightRecommendations, movieNightVotes, movieNightContributions,
  movieNightSeatAssignments, movieNightMessages,
  movies, shows, screens, theatres, cities, users, seats, bookings,
} from "../db/schema";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const uid = (req: Request): number => (req as any).user.id;

const generateInviteCode = (): string =>
  crypto.randomBytes(5).toString("hex").toUpperCase(); // e.g. "A3F9B1"

const getTimeSlot = (startTime: string): string => {
  const m = startTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return "EVENING";
  let h = parseInt(m[1]);
  const period = m[3].toUpperCase();
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  if (h >= 6 && h < 12) return "MORNING";
  if (h >= 12 && h < 18) return "AFTERNOON";
  if (h >= 18 && h < 21) return "EVENING";
  return "NIGHT";
};

const isMember = async (movieNightId: number, userId: number): Promise<boolean> => {
  const rows = await db.select({ id: movieNightMembers.id })
    .from(movieNightMembers)
    .where(and(eq(movieNightMembers.movieNightId, movieNightId), eq(movieNightMembers.userId, userId)));
  return rows.length > 0;
};

// ─── CREATE MOVIE NIGHT ───────────────────────────────────────────────────────

export const createMovieNight = async (req: Request, res: Response) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required." });

  const userId = uid(req);
  const inviteCode = generateInviteCode();

  try {
    const [night] = await db.insert(movieNights).values({
      title: title.trim(),
      description: description?.trim() || null,
      organizerId: userId,
      inviteCode,
      status: "COLLECTING_PREFERENCES",
    }).returning();

    await db.insert(movieNightMembers).values({
      movieNightId: night.id,
      userId,
      role: "ORGANIZER",
    });

    return res.status(201).json({ movieNight: night });
  } catch (err) {
    console.error("[createMovieNight]", err);
    return res.status(500).json({ error: "Failed to create movie night." });
  }
};

// ─── JOIN MOVIE NIGHT ─────────────────────────────────────────────────────────

export const joinMovieNight = async (req: Request, res: Response) => {
  const { inviteCode } = req.params;
  const userId = uid(req);

  try {
    const [night] = await db.select().from(movieNights)
      .where(eq(movieNights.inviteCode, inviteCode.toUpperCase()));
    if (!night) return res.status(404).json({ error: "Invalid invite code." });
    if (night.status === "BOOKED" || night.status === "CANCELLED") return res.status(400).json({ error: "This movie night is no longer accepting members." });

    const alreadyMember = await isMember(night.id, userId);
    if (alreadyMember) return res.json({ movieNight: night, alreadyMember: true });

    await db.insert(movieNightMembers)
      .values({ movieNightId: night.id, userId, role: "MEMBER" })
      .onConflictDoNothing({ target: [movieNightMembers.movieNightId, movieNightMembers.userId] });
    return res.json({ movieNight: night, alreadyMember: false });
  } catch (err) {
    console.error("[joinMovieNight]", err);
    return res.status(500).json({ error: "Failed to join movie night." });
  }
};

// ─── GET MY MOVIE NIGHTS ──────────────────────────────────────────────────────

export const getMyMovieNights = async (req: Request, res: Response) => {
  const userId = uid(req);
  try {
    const memberships = await db.select({ movieNightId: movieNightMembers.movieNightId, role: movieNightMembers.role })
      .from(movieNightMembers)
      .where(eq(movieNightMembers.userId, userId));

    if (memberships.length === 0) return res.json({ movieNights: [] });

    const nightIds = memberships.map(m => m.movieNightId);
    const roleMap = Object.fromEntries(memberships.map(m => [m.movieNightId, m.role]));

    const nights = await db.select().from(movieNights)
      .where(inArray(movieNights.id, nightIds))
      .orderBy(sql`${movieNights.createdAt} DESC`);

    // Attach member counts
    const counts = await db.select({
      movieNightId: movieNightMembers.movieNightId,
      count: sql<number>`count(*)::int`,
    }).from(movieNightMembers)
      .where(inArray(movieNightMembers.movieNightId, nightIds))
      .groupBy(movieNightMembers.movieNightId);

    const countMap = Object.fromEntries(counts.map(c => [c.movieNightId, c.count]));

    // Seat assignments for the current user across all BOOKED nights
    const bookedNightIds = nights.filter(n => n.status === "BOOKED").map(n => n.id);
    let myAssignments: { movieNightId: number; seatRow: string; seatNumber: number; bookingCode: string }[] = [];
    if (bookedNightIds.length > 0) {
      const rows = await db
        .select({
          movieNightId: movieNightSeatAssignments.movieNightId,
          seatRow: seats.row,
          seatNumber: seats.number,
          bookingCode: bookings.code,
        })
        .from(movieNightSeatAssignments)
        .innerJoin(seats, eq(movieNightSeatAssignments.seatId, seats.id))
        .innerJoin(bookings, eq(movieNightSeatAssignments.bookingId, bookings.id))
        .where(and(
          inArray(movieNightSeatAssignments.movieNightId, bookedNightIds),
          eq(movieNightSeatAssignments.userId, userId)
        ));
      myAssignments = rows;
    }
    const assignmentMap = Object.fromEntries(myAssignments.map(a => [a.movieNightId, a]));

    return res.json({
      movieNights: nights.map(n => ({
        ...n,
        myRole: roleMap[n.id],
        memberCount: countMap[n.id] ?? 1,
        mySeatAssignment: assignmentMap[n.id] ?? null,
      })),
    });
  } catch (err) {
    console.error("[getMyMovieNights]", err);
    return res.status(500).json({ error: "Failed to fetch movie nights." });
  }
};

// ─── GET MOVIE NIGHT DETAIL ───────────────────────────────────────────────────

export const getMovieNight = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const userId = uid(req);

  try {
    const [night] = await db.select().from(movieNights).where(eq(movieNights.id, id));
    if (!night) return res.status(404).json({ error: "Movie night not found." });

    const member = await isMember(id, userId);
    if (!member) return res.status(403).json({ error: "You are not a member of this movie night." });

    // Members with user info
    const members = await db
      .select({
        id: movieNightMembers.id,
        userId: movieNightMembers.userId,
        role: movieNightMembers.role,
        joinedAt: movieNightMembers.joinedAt,
        fullName: users.fullName,
        email: users.email,
        profilePic: users.profilePic,
      })
      .from(movieNightMembers)
      .innerJoin(users, eq(movieNightMembers.userId, users.id))
      .where(eq(movieNightMembers.movieNightId, id));

    // Preferences
    const prefs = await db.select().from(movieNightPreferences)
      .where(eq(movieNightPreferences.movieNightId, id));

    // Recommendation with movie + show details
    const [rec] = await db
      .select({
        id: movieNightRecommendations.id,
        genreScore: movieNightRecommendations.genreScore,
        timeScore: movieNightRecommendations.timeScore,
        budgetScore: movieNightRecommendations.budgetScore,
        locationScore: movieNightRecommendations.locationScore,
        compatibilityScore: movieNightRecommendations.compatibilityScore,
        createdAt: movieNightRecommendations.createdAt,
        movie: {
          id: movies.id, title: movies.title, posterUrl: movies.posterUrl,
          genre: movies.genre, language: movies.language, durationMins: movies.durationMins,
          rating: movies.rating, ratingValue: movies.ratingValue,
          trailerUrl: movies.trailerUrl, overview: movies.overview,
        },
        show: {
          id: shows.id, startTime: shows.startTime, date: shows.date,
          priceRegular: shows.priceRegular, pricePremium: shows.pricePremium,
          priceRecliner: shows.priceRecliner, language: shows.language,
        },
        theatre: { id: theatres.id, name: theatres.name, address: theatres.address },
        city: { id: cities.id, name: cities.name },
        screenType: screens.type,
        screenNumber: screens.number,
      })
      .from(movieNightRecommendations)
      .innerJoin(movies, eq(movieNightRecommendations.movieId, movies.id))
      .innerJoin(shows, eq(movieNightRecommendations.showId, shows.id))
      .innerJoin(screens, eq(shows.screenId, screens.id))
      .innerJoin(theatres, eq(screens.theatreId, theatres.id))
      .innerJoin(cities, eq(theatres.cityId, cities.id))
      .where(eq(movieNightRecommendations.movieNightId, id))
      .orderBy(sql`${movieNightRecommendations.createdAt} DESC`);

    // Votes
    const votes = await db
      .select({
        userId: movieNightVotes.userId,
        vote: movieNightVotes.vote,
        fullName: users.fullName,
      })
      .from(movieNightVotes)
      .innerJoin(users, eq(movieNightVotes.userId, users.id))
      .where(eq(movieNightVotes.movieNightId, id));

    // Contributions
    const contribs = await db
      .select({
        id: movieNightContributions.id,
        userId: movieNightContributions.userId,
        contributionAmount: movieNightContributions.contributionAmount,
        status: movieNightContributions.status,
        paidAt: movieNightContributions.paidAt,
        fullName: users.fullName,
        profilePic: users.profilePic,
      })
      .from(movieNightContributions)
      .innerJoin(users, eq(movieNightContributions.userId, users.id))
      .where(eq(movieNightContributions.movieNightId, id));

    // Seat assignments (only present after BOOKED)
    let seatAssignments: any[] = [];
    if (night.status === "BOOKED") {
      seatAssignments = await db
        .select({
          userId: movieNightSeatAssignments.userId,
          fullName: users.fullName,
          seatRow: seats.row,
          seatNumber: seats.number,
          seatCategory: seats.category,
          bookingCode: bookings.code,
        })
        .from(movieNightSeatAssignments)
        .innerJoin(users, eq(movieNightSeatAssignments.userId, users.id))
        .innerJoin(seats, eq(movieNightSeatAssignments.seatId, seats.id))
        .innerJoin(bookings, eq(movieNightSeatAssignments.bookingId, bookings.id))
        .where(eq(movieNightSeatAssignments.movieNightId, id));
    }

    return res.json({
      movieNight: night,
      myRole: members.find(m => m.userId === userId)?.role ?? "MEMBER",
      members,
      preferences: prefs.map(p => ({ ...p, preferredGenres: JSON.parse(p.preferredGenres) })),
      recommendation: rec ?? null,
      votes,
      contributions: contribs,
      seatAssignments,
    });
  } catch (err) {
    console.error("[getMovieNight]", err);
    return res.status(500).json({ error: "Failed to fetch movie night." });
  }
};

// ─── SUBMIT PREFERENCES ───────────────────────────────────────────────────────

export const submitPreferences = async (req: Request, res: Response) => {
  const movieNightId = parseInt(req.params.id);
  const userId = uid(req);
  const { preferredGenres, preferredTime, budgetLimit, preferredLocation } = req.body;

  if (!preferredTime || !budgetLimit) return res.status(400).json({ error: "preferredTime and budgetLimit are required." });
  if (!["MORNING", "AFTERNOON", "EVENING", "NIGHT"].includes(preferredTime))
    return res.status(400).json({ error: "preferredTime must be MORNING, AFTERNOON, EVENING, or NIGHT." });
  if (!Array.isArray(preferredGenres) || preferredGenres.length === 0)
    return res.status(400).json({ error: "Select at least one preferred genre." });

  try {
    const [night] = await db.select().from(movieNights).where(eq(movieNights.id, movieNightId));
    if (!night) return res.status(404).json({ error: "Movie night not found." });
    if (!["COLLECTING_PREFERENCES"].includes(night.status))
      return res.status(400).json({ error: "Preferences can only be submitted while collecting." });

    const member = await isMember(movieNightId, userId);
    if (!member) return res.status(403).json({ error: "You are not a member of this movie night." });

    // Clean genres: trim, drop empties, de-dupe (case-insensitive)
    const cleanGenres = Array.from(
      new Map(
        preferredGenres
          .map((g: unknown) => String(g).trim())
          .filter((g: string) => g.length > 0)
          .map((g: string) => [g.toLowerCase(), g])
      ).values()
    ) as string[];
    if (cleanGenres.length === 0) {
      return res.status(400).json({ error: "Select at least one valid genre." });
    }

    const data = {
      preferredGenres: JSON.stringify(cleanGenres), // denormalized cache
      preferredTime,
      budgetLimit: parseInt(budgetLimit),
      preferredLocation: preferredLocation?.trim() || null,
    };

    // Atomic upsert of the preference row + replacement of its normalized genre rows.
    await db.transaction(async (tx) => {
      await tx
        .insert(movieNightPreferences)
        .values({ movieNightId, userId, ...data })
        .onConflictDoUpdate({
          target: [movieNightPreferences.movieNightId, movieNightPreferences.userId],
          set: data,
        });

      await tx
        .delete(movieNightPreferenceGenres)
        .where(and(
          eq(movieNightPreferenceGenres.movieNightId, movieNightId),
          eq(movieNightPreferenceGenres.userId, userId)
        ));

      await tx.insert(movieNightPreferenceGenres).values(
        cleanGenres.map((genre) => ({ movieNightId, userId, genre }))
      );
    });

    return res.json({ message: "Preferences saved." });
  } catch (err) {
    console.error("[submitPreferences]", err);
    return res.status(500).json({ error: "Failed to save preferences." });
  }
};

// ─── RECOMMENDATION ENGINE (shared) ──────────────────────────────────────────

const runRecommendationEngine = async (movieNightId: number): Promise<{ error?: string }> => {
  // Must have at least one member's preferences to score against.
  const prefCountRows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(movieNightPreferences)
    .where(eq(movieNightPreferences.movieNightId, movieNightId));
  if ((prefCountRows[0]?.c ?? 0) === 0) return { error: "No preferences submitted yet." };

  const today = new Date().toISOString().slice(0, 10);

  // ── SET-BASED SCORING ────────────────────────────────────────────────────
  // The entire recommendation is computed inside PostgreSQL: candidate shows are
  // restricted to active, future shows that still have enough free seats for the
  // group, and each is scored against the group's preferences using aggregates
  // over the normalized genre table. The single best show is returned.
  const result: any = await db.execute(sql`
    WITH prefs AS (
      SELECT user_id, preferred_time, budget_limit, preferred_location
      FROM movie_night_preferences
      WHERE movie_night_id = ${movieNightId}
    ),
    mc AS (SELECT COUNT(*)::int AS member_count FROM prefs),
    loc AS (
      SELECT COUNT(*)::int AS loc_count FROM prefs
      WHERE preferred_location IS NOT NULL AND btrim(preferred_location) <> ''
    ),
    member_genres AS (
      SELECT DISTINCT user_id, lower(genre) AS genre
      FROM movie_night_preference_genres
      WHERE movie_night_id = ${movieNightId}
    ),
    candidates AS (
      SELECT
        s.id AS show_id, s.movie_id, s.price_regular, s.screen_id,
        m.genre AS movie_genre, c.name AS city_name,
        CASE
          WHEN EXTRACT(HOUR FROM to_timestamp(s.start_time, 'HH12:MI AM')) BETWEEN 6 AND 11  THEN 'MORNING'
          WHEN EXTRACT(HOUR FROM to_timestamp(s.start_time, 'HH12:MI AM')) BETWEEN 12 AND 17 THEN 'AFTERNOON'
          WHEN EXTRACT(HOUR FROM to_timestamp(s.start_time, 'HH12:MI AM')) BETWEEN 18 AND 20 THEN 'EVENING'
          ELSE 'NIGHT'
        END AS time_slot
      FROM shows s
      JOIN movies   m  ON s.movie_id  = m.id
      JOIN screens  sc ON s.screen_id = sc.id
      JOIN theatres t  ON sc.theatre_id = t.id
      JOIN cities   c  ON t.city_id   = c.id
      WHERE s.status = 'active'
        AND s.date >= ${today}
        AND (
          (SELECT COUNT(*) FROM seats se WHERE se.screen_id = s.screen_id)
          - (SELECT COUNT(*) FROM booking_seats bs
               JOIN bookings b ON bs.booking_id = b.id
               WHERE b.show_id = s.id AND b.status = 'confirmed')
        ) >= (SELECT member_count FROM mc)
    ),
    matches AS (
      SELECT
        cand.show_id, cand.movie_id,
        (SELECT COUNT(DISTINCT mg.user_id) FROM member_genres mg
           WHERE mg.genre IN (
             SELECT btrim(tok) FROM regexp_split_to_table(lower(cand.movie_genre), '/') AS tok
           )
        ) AS genre_matches,
        (SELECT COUNT(*) FROM prefs p WHERE p.preferred_time = cand.time_slot)      AS time_matches,
        (SELECT COUNT(*) FROM prefs p WHERE p.budget_limit >= cand.price_regular)   AS budget_matches,
        (SELECT COUNT(*) FROM prefs p
           WHERE p.preferred_location IS NOT NULL AND btrim(p.preferred_location) <> ''
             AND (lower(p.preferred_location) LIKE '%' || lower(cand.city_name) || '%'
                  OR lower(cand.city_name) LIKE '%' || lower(p.preferred_location) || '%')
        ) AS location_matches
      FROM candidates cand
    ),
    scored AS (
      SELECT
        mt.show_id, mt.movie_id,
        ROUND(mt.genre_matches::numeric  / NULLIF(mc.member_count, 0) * 100) AS genre_score,
        ROUND(mt.time_matches::numeric   / NULLIF(mc.member_count, 0) * 100) AS time_score,
        ROUND(mt.budget_matches::numeric / NULLIF(mc.member_count, 0) * 100) AS budget_score,
        CASE WHEN loc.loc_count = 0 THEN 100
             ELSE ROUND(mt.location_matches::numeric / loc.loc_count * 100) END AS location_score
      FROM matches mt CROSS JOIN mc CROSS JOIN loc
    )
    SELECT
      show_id, movie_id, genre_score, time_score, budget_score, location_score,
      ROUND(genre_score * 0.4 + time_score * 0.3 + budget_score * 0.2 + location_score * 0.1) AS compatibility_score
    FROM scored
    ORDER BY compatibility_score DESC, genre_score DESC, show_id ASC
    LIMIT 1
  `);

  const row = result.rows?.[0];
  if (!row) {
    return { error: "No upcoming show has enough seats for your group right now. Try a smaller group or check back later." };
  }

  // Persist atomically: clear old recommendation + votes, insert the new pick,
  // advance status — all or nothing.
  await db.transaction(async (tx) => {
    await tx.delete(movieNightRecommendations).where(eq(movieNightRecommendations.movieNightId, movieNightId));
    await tx.delete(movieNightVotes).where(eq(movieNightVotes.movieNightId, movieNightId));

    await tx.insert(movieNightRecommendations).values({
      movieNightId,
      movieId: Number(row.movie_id),
      showId: Number(row.show_id),
      genreScore: Number(row.genre_score),
      timeScore: Number(row.time_score),
      budgetScore: Number(row.budget_score),
      locationScore: Number(row.location_score),
      compatibilityScore: Number(row.compatibility_score),
    });

    await tx.update(movieNights)
      .set({ status: "RECOMMENDED", updatedAt: new Date() })
      .where(eq(movieNights.id, movieNightId));
  });

  return {};
};

// ─── GENERATE RECOMMENDATION ──────────────────────────────────────────────────

export const generateRecommendation = async (req: Request, res: Response) => {
  const movieNightId = parseInt(req.params.id);
  const userId = uid(req);

  try {
    const [night] = await db.select().from(movieNights).where(eq(movieNights.id, movieNightId));
    if (!night) return res.status(404).json({ error: "Movie night not found." });
    if (night.organizerId !== userId) return res.status(403).json({ error: "Only the organizer can generate a recommendation." });
    if (night.status !== "COLLECTING_PREFERENCES") return res.status(400).json({ error: "Recommendation can only be generated while collecting preferences." });

    const { error } = await runRecommendationEngine(movieNightId);
    if (error) return res.status(400).json({ error });

    return res.json({ message: "Recommendation generated." });
  } catch (err) {
    console.error("[generateRecommendation]", err);
    return res.status(500).json({ error: "Failed to generate recommendation." });
  }
};

// ─── VOTE ON RECOMMENDATION ───────────────────────────────────────────────────

export const voteRecommendation = async (req: Request, res: Response) => {
  const movieNightId = parseInt(req.params.id);
  const userId = uid(req);
  const { vote } = req.body; // ACCEPT | REJECT

  if (!["ACCEPT", "REJECT"].includes(vote)) return res.status(400).json({ error: "vote must be ACCEPT or REJECT." });

  try {
    const [night] = await db.select().from(movieNights).where(eq(movieNights.id, movieNightId));
    if (!night) return res.status(404).json({ error: "Movie night not found." });
    if (night.status !== "RECOMMENDED") return res.status(400).json({ error: "No recommendation to vote on." });

    const member = await isMember(movieNightId, userId);
    if (!member) return res.status(403).json({ error: "You are not a member of this movie night." });

    // Upsert vote atomically via the unique(movie_night_id, user_id) constraint —
    // no read-then-write race.
    await db
      .insert(movieNightVotes)
      .values({ movieNightId, userId, vote })
      .onConflictDoUpdate({
        target: [movieNightVotes.movieNightId, movieNightVotes.userId],
        set: { vote },
      });

    // Tally current votes against the membership.
    const allVotes = await db.select({ vote: movieNightVotes.vote })
      .from(movieNightVotes)
      .where(eq(movieNightVotes.movieNightId, movieNightId));

    const members = await db.select({ userId: movieNightMembers.userId })
      .from(movieNightMembers).where(eq(movieNightMembers.movieNightId, movieNightId));

    const accepts = allVotes.filter(v => v.vote === "ACCEPT").length;
    const rejects = allVotes.filter(v => v.vote === "REJECT").length;
    // True majority — more than half. For 4 members that's 3, so a 2–2 tie no longer passes.
    const majority = Math.floor(members.length / 2) + 1;

    if (accepts >= majority) {
      // Look up the recommended show's price for the split.
      const [rec] = await db.select({ showId: movieNightRecommendations.showId })
        .from(movieNightRecommendations)
        .where(eq(movieNightRecommendations.movieNightId, movieNightId));
      const [show] = await db.select({ priceRegular: shows.priceRegular })
        .from(shows).where(eq(shows.id, rec.showId));

      const perPerson = show.priceRegular; // regular-seat share per member
      const totalCost = perPerson * members.length;

      // Reset contributions + advance status atomically.
      await db.transaction(async (tx) => {
        await tx.delete(movieNightContributions).where(eq(movieNightContributions.movieNightId, movieNightId));
        await tx.insert(movieNightContributions).values(
          members.map(m => ({ movieNightId, userId: m.userId, contributionAmount: perPerson, status: "PENDING" }))
        );
        await tx.update(movieNights)
          .set({ status: "PAYMENT_PENDING", updatedAt: new Date() })
          .where(eq(movieNights.id, movieNightId));
      });

      return res.json({ message: "Majority accepted! Contributions created.", status: "PAYMENT_PENDING", perPerson, totalCost });
    }

    if (rejects >= majority) {
      await db.update(movieNights)
        .set({ status: "REJECTED", updatedAt: new Date() })
        .where(eq(movieNights.id, movieNightId));
      return res.json({ message: "Majority rejected the recommendation.", status: "REJECTED", rejects, totalMembers: members.length });
    }

    return res.json({ message: "Vote recorded.", accepts, totalMembers: members.length });
  } catch (err) {
    console.error("[voteRecommendation]", err);
    return res.status(500).json({ error: "Failed to record vote." });
  }
};

// ─── REGENERATE RECOMMENDATION (from REJECTED) ────────────────────────────────

export const regenerateRecommendation = async (req: Request, res: Response) => {
  const movieNightId = parseInt(req.params.id);
  const userId = uid(req);

  try {
    const [night] = await db.select().from(movieNights).where(eq(movieNights.id, movieNightId));
    if (!night) return res.status(404).json({ error: "Movie night not found." });
    if (night.organizerId !== userId) return res.status(403).json({ error: "Only the organizer can regenerate a recommendation." });
    if (night.status !== "REJECTED") return res.status(400).json({ error: "Can only regenerate from a rejected state." });

    const { error } = await runRecommendationEngine(movieNightId);
    if (error) return res.status(400).json({ error });

    return res.json({ message: "New recommendation generated. Start a fresh vote!" });
  } catch (err) {
    console.error("[regenerateRecommendation]", err);
    return res.status(500).json({ error: "Failed to regenerate recommendation." });
  }
};

// ─── CANCEL MOVIE NIGHT ───────────────────────────────────────────────────────

export const cancelMovieNight = async (req: Request, res: Response) => {
  const movieNightId = parseInt(req.params.id);
  const userId = uid(req);

  try {
    const [night] = await db.select().from(movieNights).where(eq(movieNights.id, movieNightId));
    if (!night) return res.status(404).json({ error: "Movie night not found." });
    if (night.organizerId !== userId) return res.status(403).json({ error: "Only the organizer can cancel this movie night." });
    if (night.status === "BOOKED") return res.status(400).json({ error: "Cannot cancel an already booked movie night." });
    if (night.status === "CANCELLED") return res.json({ message: "Already cancelled." });

    await db.update(movieNights)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(movieNights.id, movieNightId));

    return res.json({ message: "Movie night cancelled successfully." });
  } catch (err) {
    console.error("[cancelMovieNight]", err);
    return res.status(500).json({ error: "Failed to cancel movie night." });
  }
};

// ─── MARK CONTRIBUTION PAID ───────────────────────────────────────────────────

export const markContributionPaid = async (req: Request, res: Response) => {
  const movieNightId = parseInt(req.params.id);
  const userId = uid(req);
  const { paymentId } = req.body;

  try {
    const [night] = await db.select().from(movieNights).where(eq(movieNights.id, movieNightId));
    if (!night) return res.status(404).json({ error: "Movie night not found." });
    if (night.status !== "PAYMENT_PENDING") return res.status(400).json({ error: "No payment pending." });

    const [contrib] = await db.select().from(movieNightContributions)
      .where(and(eq(movieNightContributions.movieNightId, movieNightId), eq(movieNightContributions.userId, userId)));

    if (!contrib) return res.status(404).json({ error: "No contribution record found for you." });
    if (contrib.status === "PAID") return res.json({ message: "Already marked as paid." });

    // Mark this member paid and, if it was the last pending one, advance the night —
    // both in a single transaction so two members paying at once can't disagree.
    const remainingCount = await db.transaction(async (tx) => {
      await tx.update(movieNightContributions)
        .set({ status: "PAID", paymentId: paymentId || null, paidAt: new Date() })
        .where(eq(movieNightContributions.id, contrib.id));

      const remaining = await tx.select({ id: movieNightContributions.id })
        .from(movieNightContributions)
        .where(and(eq(movieNightContributions.movieNightId, movieNightId), eq(movieNightContributions.status, "PENDING")));

      if (remaining.length === 0) {
        await tx.update(movieNights)
          .set({ status: "READY_TO_BOOK", updatedAt: new Date() })
          .where(eq(movieNights.id, movieNightId));
      }
      return remaining.length;
    });

    if (remainingCount === 0) {
      return res.json({ message: "All contributions paid! Ready to book.", status: "READY_TO_BOOK" });
    }

    return res.json({ message: "Contribution marked as paid.", remaining: remainingCount });
  } catch (err) {
    console.error("[markContributionPaid]", err);
    return res.status(500).json({ error: "Failed to mark contribution." });
  }
};

// ─── COMPLETE BOOKING ─────────────────────────────────────────────────────────

export const completeBooking = async (req: Request, res: Response) => {
  const movieNightId = parseInt(req.params.id);
  const userId = uid(req);

  try {
    const [night] = await db.select().from(movieNights).where(eq(movieNights.id, movieNightId));
    if (!night) return res.status(404).json({ error: "Movie night not found." });
    if (night.organizerId !== userId) return res.status(403).json({ error: "Only the organizer can complete the booking." });
    if (night.status !== "READY_TO_BOOK") return res.status(400).json({ error: "Not all contributions are paid yet." });

    const [rec] = await db.select()
      .from(movieNightRecommendations)
      .where(eq(movieNightRecommendations.movieNightId, movieNightId));

    if (!rec) return res.status(400).json({ error: "No recommendation found." });

    const memberRows = await db.select({ id: movieNightMembers.id })
      .from(movieNightMembers)
      .where(eq(movieNightMembers.movieNightId, movieNightId));

    // Status stays READY_TO_BOOK until payment is confirmed in /bookings/verify
    return res.json({ message: "Proceed to seat selection.", showId: rec.showId, memberCount: memberRows.length });
  } catch (err) {
    console.error("[completeBooking]", err);
    return res.status(500).json({ error: "Failed to complete booking." });
  }
};

// ─── GET SEAT ASSIGNMENTS (all members, for the success/detail page) ──────────

export const getNightSeatAssignments = async (req: Request, res: Response) => {
  const movieNightId = parseInt(req.params.id);
  const userId = uid(req);
  try {
    const member = await isMember(movieNightId, userId);
    if (!member) return res.status(403).json({ error: "Not a member of this movie night." });

    const assignments = await db
      .select({
        userId: movieNightSeatAssignments.userId,
        fullName: users.fullName,
        seatRow: seats.row,
        seatNumber: seats.number,
        seatCategory: seats.category,
        bookingCode: bookings.code,
      })
      .from(movieNightSeatAssignments)
      .innerJoin(users, eq(movieNightSeatAssignments.userId, users.id))
      .innerJoin(seats, eq(movieNightSeatAssignments.seatId, seats.id))
      .innerJoin(bookings, eq(movieNightSeatAssignments.bookingId, bookings.id))
      .where(eq(movieNightSeatAssignments.movieNightId, movieNightId))
      .orderBy(asc(seats.row), asc(seats.number));

    return res.json({ assignments });
  } catch (err) {
    console.error("[getNightSeatAssignments]", err);
    return res.status(500).json({ error: "Failed to fetch seat assignments." });
  }
};

// ─── GET MY TICKET (current user's seat for this movie night) ─────────────────

export const getMyNightTicket = async (req: Request, res: Response) => {
  const movieNightId = parseInt(req.params.id);
  const userId = uid(req);
  try {
    const rows = await db
      .select({
        seatRow: seats.row,
        seatNumber: seats.number,
        seatCategory: seats.category,
        bookingCode: bookings.code,
        bookingId: movieNightSeatAssignments.bookingId,
      })
      .from(movieNightSeatAssignments)
      .innerJoin(seats, eq(movieNightSeatAssignments.seatId, seats.id))
      .innerJoin(bookings, eq(movieNightSeatAssignments.bookingId, bookings.id))
      .where(and(
        eq(movieNightSeatAssignments.movieNightId, movieNightId),
        eq(movieNightSeatAssignments.userId, userId)
      ));

    if (!rows[0]) return res.status(404).json({ error: "No ticket found for this movie night." });
    return res.json({ ticket: rows[0] });
  } catch (err) {
    console.error("[getMyNightTicket]", err);
    return res.status(500).json({ error: "Failed to fetch ticket." });
  }
};

// ─── GET MOVIE NIGHT MESSAGES (group chat) ────────────────────────────────────

export const getMovieNightMessages = async (req: Request, res: Response) => {
  const movieNightId = parseInt(req.params.id);
  const userId = uid(req);
  try {
    const member = await isMember(movieNightId, userId);
    if (!member) return res.status(403).json({ error: "Not a member of this movie night." });

    const messages = await db
      .select({
        id: movieNightMessages.id,
        message: movieNightMessages.message,
        createdAt: movieNightMessages.createdAt,
        userId: movieNightMessages.userId,
        userFullName: users.fullName,
        userProfilePic: users.profilePic,
      })
      .from(movieNightMessages)
      .innerJoin(users, eq(movieNightMessages.userId, users.id))
      .where(eq(movieNightMessages.movieNightId, movieNightId))
      .orderBy(asc(movieNightMessages.createdAt))
      .limit(150);

    return res.json({ messages });
  } catch (err) {
    console.error("[getMovieNightMessages]", err);
    return res.status(500).json({ error: "Failed to fetch messages." });
  }
};

// ─── SEND MOVIE NIGHT MESSAGE (group chat) ────────────────────────────────────

export const sendMovieNightMessage = async (req: Request, res: Response) => {
  const movieNightId = parseInt(req.params.id);
  const userId = uid(req);
  const { message } = req.body;

  if (!message?.trim()) return res.status(400).json({ error: "Message cannot be empty." });

  try {
    const member = await isMember(movieNightId, userId);
    if (!member) return res.status(403).json({ error: "Not a member of this movie night." });

    const [newMsg] = await db
      .insert(movieNightMessages)
      .values({ movieNightId, userId, message: message.trim() })
      .returning();

    const [userInfo] = await db
      .select({ fullName: users.fullName, profilePic: users.profilePic })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return res.status(201).json({
      message: { ...newMsg, userFullName: userInfo.fullName, userProfilePic: userInfo.profilePic },
    });
  } catch (err) {
    console.error("[sendMovieNightMessage]", err);
    return res.status(500).json({ error: "Failed to send message." });
  }
};
