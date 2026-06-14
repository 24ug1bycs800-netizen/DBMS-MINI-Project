import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCityStore } from "../store/useCityStore.js";
import {
  Play, Calendar, Star, Film, ChevronLeft, ChevronRight,
  Popcorn, Users, Ticket, MapPin,
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

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export const Home: React.FC = () => {
  const { selectedCity } = useCityStore();
  const navigate = useNavigate();

  const [nowShowing, setNowShowing] = useState<Movie[]>([]);
  const [comingSoon, setComingSoon] = useState<Movie[]>([]);
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    api.get("/movies?isNowShowing=true").then(r => setNowShowing(r.data.movies)).catch(() => {});
    api.get("/movies?isNowShowing=false").then(r => setComingSoon(r.data.movies)).catch(() => {});
  }, []);

  useEffect(() => {
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
    <div style={{ background: "#0B1120", color: "#F9FAFB", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {hero && (
          <motion.div
            key={heroIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{ position: "relative", height: "88vh", minHeight: 560, overflow: "hidden", display: "flex", alignItems: "flex-end" }}
          >
            {/* Backdrop */}
            <div
              style={{
                position: "absolute", inset: 0,
                backgroundImage: `url(${getImageUrl(hero.backdropUrl || hero.posterUrl)})`,
                backgroundSize: "cover", backgroundPosition: "center",
                filter: "brightness(0.3) saturate(1.1)",
                transform: "scale(1.04)",
                transition: "transform 8s ease",
              }}
            />

            {/* Gradient overlays */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0B1120 0%, rgba(11,17,32,0.85) 40%, rgba(11,17,32,0.15) 100%)" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #0B1120 0%, rgba(11,17,32,0.6) 40%, transparent 100%)" }} />

            {/* Red glow from bottom */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 200,
              background: "linear-gradient(to top, rgba(229,9,20,0.04) 0%, transparent 100%)",
              pointerEvents: "none",
            }} />

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: "relative", zIndex: 10, padding: "0 2rem 4rem", width: "100%", maxWidth: 900 }}
              className="sm:px-16"
            >
              {/* NOW SHOWING badge */}
              <div style={{ marginBottom: 18 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 12px",
                  background: "#E50914",
                  borderRadius: 6,
                  fontSize: "0.65rem", fontWeight: 700,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: "#fff",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.7)", display: "inline-block", animation: "pulse 2s ease-out infinite" }} />
                  Now Showing
                </span>
              </div>

              <h1 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(2.2rem, 6vw, 4rem)",
                lineHeight: 1.05,
                color: "#F9FAFB",
                marginBottom: 16,
                letterSpacing: "-0.02em",
                textShadow: "0 4px 32px rgba(0,0,0,0.6)",
              }}>
                {hero.title}
              </h1>

              <p style={{ color: "#9CA3AF", fontSize: "0.9rem", maxWidth: 480, marginBottom: 20, lineHeight: 1.65 }}
                className="hidden sm:block line-clamp-2">
                {hero.description}
              </p>

              {/* Meta */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28, alignItems: "center" }}>
                {[hero.language, hero.genre.split("/")[0]].map(tag => (
                  <span key={tag} style={{
                    padding: "3px 10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 5,
                    fontSize: "0.72rem", fontWeight: 600,
                    color: "#9CA3AF",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                  }}>{tag}</span>
                ))}
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#F59E0B", fontSize: "0.82rem", fontWeight: 700 }}>
                  <Star size={13} style={{ fill: "#F59E0B" }} /> {hero.ratingValue}
                </span>
                <span style={{ color: "#4B5563", fontSize: "0.78rem" }}>{hero.durationMins} min</span>
              </div>

              {/* CTAs */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/movies/${hero.id}`)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "12px 26px",
                    background: "#E50914",
                    borderRadius: 9,
                    border: "none",
                    color: "#fff",
                    fontSize: "0.88rem", fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'Space Grotesk', sans-serif",
                    boxShadow: "0 8px 24px rgba(229,9,20,0.3)",
                  }}
                >
                  <Ticket size={15} /> Book Tickets
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/movies/${hero.id}?playTrailer=true`)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "12px 26px",
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 9,
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#F9FAFB",
                    fontSize: "0.88rem", fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <Play size={15} style={{ fill: "rgba(255,255,255,0.8)" }} /> Watch Trailer
                </motion.button>
              </div>
            </motion.div>

            {/* Slide controls */}
            <div style={{ position: "absolute", right: 24, bottom: 56, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: heroCount }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroIdx(i)}
                    style={{
                      height: 4, borderRadius: 999,
                      width: i === heroIdx ? 22 : 6,
                      background: i === heroIdx ? "#E50914" : "rgba(255,255,255,0.2)",
                      border: "none", cursor: "pointer",
                      transition: "all 0.3s ease",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ fn: () => setHeroIdx(p => (p - 1 + heroCount) % heroCount), icon: <ChevronLeft size={15} /> },
                  { fn: () => setHeroIdx(p => (p + 1) % heroCount), icon: <ChevronRight size={15} /> }].map(({ fn, icon }, i) => (
                  <button key={i} onClick={fn}
                    style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(229,9,20,0.2)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(229,9,20,0.4)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
                    }}
                  >{icon}</button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MOVIE NIGHTS FEATURE BAND ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{
          margin: "0 1.5rem",
          borderRadius: 16,
          overflow: "hidden",
          background: "linear-gradient(135deg, rgba(229,9,20,0.12) 0%, rgba(11,17,32,0) 60%)",
          border: "1px solid rgba(229,9,20,0.2)",
          padding: "2rem 2.5rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}
        className="sm:mx-16 my-10"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: "rgba(229,9,20,0.15)",
            border: "1px solid rgba(229,9,20,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Popcorn size={24} color="#E50914" />
          </div>
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.2rem", color: "#F9FAFB", marginBottom: 4 }}>
              Plan Movie Nights Together
            </h2>
            <p style={{ color: "#9CA3AF", fontSize: "0.85rem", lineHeight: 1.5, maxWidth: 480 }}>
              Vote on movies, pick showtimes together, and book group seats — all in one shared room.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/movie-nights/create")}
            style={{
              padding: "10px 22px",
              background: "#E50914",
              borderRadius: 8, border: "none",
              color: "#fff", fontSize: "0.85rem", fontWeight: 600,
              cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Create Movie Night
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/movie-nights")}
            style={{
              padding: "10px 22px",
              background: "transparent",
              borderRadius: 8,
              border: "1px solid rgba(229,9,20,0.3)",
              color: "#E50914", fontSize: "0.85rem", fontWeight: 600,
              cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Browse Rooms
          </motion.button>
        </div>
      </motion.div>

      {/* ── NOW SHOWING ──────────────────────────────────────────────────── */}
      <Section label="Now Showing" icon={<Film size={14} color="#F59E0B" />} accentColor="amber" className="px-6 sm:px-16 pb-14 pt-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 16 }}
        >
          {nowShowing.map(m => (
            <motion.div key={m.id} variants={fadeUp}>
              <MovieCard
                movie={m}
                badge={
                  <span style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", background: "rgba(0,0,0,0.75)", border: "1px solid rgba(245,158,11,0.35)", borderRadius: 5, fontSize: "0.65rem", fontWeight: 700, color: "#F59E0B" }}>
                    <Star size={9} style={{ fill: "#F59E0B" }} /> {m.ratingValue}
                  </span>
                }
                subtitle={`${m.language} · ${m.genre.split("/")[0]}`}
                meta={`${m.durationMins} min`}
                onClick={() => navigate(`/movies/${m.id}`)}
                accentColor="#E50914"
              />
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ── COMING SOON ──────────────────────────────────────────────────── */}
      <Section label="Coming Soon" icon={<Calendar size={14} color="#9CA3AF" />} accentColor="muted" className="px-6 sm:px-16 pb-14">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 16 }}
        >
          {comingSoon.map(m => (
            <motion.div key={m.id} variants={fadeUp}>
              <MovieCard
                movie={m}
                badge={
                  <span style={{ padding: "3px 8px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 5, fontSize: "0.6rem", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Soon
                  </span>
                }
                subtitle={`${m.language} · ${m.genre.split("/")[0]}`}
                meta={`Release: ${m.releaseDate}`}
                onClick={() => navigate(`/movies/${m.id}`)}
                accentColor="#9CA3AF"
              />
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ── WHY CINECIRCLE ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{ padding: "3rem 1.5rem", textAlign: "center" }}
        className="sm:px-16"
      >
        <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#E50914", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'Space Grotesk', sans-serif" }}>
          Why CineCircle
        </p>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(1.5rem, 3vw, 2rem)", color: "#F9FAFB", marginBottom: 40, letterSpacing: "-0.01em" }}>
          Movie nights, done right
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, maxWidth: 900, margin: "0 auto" }}>
          {[
            { icon: <Popcorn size={22} color="#E50914" />, title: "Group Rooms", desc: "Create a room, invite friends, vote on what to watch and when." },
            { icon: <Ticket size={22} color="#F59E0B" />, title: "Book Together", desc: "Pick seats side-by-side and pay individually — no coordination chaos." },
            { icon: <Users size={22} color="#9CA3AF" />, title: "Stay in Sync", desc: "Real-time voting keeps everyone on the same page before you buy." },
          ].map(f => (
            <motion.div
              key={f.title}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{
                padding: "1.5rem",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 12,
                textAlign: "left",
              }}
            >
              <div style={{ marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "#F9FAFB", marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: "0.82rem", color: "#6B7280", lineHeight: 1.6 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── THEATRES ─────────────────────────────────────────────────────── */}
      <div style={{ padding: "0 1.5rem 4rem" }} className="sm:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            borderRadius: 16,
            padding: "2rem",
            background: "rgba(17,24,39,0.6)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <MapPin size={14} color="#9CA3AF" />
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#F9FAFB" }}>
              Theatres in {selectedCity.name}
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {theatres.length > 0 ? theatres.map(t => (
              <motion.div
                key={t.id}
                whileHover={{ borderColor: "rgba(255,255,255,0.12)" }}
                style={{
                  padding: "1rem 1.25rem",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 10,
                  display: "flex", gap: 12, alignItems: "flex-start",
                  transition: "border-color 0.2s",
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Film size={15} color="#F59E0B" />
                </div>
                <div>
                  <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "0.85rem", color: "#F9FAFB", marginBottom: 3 }}>{t.name}</p>
                  <p style={{ fontSize: "0.75rem", color: "#6B7280", lineHeight: 1.5 }}>{t.address}</p>
                </div>
              </motion.div>
            )) : (
              <p style={{ color: "#4B5563", fontSize: "0.85rem", padding: "1rem 0" }}>No theatres found for this location.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section: React.FC<{
  label: string;
  icon: React.ReactNode;
  accentColor: "amber" | "muted";
  children: React.ReactNode;
  className?: string;
}> = ({ label, icon, accentColor, children, className }) => (
  <div className={className}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
      <div style={{
        width: 3, height: 18, borderRadius: 2,
        background: accentColor === "amber" ? "#F59E0B" : "#374151",
        flexShrink: 0,
      }} />
      {icon}
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#F9FAFB" }}>{label}</h2>
    </div>
    {children}
  </div>
);

// ─── Movie Card ───────────────────────────────────────────────────────────────
const MovieCard: React.FC<{
  movie: Movie;
  badge: React.ReactNode;
  subtitle: string;
  meta: string;
  onClick: () => void;
  accentColor: string;
}> = ({ movie, badge, subtitle, meta, onClick, accentColor }) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => { if (imgRef.current?.complete) setLoaded(true); }, []);

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      onClick={onClick}
      style={{
        cursor: "pointer", borderRadius: 12, overflow: "hidden",
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.04)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        transition: "border-color 0.25s, box-shadow 0.25s",
      }}
      onHoverStart={e => {
        (e.target as HTMLDivElement).style?.setProperty?.("border-color", `${accentColor}40`);
      }}
    >
      <div style={{ position: "relative", aspectRatio: "2/3", overflow: "hidden", background: "#1F2937" }}>
        {!loaded && <div className="absolute inset-0 shimmer" />}
        <img
          ref={imgRef}
          src={getImageUrl(movie.posterUrl)}
          alt={movie.title}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{
            width: "100%", height: "100%", objectFit: "cover", objectPosition: "center",
            opacity: loaded ? 1 : 0, transition: "opacity 0.4s ease",
          }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 40%)", opacity: 0, transition: "opacity 0.3s" }}
          className="group-hover:opacity-100" />
        <div style={{ position: "absolute", top: 8, right: 8 }}>{badge}</div>
      </div>
      <div style={{ padding: "12px 12px 14px" }}>
        <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{subtitle}</p>
        <h3 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700, fontSize: "0.85rem", color: "#F9FAFB",
          lineHeight: 1.3,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{movie.title}</h3>
        <p style={{ fontSize: "0.68rem", color: "#4B5563", marginTop: 5 }}>{meta}</p>
      </div>
    </motion.div>
  );
};
