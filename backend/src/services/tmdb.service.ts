const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

const tmdbHeaders = () => ({
  Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}`,
  "Content-Type": "application/json",
});

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
  const res = await fetch(
    `${TMDB_BASE}/movie/now_playing?region=IN&language=en-US&page=1`,
    { headers: tmdbHeaders() }
  );
  if (!res.ok) throw new Error(`TMDB now_playing failed: ${res.status}`);
  const data = (await res.json()) as { results?: TmdbMovie[] };
  return data.results ?? [];
}

export async function fetchMovieDetails(tmdbId: number): Promise<TmdbMovieDetail> {
  const res = await fetch(
    `${TMDB_BASE}/movie/${tmdbId}?append_to_response=release_dates`,
    { headers: tmdbHeaders() }
  );
  if (!res.ok) throw new Error(`TMDB detail failed for ${tmdbId}: ${res.status}`);
  return (await res.json()) as TmdbMovieDetail;
}
