import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import {
  Moon, Plus, Users, CheckCircle, Clock,
  Ticket, ArrowRight, Hash, LogIn, Sparkles,
  Film, Crown, XCircle, Ban, Star,
} from "lucide-react";
import api from "../services/api.js";

interface MovieNight {
  id: number; title: string; description?: string;
  inviteCode: string; status: string; createdAt: string;
  myRole: string; memberCount: number;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode; glow: string }> = {
  COLLECTING_PREFERENCES: { label:"Collecting Prefs", color:"#6ee7e7", bg:"rgba(110,231,231,0.08)", border:"rgba(110,231,231,0.25)", icon:<Clock className="w-3 h-3"/>, glow:"rgba(110,231,231,0.15)" },
  RECOMMENDED:            { label:"Vote Pending",     color:"#c084fc", bg:"rgba(192,132,252,0.08)", border:"rgba(192,132,252,0.25)", icon:<Sparkles className="w-3 h-3"/>, glow:"rgba(192,132,252,0.15)" },
  APPROVED:               { label:"Approved",         color:"#4ade80", bg:"rgba(74,222,128,0.08)",  border:"rgba(74,222,128,0.25)",  icon:<CheckCircle className="w-3 h-3"/>, glow:"rgba(74,222,128,0.12)" },
  PAYMENT_PENDING:        { label:"Payment Pending",  color:"#fb923c", bg:"rgba(251,146,60,0.08)",  border:"rgba(251,146,60,0.25)",  icon:<Clock className="w-3 h-3"/>, glow:"rgba(251,146,60,0.12)" },
  READY_TO_BOOK:          { label:"Ready to Book",    color:"#C9A84C", bg:"rgba(201,168,76,0.08)",  border:"rgba(201,168,76,0.25)",  icon:<Ticket className="w-3 h-3"/>, glow:"rgba(201,168,76,0.18)" },
  BOOKED:                 { label:"Booked ✓",         color:"#4ade80", bg:"rgba(74,222,128,0.08)",  border:"rgba(74,222,128,0.25)",  icon:<CheckCircle className="w-3 h-3"/>, glow:"rgba(74,222,128,0.12)" },
  REJECTED:               { label:"Rejected",          color:"#f87171", bg:"rgba(248,113,113,0.08)", border:"rgba(248,113,113,0.25)", icon:<XCircle className="w-3 h-3"/>, glow:"rgba(248,113,113,0.12)" },
  CANCELLED:              { label:"Cancelled",         color:"#6b7280", bg:"rgba(107,114,128,0.08)", border:"rgba(107,114,128,0.2)",  icon:<Ban className="w-3 h-3"/>, glow:"rgba(107,114,128,0.08)" },
};

const STEP_ORDER = ["COLLECTING_PREFERENCES","RECOMMENDED","PAYMENT_PENDING","READY_TO_BOOK","BOOKED"];
function getProgress(status: string) {
  const idx = STEP_ORDER.indexOf(status);
  return idx === -1 ? 0 : Math.round(((idx + 1) / STEP_ORDER.length) * 100);
}

