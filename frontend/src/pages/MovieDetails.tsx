import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useCityStore } from "../store/useCityStore.js";
import { useAuth } from "../context/AuthContext.js";
import {
  Star,
  Clock,
  Heart,
  Share2,
  Play,
  Users,
  Moon,
  AlertCircle,
  X,
  CheckCircle,
} from "lucide-react";
import api from "../services/api.js";

const getEmbedUrl = (url?: string | null) => {
  const rawUrl = url?.trim();
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "");
    let videoId: string | null = null;

    if (host === "youtu.be") {
      videoId = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/").filter(Boolean)[1] ?? null;
      } else if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/live/")) {
        videoId = parsed.pathname.split("/").filter(Boolean)[1] ?? null;
      } else {
        videoId = parsed.searchParams.get("v");
      }
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    if (rawUrl.includes("youtube.com/embed/")) return rawUrl;
  }

  return null;
};

const getImageUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
};

const getLocalToday = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getUpcomingDates = (count = 5): string[] => {
  const dates: string[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
};

const SHOWTIME_HOURS: Record<string, number> = {
  "09:00 AM": 9,
  "12:30 PM": 12,
  "03:45 PM": 15,
  "06:30 PM": 18,
  "09:30 PM": 21,
  "11:45 PM": 23,
};

const parseShowHour = (startTime: string): number => {
  if (SHOWTIME_HOURS[startTime] !== undefined) return SHOWTIME_HOURS[startTime];
  const [time, period] = startTime.split(" ");
  const [h] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) return h + 12;
  if (period === "AM" && h === 12) return 0;
  return h;
};

const isShowAvailable = (show: Show, selectedDate: string): boolean => {
  if (selectedDate !== getLocalToday()) return true;
  return parseShowHour(show.startTime) > new Date().getHours();
};

interface Movie {
  id: number;
  title: string;
  description: string;
  genre: string;
  language: string;
  durationMins: number;
  rating: string;
  ratingValue: string;
  releaseDate: string;
  trailerUrl?: string;
  posterUrl: string;
  isNowShowing: boolean;
}

interface Show {
  id: number;
  language?: string;
  startTime: string;
  date: string;
  priceRegular: number;
  screen: { id: number; number: number; type: string };
  theatre: { id: number; name: string; address: string };
}

const DATE_OPTIONS = getUpcomingDates(5);

