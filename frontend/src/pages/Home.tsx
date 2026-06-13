import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCityStore } from "../store/useCityStore.js";
import { Play, Calendar, Star, Film, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
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

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-8">
    <p className="text-[10px] font-semibold tracking-[0.28em] uppercase mb-3 font-inter"
       style={{ color: "rgba(255,255,255,0.28)" }}>
      {children}
    </p>
    <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
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

  const heroCount = Math.min(nowShowing.length, 3);
  const activeHero = nowShowing[heroIdx];
  const handleNextHero = () => setHeroIdx((prev) => (prev + 1) % heroCount);
  const handlePrevHero = () => setHeroIdx((prev) => (prev - 1 + heroCount) % heroCount);

  return (
    <div style={{ background: "#080808", color: "#f0ebe0" }} className="min-h-screen pb-24 font-inter">

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      {activeHero && (
        <div className="relative h-[88vh] w-full overflow-hidden flex items-end">
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
            style={{
              backgroundImage: `url(${getImageUrl(activeHero.backdropUrl || activeHero.posterUrl)})`,
              filter: "brightness(0.28) saturate(0.9)",
              transform: "scale(1.04)",
            }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #080808 0%, rgba(8,8,8,0.75) 45%, rgba(8,8,8,0.05) 100%)" }} />
          <div className="absolute inset-0 hidden md:block" style={{ background: "linear-gradient(to right, #080808 0%, rgba(8,8,8,0.55) 42%, transparent 100%)" }} />

          <div className="relative z-10 px-6 sm:px-16 pb-16 w-full max-w-3xl">
            <div className="mb-4">
              <span
                className="text-[9px] font-bold tracking-[0.22em] uppercase px-2.5 py-1"
                style={{ background: "#c9a84c", color: "#000", borderRadius: 3 }}
              >
                Now Showing
              </span>
            </div>

            <h1
              className="text-5xl md:text-7xl font-black text-white leading-none mb-4"
              style={{ fontFamily: "'Playfair Display', serif", textShadow: "0 2px 24px rgba(0,0,0,0.7)" }}
            >
              {activeHero.title}
            </h1>

            <p className="text-sm max-w-lg mb-5 leading-relaxed hidden sm:block line-clamp-2"
               style={{ color: "rgba(240,235,224,0.55)" }}>
              {activeHero.description}
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-7">
              {[activeHero.language, activeHero.genre.split("/")[0]].map((tag) => (
                <span key={tag} className="px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.45)", borderRadius: 3 }}>
                  {tag}
                </span>
              ))}
              <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#c9a84c" }}>
                <Star className="w-3.5 h-3.5 fill-[#c9a84c]" /> {activeHero.ratingValue}
              </span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>{activeHero.durationMins} min</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate(`/movies/${activeHero.id}`)}
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-85"
                style={{ background: "#c9a84c", color: "#000", borderRadius: 6 }}
              >
                <Film className="w-4 h-4" /> Book Tickets
              </button>
              <button
                onClick={() => navigate(`/movies/${activeHero.id}?playTrailer=true`)}
                className="flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.7)",
                  borderRadius: 6,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)"; e.currentTarget.style.color = "rgba(255,255,255,0.9)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
              >
                <Play className="w-4 h-4" /> Trailer
              </button>
            </div>
          </div>

          {/* Slide controls */}
          <div className="absolute right-6 bottom-12 z-20 flex flex-col items-end gap-3">
            <div className="flex gap-1.5">
              {Array.from({ length: heroCount }).map((_, i) => (
                <button key={i} onClick={() => setHeroIdx(i)}
                  className="transition-all"
                  style={{
                    width: i === heroIdx ? 22 : 5, height: 5,
                    background: i === heroIdx ? "#c9a84c" : "rgba(255,255,255,0.18)",
                    borderRadius: 2,
                  }}
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              {[{ fn: handlePrevHero, icon: <ChevronLeft className="w-4 h-4" /> }, { fn: handleNextHero, icon: <ChevronRight className="w-4 h-4" /> }].map(({ fn, icon }, i) => (
                <button key={i} onClick={fn}
                  className="p-2 transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, color: "rgba(255,255,255,0.7)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CITY STRIP ───────────────────────────────────────────────── */}
      <div className="px-6 sm:px-16 py-2.5 flex items-center gap-2 text-xs font-inter"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)" }}>
        <MapPin className="w-3.5 h-3.5" style={{ color: "#c9a84c" }} />
        <span>Showing for <strong className="text-white font-medium">{selectedCity.name}</strong></span>
      </div>

      {/* ── NOW SHOWING ──────────────────────────────────────────────── */}
      <div className="px-6 sm:px-16 pt-16 pb-14">
        <SectionLabel>Now Showing</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {nowShowing.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              badge={
                <span className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c", borderRadius: 3 }}>
                  <Star className="w-2.5 h-2.5 fill-[#c9a84c]" /> {movie.ratingValue}
                </span>
              }
              onClick={() => navigate(`/movies/${movie.id}`)}
            />
          ))}
        </div>
      </div>

      {/* ── COMING SOON ──────────────────────────────────────────────── */}
      {comingSoon.length > 0 && (
        <div className="px-6 sm:px-16 pb-14">
          <SectionLabel>Coming Soon</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {comingSoon.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                badge={
                  <span className="px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", borderRadius: 3 }}>
                    Soon
                  </span>
                }
                onClick={() => navigate(`/movies/${movie.id}`)}
                muted
              />
            ))}
          </div>
        </div>
      )}

      {/* ── THEATRES ─────────────────────────────────────────────────── */}
      <div className="px-6 sm:px-16 pb-10">
        <div className="p-8 rounded-lg" style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.05)" }}>
          <SectionLabel>Theatres in {selectedCity.name}</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {theatres.length > 0 ? theatres.map((t) => (
              <div key={t.id} className="p-4 rounded-md flex items-start gap-3 transition-all"
                style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; }}
              >
                <div className="p-2 rounded flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.12)" }}>
                  <Film className="w-3.5 h-3.5" style={{ color: "#c9a84c" }} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white">{t.name}</h4>
                  <p className="text-xs mt-1 font-inter leading-relaxed" style={{ color: "rgba(255,255,255,0.28)" }}>{t.address}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm col-span-3 text-center py-8 font-inter" style={{ color: "rgba(255,255,255,0.2)" }}>
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
  onClick: () => void;
  muted?: boolean;
}> = ({ movie, badge, onClick, muted }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) setImgLoaded(true);
  }, []);

  return (
    <div
      className="group cursor-pointer overflow-hidden transition-all duration-300"
      style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, transform: "translateY(0)" }}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(201,168,76,0.22)";
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
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
          className={`w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          style={{ filter: muted ? "saturate(0.7) brightness(0.85)" : undefined }}
        />
        <div className="absolute top-2 right-2">{badge}</div>
      </div>

      <div className="p-3">
        <p className="text-[9px] font-medium tracking-widest uppercase mb-1.5 font-inter"
           style={{ color: "rgba(255,255,255,0.25)" }}>
          {movie.language.split(",")[0].trim()} · {movie.genre.split("/")[0]}
        </p>
        <h3
          className="text-sm font-bold leading-snug line-clamp-2 transition-colors group-hover:text-[#c9a84c]"
          style={{ fontFamily: "'Playfair Display', serif", color: "rgba(255,255,255,0.9)" }}
        >
          {movie.title}
        </h3>
        <p className="text-[9px] mt-1.5 font-inter" style={{ color: "rgba(255,255,255,0.2)" }}>
          {movie.isNowShowing ? `${movie.durationMins} min` : `Release: ${movie.releaseDate}`}
        </p>
      </div>
    </div>
  );
};