const MN_STYLES = `
  @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(90px,-55px) scale(1.1)} 66%{transform:translate(-35px,45px) scale(0.93)} }
  @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-65px,80px) scale(1.08)} }
  @keyframes orb3 { 0%,100%{transform:translate(0,0) scale(1.04)} 50%{transform:translate(55px,-45px) scale(0.96)} }
  @keyframes shimmerGold {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
  @keyframes heroFadeUp { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
  @keyframes filmFlicker { 0%,100%{opacity:0.06} 50%{opacity:0.09} }
  @keyframes spinSlow { to{transform:rotate(360deg)} }
  @keyframes starPulse { 0%,100%{opacity:0.12;transform:scale(1)} 50%{opacity:0.28;transform:scale(1.15)} }
  @keyframes progressGrow { from{width:0} to{width:var(--prog-w)} }

  .mn-hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 5px 15px;
    background: rgba(201,168,76,0.07); border: 1px solid rgba(201,168,76,0.2);
    border-radius: 100px;
    font-size: 0.7rem; font-weight: 700; color: rgba(201,168,76,0.85);
    letter-spacing: 0.12em; text-transform: uppercase;
    animation: heroFadeUp 0.6s ease both;
  }
  .mn-h1-ghost  { display:block; font-style:italic; color:rgba(255,255,255,0.1); animation: heroFadeUp 0.6s 0.08s ease both; }
  .mn-h1-white  { display:block; color:#f0f0f0; animation: heroFadeUp 0.6s 0.16s ease both; }
  .mn-h1-gold   {
    display: block;
    background: linear-gradient(90deg, #C9A84C 0%, #E8C96A 25%, #f4d03f 50%, #E8C96A 75%, #C9A84C 100%);
    background-size: 200% auto;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: heroFadeUp 0.6s 0.24s ease both, shimmerGold 5s linear 0.9s infinite;
  }
  .mn-desc   { animation: heroFadeUp 0.6s 0.32s ease both; }
  .mn-ctas   { animation: heroFadeUp 0.6s 0.40s ease both; }
  .mn-stats  { animation: heroFadeUp 0.6s 0.48s ease both; }
  .mn-join-card { animation: heroFadeUp 0.7s 0.28s ease both; }

  /* Night card hover */
  .night-card {
    cursor: pointer; border-radius: 16px; overflow: hidden;
    transition: transform 0.38s cubic-bezier(0.22,1,0.36,1),
                border-color 0.38s ease,
                box-shadow 0.38s ease;
  }
  .night-card:hover { transform: translateY(-7px) scale(1.015); }
  .night-card .night-card-arrow {
    transition: transform 0.28s ease, color 0.28s ease;
  }
  .night-card:hover .night-card-arrow { transform: translateX(4px); }
  .night-card .night-card-top-line {
    transition: opacity 0.35s ease;
    opacity: 0;
  }
  .night-card:hover .night-card-top-line { opacity: 1; }
  .night-card .night-card-title { transition: color 0.28s ease; }

  /* Step card hover */
  .step-card {
    transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), border-color 0.35s ease, background 0.35s ease;
  }
  .step-card:hover {
    transform: translateY(-5px);
    border-color: rgba(201,168,76,0.3) !important;
    background: rgba(201,168,76,0.03) !important;
  }

  /* Join input glow */
  .mn-join-input:focus {
    border-color: rgba(201,168,76,0.5) !important;
    box-shadow: 0 0 0 3px rgba(201,168,76,0.07) !important;
    outline: none;
  }
`;