// ─── REVIEW FORM ──────────────────────────────────────────────────────────────
const ReviewForm: React.FC<{
  movieId: string;
  user: any;
  onReviewSubmitted: (review: any) => void;
}> = ({ movieId, user, onReviewSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post("/bookings/reviews", {
        movieId: parseInt(movieId),
        rating,
        comment,
      });
      onReviewSubmitted({
        ...res.data.review,
        user: { fullName: user?.fullName },
      });
      setSubmitted(true);
      setComment("");
      setRating(0);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="p-4 rounded-xl flex items-center gap-2.5 text-xs font-inter"
        style={{
          background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.2)",
        }}
      >
        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
        <span className="text-green-400">Review submitted! Thank you.</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 rounded-xl space-y-4 font-inter"
      style={{
        background: "#0a0a0a",
        border: "1px solid rgba(212,175,55,0.1)",
      }}
    >
      <p className="text-xs font-black text-white tracking-wide">
        Write a Review
      </p>

      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                star <= (hovered || rating)
                  ? "fill-[#d4af37] text-[#d4af37]"
                  : "text-neutral-800"
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span
            className="text-xs font-black ml-2"
            style={{ color: "#d4af37" }}
          >
            {rating}/5
          </span>
        )}
      </div>

      <textarea
        rows={3}
        placeholder="Share your thoughts about this film..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full p-3 rounded-xl text-white text-xs resize-none focus:outline-none transition-all"
        style={{
          background: "#050505",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
        onFocus={(e) => {
          e.target.style.border = "1px solid rgba(212,175,55,0.4)";
        }}
        onBlur={(e) => {
          e.target.style.border = "1px solid rgba(255,255,255,0.07)";
        }}
      />

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 rounded-xl font-black text-xs tracking-wider uppercase transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, #d4af37, #f4d03f)",
          color: "#000",
        }}
      >
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export const MovieDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedCity } = useCityStore();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(DATE_OPTIONS[0]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const embedUrl = getEmbedUrl(movie?.trailerUrl);

  useEffect(() => {
    if (searchParams.get("playTrailer") === "true") setTrailerOpen(true);
  }, [searchParams]);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        const movieRes = await api.get(`/movies/${id}`);
        setMovie(movieRes.data.movie);
        setReviews(movieRes.data.reviews);
        if (user) {
          const wishRes = await api.get("/bookings/wishlist");
          const list = wishRes.data.wishlist as Movie[];
          setIsWishlisted(list.some((m) => m.id === parseInt(id!)));
        }
      } catch (err) {
        console.error("Failed to load movie details:", err);
      }
    };
    fetchMovieDetails();
  }, [id, user]);

  useEffect(() => {
    const fetchShows = async () => {
      try {
        const res = await api.get(
          `/shows?movieId=${id}&citySlug=${selectedCity.slug}`,
        );
        setShows(res.data.shows);
      } catch (err) {
        console.error("Failed to load showtimes:", err);
      }
    };
    if (movie?.isNowShowing) fetchShows();
  }, [id, movie, selectedCity]);

  const handleToggleWishlist = async () => {
    if (!user) {
      navigate("/auth", { state: { from: `/movies/${id}` } });
      return;
    }
    try {
      const res = await api.post("/bookings/wishlist/toggle", { movieId: id });
      setIsWishlisted(res.data.isWishlisted);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: movie?.title, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const availableLanguages = useMemo(() => {
    const langs = new Set(shows.map(s => s.language).filter(Boolean));
    return Array.from(langs) as string[];
  }, [shows]);

  if (!movie) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#080808" }}
      >
        <div
          className="w-10 h-10 rounded-full border-t-2 animate-spin"
          style={{ borderColor: "#d4af37" }}
        />
      </div>
    );
  }

  const dailyShows = shows.filter(
    (s) => s.date === selectedDate &&
      isShowAvailable(s, selectedDate) &&
      (!selectedLanguage || s.language === selectedLanguage),
  );
  const theatresMap: Record<
    number,
    { name: string; address: string; shows: Show[] }
  > = {};
  dailyShows.forEach((show) => {
    if (!theatresMap[show.theatre?.id]) {
      theatresMap[show.theatre?.id] = {
        name: show.theatre.name,
        address: show.theatre.address,
        shows: [],
      };
    }
    theatresMap[show.theatre?.id].shows.push(show);
  });

  return (
    <div
      className="text-white pb-24 font-poppins min-h-screen relative"
      style={{ background: "#080808" }}
    >
      {/* FILM GRAIN */}
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── 1. HERO BACKDROP ──────────────────────────────────────────── */}
      <div className="relative h-[50vh] sm:h-[60vh] w-full overflow-hidden flex items-end">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{
            backgroundImage: `url(${getImageUrl(movie.posterUrl)})`,
            filter: "brightness(0.25)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, #080808 0%, rgba(8,8,8,0.7) 50%, rgba(8,8,8,0.1) 100%)",
          }}
        />
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              "linear-gradient(to right, #080808 0%, rgba(8,8,8,0.5) 50%, transparent 100%)",
          }}
        />
        {/* BOTTOM GOLD LINE */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(212,175,55,0.3) 30%, rgba(212,175,55,0.3) 70%, transparent)",
          }}
        />

        {/* POSTER + INFO */}
        <div className="relative z-10 px-6 sm:px-16 pb-10 max-w-6xl mx-auto w-full flex flex-col md:flex-row gap-8 items-end">
          {/* POSTER */}
          <div
            className="w-36 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden flex-shrink-0"
            style={{
              border: "1px solid rgba(212,175,55,0.2)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
            }}
          >
            <img
              src={getImageUrl(movie.posterUrl)}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-grow">
            {/* GENRE TAG */}
            <span
              className="text-[10px] font-black tracking-[0.2em] uppercase mb-3 inline-block"
              style={{ color: "#d4af37" }}
            >
              {movie.genre.split("/")[0]} · {movie.language}
            </span>

            <h1
              className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4"
              style={{ textShadow: "0 4px 24px rgba(0,0,0,0.8)" }}
            >
              {movie.title}
            </h1>

            {/* META ROW */}
            <div className="flex flex-wrap items-center gap-3 text-sm mb-5 font-inter">
              <span
                className="flex items-center gap-1.5 font-bold"
                style={{ color: "#d4af37" }}
              >
                <Star className="w-4 h-4 fill-[#d4af37]" /> {movie.ratingValue}{" "}
                / 10
              </span>
              <span className="text-neutral-700">·</span>
              <span className="flex items-center gap-1.5 text-neutral-400">
                <Clock className="w-4 h-4" /> {movie.durationMins} min
              </span>
              <span className="text-neutral-700">·</span>
              <span
                className="px-2.5 py-0.5 rounded text-xs font-bold"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#999",
                }}
              >
                {movie.rating}
              </span>
            </div>

            <p className="text-sm text-neutral-500 font-inter mb-7 leading-relaxed max-w-2xl line-clamp-3">
              {movie.description}
            </p>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setTrailerOpen(true)}
                className="px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:scale-105"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(212,175,55,0.25)",
                  color: "#d4af37",
                }}
              >
                <Play className="w-4 h-4 fill-[#d4af37]" /> Watch Trailer
              </button>
              <button
                onClick={handleToggleWishlist}
                className="px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:scale-105"
                style={
                  isWishlisted
                    ? {
                        background: "rgba(212,175,55,0.12)",
                        border: "1px solid rgba(212,175,55,0.4)",
                        color: "#d4af37",
                      }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#888",
                      }
                }
              >
                <Heart
                  className={`w-4 h-4 ${isWishlisted ? "fill-[#d4af37]" : ""}`}
                />
                <span className="hidden sm:inline">Wishlist</span>
              </button>
              <button
                onClick={handleShare}
                className="px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:scale-105"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#888",
                }}
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. BODY ───────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-16 mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* MOVIE NIGHTS WIDGET */}
        <div
          className="lg:col-span-3 p-6 rounded-2xl relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(212,175,55,0.02) 100%)",
            border: "1px solid rgba(212,175,55,0.2)",
          }}
        >
          {/* TOP LINE */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(212,175,55,0.5) 30%, rgba(212,175,55,0.5) 70%, transparent)",
            }}
          />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
            <div>
              <span
                className="text-[10px] font-black tracking-[0.2em] uppercase px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(212,175,55,0.1)",
                  border: "1px solid rgba(212,175,55,0.25)",
                  color: "#d4af37",
                }}
              >
                CineCircle USP Feature
              </span>
              <h3 className="text-lg font-black text-white mt-3 flex items-center gap-2">
                <Users className="w-5 h-5" style={{ color: "#d4af37" }} /> Plan
                with Friends!
              </h3>
              <p className="text-xs text-neutral-600 font-inter mt-1.5 leading-relaxed max-w-xl">
                Can't decide on theatres or timings? Start a Movie Night to
                invite friends, let the AI pick the best show, and book together!
              </p>
            </div>
            <button
              onClick={() => navigate("/movie-nights")}
              className="px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all hover:scale-105 flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #d4af37, #f4d03f)",
                color: "#000",
                boxShadow: "0 8px 24px rgba(212,175,55,0.25)",
              }}
            >
              <Moon className="w-4 h-4" /> Plan a Movie Night
            </button>
          </div>
        </div>

        {/* ── SHOWTIMES ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            <div
              className="w-1 h-5 rounded-full"
              style={{ background: "#d4af37" }}
            />
            <h2 className="text-lg font-black text-white">Showtimes</h2>
          </div>

          {movie.isNowShowing ? (
            <>
              {/* LANGUAGE FILTER — BookMyShow style */}
              {availableLanguages.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    onClick={() => setSelectedLanguage("")}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={
                      selectedLanguage === ""
                        ? { background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#666" }
                    }
                  >
                    All Languages
                  </button>
                  {availableLanguages.map(lang => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={
                        selectedLanguage === lang
                          ? { background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000" }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#666" }
                      }
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}

              {/* DATE PICKER */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {DATE_OPTIONS.map((dateStr) => {
                  const isSelected = selectedDate === dateStr;
                  const isToday = dateStr === getLocalToday();
                  const [year, month, day] = dateStr.split("-").map(Number);
                  const dateObj = new Date(year, month - 1, day);
                  const weekday = dateObj.toLocaleDateString("en-US", {
                    weekday: "short",
                  });
                  const dayNum = dateObj.getDate();
                  const monthStr = dateObj.toLocaleDateString("en-US", {
                    month: "short",
                  });

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className="flex flex-col items-center p-3 rounded-xl min-w-[60px] font-inter transition-all"
                      style={
                        isSelected
                          ? {
                              background:
                                "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))",
                              border: "1px solid rgba(212,175,55,0.4)",
                              color: "#d4af37",
                            }
                          : {
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid rgba(255,255,255,0.05)",
                              color: "#555",
                            }
                      }
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                        {weekday}
                      </span>
                      <span className="text-lg font-black mt-0.5">
                        {dayNum}
                      </span>
                      <span className="text-[9px] uppercase font-bold opacity-70">
                        {monthStr}
                      </span>
                      {isToday && (
                        <span
                          className="text-[8px] font-black mt-0.5 uppercase tracking-wide"
                          style={{ color: "#d4af37" }}
                        >
                          Today
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* THEATRE + SHOW ROWS */}
              <div className="space-y-3 mt-4">
                {Object.keys(theatresMap).length > 0 ? (
                  Object.entries(theatresMap).map(([tId, th]) => (
                    <div
                      key={tId}
                      className="p-5 rounded-2xl flex flex-col md:flex-row justify-between gap-4 transition-all"
                      style={{
                        background: "#0f0f0f",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div className="max-w-xs">
                        <h4 className="font-black text-sm text-white">
                          {th.name}
                        </h4>
                        <p className="text-xs text-neutral-700 font-inter mt-1 leading-relaxed">
                          {th.address}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {th.shows.map((show) => (
                          <button
                            key={show.id}
                            onClick={() =>
                              navigate(`/shows/${show.id}/booking`, {
                                state: { show, movie, city: selectedCity },
                              })
                            }
                            className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
                            style={{
                              background: "rgba(212,175,55,0.06)",
                              border: "1px solid rgba(212,175,55,0.2)",
                              color: "#d4af37",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "rgba(212,175,55,0.14)";
                              e.currentTarget.style.borderColor =
                                "rgba(212,175,55,0.5)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background =
                                "rgba(212,175,55,0.06)";
                              e.currentTarget.style.borderColor =
                                "rgba(212,175,55,0.2)";
                            }}
                          >
                            <span className="block font-black">
                              {show.startTime}
                            </span>
                            <span className="block text-[8px] text-neutral-600 font-inter uppercase mt-0.5">
                              {show.language ? `${show.language} · ` : ""}{show.screen?.type}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className="p-10 text-center rounded-2xl flex flex-col items-center gap-3"
                    style={{
                      background: "rgba(255,255,255,0.01)",
                      border: "1px dashed rgba(212,175,55,0.1)",
                    }}
                  >
                    <AlertCircle className="w-8 h-8 text-neutral-800" />
                    <p className="text-sm text-neutral-700 font-inter">
                      {selectedDate === getLocalToday()
                        ? "No more shows available today. Check tomorrow's schedule!"
                        : `No shows scheduled at ${selectedCity.name} on this date.`}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div
              className="p-10 text-center rounded-2xl flex flex-col items-center gap-3"
              style={{
                background: "rgba(212,175,55,0.02)",
                border: "1px solid rgba(212,175,55,0.1)",
              }}
            >
              <Clock
                className="w-8 h-8 animate-pulse"
                style={{ color: "rgba(212,175,55,0.4)" }}
              />
              <h4 className="font-black text-white text-sm">
                Coming Soon in Theatres
              </h4>
              <p className="text-xs text-neutral-600 font-inter max-w-xs leading-relaxed">
                This film isn't showing yet. Advance ticketing will open soon!
              </p>
            </div>
          )}
        </div>

        {/* ── USER REVIEWS ──────────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div
              className="w-1 h-5 rounded-full"
              style={{ background: "#6ee7e7" }}
            />
            <h2 className="text-lg font-black text-white">User Reviews</h2>
          </div>

          {user ? (
            <ReviewForm
              movieId={id!}
              user={user}
              onReviewSubmitted={(rev) => setReviews((prev) => [rev, ...prev])}
            />
          ) : (
            <button
              onClick={() =>
                navigate("/auth", { state: { from: `/movies/${id}` } })
              }
              className="w-full py-3.5 rounded-xl text-xs text-neutral-700 font-inter transition-all hover:text-[#d4af37]"
              style={{ border: "1px dashed rgba(255,255,255,0.06)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(212,175,55,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              }}
            >
              Sign in to leave a review
            </button>
          )}

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {reviews.length > 0 ? (
              reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-xl font-inter"
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="font-black text-xs text-white">
                      {rev.user?.fullName || "Anonymous"}
                    </span>
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${s <= rev.rating ? "fill-[#d4af37] text-[#d4af37]" : "text-neutral-800"}`}
                        />
                      ))}
                      <span
                        className="text-[10px] font-black ml-1"
                        style={{ color: "#d4af37" }}
                      >
                        {rev.rating}/5
                      </span>
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {rev.comment || "No comment left."}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-800 text-center py-8 font-inter">
                No reviews yet. Be the first!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── TRAILER MODAL ─────────────────────────────────────────────── */}
      {trailerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          style={{ background: "rgba(0,0,0,0.92)" }}
        >
          <div
            className="w-full max-w-3xl aspect-video rounded-2xl overflow-hidden relative"
            style={{
              border: "1px solid rgba(212,175,55,0.2)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
            }}
          >
            <button
              onClick={() => setTrailerOpen(false)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full transition-all hover:scale-110"
              style={{
                background: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
              }}
            >
              <X className="w-4 h-4" />
            </button>
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={`${movie.title} Official Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-none"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-600 font-inter text-sm">
                Trailer coming soon 🎬
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
