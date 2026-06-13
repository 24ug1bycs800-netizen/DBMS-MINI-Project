import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import {
  Moon, Plus, Users, CheckCircle, Clock,
  Ticket, ArrowRight, Hash, LogIn, Star, Sparkles,
  Film, Crown,
} from "lucide-react";
import api from "../services/api.js";

interface MovieNight {
  id: number;
  title: string;
  description?: string;
  inviteCode: string;
  status: string;
  createdAt: string;
  myRole: string;
  memberCount: number;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode; glow: string }> = {
  COLLECTING_PREFERENCES: { label: "Collecting Prefs", color: "#6ee7e7", bg: "rgba(110,231,231,0.08)", border: "rgba(110,231,231,0.25)", icon: <Clock className="w-3 h-3" />, glow: "rgba(110,231,231,0.12)" },
  RECOMMENDED:            { label: "Vote Pending",     color: "#c084fc", bg: "rgba(192,132,252,0.08)", border: "rgba(192,132,252,0.25)", icon: <Sparkles className="w-3 h-3" />, glow: "rgba(192,132,252,0.12)" },
  APPROVED:               { label: "Approved",         color: "#4ade80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.25)",  icon: <CheckCircle className="w-3 h-3" />, glow: "rgba(74,222,128,0.12)" },
  PAYMENT_PENDING:        { label: "Payment Pending",  color: "#fb923c", bg: "rgba(251,146,60,0.08)",  border: "rgba(251,146,60,0.25)",  icon: <Clock className="w-3 h-3" />, glow: "rgba(251,146,60,0.12)" },
  READY_TO_BOOK:          { label: "Ready to Book",    color: "#d4af37", bg: "rgba(212,175,55,0.08)",  border: "rgba(212,175,55,0.25)",  icon: <Ticket className="w-3 h-3" />, glow: "rgba(212,175,55,0.15)" },
  BOOKED:                 { label: "Booked ✓",         color: "#4ade80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.25)",  icon: <CheckCircle className="w-3 h-3" />, glow: "rgba(74,222,128,0.12)" },
};

const STEP_ORDER = ["COLLECTING_PREFERENCES", "RECOMMENDED", "PAYMENT_PENDING", "READY_TO_BOOK", "BOOKED"];

function getProgress(status: string) {
  const idx = STEP_ORDER.indexOf(status);
  return idx === -1 ? 0 : Math.round(((idx + 1) / STEP_ORDER.length) * 100);
}

