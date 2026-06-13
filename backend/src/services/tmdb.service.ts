import https from "https";

const TMDB_BASE = "api.themoviedb.org";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// Force IPv4 — some environments fail to reach TMDB over IPv6
const ipv4Agent = new https.Agent({ family: 4 });

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
  53: "Thriller", 10752: "War", 37: "Western",
};

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  genre_ids: number[];
  release_date: string;
  vote_average: number;
  poster_path: string | null;
  backdrop_path: string | null;
  original_language: string;
}

export interface TmdbMovieDetail extends TmdbMovie {
  runtime: number;
  release_dates?: { results: Array<{ iso_3166_1: string; release_dates: Array<{ certification: string; type: number }> }> };
}

function tmdbGet<T>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: TMDB_BASE,
      path,
      method: "GET",
      agent: ipv4Agent,
      headers: {
        Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}`,
        Accept: "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`TMDB ${path} returned ${res.statusCode}: ${raw.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(raw) as T);
        } catch {
          reject(new Error(`TMDB invalid JSON from ${path}`));
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(new Error(`TMDB timeout after 30s: ${path}`)); });
    req.end();
  });
}

export const posterUrl = (path: string | null, size = "w500") =>
  path ? `${TMDB_IMAGE_BASE}/${size}${path}` : "";

export const backdropUrl = (path: string | null, size = "w1280") =>
  path ? `${TMDB_IMAGE_BASE}/${size}${path}` : "";

export const genreName = (ids: number[]) =>
  ids.map(id => GENRE_MAP[id] ?? "").filter(Boolean).slice(0, 2).join("/") || "Drama";

export const ratingCertificate = (detail: TmdbMovieDetail): string => {
  const results = detail.release_dates?.results ?? [];
  const in_ = results.find(r => r.iso_3166_1 === "IN");
  const us = results.find(r => r.iso_3166_1 === "US");
  const source = in_ ?? us;
  const cert = source?.release_dates?.find(d => d.type === 3)?.certification
    ?? source?.release_dates?.[0]?.certification;
  if (!cert) return "UA";
  if (cert === "U/A" || cert === "UA") return "UA";
  if (cert === "A" || cert === "NC-17" || cert === "R") return "A";
  return "U";
};

export async function fetchNowPlaying(): Promise<TmdbMovie[]> {
  const data = await tmdbGet<{ results?: TmdbMovie[] }>(
    "/3/movie/now_playing?region=IN&language=en-US&page=1"
  );
  return data.results ?? [];
}

export async function fetchMovieDetails(tmdbId: number): Promise<TmdbMovieDetail> {
  return tmdbGet<TmdbMovieDetail>(
    `/3/movie/${tmdbId}?append_to_response=release_dates`
  );
}
