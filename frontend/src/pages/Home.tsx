import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCityStore } from "../store/useCityStore.js";
import { CitySelectorModal } from "../components/CitySelectorModal.js";
import { Play, Calendar, Star, Film, ChevronLeft, ChevronRight, Compass, ChevronDown, Moon, ArrowRight } from "lucide-react";
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
  @keyframes heroFadeIn { from{opacity:0;transform:scale(1.04)} to{opacity:1;transform:scale(1)} }
  @keyframes contentSlideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }

  /* ── Movie Card Hover ── */
  .movie-card {
    cursor: pointer; border-radius: 12px; overflow: hidden;
    background: #0f0f0f; border: 1px solid rgba(255,255,255,0.05);
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    transition: transform 0.42s cubic-bezier(0.22,1,0.36,1),
                border-color 0.42s ease,
                box-shadow 0.42s ease;
  }
  .movie-card:hover {
    transform: translateY(-12px) scale(1.025);
    border-color: rgba(201,168,76,0.5);
    box-shadow: 0 32px 80px rgba(0,0,0,0.85),
                0 0 0 1px rgba(201,168,76,0.12),
                0 0 60px rgba(201,168,76,0.07);
  }
  .movie-card .card-img-wrap { overflow: hidden; position: relative; }
  .movie-card .card-poster-img {
    width:100%; height:100%; object-fit:cover; display:block;
    transition: transform 0.6s cubic-bezier(0.22,1,0.36,1);
  }
  .movie-card:hover .card-poster-img { transform: scale(1.1); }
  .movie-card .card-hover-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 40%, transparent 72%);
    opacity: 0;
    transition: opacity 0.38s ease;
    display: flex; align-items: flex-end; padding: 14px 12px;
  }
  .movie-card:hover .card-hover-overlay { opacity: 1; }
  .movie-card .card-book-cta {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 7px 16px;
    background: linear-gradient(135deg, #C9A84C, #E8C96A);
    border-radius: 6px; color: #000;
    font-size: 0.72rem; font-weight: 800; letter-spacing: 0.04em;
    font-family: 'Poppins', sans-serif;
    transform: translateY(10px); opacity: 0;
    transition: transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.28s ease;
    white-space: nowrap;
  }
  .movie-card:hover .card-book-cta { transform: translateY(0); opacity: 1; }
  .movie-card .card-title-text { transition: color 0.28s ease; }
  .movie-card:hover .card-title-text { color: #E8C96A !important; }

  /* ── Theatre Card Hover ── */
  .theatre-card {
    transition: border-color 0.25s ease, background 0.25s ease, transform 0.25s ease;
  }
  .theatre-card:hover {
    border-color: rgba(201,168,76,0.28) !important;
    background: rgba(201,168,76,0.03) !important;
    transform: translateX(3px);
  }
`;

export const Home: React.FC = () => {
  const { selectedCity } = useCityStore();
  const navigate = useNavigate();
  const [nowShowing, setNowShowing] = useState<Movie[]>([]);
  const [comingSoon, setComingSoon] = useState<Movie[]>([]);
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);

  useEffect(() => {
    setHeroLoaded(false);
    setHeroIdx(0);
    api.get(`/movies?isNowShowing=true&citySlug=${selectedCity.slug}`).then(r => { setNowShowing(r.data.movies); setHeroLoaded(true); }).catch(() => {});
    api.get("/movies?isNowShowing=false").then(r => setComingSoon(r.data.movies)).catch(() => {});
    api.get(`/theatres?citySlug=${selectedCity.slug}`).then(r => setTheatres(r.data.theatres)).catch(() => {});
  }, [selectedCity]);

  useEffect(() => {
    if (!nowShowing.length) return;
    const t = setInterval(() => setHeroIdx(p => (p + 1) % Math.min(nowShowing.length, 4)), 6000);
    return () => clearInterval(t);
  }, [nowShowing]);

  const heroCount = Math.min(nowShowing.length, 4);
  const hero = nowShowing[heroIdx];

  return (
    <div style={{ background: "#080808", color: "#f0f0f0", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <style>{HOME_STYLES}</style>

      {/* ── HERO ── */}
      {hero ? (
        <div style={{ position: "relative", height: "88vh", minHeight: 560, overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
          <div key={heroIdx} style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${getImageUrl(hero.backdropUrl || hero.posterUrl)})`,
            backgroundSize: "cover", backgroundPosition: "center top",
            filter: "brightness(0.28) saturate(1.2)",
            animation: "heroFadeIn 0.8s ease both",
          }} />

          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, #080808 0%, rgba(8,8,8,0.9) 35%, rgba(8,8,8,0.2) 70%, transparent 100%)" }} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right, #080808 0%, rgba(8,8,8,0.65) 40%, transparent 100%)", display:"none" }} className="sm:block" />
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, background:"linear-gradient(to right, transparent, rgba(201,168,76,0.35) 30%, rgba(201,168,76,0.35) 70%, transparent)" }} />

          <div key={`content-${heroIdx}`} style={{ position:"relative", zIndex:10, padding:"0 1.5rem 3.5rem", width:"100%", maxWidth:860, animation:"contentSlideUp 0.6s cubic-bezier(0.22,1,0.36,1) both" }} className="sm:px-16">
            <div style={{ marginBottom:16 }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"3px 12px", background:"linear-gradient(135deg, #C9A84C, #E8C96A)", borderRadius:4, fontSize:"0.6rem", fontWeight:800, letterSpacing:"0.18em", textTransform:"uppercase", color:"#000", fontFamily:"'Poppins', sans-serif" }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:"rgba(0,0,0,0.4)", display:"inline-block" }} />
                Now Showing
              </span>
            </div>

            <h1 style={{ fontFamily:"'Playfair Display', serif", fontWeight:900, fontSize:"clamp(2.2rem, 6vw, 4.2rem)", lineHeight:1.05, color:"#fff", marginBottom:14, textShadow:"0 4px 40px rgba(0,0,0,0.8)" }}>
              {hero.title}
            </h1>

            <p style={{ color:"#888", fontSize:"0.875rem", maxWidth:480, marginBottom:18, lineHeight:1.7 }} className="hidden sm:block line-clamp-2">
              {hero.description}
            </p>

            <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:26, alignItems:"center" }}>
              {[hero.language, hero.genre.split("/")[0]].map(t => (
                <span key={t} style={{ padding:"2px 9px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:3, fontSize:"0.68rem", fontWeight:600, color:"#888", textTransform:"uppercase", letterSpacing:"0.1em" }}>{t}</span>
              ))}
              <span style={{ display:"flex", alignItems:"center", gap:3, color:"#C9A84C", fontSize:"0.8rem", fontWeight:700, fontFamily:"'Poppins', sans-serif" }}>
                <Star size={12} style={{ fill:"#C9A84C" }} /> {hero.ratingValue}
              </span>
              <span style={{ color:"#444", fontSize:"0.75rem" }}>{hero.durationMins} min</span>
            </div>

            <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
              <button onClick={() => navigate(`/movies/${hero.id}`)} style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 24px", background:"linear-gradient(135deg, #C9A84C, #E8C96A)", borderRadius:7, border:"none", color:"#000", fontSize:"0.85rem", fontWeight:700, cursor:"pointer", fontFamily:"'Poppins', sans-serif", boxShadow:"0 8px 28px rgba(201,168,76,0.25)", transition:"opacity 0.2s, transform 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity="0.88"; e.currentTarget.style.transform="translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="translateY(0)"; }}>
                <Film size={14} /> Book Tickets
              </button>
              {hero.trailerUrl && (
                <button onClick={() => navigate(`/movies/${hero.id}?playTrailer=true`)} style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 24px", background:"rgba(255,255,255,0.05)", borderRadius:7, border:"1px solid rgba(201,168,76,0.3)", color:"#C9A84C", fontSize:"0.85rem", fontWeight:600, cursor:"pointer", fontFamily:"'Poppins', sans-serif", backdropFilter:"blur(8px)", transition:"all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background="rgba(201,168,76,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.05)"; }}>
                  <Play size={14} style={{ fill:"#C9A84C" }} /> Watch Trailer
                </button>
              )}
            </div>
          </div>

          {/* Slide controls */}
          <div style={{ position:"absolute", right:20, bottom:48, zIndex:20, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10 }}>
            <div style={{ display:"flex", gap:5 }}>
              {Array.from({ length: heroCount }).map((_, i) => (
                <button key={i} onClick={() => setHeroIdx(i)} style={{ height:3, borderRadius:999, border:"none", cursor:"pointer", width: i === heroIdx ? 20 : 5, background: i === heroIdx ? "#C9A84C" : "rgba(255,255,255,0.2)", transition:"all 0.3s" }} />
              ))}
            </div>
            <div style={{ display:"flex", gap:7 }}>
              {[
                { fn: () => setHeroIdx(p => (p - 1 + heroCount) % heroCount), icon: <ChevronLeft size={14} /> },
                { fn: () => setHeroIdx(p => (p + 1) % heroCount), icon: <ChevronRight size={14} /> },
              ].map(({ fn, icon }, i) => (
                <button key={i} onClick={fn} style={{ width:30, height:30, borderRadius:"50%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(201,168,76,0.2)", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(201,168,76,0.6)"; e.currentTarget.style.background="rgba(201,168,76,0.06)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(201,168,76,0.2)"; e.currentTarget.style.background="rgba(255,255,255,0.04)"; }}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ height:"88vh", minHeight:560, background:"#0d0d0d" }} className="shimmer" />
      )}

      {/* ── CITY BAR ── */}
      <div style={{ padding:"0.6rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(201,168,76,0.03)", borderTop:"1px solid rgba(201,168,76,0.08)", borderBottom:"1px solid rgba(201,168,76,0.08)" }} className="sm:px-16">
        <button onClick={() => setCityModalOpen(true)} style={{ display:"flex", alignItems:"center", gap:8, color:"#C9A84C", fontSize:"0.78rem", fontWeight:500, background:"none", border:"none", cursor:"pointer", padding:0 }}>
          <Compass size={13} style={{ animation:"spin 8s linear infinite" }} />
          <span style={{ color:"#888" }}>Showing for</span>
          <strong style={{ color:"#f0f0f0", borderBottom:"1px solid rgba(201,168,76,0.5)" }}>{selectedCity.name}</strong>
          <ChevronDown size={12} style={{ color:"#555" }} />
        </button>
        <button onClick={() => navigate("/movie-nights")} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 12px", background:"rgba(201,168,76,0.07)", border:"1px solid rgba(201,168,76,0.2)", borderRadius:5, color:"#C9A84C", fontSize:"0.72rem", fontWeight:700, cursor:"pointer", fontFamily:"'Poppins', sans-serif", letterSpacing:"0.05em", transition:"all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.background="rgba(201,168,76,0.14)"; }}
          onMouseLeave={e => { e.currentTarget.style.background="rgba(201,168,76,0.07)"; }}>
          <Moon size={11} /> Plan a Movie Night
        </button>
      </div>

      {/* ── NOW SHOWING ── */}
      <div style={{ padding:"3rem 1.5rem 2.5rem" }} className="sm:px-16">
        <SectionHeading icon={<Film size={14} color="#C9A84C" />} label="Now Showing" />
        {nowShowing.length === 0 && !heroLoaded ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:16 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ borderRadius:12, overflow:"hidden" }}>
                <div className="shimmer" style={{ aspectRatio:"2/3", borderRadius:12 }} />
                <div className="shimmer" style={{ height:12, borderRadius:4, marginTop:8, width:"80%" }} />
                <div className="shimmer" style={{ height:10, borderRadius:4, marginTop:5, width:"55%" }} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:16 }}>
            {nowShowing.map((m, i) => (
              <MovieCard key={m.id} movie={m} delay={i * 45}
                badge={
                  <span style={{ display:"flex", alignItems:"center", gap:3, padding:"2px 7px", background:"rgba(0,0,0,0.85)", border:"1px solid rgba(201,168,76,0.4)", borderRadius:4, fontSize:"0.6rem", fontWeight:800, color:"#C9A84C", fontFamily:"'Poppins', sans-serif" }}>
                    <Star size={8} style={{ fill:"#C9A84C" }} /> {m.ratingValue}
                  </span>
                }
                meta={`${m.language} · ${m.durationMins}m`}
                onClick={() => navigate(`/movies/${m.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── COMING SOON ── */}
      {comingSoon.length > 0 && (
        <div style={{ padding:"0 1.5rem 3rem" }} className="sm:px-16">
          <SectionHeading icon={<Calendar size={14} color="#888" />} label="Coming Soon" />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:16 }}>
            {comingSoon.map((m, i) => (
              <MovieCard key={m.id} movie={m} delay={i * 45}
                badge={
                  <span style={{ padding:"2px 7px", background:"rgba(0,0,0,0.85)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:4, fontSize:"0.6rem", fontWeight:800, color:"#888", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"'Poppins', sans-serif" }}>
                    Soon
                  </span>
                }
                meta={`Release: ${m.releaseDate}`}
                onClick={() => navigate(`/movies/${m.id}`)}
                muted
              />
            ))}
          </div>
        </div>
      )}

      {/* ── THEATRES ── */}
      <div style={{ padding:"0 1.5rem 4rem" }} className="sm:px-16">
        <div style={{ borderRadius:16, padding:"2rem", background:"linear-gradient(160deg, #0f0f0f 0%, #0a0a0a 100%)", border:"1px solid rgba(201,168,76,0.1)", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(to right, transparent, rgba(201,168,76,0.35) 30%, rgba(201,168,76,0.35) 70%, transparent)" }} />
          <SectionHeading icon={<Compass size={14} color="#C9A84C" />} label={`Theatres in ${selectedCity.name}`} />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
            {theatres.length > 0 ? theatres.map(t => (
              <div key={t.id} className="theatre-card" style={{ padding:"1rem 1.2rem", borderRadius:10, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.04)", display:"flex", gap:12, alignItems:"flex-start" }}>
                <div style={{ width:34, height:34, borderRadius:8, flexShrink:0, background:"rgba(201,168,76,0.07)", border:"1px solid rgba(201,168,76,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Film size={14} color="#C9A84C" />
                </div>
                <div>
                  <p style={{ fontFamily:"'Poppins', sans-serif", fontWeight:700, fontSize:"0.83rem", color:"#f0f0f0", marginBottom:3 }}>{t.name}</p>
                  <p style={{ fontSize:"0.73rem", color:"#555", lineHeight:1.5 }}>{t.address}</p>
                </div>
              </div>
            )) : (
              <p style={{ color:"#444", fontSize:"0.83rem", padding:"1rem 0" }}>No theatres found for {selectedCity.name}.</p>
            )}
          </div>
        </div>
      </div>

      <CitySelectorModal isOpen={cityModalOpen} onClose={() => setCityModalOpen(false)} />
    </div>
  );
};

/* ── Section Heading ── */
const SectionHeading: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
    <div style={{ width:3, height:18, background:"#C9A84C", borderRadius:2, flexShrink:0 }} />
    {icon}
    <h2 style={{ fontFamily:"'Poppins', sans-serif", fontWeight:800, fontSize:"0.9rem", color:"#f0f0f0", textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</h2>
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
    <div
      className="movie-card"
      onClick={onClick}
      style={{ animation: `cardEnter 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
    >
      <div className="card-img-wrap" style={{ aspectRatio:"2/3", background:"#171717" }}>
        {!loaded && <div className="shimmer" style={{ position:"absolute", inset:0 }} />}
        <img
          ref={imgRef}
          src={getImageUrl(movie.posterUrl)}
          alt={movie.title}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className="card-poster-img"
          style={{ opacity: loaded ? 1 : 0, transition:"opacity 0.4s ease" }}
        />
        <div className="card-hover-overlay">
          <span className="card-book-cta">
            {muted ? "Details" : "Book Now"} <ArrowRight size={10} />
          </span>
        </div>
        <div style={{ position:"absolute", top:7, right:7 }}>{badge}</div>
      </div>
      <div style={{ padding:"10px 11px 14px" }}>
        <p style={{ fontSize:"0.68rem", fontWeight:700, color: muted ? "#555" : "#C9A84C", fontFamily:"'Poppins', sans-serif", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>
          {movie.genre.split("/")[0]}
        </p>
        <h3 className="card-title-text" style={{ fontFamily:"'Playfair Display', serif", fontWeight:700, fontSize:"0.85rem", color:"#f0f0f0", lineHeight:1.3, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
          {movie.title}
        </h3>
        <p style={{ fontSize:"0.65rem", color:"#444", marginTop:5, fontFamily:"'Inter', sans-serif" }}>{meta}</p>
      </div>
    </div>
  );
};