export const MovieNights: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [nights, setNights] = useState<MovieNight[]>([]);
  const [fetching, setFetching] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinErr, setJoinErr] = useState("");

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

  const activeCount  = nights.filter(n => n.status !== "BOOKED" && n.status !== "CANCELLED").length;
  const bookedCount  = nights.filter(n => n.status === "BOOKED").length;
  const hostedCount  = nights.filter(n => n.myRole === "ORGANIZER").length;

  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:"#060606" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-2 border-neutral-800 animate-spin" style={{ borderTopColor:"#C9A84C" }} />
          <Moon className="w-6 h-6 absolute inset-0 m-auto" style={{ color:"#C9A84C" }} />
        </div>
        <p className="text-neutral-600 text-xs font-bold tracking-widest uppercase">Loading your nights…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background:"#060606", fontFamily:"'Poppins', sans-serif" }}>
      <style>{MN_STYLES}</style>

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section style={{ position:"relative", minHeight:"92vh", display:"flex", alignItems:"center", overflow:"hidden" }}>

        {/* Animated orb mesh */}
        <div style={{ position:"absolute", top:"-18%", left:"-10%", width:750, height:750, borderRadius:"50%", background:"radial-gradient(circle,rgba(201,168,76,0.1) 0%,transparent 58%)", animation:"orb1 22s ease-in-out infinite", pointerEvents:"none", willChange:"transform" }} />
        <div style={{ position:"absolute", bottom:"-22%", right:"-8%", width:640, height:640, borderRadius:"50%", background:"radial-gradient(circle,rgba(192,132,252,0.08) 0%,transparent 60%)", animation:"orb2 28s ease-in-out infinite", pointerEvents:"none", willChange:"transform" }} />
        <div style={{ position:"absolute", top:"38%", left:"42%", width:420, height:420, borderRadius:"50%", background:"radial-gradient(circle,rgba(110,231,231,0.05) 0%,transparent 62%)", animation:"orb3 19s ease-in-out infinite", pointerEvents:"none", willChange:"transform" }} />

        {/* Film grain */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", animation:"filmFlicker 4s ease-in-out infinite", backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")` }} />

        {/* Film strip left */}
        <div className="absolute left-0 top-0 bottom-0 w-8 opacity-[0.04] pointer-events-none hidden xl:flex flex-col">
          {Array.from({ length: 14 }).map((_, i) => <div key={i} className="flex-1 border-b border-r-4 border-white" />)}
        </div>
        {/* Film strip right */}
        <div className="absolute right-0 top-0 bottom-0 w-8 opacity-[0.04] pointer-events-none hidden xl:flex flex-col">
          {Array.from({ length: 14 }).map((_, i) => <div key={i} className="flex-1 border-b border-l-4 border-white" />)}
        </div>

        {/* Floating stars */}
        {[[8,18,0,5],[85,12,1.4,4],[14,72,0.8,3],[91,65,2.2,5],[48,8,1.1,3],[70,45,1.8,4]].map(([x,y,d,s], i) => (
          <div key={i} style={{ position:"absolute", left:`${x}%`, top:`${y}%`, pointerEvents:"none" }}>
            <Star style={{ color:"#C9A84C", width:s, height:s, animation:`starPulse 3.5s ease-in-out ${d}s infinite` }} className="fill-current" />
          </div>
        ))}

        {/* Gold bottom hairline */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, background:"linear-gradient(to right, transparent, rgba(201,168,76,0.3) 30%, rgba(201,168,76,0.3) 70%, transparent)" }} />

        {/* Content grid */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 sm:px-12 xl:px-16 py-20 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 xl:gap-20 items-center">

          {/* ── LEFT: Typography ── */}
          <div>
            {/* Badge */}
            <div className="mn-hero-badge mb-7">
              <Sparkles size={12} style={{ color:"#C9A84C" }} />
              AI-Powered Cinema Planner
            </div>

            {/* Headline */}
            <h1 style={{ fontFamily:"'Playfair Display', serif", fontWeight:900, lineHeight:0.92, letterSpacing:"-0.025em", marginBottom:28 }}>
              <span className="mn-h1-ghost" style={{ fontSize:"clamp(1.4rem,3.5vw,2.6rem)", marginBottom:"0.15em" }}>
                plan
              </span>
              <span className="mn-h1-white" style={{ fontSize:"clamp(3.8rem,9vw,7.2rem)" }}>
                Movie
              </span>
              <span className="mn-h1-gold" style={{ fontSize:"clamp(3.8rem,9vw,7.2rem)" }}>
                Nights.
              </span>
            </h1>

            <p className="mn-desc" style={{ fontSize:"1rem", color:"#525252", lineHeight:1.8, maxWidth:460, marginBottom:36 }}>
              Gather your squad, let AI find the perfect show, vote together, split the bill — and book seats side by side.
            </p>

            {/* CTAs */}
            <div className="mn-ctas" style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom: nights.length > 0 ? 40 : 0 }}>
              <button
                onClick={() => navigate("/movie-nights/create")}
                style={{ display:"flex", alignItems:"center", gap:9, padding:"13px 28px", background:"linear-gradient(135deg,#C9A84C,#E8C96A)", borderRadius:10, border:"none", color:"#000", fontSize:"0.9rem", fontWeight:800, cursor:"pointer", fontFamily:"'Poppins', sans-serif", boxShadow:"0 8px 32px rgba(201,168,76,0.35)", transition:"transform 0.2s, box-shadow 0.2s, opacity 0.2s", letterSpacing:"0.02em" }}
                onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 14px 40px rgba(201,168,76,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 8px 32px rgba(201,168,76,0.35)"; }}
              >
                <Plus size={17} /> Create a Night
              </button>
              <button
                style={{ display:"flex", alignItems:"center", gap:8, padding:"13px 24px", background:"rgba(255,255,255,0.04)", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.55)", fontSize:"0.88rem", fontWeight:600, cursor:"pointer", fontFamily:"'Poppins', sans-serif", transition:"all 0.2s" }}
                onClick={() => document.getElementById("mn-join-section")?.scrollIntoView({ behavior:"smooth" })}
                onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(201,168,76,0.3)"; e.currentTarget.style.color="#C9A84C"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"; e.currentTarget.style.color="rgba(255,255,255,0.55)"; }}
              >
                Join a Night <ArrowRight size={15} />
              </button>
            </div>

            {/* Stats */}
            {nights.length > 0 && (
              <div className="mn-stats" style={{ display:"flex", flexWrap:"wrap", gap:"2rem" }}>
                {[
                  { val: activeCount,  label:"Active",   color:"#6ee7e7", icon:<Moon  size={14}/> },
                  { val: bookedCount,  label:"Booked",   color:"#4ade80", icon:<CheckCircle size={14}/> },
                  { val: hostedCount,  label:"Hosting",  color:"#C9A84C", icon:<Crown size={14}/> },
                  { val: nights.length,label:"Total",    color:"#c084fc", icon:<Film  size={14}/> },
                ].map(({ val, label, color, icon }) => (
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:`${color}14`, display:"flex", alignItems:"center", justifyContent:"center", color, flexShrink:0 }}>
                      {icon}
                    </div>
                    <div>
                      <div style={{ fontSize:"1.6rem", fontWeight:900, color, lineHeight:1, fontFamily:"'Playfair Display', serif" }}>{val}</div>
                      <div style={{ fontSize:"0.65rem", color:"#444", textTransform:"uppercase", letterSpacing:"0.1em", marginTop:2 }}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Join card ── */}
          <div className="mn-join-card" style={{ position:"relative" }}>
            {/* Glow behind card */}
            <div style={{ position:"absolute", inset:"-20px", background:"radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 70%)", pointerEvents:"none", zIndex:0 }} />

            <div style={{ position:"relative", zIndex:1, background:"rgba(6,6,6,0.75)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", border:"1px solid rgba(201,168,76,0.18)", borderRadius:20, overflow:"hidden", boxShadow:"0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.06)" }}>

              {/* Gold top stripe */}
              <div style={{ height:2, background:"linear-gradient(to right, transparent, #C9A84C 30%, #E8C96A 50%, #C9A84C 70%, transparent)" }} />

              <div style={{ padding:"28px 28px 24px" }}>
                {/* Header */}
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:"linear-gradient(135deg,#C9A84C,#E8C96A)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <LogIn size={16} color="#000" />
                  </div>
                  <div>
                    <h3 style={{ fontFamily:"'Playfair Display', serif", fontWeight:900, fontSize:"1.1rem", color:"#f0f0f0", lineHeight:1 }}>Join a Movie Night</h3>
                    <p style={{ fontSize:"0.72rem", color:"#444", marginTop:3, fontFamily:"'Inter', sans-serif" }}>Enter your squad's invite code</p>
                  </div>
                </div>

                <div style={{ height:1, background:"rgba(201,168,76,0.1)", margin:"18px 0" }} />

                {/* Form */}
                <form onSubmit={handleJoin} style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <div style={{ position:"relative" }}>
                    <Hash size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"#555", pointerEvents:"none" }} />
                    <input
                      className="mn-join-input"
                      style={{ width:"100%", paddingLeft:38, paddingRight:14, paddingTop:13, paddingBottom:13, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, color:"#f0f0f0", fontSize:"0.875rem", fontWeight:700, fontFamily:"monospace", letterSpacing:"0.15em", textTransform:"uppercase", transition:"border-color 0.2s, box-shadow 0.2s", boxSizing:"border-box" }}
                      placeholder="ENTER CODE"
                      value={joinCode}
                      onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinErr(""); }}
                      maxLength={10}
                    />
                  </div>

                  {joinErr && (
                    <p style={{ fontSize:"0.76rem", color:"#f87171", fontFamily:"'Inter', sans-serif", display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ width:5, height:5, borderRadius:"50%", background:"#f87171", flexShrink:0, display:"inline-block" }} />
                      {joinErr}
                    </p>
                  )}

                  <button type="submit" disabled={joinLoading || !joinCode.trim()} style={{ width:"100%", padding:"13px", background:"linear-gradient(135deg,#C9A84C,#E8C96A)", borderRadius:10, border:"none", color:"#000", fontSize:"0.85rem", fontWeight:800, cursor: joinLoading || !joinCode.trim() ? "not-allowed" : "pointer", fontFamily:"'Poppins', sans-serif", letterSpacing:"0.03em", display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity: !joinCode.trim() ? 0.45 : 1, transition:"opacity 0.2s, transform 0.2s", boxShadow:"0 6px 20px rgba(201,168,76,0.2)" }}
                    onMouseEnter={e => { if (joinCode.trim() && !joinLoading) e.currentTarget.style.transform="translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; }}>
                    {joinLoading
                      ? <div style={{ width:16, height:16, borderRadius:"50%", border:"2.5px solid rgba(0,0,0,0.25)", borderTopColor:"#000", animation:"spin 0.7s linear infinite" }} />
                      : <><LogIn size={15} /> Join Night</>
                    }
                  </button>
                </form>

                {/* Divider */}
                <div style={{ display:"flex", alignItems:"center", gap:10, margin:"20px 0 16px" }}>
                  <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.05)" }} />
                  <span style={{ fontSize:"0.68rem", color:"#333", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"'Poppins', sans-serif" }}>or</span>
                  <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.05)" }} />
                </div>

                <button
                  onClick={() => navigate("/movie-nights/create")}
                  style={{ width:"100%", padding:"11px", background:"transparent", border:"1px solid rgba(201,168,76,0.15)", borderRadius:10, color:"#C9A84C", fontSize:"0.82rem", fontWeight:700, cursor:"pointer", fontFamily:"'Poppins', sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:7, transition:"all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background="rgba(201,168,76,0.06)"; e.currentTarget.style.borderColor="rgba(201,168,76,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="rgba(201,168,76,0.15)"; }}>
                  <Plus size={14} /> Create your own night
                </button>
              </div>

              {/* Step footer */}
              <div style={{ padding:"14px 28px 20px", background:"rgba(0,0,0,0.3)", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  {[
                    { emoji:"🎬", label:"Create" },
                    { emoji:"🗳️", label:"Vote" },
                    { emoji:"🎟️", label:"Book" },
                  ].map((s, i) => (
                    <React.Fragment key={s.label}>
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <span style={{ fontSize:"0.85rem" }}>{s.emoji}</span>
                        <span style={{ fontSize:"0.7rem", color:"#555", fontWeight:600 }}>{s.label}</span>
                      </div>
                      {i < 2 && <ArrowRight size={11} style={{ color:"#2a2a2a", flexShrink:0 }} />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CONTENT
      ══════════════════════════════════════════════════════ */}
      <div id="mn-join-section" className="max-w-6xl mx-auto px-6 sm:px-12 xl:px-16 py-12 space-y-10">

        {/* ── Empty state ── */}
        {nights.length === 0 ? (
          <div style={{ position:"relative", overflow:"hidden", borderRadius:24, padding:"5rem 2rem", textAlign:"center", background:"#0a0a0a", border:"1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 60%)" }} />
            <div style={{ position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center", width:80, height:80, marginBottom:24 }}>
              <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"1px dashed rgba(201,168,76,0.25)", animation:"spinSlow 12s linear infinite" }} />
              <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(201,168,76,0.06)", border:"1px solid rgba(201,168,76,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Moon size={28} style={{ color:"#C9A84C" }} />
              </div>
            </div>
            <p style={{ fontFamily:"'Playfair Display', serif", fontWeight:900, fontSize:"1.8rem", color:"#f0f0f0", marginBottom:8 }}>No Movie Nights Yet</p>
            <p style={{ fontSize:"0.875rem", color:"#444", marginBottom:36, lineHeight:1.7, maxWidth:320, margin:"0 auto 36px" }}>
              Start planning your next cinematic squad experience.
            </p>
            <button onClick={() => navigate("/movie-nights/create")} style={{ display:"inline-flex", alignItems:"center", gap:9, padding:"13px 32px", background:"linear-gradient(135deg,#C9A84C,#E8C96A)", borderRadius:12, border:"none", color:"#000", fontSize:"0.9rem", fontWeight:800, cursor:"pointer", fontFamily:"'Poppins', sans-serif", boxShadow:"0 8px 32px rgba(201,168,76,0.28)", transition:"transform 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.transform="translateY(-2px)")}
              onMouseLeave={e => (e.currentTarget.style.transform="translateY(0)")}>
              <Plus size={16} /> Create Your First Night
            </button>
          </div>
        ) : (
          <>
            {/* Header row */}
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <p style={{ fontSize:"0.7rem", fontWeight:800, textTransform:"uppercase", letterSpacing:"0.14em", color:"#333", flexShrink:0 }}>
                Your Nights · {nights.length}
              </p>
              <div style={{ flex:1, height:1, background:"linear-gradient(90deg, rgba(255,255,255,0.05), transparent)" }} />
              <button onClick={() => navigate("/movie-nights/create")} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", background:"rgba(201,168,76,0.07)", border:"1px solid rgba(201,168,76,0.18)", borderRadius:7, color:"#C9A84C", fontSize:"0.75rem", fontWeight:700, cursor:"pointer", fontFamily:"'Poppins', sans-serif", transition:"all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background="rgba(201,168,76,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.background="rgba(201,168,76,0.07)"; }}>
                <Plus size={13} /> New
              </button>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {nights.map((night, idx) => {
                const meta = STATUS_META[night.status] ?? STATUS_META.COLLECTING_PREFERENCES;
                const progress = getProgress(night.status);
                const isOrganizer = night.myRole === "ORGANIZER";

                return (
                  <div
                    key={night.id}
                    className="night-card"
                    onClick={() => navigate(`/movie-nights/${night.id}`)}
                    style={{
                      background:"#0d0d0d",
                      border:`1px solid rgba(255,255,255,0.06)`,
                      animation:`cardEnter 0.45s cubic-bezier(0.22,1,0.36,1) ${idx * 60}ms both`,
                      // dynamic hover glow set via CSS var would need runtime style; use onMouseEnter instead
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = meta.border;
                      e.currentTarget.style.boxShadow = `0 16px 50px rgba(0,0,0,0.7), 0 0 0 1px ${meta.border}, 0 0 40px ${meta.glow}`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Animated color top line */}
                    <div className="night-card-top-line" style={{ height:2, background:`linear-gradient(90deg, transparent, ${meta.color}, transparent)` }} />

                    <div style={{ padding:"20px 20px 18px" }}>
                      {/* Status + organizer */}
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:16 }}>
                        <span style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:7, fontSize:"0.7rem", fontWeight:800, textTransform:"uppercase", letterSpacing:"0.06em", background:meta.bg, border:`1px solid ${meta.border}`, color:meta.color }}>
                          {meta.icon} {meta.label}
                        </span>
                        {isOrganizer && (
                          <div title="Organizer" style={{ padding:5, borderRadius:6, background:"rgba(201,168,76,0.08)", color:"#C9A84C" }}>
                            <Crown size={11} />
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="night-card-title" style={{ fontFamily:"'Playfair Display', serif", fontWeight:900, fontSize:"1.05rem", color:"#f0f0f0", lineHeight:1.25, marginBottom:6, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                        {night.title}
                      </h3>
                      {night.description && (
                        <p style={{ fontSize:"0.78rem", color:"#444", lineHeight:1.6, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", marginBottom:12 }}>
                          {night.description}
                        </p>
                      )}

                      {/* Progress bar */}
                      <div style={{ margin:"14px 0" }}>
                        <div style={{ height:3, borderRadius:999, background:"rgba(255,255,255,0.04)", overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:999, width:`${progress}%`, background:`linear-gradient(90deg, ${meta.color}88, ${meta.color})`, transition:"width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
                        </div>
                      </div>

                      {/* Footer */}
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, color:"#444", fontSize:"0.78rem" }}>
                          <Users size={13} />
                          <span style={{ fontWeight:600 }}>{night.memberCount} {night.memberCount !== 1 ? "members" : "member"}</span>
                        </div>
                        <div className="night-card-arrow" style={{ display:"flex", alignItems:"center", gap:4, fontSize:"0.75rem", fontWeight:700, color:"rgba(255,255,255,0.2)", fontFamily:"'Poppins', sans-serif" }}>
                          Open <ArrowRight size={13} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── How It Works ── */}
        <div style={{ position:"relative", overflow:"hidden", borderRadius:20, padding:"2.5rem 2rem", background:"linear-gradient(160deg,#0a0a0a,#0d0d0d)", border:"1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse at 0% 50%, rgba(201,168,76,0.04) 0%, transparent 60%)" }} />
          <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(to right, transparent, rgba(201,168,76,0.15) 40%, transparent)" }} />

          <p style={{ fontSize:"0.65rem", fontWeight:800, textTransform:"uppercase", letterSpacing:"0.16em", color:"rgba(201,168,76,0.4)", marginBottom:28, fontFamily:"'Poppins', sans-serif" }}>How It Works</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
            {[
              { n:"01", title:"Create",       desc:"Start a night & share the invite code",  color:"#C9A84C", icon:"🎬" },
              { n:"02", title:"Preferences",  desc:"Everyone submits genre, time & budget",   color:"#c084fc", icon:"🎯" },
              { n:"03", title:"AI Match",     desc:"Engine finds the perfect show for all",   color:"#6ee7e7", icon:"✨" },
              { n:"04", title:"Book Together", desc:"Vote, split costs, and grab seats",       color:"#4ade80", icon:"🎟️" },
            ].map(({ n, title, desc, color, icon }, i) => (
              <div key={n} className="step-card" style={{ padding:"18px 16px", borderRadius:14, background:"rgba(255,255,255,0.015)", border:"1px solid rgba(255,255,255,0.05)", position:"relative" }}>
                {/* Connector line */}
                {i < 3 && (
                  <div className="hidden sm:block absolute top-7 left-full w-4 h-px pointer-events-none" style={{ background:"linear-gradient(90deg,rgba(255,255,255,0.06),transparent)", zIndex:0 }} />
                )}
                <div style={{ fontSize:"1.4rem", marginBottom:10 }}>{icon}</div>
                <div style={{ fontSize:"0.65rem", fontWeight:900, color, marginBottom:6, letterSpacing:"0.08em" }}>{n}</div>
                <div style={{ fontSize:"0.82rem", fontWeight:700, color:"#f0f0f0", marginBottom:6, fontFamily:"'Playfair Display', serif" }}>{title}</div>
                <div style={{ fontSize:"0.73rem", color:"#444", lineHeight:1.6, fontFamily:"'Inter', sans-serif" }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
