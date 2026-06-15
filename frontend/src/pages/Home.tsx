import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCityStore } from "../store/useCityStore.js";
import { CitySelectorModal } from "../components/CitySelectorModal.js";
import { Play, Calendar, Star, Film, ChevronLeft, ChevronRight, Compass, ChevronDown, Moon, ArrowRight, Flame } from "lucide-react";
import api from "../services/api.js";

interface Movie {
  id: number; title: string; description: string;
  genre: string; language: string; durationMins: number;
  rating: string; ratingValue: string; releaseDate: string;
  trailerUrl?: string; posterUrl: string; backdropUrl?: string;
  isNowShowing: boolean; trending: boolean; topRated: boolean;
}
interface Theatre { id: number; name: string; cityId: number; address: string; }

const getImageUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
};

const HOME_STYLES = `
  @keyframes heroFadeIn { from{opacity:0;transform:scale(1.05)} to{opacity:1;transform:scale(1)} }
  @keyframes contentSlideUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
  @keyframes cardEnter { from{opacity:0;transform:translateY(18px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes posterFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  @keyframes shimmerGold { 0%{background-position:200% center} 100%{background-position:-200% center} }
  @keyframes pillFade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

  /* ── Movie Card ── */
  .movie-card {
    cursor: pointer; border-radius: 13px; overflow: hidden;
    background: #0f0f0f; border: 1px solid rgba(255,255,255,0.05);
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    transition: transform 0.42s cubic-bezier(0.22,1,0.36,1), border-color 0.42s ease, box-shadow 0.42s ease;
  }
  .movie-card:hover {
    transform: translateY(-14px) scale(1.028);
    border-color: rgba(201,168,76,0.45);
    box-shadow: 0 40px 90px rgba(0,0,0,0.9), 0 0 0 1px rgba(201,168,76,0.1), 0 0 70px rgba(201,168,76,0.06);
  }
  .movie-card .card-img-wrap { overflow: hidden; position: relative; }
  .movie-card .card-poster-img {
    width:100%; height:100%; object-fit:cover; display:block;
    transition: transform 0.6s cubic-bezier(0.22,1,0.36,1);
  }
  .movie-card:hover .card-poster-img { transform: scale(1.08); }
  .movie-card .card-hover-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 40%, transparent 72%);
    opacity: 0; transition: opacity 0.38s ease;
    display: flex; align-items: flex-end; padding: 14px 12px;
  }
  .movie-card:hover .card-hover-overlay { opacity: 1; }
  .movie-card .card-book-cta {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 7px 16px; background: linear-gradient(135deg, #C9A84C, #E8C96A);
    border-radius: 6px; color: #000; font-size: 0.72rem; font-weight: 800;
    letter-spacing: 0.04em; font-family: 'Poppins', sans-serif;
    transform: translateY(10px); opacity: 0;
    transition: transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.28s ease;
    white-space: nowrap;
  }
  .movie-card:hover .card-book-cta { transform: translateY(0); opacity: 1; }
  .movie-card .card-title-text { transition: color 0.28s ease; }
  .movie-card:hover .card-title-text { color: #E8C96A !important; }

  /* ── Trending Card ── */
  .trending-card {
    cursor: pointer; border-radius: 14px; overflow: hidden; flex-shrink: 0;
    background: #0f0f0f; border: 1px solid rgba(255,255,255,0.05);
    transition: transform 0.38s cubic-bezier(0.22,1,0.36,1), border-color 0.38s ease, box-shadow 0.38s ease;
  }
  .trending-card:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: rgba(201,168,76,0.4);
    box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(201,168,76,0.06);
  }
  .h-scroll::-webkit-scrollbar { display: none; }

  /* ── Genre Pills ── */
  .genre-pill {
    padding: 6px 16px; border-radius: 100px; white-space: nowrap; flex-shrink: 0;
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
    color: #555; font-size: 0.74rem; font-weight: 600; cursor: pointer;
    font-family: 'Poppins', sans-serif;
    transition: all 0.22s ease;
  }
  .genre-pill:hover { background: rgba(201,168,76,0.07); border-color: rgba(201,168,76,0.25); color: #C9A84C; }
  .genre-pill.gp-active { background: rgba(201,168,76,0.12); border-color: rgba(201,168,76,0.4); color: #C9A84C; font-weight: 700; }

  /* ── Theatre Card ── */
  .theatre-card {
    transition: border-color 0.25s ease, background 0.25s ease, transform 0.25s ease;
  }
  .theatre-card:hover {
    border-color: rgba(201,168,76,0.28) !important;
    background: rgba(201,168,76,0.03) !important;
    transform: translateX(3px);
  }
`;