const FloatingStar: React.FC<{ x: number; y: number; delay: number; size: number; opacity: number }> = ({ x, y, delay, size, opacity }) => (
  <div
    className="absolute pointer-events-none"
    style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s`, opacity }}
  >
    <Star className="fill-current" style={{ color: "#d4af37", width: size, height: size, animation: `pulse 3s ease-in-out ${delay}s infinite` }} />
  </div>
);

export const MovieNights: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [nights, setNights] = useState<MovieNight[]>([]);
  const [fetching, setFetching] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinErr, setJoinErr] = useState("");
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) { navigate("/auth"); return; }
    if (!loading) fetchNights();
  }, [loading, user]);

  const fetchNights = async () => {
    setFetching(true);
    try {
      const res = await api.get("/movie-nights");
      setNights(res.data.movieNights);
    } catch { /* empty */ } finally { setFetching(false); }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinLoading(true); setJoinErr("");
    try {
      const res = await api.post(`/movie-nights/join/${joinCode.trim().toUpperCase()}`);
      navigate(`/movie-nights/${res.data.movieNight.id}`);
    } catch (err: any) {
      setJoinErr(err.response?.data?.error || "Invalid invite code.");
    } finally { setJoinLoading(false); }
  };

  const activeCount = nights.filter(n => n.status !== "BOOKED").length;
  const bookedCount = nights.filter(n => n.status === "BOOKED").length;
  const hostedCount = nights.filter(n => n.myRole === "ORGANIZER").length;

  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#060606" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-2 border-neutral-800 animate-spin" style={{ borderTopColor: "#d4af37" }} />
          <Moon className="w-6 h-6 absolute inset-0 m-auto" style={{ color: "#d4af37" }} />
        </div>
        <p className="text-neutral-600 text-xs font-bold tracking-widest uppercase">Loading your nights…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-white font-poppins overflow-x-hidden" style={{ background: "#060606" }}>

      {/* ── HERO ── */}
      <div className="relative overflow-hidden" style={{ minHeight: 320 }}>
        {/* Film-grain overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
          opacity: 0.6,
        }} />

        {/* Ambient glow orbs */}
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)" }} />
        <div className="absolute -top-10 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(192,132,252,0.06) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-32 pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.05) 0%, transparent 70%)" }} />

        {/* Floating stars */}
        <FloatingStar x={8}  y={20} delay={0}   size={6} opacity={0.3} />
        <FloatingStar x={15} y={65} delay={1.2} size={4} opacity={0.2} />
        <FloatingStar x={88} y={15} delay={0.6} size={5} opacity={0.25} />
        <FloatingStar x={92} y={70} delay={1.8} size={4} opacity={0.2} />
        <FloatingStar x={45} y={10} delay={0.9} size={3} opacity={0.15} />
        <FloatingStar x={72} y={50} delay={2.1} size={5} opacity={0.2} />

        {/* Film strip decoration left */}
        <div className="absolute left-0 top-0 bottom-0 w-10 opacity-5 pointer-events-none hidden lg:flex flex-col">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-1 border-b border-r-4 border-white" />
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-10 opacity-5 pointer-events-none hidden lg:flex flex-col">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-1 border-b border-l-4 border-white" />
          ))}
        </div>

        <div className="relative max-w-5xl mx-auto px-6 sm:px-16 pt-14 pb-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"
            style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: "#d4af37" }}>
            <Sparkles className="w-3 h-3" /> AI-Powered Squad Planner
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none mb-3">
                <span className="text-white">Movie</span>{" "}
                <span style={{ background: "linear-gradient(135deg,#d4af37,#f4d03f,#d4af37)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Nights
                </span>
              </h1>
              <p className="text-neutral-500 font-inter text-sm max-w-md leading-relaxed">
                Gather your squad, vote on movies, split the bill, and book seats — all in one place.
              </p>
            </div>

            <button
              onClick={() => navigate("/movie-nights/create")}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-sm transition-all hover:scale-105 hover:shadow-2xl shrink-0"
              style={{
                background: "linear-gradient(135deg,#d4af37,#f4d03f)",
                color: "#000",
                boxShadow: "0 4px 24px rgba(212,175,55,0.35)",
              }}
            >
              <Plus className="w-4 h-4" /> Create Night
            </button>
          </div>

          {/* Stats row */}
          {nights.length > 0 && (
            <div className="flex items-center gap-6 mt-8 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              {[
                { label: "Active", value: activeCount, color: "#6ee7e7", icon: <Moon className="w-3.5 h-3.5" /> },
                { label: "Booked", value: bookedCount, color: "#4ade80", icon: <CheckCircle className="w-3.5 h-3.5" /> },
                { label: "Hosting", value: hostedCount, color: "#d4af37", icon: <Crown className="w-3.5 h-3.5" /> },
                { label: "Total", value: nights.length, color: "#c084fc", icon: <Film className="w-3.5 h-3.5" /> },
              ].map(({ label, value, color, icon }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg" style={{ background: `${color}14`, color }}>{icon}</div>
                  <div>
                    <div className="text-xl font-black" style={{ color }}>{value}</div>
                    <div className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-5xl mx-auto px-6 sm:px-16 py-10 space-y-8">

        {/* Join panel — cinematic */}
        <div className="relative overflow-hidden rounded-2xl p-6"
          style={{ background: "linear-gradient(135deg, #0d0d0d 0%, #111 100%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)" }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg" style={{ background: "rgba(212,175,55,0.1)", color: "#d4af37" }}>
                <LogIn className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Join with Invite Code</p>
            </div>
            <form onSubmit={handleJoin} className="flex gap-3">
              <div className="relative flex-1">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-white text-xs font-black tracking-[0.2em] placeholder-neutral-700 focus:outline-none transition-all uppercase"
                  style={{
                    background: "#080808",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontFamily: "monospace",
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.06)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
                  placeholder="ENTER CODE"
                  value={joinCode}
                  onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinErr(""); }}
                  maxLength={10}
                />
              </div>
              <button
                type="submit"
                disabled={joinLoading || !joinCode.trim()}
                className="px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                style={{ background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000", boxShadow: "0 4px 16px rgba(212,175,55,0.2)" }}
              >
                {joinLoading
                  ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  : <><LogIn className="w-3.5 h-3.5" /> Join</>}
              </button>
            </form>
            {joinErr && (
              <p className="text-xs text-red-400 font-inter mt-2.5 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-400 inline-block" /> {joinErr}
              </p>
            )}
          </div>
        </div>

        {/* Empty state */}
        {nights.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl py-20 text-center"
            style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.06) 0%, transparent 60%)" }} />

            {/* Decorative film reel */}
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full animate-spin" style={{ border: "1px dashed rgba(212,175,55,0.2)", animationDuration: "10s" }} />
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)" }}>
                <Moon className="w-8 h-8" style={{ color: "#d4af37" }} />
              </div>
            </div>

            <p className="text-white font-black text-2xl mb-2">No Movie Nights Yet</p>
            <p className="text-neutral-600 font-inter text-sm mb-8 max-w-xs mx-auto leading-relaxed">
              Start planning your next cinematic squad experience.
            </p>
            <button
              onClick={() => navigate("/movie-nights/create")}
              className="px-8 py-3.5 rounded-2xl font-black text-sm inline-flex items-center gap-2.5 hover:scale-105 transition-all"
              style={{ background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000", boxShadow: "0 8px 32px rgba(212,175,55,0.25)" }}
            >
              <Plus className="w-4 h-4" /> Create Your First Night
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-neutral-600">
                Your Nights · {nights.length}
              </p>
              <div className="h-px flex-1 mx-4" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.04), transparent)" }} />
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {nights.map(night => {
                const meta = STATUS_META[night.status] ?? STATUS_META.COLLECTING_PREFERENCES;
                const progress = getProgress(night.status);
                const isHovered = hoveredId === night.id;
                const isOrganizer = night.myRole === "ORGANIZER";

                return (
                  <div
                    key={night.id}
                    onClick={() => navigate(`/movie-nights/${night.id}`)}
                    onMouseEnter={() => setHoveredId(night.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300"
                    style={{
                      background: "#0d0d0d",
                      border: `1px solid ${isHovered ? meta.border : "rgba(255,255,255,0.06)"}`,
                      boxShadow: isHovered ? `0 12px 40px ${meta.glow}, 0 4px 12px rgba(0,0,0,0.5)` : "none",
                      transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                    }}
                  >
                    {/* Ambient top glow */}
                    <div className="h-0.5 w-full transition-all duration-300" style={{
                      background: isHovered ? `linear-gradient(90deg, transparent, ${meta.color}, transparent)` : "transparent",
                    }} />

                    <div className="p-5">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <span
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider"
                          style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}
                        >
                          {meta.icon} {meta.label}
                        </span>
                        {isOrganizer && (
                          <div className="p-1 rounded-md" style={{ background: "rgba(212,175,55,0.08)", color: "#d4af37" }} title="Organizer">
                            <Crown className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-black text-base text-white leading-snug mb-1 line-clamp-2 transition-colors duration-200"
                        style={{ color: isHovered ? meta.color : "#fff" }}>
                        {night.title}
                      </h3>
                      {night.description && (
                        <p className="text-[11px] text-neutral-600 font-inter line-clamp-2 mb-3 leading-relaxed">{night.description}</p>
                      )}

                      {/* Progress bar */}
                      <div className="my-3">
                        <div className="h-0.5 rounded-full w-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})` }}
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1.5 text-neutral-600">
                          <Users className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">
                            {night.memberCount} {night.memberCount !== 1 ? "members" : "member"}
                          </span>
                        </div>
                        <div
                          className="flex items-center gap-1 text-xs font-black transition-colors duration-200"
                          style={{ color: isHovered ? meta.color : "rgba(255,255,255,0.2)" }}
                        >
                          Open <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Create new card */}
              <div
                onClick={() => navigate("/movie-nights/create")}
                className="group cursor-pointer rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[180px]"
                style={{
                  background: "transparent",
                  border: "1px dashed rgba(255,255,255,0.08)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)";
                  e.currentTarget.style.background = "rgba(212,175,55,0.03)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110"
                  style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)", color: "#d4af37" }}>
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black text-neutral-600 group-hover:text-[#d4af37] transition-colors">New Movie Night</p>
                  <p className="text-[10px] text-neutral-700 font-inter mt-0.5">Start planning</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* How it works strip */}
        <div className="relative overflow-hidden rounded-2xl p-6"
          style={{ background: "linear-gradient(135deg,#0a0a0a,#0d0d0d)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 0% 50%, rgba(212,175,55,0.04) 0%, transparent 60%)" }} />
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-4">How It Works</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
            {[
              { n: "01", title: "Create", desc: "Start a night & invite your squad", color: "#d4af37" },
              { n: "02", title: "Preferences", desc: "Everyone shares their picks & budget", color: "#c084fc" },
              { n: "03", title: "AI Match", desc: "Smart engine finds the perfect show", color: "#6ee7e7" },
              { n: "04", title: "Book", desc: "Vote, split costs, and grab seats", color: "#4ade80" },
            ].map(({ n, title, desc, color }, i) => (
              <div key={n} className="relative">
                {i < 3 && (
                  <div className="hidden sm:block absolute top-3 left-full w-full h-px -translate-y-px pointer-events-none z-0"
                    style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.06), transparent)" }} />
                )}
                <div className="text-[10px] font-black mb-1.5" style={{ color }}>{n}</div>
                <div className="text-xs font-black text-white mb-1">{title}</div>
                <div className="text-[10px] text-neutral-600 font-inter leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
