import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCityStore } from "../store/useCityStore.js";
import {
  Play,
  Calendar,
  Star,
  Compass,
  Film,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "../services/api.js";

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
  backdropUrl?: string;
  isNowShowing: boolean;
  trending: boolean;
  topRated: boolean;
}

interface Theatre {
  id: number;
  name: string;
  cityId: number;
  address: string;
}

const getImageUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
};

// ─── GOLD SECTION HEADING ─────────────────────────────────────────────────────
const SectionHeading: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-3 mb-8">
    <div
      className="p-2 rounded-lg"
      style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.18)" }}
    >
      {icon}
    </div>
    <div>
      <h2 className="text-xl font-black text-white tracking-wide">{label}</h2>
      <div className="mt-1 w-6 h-0.5 rounded-full" style={{ background: "#d4af37" }} />
    </div>
  </div>
);

export const Home: React.FC = () => {
  const { selectedCity } = useCityStore();
  const navigate = useNavigate();

  const [nowShowing, setNowShowing] = useState<Movie[]>([]);
  const [comingSoon, setComingSoon] = useState<Movie[]>([]);
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const nowRes = await api.get("/movies?isNowShowing=true");
        setNowShowing(nowRes.data.movies);
        const soonRes = await api.get("/movies?isNowShowing=false");
        setComingSoon(soonRes.data.movies);
      } catch (err) {
        console.error("Failed to load movies:", err);
      }
    };
    fetchMovies();
  }, []);

  useEffect(() => {
    const fetchTheatres = async () => {
      try {
        const res = await api.get(`/theatres?citySlug=${selectedCity.slug}`);
        setTheatres(res.data.theatres);
      } catch (err) {
        console.error("Failed to load local theatres:", err);
      }
    };
    fetchTheatres();
  }, [selectedCity]);

  useEffect(() => {
    if (nowShowing.length === 0) return;
    const interval = setInterval(() => {
      setHeroIdx((prev) => (prev + 1) % Math.min(nowShowing.length, 3));
    }, 6000);
    return () => clearInterval(interval);
  }, [nowShowing]);

  const activeHero = nowShowing[heroIdx];
  const handleNextHero = () => setHeroIdx((prev) => (prev + 1) % Math.min(nowShowing.length, 3));
  const handlePrevHero = () => setHeroIdx((prev) => (prev - 1 + Math.min(nowShowing.length, 3)) % Math.min(nowShowing.length, 3));

  return (
    <div className="bg-[#080808] text-white pb-24 font-poppins min-h-screen relative">
      {/* FILM GRAIN OVERLAY */}
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── 1. HERO BANNER ──────────────────────────────────────────────── */}
      {activeHero && (
        <div className="relative h-[85vh] w-full overflow-hidden flex items-end">
          {/* BACKDROP */}
          <div
            className="absolute inset-0 bg-cover bg-center scale-105 transition-all duration-1000"
            style={{
              backgroundImage: `url(${getImageUrl(activeHero.backdropUrl || activeHero.posterUrl)})`,
              filter: "brightness(0.35)",
            }}
          />

          {/* GRADIENT OVERLAYS */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #080808 0%, rgba(8,8,8,0.8) 40%, rgba(8,8,8,0.1) 100%)" }} />
          <div className="absolute inset-0 hidden md:block" style={{ background: "linear-gradient(to right, #080808 0%, rgba(8,8,8,0.6) 45%, transparent 100%)" }} />

          {/* SUBTLE GOLD VIGNETTE */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.3) 30%, rgba(212,175,55,0.3) 70%, transparent)" }}
          />

          {/* CONTENT */}
          <div className="relative z-10 px-6 sm:px-16 pb-16 w-full max-w-5xl">
            {/* NOW SHOWING PILL */}
            <div className="mb-5 inline-flex items-center gap-2">
              <div
                className="px-3 py-1 rounded-full text-[10px] font-black tracking-[0.2em] uppercase flex items-center gap-1.5"
                style={{
                  background: "linear-gradient(135deg, #d4af37, #f4d03f)",
                  color: "#000",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-black/40 animate-pulse inline-block" />
                Now Showing
              </div>
            </div>

            <h1
              className="text-5xl md:text-7xl font-black text-white leading-none mb-5 tracking-tight"
              style={{ textShadow: "0 4px 32px rgba(0,0,0,0.8)" }}
            >
              {activeHero.title}
            </h1>

            <p className="text-sm text-neutral-400 font-inter max-w-xl mb-6 leading-relaxed hidden sm:block line-clamp-2">
              {activeHero.description}
            </p>

            {/* META TAGS */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
              {[activeHero.language, activeHero.genre.split("/")[0]].map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#aaa" }}
                >
                  {tag}
                </span>
              ))}
              <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "#d4af37" }}>
                <Star className="w-3.5 h-3.5 fill-[#d4af37]" /> {activeHero.ratingValue}
              </span>
              <span className="text-xs text-neutral-600">{activeHero.durationMins} min</span>
            </div>

            {/* CTA BUTTONS */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate(`/movies/${activeHero.id}`)}
                className="px-8 py-3.5 rounded-full font-black text-sm tracking-wide flex items-center gap-2 transition-all hover:scale-105 hover:shadow-2xl"
                style={{
                  background: "linear-gradient(135deg, #d4af37, #f4d03f)",
                  color: "#000",
                  boxShadow: "0 8px 28px rgba(212,175,55,0.3)",
                }}
              >
                <Film className="w-4 h-4" /> Book Tickets
              </button>
              <button
                onClick={() => navigate(`/movies/${activeHero.id}?playTrailer=true`)}
                className="px-8 py-3.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all hover:scale-105 backdrop-blur-sm"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(212,175,55,0.35)",
                  color: "#d4af37",
                }}
              >
                <Play className="w-4 h-4 fill-[#d4af37]" /> Watch Trailer
              </button>
            </div>
          </div>

          {/* SLIDE DOTS + ARROWS */}
          <div className="absolute right-6 bottom-14 z-20 flex flex-col items-end gap-3">
            {/* Dots */}
            <div className="flex gap-1.5">
              {Array.from({ length: Math.min(nowShowing.length, 3) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIdx(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === heroIdx ? 20 : 6,
                    height: 6,
                    background: i === heroIdx ? "#d4af37" : "rgba(255,255,255,0.2)",
                  }}
                />
              ))}
            </div>
            {/* Arrows */}
            <div className="flex gap-2">
              {[{ onClick: handlePrevHero, icon: <ChevronLeft className="w-4 h-4" /> }, { onClick: handleNextHero, icon: <ChevronRight className="w-4 h-4" /> }].map(
                ({ onClick, icon }, i) => (
                  <button
                    key={i}
                    onClick={onClick}
                    className="p-2 rounded-full transition-all hover:scale-110"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(212,175,55,0.2)",
                      color: "#fff",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.6)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.2)")}
                  >
                    {icon}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. CITY BAR ─────────────────────────────────────────────────── */}
      <div
        className="px-6 sm:px-16 py-3 flex items-center justify-between text-xs font-semibold font-inter"
        style={{
          background: "rgba(212,175,55,0.04)",
          borderTop: "1px solid rgba(212,175,55,0.1)",
          borderBottom: "1px solid rgba(212,175,55,0.1)",
        }}
      >
        <div className="flex items-center gap-2" style={{ color: "#d4af37" }}>
          <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: "8s" }} />
          <span>
            Showing for{" "}
            <strong className="text-white underline decoration-[#d4af37] underline-offset-2">
              {selectedCity.name}
            </strong>
          </span>
        </div>
        <span className="text-neutral-700 hidden md:inline tracking-widest text-[10px] uppercase">
          Location persisted
        </span>
      </div>

      {/* ── HERO TAGLINE ────────────────────────────────────────────────── */}
      <div className="text-center pt-16 pb-10 px-6">
        <h2
          className="text-4xl md:text-5xl font-black leading-tight tracking-tight"
          style={{
            background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Plan Movie Nights<br />
          <span style={{ color: "#d4af37", WebkitTextFillColor: "#d4af37" }}>Together</span>
        </h2>
        <p className="text-neutral-600 mt-4 max-w-md mx-auto font-inter text-sm leading-relaxed">
          Decide, coordinate, and book cinema tickets with your crew — all in one place.
        </p>
      </div>

      {/* ── 3. NOW SHOWING ──────────────────────────────────────────────── */}
      <div className="px-6 sm:px-16 pb-16">
        <SectionHeading icon={<Film className="w-4 h-4" style={{ color: "#d4af37" }} />} label="Now Showing" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5">
          {nowShowing.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              badge={
                <div
                  className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-black"
                  style={{ background: "rgba(0,0,0,0.75)", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37" }}
                >
                  <Star className="w-2.5 h-2.5 fill-[#d4af37]" /> {movie.ratingValue}
                </div>
              }
              subtitle={`${movie.language} · ${movie.genre.split("/")[0]}`}
              meta={`${movie.durationMins} min`}
              onClick={() => navigate(`/movies/${movie.id}`)}
              accentColor="#d4af37"
            />
          ))}
        </div>
      </div>

      {/* ── 4. COMING SOON ──────────────────────────────────────────────── */}
      <div className="px-6 sm:px-16 pb-16">
        <SectionHeading
          icon={<Calendar className="w-4 h-4" style={{ color: "#6ee7e7" }} />}
          label="Coming Soon"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5">
          {comingSoon.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              badge={
                <div
                  className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
                  style={{ background: "rgba(110,231,231,0.15)", border: "1px solid rgba(110,231,231,0.3)", color: "#6ee7e7" }}
                >
                  Soon
                </div>
              }
              subtitle={`${movie.language} · ${movie.genre.split("/")[0]}`}
              meta={`Release: ${movie.releaseDate}`}
              onClick={() => navigate(`/movies/${movie.id}`)}
              accentColor="#6ee7e7"
            />
          ))}
        </div>
      </div>

      {/* ── 5. POPULAR THEATRES ─────────────────────────────────────────── */}
      <div className="px-6 sm:px-16">
        <div
          className="rounded-2xl p-8 relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #101010 0%, #0c0c0c 100%)",
            border: "1px solid rgba(212,175,55,0.12)",
          }}
        >
          {/* TOP GOLD LINE */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.4) 30%, rgba(212,175,55,0.4) 70%, transparent)" }}
          />

          <SectionHeading icon={<Compass className="w-4 h-4" style={{ color: "#d4af37" }} />} label={`Theatres in ${selectedCity.name}`} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {theatres.length > 0 ? (
              theatres.map((theatre) => (
                <div
                  key={theatre.id}
                  className="p-5 rounded-xl flex items-start gap-3 transition-all hover:-translate-y-0.5 group"
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)")}
                >
                  <div
                    className="p-2.5 rounded-lg flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.15)" }}
                  >
                    <Film className="w-4 h-4" style={{ color: "#d4af37" }} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white group-hover:text-[#d4af37] transition-colors">{theatre.name}</h4>
                    <p className="text-xs text-neutral-600 font-inter mt-1 leading-relaxed">{theatre.address}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-700 col-span-3 text-center py-8 font-inter">
                No theatres found for this location.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MOVIE CARD ───────────────────────────────────────────────────────────────
const MovieCard: React.FC<{
  movie: Movie;
  badge: React.ReactNode;
  subtitle: string;
  meta: string;
  onClick: () => void;
  accentColor: string;
}> = ({ movie, badge, subtitle, meta, onClick, accentColor }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) setImgLoaded(true);
  }, []);

  return (
    <div
      className="group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5"
      style={{
        background: "#101010",
        border: "1px solid rgba(255,255,255,0.04)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${accentColor}55`;
        e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.5)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
      }}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-neutral-900">
        {!imgLoaded && <div className="absolute inset-0 shimmer" />}
        <img
          ref={imgRef}
          src={getImageUrl(movie.posterUrl)}
          alt={movie.title}
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover object-center transition-all duration-500 group-hover:scale-110 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
        />
        {/* HOVER GRADIENT */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {/* BADGE */}
        <div className="absolute top-2 right-2">{badge}</div>
      </div>

      <div className="p-3.5">
        <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: accentColor }}>
          {subtitle}
        </span>
        <h3 className="font-black text-sm mt-1.5 text-white group-hover:text-[#d4af37] transition-colors leading-snug line-clamp-2">
          {movie.title}
        </h3>
        <p className="text-[9px] text-neutral-700 font-inter mt-1.5">{meta}</p>
      </div>
    </div>
  );
};
