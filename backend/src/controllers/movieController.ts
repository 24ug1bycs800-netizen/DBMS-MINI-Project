import { Request, Response } from "express";
import { and, asc, eq, exists, ne, sql } from "drizzle-orm";
import { db } from "../db/db";
import { cities, movies, reviews, screens, shows, theatres } from "../db/schema";

const parseInteger = (value: unknown) => Number.parseInt(String(value), 10);

// Returns ISO date string for today (YYYY-MM-DD)
const getToday = () => new Date().toISOString().slice(0, 10);

// GET CITIES
export const getCities = async (_req: Request, res: Response) => {
  try {
    const citiesList = await db.select().from(cities).orderBy(asc(cities.name));
    return res.status(200).json({ cities: citiesList });
  } catch (err) {
    console.error("getCities error:", err);
    return res.status(500).json({ error: "Failed to fetch cities" });
  }
};

// GET MOVIES
// When citySlug + isNowShowing=true: only return movies with active future shows in that city.
export const getMovies = async (req: Request, res: Response) => {
  try {
    const { isNowShowing, citySlug } = req.query;
    const today = getToday();

    // Build optional city-exists subquery for location filtering
    let cityExistsClause: ReturnType<typeof exists> | undefined;
    if (citySlug && isNowShowing === "true") {
      const cityResult = await db
        .select({ id: cities.id })
        .from(cities)
        .where(eq(cities.slug, String(citySlug)))
        .limit(1);
      if (!cityResult[0]) return res.status(200).json({ movies: [] });
      const cId = cityResult[0].id;
      cityExistsClause = exists(
        db
          .select({ one: sql`1` })
          .from(shows)
          .innerJoin(screens, eq(shows.screenId, screens.id))
          .innerJoin(theatres, eq(screens.theatreId, theatres.id))
          .where(
            and(
              eq(shows.movieId, movies.id),
              eq(theatres.cityId, cId),
              ne(shows.status, "expired"),
              sql`${shows.date} >= ${today}`
            )
          )
      );
    }

    const moviesList = await db
      .select()
      .from(movies)
      .where(
        and(
          isNowShowing !== undefined
            ? eq(movies.isNowShowing, isNowShowing === "true")
            : undefined,
          cityExistsClause
        )
      )
      .orderBy(asc(movies.title));

    return res.status(200).json({ movies: moviesList });
  } catch (err) {
    console.error("getMovies error:", err);
    return res
      .status(500)
      .json({ error: "Failed to fetch movies", details: err instanceof Error ? err.message : err });
  }
};

// GET MOVIE BY ID
export const getMovieById = async (req: Request, res: Response) => {
  try {
    const id = parseInteger(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid movie ID" });
    }

    const [movie, reviewsList] = await Promise.all([
      db.select().from(movies).where(eq(movies.id, id)).limit(1),
      db.select().from(reviews).where(eq(reviews.movieId, id)).orderBy(asc(reviews.createdAt)),
    ]);

    if (!movie[0]) {
      return res.status(404).json({ error: "Movie not found" });
    }

    return res.status(200).json({ movie: movie[0], reviews: reviewsList });
  } catch (err) {
    console.error("getMovieById error:", err);
    return res.status(500).json({ error: "Failed to fetch movie details" });
  }
};

// GET THEATRES (supports cityId or citySlug)
export const getTheatres = async (req: Request, res: Response) => {
  try {
    const { cityId, citySlug } = req.query;

    if (citySlug) {
      const cityResult = await db
        .select()
        .from(cities)
        .where(eq(cities.slug, String(citySlug)))
        .limit(1);
      if (!cityResult[0]) return res.status(200).json({ theatres: [] });

      const theatresList = await db
        .select()
        .from(theatres)
        .where(eq(theatres.cityId, cityResult[0].id))
        .orderBy(asc(theatres.name));
      return res.status(200).json({ theatres: theatresList });
    }

    if (cityId) {
      const theatresList = await db
        .select()
        .from(theatres)
        .where(eq(theatres.cityId, parseInteger(String(cityId))))
        .orderBy(asc(theatres.name));
      return res.status(200).json({ theatres: theatresList });
    }

    const theatresList = await db.select().from(theatres).orderBy(asc(theatres.name));
    return res.status(200).json({ theatres: theatresList });
  } catch (err) {
    console.error("getTheatres error:", err);
    return res.status(500).json({ error: "Failed to fetch theatres" });
  }
};

// GET SHOWS
// Filters: only active status + date >= today → users never see expired/past shows.
// This applies everywhere: home, movie details, theatre pages, group planning, booking flow.
export const getShows = async (req: Request, res: Response) => {
  try {
    const { movieId, citySlug, theatreId } = req.query;
    if (!movieId) {
      return res.status(400).json({ error: "movieId required" });
    }

    const today = getToday();
    const theatreInt = theatreId ? parseInteger(String(theatreId)) : NaN;

    let cityId: number | null = null;
    if (citySlug) {
      const cityResult = await db
        .select({ id: cities.id })
        .from(cities)
        .where(eq(cities.slug, String(citySlug)))
        .limit(1);
      if (!cityResult[0]) return res.status(200).json({ shows: [] });
      cityId = cityResult[0].id;
    }

    const rows = await db
      .select({
        id: shows.id,
        movieId: shows.movieId,
        screenId: shows.screenId,
        language: shows.language,
        startTime: shows.startTime,
        date: shows.date,
        priceRegular: shows.priceRegular,
        pricePremium: shows.pricePremium,
        priceRecliner: shows.priceRecliner,
        status: shows.status,
        screen: {
          id: screens.id,
          number: screens.number,
          type: screens.type,
        },
        theatre: {
          id: theatres.id,
          name: theatres.name,
          address: theatres.address,
          cityId: theatres.cityId,
        },
      })
      .from(shows)
      .innerJoin(screens, eq(shows.screenId, screens.id))
      .innerJoin(theatres, eq(screens.theatreId, theatres.id))
      .where(
        and(
          eq(shows.movieId, parseInteger(String(movieId))),
          // Only active shows
          ne(shows.status, "expired"),
          // Only today or future dates
          sql`${shows.date} >= ${today}`,
          Number.isNaN(theatreInt) ? undefined : eq(theatres.id, theatreInt),
          cityId === null ? undefined : eq(theatres.cityId, cityId)
        )
      )
      .orderBy(asc(shows.date), asc(shows.startTime), asc(theatres.name), asc(screens.number));

    return res.status(200).json({ shows: rows });
  } catch (err) {
    console.error("getShows error:", err);
    return res.status(500).json({ shows: [] });
  }
};