const SkeletonCard = () => (
  <div style={{ borderRadius: 13, overflow: "hidden", background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.05)" }}>
    <div className="shimmer" style={{ aspectRatio: "2/3", width: "100%" }} />
    <div style={{ padding: "10px 12px 14px" }}>
      <div className="shimmer" style={{ height: 14, borderRadius: 4, marginBottom: 8 }} />
      <div className="shimmer" style={{ height: 10, borderRadius: 4, width: "60%" }} />
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
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [genreFilter, setGenreFilter] = useState<string>("");

  useEffect(() => {
    setHeroLoaded(false);
    setHeroIdx(0);
    setLoadingMovies(true);
    setGenreFilter("");
    Promise.all([
      api.get(`/movies?isNowShowing=true${selectedCity.slug ? `&citySlug=${selectedCity.slug}` : ""}`).then(r => setNowShowing(r.data.movies)).catch(() => {}),
      api.get("/movies?isNowShowing=false").then(r => setComingSoon(r.data.movies)).catch(() => {}),
      api.get(`/theatres${selectedCity.slug ? `?citySlug=${selectedCity.slug}` : ""}`).then(r => setTheatres(r.data.theatres)).catch(() => {}),
    ]).finally(() => { setLoadingMovies(false); setHeroLoaded(true); });
  }, [selectedCity]);

  useEffect(() => {
    if (!nowShowing.length) return;
    const t = setInterval(() => setHeroIdx(p => (p + 1) % Math.min(nowShowing.length, 5)), 6000);
    return () => clearInterval(t);
  }, [nowShowing]);

  const heroCount = Math.min(nowShowing.length, 5);
  const hero = nowShowing[heroIdx];

  const genres = useMemo(() => {
    const all = nowShowing.flatMap(m => m.genre.split("/").map(g => g.trim()).filter(Boolean));
    return Array.from(new Set(all)).slice(0, 8);
  }, [nowShowing]);

  const filteredNowShowing = useMemo(() => {
    if (!genreFilter) return nowShowing;
    return nowShowing.filter(m => m.genre.toLowerCase().includes(genreFilter.toLowerCase()));
  }, [nowShowing, genreFilter]);

  const trendingMovies = useMemo(() =>
    nowShowing.filter(m => m.trending || m.topRated).slice(0, 10),
    [nowShowing]
  );

  return (
    <div style={{ background: "#080808", color: "#f0f0f0", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <style>{HOME_STYLES}</style>

      {/* ── HERO ── */}
      {hero ? (
        <div style={{ position: "relative", height: "88vh", minHeight: 580, overflow: "hidden" }}>
          {/* Backdrop */}
          <div key={heroIdx} style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${getImageUrl(hero.backdropUrl || hero.posterUrl)})`,
            backgroundSize: "cover", backgroundPosition: "center top",
            filter: "brightness(0.32) saturate(1.3)",
            animation: "heroFadeIn 0.8s ease both",
          }} />

          {/* Gradients */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #080808 0%, rgba(8,8,8,0.92) 28%, rgba(8,8,8,0.1) 68%, transparent 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #080808 0%, rgba(8,8,8,0.82) 38%, rgba(8,8,8,0.12) 65%, transparent 100%)" }} />
          {/* Gold bottom hairline */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(to right, transparent, rgba(201,168,76,0.4) 30%, rgba(201,168,76,0.4) 70%, transparent)" }} />

          {/* Content */}
          <div key={`c-${heroIdx}`} style={{
            position: "absolute", inset: 0, zIndex: 10,
            display: "flex", alignItems: "flex-end",
            padding: "0 1.5rem 3rem",
            animation: "contentSlideUp 0.55s cubic-bezier(0.22,1,0.36,1) both",
          }}>
            <div style={{ width: "100%", maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32, padding: "0 1rem" }}>

              {/* LEFT: movie info */}
              <div style={{ maxWidth: 620, flex: 1 }}>
                {/* Badge */}
                <div style={{ marginBottom: 16 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "linear-gradient(135deg, #C9A84C, #E8C96A)", borderRadius: 5, fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#000", fontFamily: "'Poppins', sans-serif" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(0,0,0,0.35)", display: "inline-block" }} />
                    Now Showing
                  </span>
                </div>

                <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "clamp(2.4rem, 6vw, 4.6rem)", lineHeight: 1.02, color: "#fff", marginBottom: 14, textShadow: "0 4px 40px rgba(0,0,0,0.9)", letterSpacing: "-0.02em" }}>
                  {hero.title}
                </h1>

                <p style={{ color: "#777", fontSize: "0.875rem", maxWidth: 460, marginBottom: 18, lineHeight: 1.75, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {hero.description}
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 26, alignItems: "center" }}>
                  {[hero.language, hero.genre.split("/")[0]].map(t => (
                    <span key={t} style={{ padding: "3px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, fontSize: "0.68rem", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>{t}</span>
                  ))}
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#C9A84C", fontSize: "0.82rem", fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}>
                    <Star size={12} style={{ fill: "#C9A84C" }} /> {hero.ratingValue}
                  </span>
                  <span style={{ color: "#3a3a3a", fontSize: "0.75rem" }}>{hero.durationMins} min</span>
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
                  <button onClick={() => navigate(`/movies/${hero.id}`)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 26px", background: "linear-gradient(135deg, #C9A84C, #E8C96A)", borderRadius: 8, border: "none", color: "#000", fontSize: "0.875rem", fontWeight: 800, cursor: "pointer", fontFamily: "'Poppins', sans-serif", boxShadow: "0 8px 28px rgba(201,168,76,0.3)", transition: "transform 0.2s, box-shadow 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 14px 36px rgba(201,168,76,0.42)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(201,168,76,0.3)"; }}>
                    <Film size={15} /> Book Tickets
                  </button>
                  {hero.trailerUrl && (
                    <button onClick={() => navigate(`/movies/${hero.id}?playTrailer=true`)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", background: "rgba(255,255,255,0.05)", borderRadius: 8, border: "1px solid rgba(201,168,76,0.3)", color: "#C9A84C", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif", backdropFilter: "blur(8px)", transition: "all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.09)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)"; }}>
                      <Play size={14} style={{ fill: "#C9A84C" }} /> Watch Trailer
                    </button>
                  )}
                </div>

                {/* Slide controls */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {Array.from({ length: heroCount }).map((_, i) => (
                      <button key={i} onClick={() => setHeroIdx(i)}
                        style={{ height: 3, borderRadius: 999, border: "none", cursor: "pointer", width: i === heroIdx ? 22 : 5, background: i === heroIdx ? "#C9A84C" : "rgba(255,255,255,0.18)", transition: "all 0.3s" }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      { fn: () => setHeroIdx(p => (p - 1 + heroCount) % heroCount), icon: <ChevronLeft size={13} /> },
                      { fn: () => setHeroIdx(p => (p + 1) % heroCount), icon: <ChevronRight size={13} /> },
                    ].map(({ fn, icon }, i) => (
                      <button key={i} onClick={fn}
                        style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.6)"; e.currentTarget.style.background = "rgba(201,168,76,0.08)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.2)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}>
                        {icon}
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: "0.63rem", color: "#2e2e2e", fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>{heroIdx + 1} / {heroCount}</span>
                </div>
              </div>

              {/* RIGHT: 3D Poster Card (desktop only) */}
              <div className="hidden lg:block" style={{ flexShrink: 0, paddingBottom: "0.75rem" }}>
                <div style={{ position: "relative", display: "inline-block", animation: "posterFloat 5s ease-in-out infinite" }}>
                  {/* Glow behind */}
                  <div style={{ position: "absolute", inset: -50, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.2) 0%, transparent 65%)", pointerEvents: "none", zIndex: -1 }} />
                  {/* 3D card */}
                  <div style={{
                    width: 215, aspectRatio: "2/3", borderRadius: 18, overflow: "hidden",
                    transform: "perspective(1000px) rotateY(-10deg) rotateX(2deg)",
                    boxShadow: "35px 55px 100px rgba(0,0,0,0.97), 0 0 0 1px rgba(201,168,76,0.22), 0 0 0 4px rgba(8,8,8,0.7)",
                  }}>
                    <img src={getImageUrl(hero.posterUrl)} alt={hero.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    {/* Edge highlight */}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 50%)", pointerEvents: "none" }} />
                  </div>
                  {/* Rating badge */}
                  <div style={{
                    position: "absolute", bottom: -12, right: -16,
                    width: 54, height: 54, borderRadius: "50%",
                    background: "linear-gradient(135deg, #C9A84C, #E8C96A)",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 6px 22px rgba(201,168,76,0.55), 0 0 0 3px #080808",
                  }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "#000", lineHeight: 1 }}>{hero.ratingValue}</span>
                    <span style={{ fontSize: "0.47rem", color: "rgba(0,0,0,0.5)", fontWeight: 800, letterSpacing: "0.03em" }}>IMDb</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : (
        <div style={{ height: "88vh", minHeight: 580, background: "#0d0d0d" }} className="shimmer" />
      )}

      {/* ── CITY BAR ── */}
      <div style={{ padding: "0.65rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(201,168,76,0.025)", borderTop: "1px solid rgba(201,168,76,0.1)", borderBottom: "1px solid rgba(201,168,76,0.06)" }}>
        <button onClick={() => setCityModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 8, color: "#C9A84C", fontSize: "0.78rem", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <Compass size={13} style={{ animation: "spin 9s linear infinite" }} />
          <span style={{ color: "#555" }}>Showing for</span>
          <strong style={{ color: "#e8e8e8", borderBottom: "1px solid rgba(201,168,76,0.4)" }}>{selectedCity.name}</strong>
          <ChevronDown size={12} style={{ color: "#3a3a3a" }} />
        </button>
        <button onClick={() => navigate("/movie-nights")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.22)", borderRadius: 6, color: "#C9A84C", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins', sans-serif", letterSpacing: "0.04em", transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.15)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.08)"; }}>
          <Moon size={11} /> Plan a Movie Night
        </button>
      </div>

      {/* ── GENRE FILTER PILLS ── */}
      {!loadingMovies && genres.length > 0 && (
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.035)", background: "rgba(255,255,255,0.008)" }}>
          <div className="h-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0.65rem 1.5rem", scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <button className={`genre-pill${genreFilter === "" ? " gp-active" : ""}`} onClick={() => setGenreFilter("")}>All</button>
            {genres.map((g, i) => (
              <button
                key={g}
                className={`genre-pill${genreFilter === g ? " gp-active" : ""}`}
                onClick={() => setGenreFilter(g)}
                style={{ animation: `pillFade 0.3s ease ${i * 40}ms both` }}
              >{g}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── TRENDING HORIZONTAL SCROLL ── */}
      {!loadingMovies && trendingMovies.length > 0 && (
        <div style={{ paddingTop: "2.5rem" }}>
          <div style={{ padding: "0 1.5rem", marginBottom: 16 }}>
            <SectionHeading icon={<Flame size={14} color="#C9A84C" />} label="Trending Now" />
          </div>
          <div className="h-scroll" style={{ display: "flex", gap: 14, overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none", padding: "0.25rem 1.5rem 1.5rem" }}>
            {trendingMovies.map((m, i) => (
              <TrendingCard key={m.id} movie={m} delay={i * 50} onClick={() => navigate(`/movies/${m.id}`)} />
            ))}
          </div>
        </div>
      )}

      {/* ── NOW SHOWING ── */}
      <div style={{ padding: `${!loadingMovies && trendingMovies.length > 0 ? "1.5rem" : "3rem"} 1.5rem 2.5rem` }}>
        <SectionHeading
          icon={<Film size={14} color="#C9A84C" />}
          label="Now Showing"
          count={genreFilter && filteredNowShowing.length !== nowShowing.length ? `${filteredNowShowing.length} / ${nowShowing.length}` : nowShowing.length > 0 ? `${nowShowing.length}` : undefined}
        />
        {loadingMovies ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))", gap: 16 }}>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))", gap: 16 }}>
            {filteredNowShowing.length > 0 ? filteredNowShowing.map((m, i) => (
              <MovieCard key={m.id} movie={m} delay={i * 40}
                badge={<span style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 7px", background: "rgba(0,0,0,0.85)", border: "1px solid rgba(201,168,76,0.4)", borderRadius: 4, fontSize: "0.6rem", fontWeight: 800, color: "#C9A84C", fontFamily: "'Poppins', sans-serif" }}><Star size={8} style={{ fill: "#C9A84C" }} /> {m.ratingValue}</span>}
                meta={`${m.language} · ${m.durationMins}m`}
                onClick={() => navigate(`/movies/${m.id}`)}
              />
            )) : (
              <div style={{ gridColumn: "1/-1", padding: "3rem 0", textAlign: "center" }}>
                <p style={{ color: "#333", fontSize: "0.875rem", marginBottom: 12 }}>No {genreFilter} movies found.</p>
                <button onClick={() => setGenreFilter("")} style={{ padding: "6px 18px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.22)", borderRadius: 6, color: "#C9A84C", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>Show all genres</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MOVIE NIGHT PROMO BANNER ── */}
      <div style={{ padding: "0 1.5rem 3rem" }}>
        <div style={{ borderRadius: 20, overflow: "hidden", position: "relative", background: "linear-gradient(135deg, #0d0d0d 0%, #0c0b09 50%, #0d0d0d 100%)", border: "1px solid rgba(201,168,76,0.14)", padding: "2rem 2.5rem" }}>
          <div style={{ position: "absolute", top: "-50%", right: "-5%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 60%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "-60%", left: "15%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(192,132,252,0.04) 0%, transparent 60%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(to right, transparent, rgba(201,168,76,0.38) 30%, rgba(201,168,76,0.38) 70%, transparent)" }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 58, height: 58, borderRadius: 15, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.22)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Moon size={26} style={{ color: "#C9A84C" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: "0.58rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(201,168,76,0.5)", fontFamily: "'Poppins', sans-serif" }}>New Feature</span>
                  <span style={{ padding: "1px 7px", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.22)", borderRadius: 3, fontSize: "0.54rem", fontWeight: 800, color: "#C9A84C", letterSpacing: "0.06em" }}>AI-POWERED</span>
                </div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "1.3rem", color: "#f0f0f0", lineHeight: 1.1, marginBottom: 5 }}>Plan a Movie Night</h3>
                <p style={{ fontSize: "0.8rem", color: "#3e3e3e", lineHeight: 1.55, maxWidth: 380 }}>Invite friends, vote on movies together, split the cost, and book seats side by side.</p>
              </div>
            </div>
            <button onClick={() => navigate("/movie-nights")}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "linear-gradient(135deg, #C9A84C, #E8C96A)", borderRadius: 10, border: "none", color: "#000", fontSize: "0.85rem", fontWeight: 800, cursor: "pointer", fontFamily: "'Poppins', sans-serif", boxShadow: "0 8px 24px rgba(201,168,76,0.25)", transition: "transform 0.2s, box-shadow 0.2s", flexShrink: 0, whiteSpace: "nowrap" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 14px 32px rgba(201,168,76,0.38)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(201,168,76,0.25)"; }}>
              Start Planning <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── COMING SOON ── */}
      {(loadingMovies || comingSoon.length > 0) && (
        <div style={{ padding: "0 1.5rem 3rem" }}>
          <SectionHeading icon={<Calendar size={14} color="#666" />} label="Coming Soon" count={!loadingMovies && comingSoon.length > 0 ? `${comingSoon.length}` : undefined} />
          {loadingMovies && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))", gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
          {!loadingMovies && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))", gap: 16 }}>
              {comingSoon.map((m, i) => (
                <MovieCard key={m.id} movie={m} delay={i * 40}
                  badge={<span style={{ padding: "2px 7px", background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, fontSize: "0.6rem", fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Poppins', sans-serif" }}>Soon</span>}
                  meta={`Release: ${m.releaseDate}`}
                  onClick={() => navigate(`/movies/${m.id}`)}
                  muted
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── THEATRES ── */}
      <div style={{ padding: "0 1.5rem 4rem" }}>
        <div style={{ borderRadius: 18, padding: "2rem 2rem 1.75rem", background: "linear-gradient(160deg, #0f0f0f 0%, #0a0a0a 100%)", border: "1px solid rgba(201,168,76,0.1)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(to right, transparent, rgba(201,168,76,0.38) 30%, rgba(201,168,76,0.38) 70%, transparent)" }} />
          <SectionHeading icon={<Compass size={14} color="#C9A84C" />} label={selectedCity.id === 0 ? "All Theatres" : `Theatres in ${selectedCity.name}`} count={theatres.length > 0 ? `${theatres.length}` : undefined} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {theatres.length > 0 ? theatres.map(t => (
              <div key={t.id} className="theatre-card" style={{ padding: "1rem 1.2rem", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Film size={14} color="#C9A84C" />
                </div>
                <div>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "0.83rem", color: "#f0f0f0", marginBottom: 3 }}>{t.name}</p>
                  <p style={{ fontSize: "0.73rem", color: "#3e3e3e", lineHeight: 1.5 }}>{t.address}</p>
                </div>
              </div>
            )) : (
              <p style={{ color: "#2e2e2e", fontSize: "0.83rem", padding: "1rem 0" }}>No theatres found{selectedCity.id !== 0 ? ` for ${selectedCity.name}` : ""}.</p>
            )}
          </div>
        </div>
      </div>

      <CitySelectorModal isOpen={cityModalOpen} onClose={() => setCityModalOpen(false)} />
    </div>
  );
};

/* ── Section Heading ── */
const SectionHeading: React.FC<{ icon: React.ReactNode; label: string; count?: string }> = ({ icon, label, count }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
    <div style={{ width: 3, height: 18, background: "#C9A84C", borderRadius: 2, flexShrink: 0 }} />
    {icon}
    <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: "0.9rem", color: "#e8e8e8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</h2>
    {count !== undefined && (
      <span style={{ padding: "2px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 4, fontSize: "0.65rem", fontWeight: 700, color: "#3a3a3a", fontFamily: "'Poppins', sans-serif" }}>{count}</span>
    )}
  </div>
);

/* ── Trending Card ── */
const TrendingCard: React.FC<{ movie: Movie; delay: number; onClick: () => void }> = ({ movie, delay, onClick }) => (
  <div
    className="trending-card"
    onClick={onClick}
    style={{ width: 264, animation: `cardEnter 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
  >
    <div style={{ position: "relative", aspectRatio: "16/9", background: "#171717" }}>
      <img
        src={getImageUrl(movie.backdropUrl || movie.posterUrl)}
        alt={movie.title}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        loading="lazy"
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.2) 55%, transparent 100%)" }} />
      <div style={{ position: "absolute", bottom: 10, left: 10, right: 10 }}>
        <h4 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "0.9rem", color: "#fff", lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{movie.title}</h4>
      </div>
      <div style={{ position: "absolute", top: 8, right: 8, display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", background: "rgba(0,0,0,0.8)", border: "1px solid rgba(201,168,76,0.4)", borderRadius: 4, fontSize: "0.58rem", fontWeight: 800, color: "#C9A84C" }}>
        <Star size={7} style={{ fill: "#C9A84C" }} /> {movie.ratingValue}
      </div>
      {(movie.trending || movie.topRated) && (
        <div style={{ position: "absolute", top: 8, left: 8, padding: "2px 7px", background: "linear-gradient(135deg, #C9A84C, #E8C96A)", borderRadius: 4, fontSize: "0.57rem", fontWeight: 800, color: "#000", letterSpacing: "0.05em" }}>
          {movie.trending ? "🔥 TRENDING" : "⭐ TOP RATED"}
        </div>
      )}
    </div>
    <div style={{ padding: "9px 12px 11px" }}>
      <span style={{ fontSize: "0.65rem", color: "#C9A84C", fontWeight: 700, fontFamily: "'Poppins', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>{movie.genre.split("/")[0]}</span>
      <p style={{ fontSize: "0.68rem", color: "#3e3e3e", marginTop: 2, fontFamily: "'Inter', sans-serif" }}>{movie.language} · {movie.durationMins}m</p>
    </div>
  </div>
);

/* ── Movie Card ── */
const MovieCard: React.FC<{
  movie: Movie; badge: React.ReactNode; meta: string;
  onClick: () => void; delay?: number; muted?: boolean;
}> = ({ movie, badge, meta, onClick, delay = 0, muted }) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => { if (imgRef.current?.complete) setLoaded(true); }, []);

  return (
    <div className="movie-card" onClick={onClick} style={{ animation: `cardEnter 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
      <div className="card-img-wrap" style={{ aspectRatio: "2/3", background: "#171717" }}>
        {!loaded && <div className="shimmer" style={{ position: "absolute", inset: 0 }} />}
        <img
          ref={imgRef} src={getImageUrl(movie.posterUrl)} alt={movie.title} loading="lazy"
          onLoad={() => setLoaded(true)} className="card-poster-img"
          style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.4s ease" }}
        />
        <div className="card-hover-overlay">
          <span className="card-book-cta">{muted ? "Details" : "Book Now"} <ArrowRight size={10} /></span>
        </div>
        <div style={{ position: "absolute", top: 7, right: 7 }}>{badge}</div>
      </div>
      <div style={{ padding: "10px 11px 14px" }}>
        <p style={{ fontSize: "0.67rem", fontWeight: 700, color: muted ? "#3a3a3a" : "#C9A84C", fontFamily: "'Poppins', sans-serif", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {movie.genre.split("/")[0]}
        </p>
        <h3 className="card-title-text" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "0.85rem", color: "#f0f0f0", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {movie.title}
        </h3>
        <p style={{ fontSize: "0.65rem", color: "#333", marginTop: 5, fontFamily: "'Inter', sans-serif" }}>{meta}</p>
      </div>
    </div>
  );
};
