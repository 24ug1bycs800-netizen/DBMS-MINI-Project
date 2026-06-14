import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { CheckCircle, Calendar, Clock, MapPin, Monitor, Ticket, Home, LayoutDashboard } from "lucide-react";
import api from "../services/api.js";

const getImageUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
};

const CATEGORY_COLOR: Record<string, string> = {
  Regular:  "rgba(255,255,255,0.12)",
  Premium:  "rgba(255,255,255,0.18)",
  Recliner: "rgba(201,168,76,0.35)",
};
const CATEGORY_TEXT: Record<string, string> = {
  Regular:  "#aaa",
  Premium:  "rgba(255,255,255,0.65)",
  Recliner: "#C9A84C",
};

export const BookingConfirmation: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    api.get(`/bookings/confirm/${code}`)
      .then(r => setData(r.data))
      .catch(() => setError("Booking not found or access denied."))
      .finally(() => setLoading(false));
  }, [code, user, authLoading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080808" }}>
        <div className="w-10 h-10 rounded-full border-t-2 animate-spin" style={{ borderColor: "#C9A84C" }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#080808" }}>
        <p className="text-neutral-400 font-inter text-sm">{error || "Something went wrong."}</p>
        <Link to="/dashboard" className="text-[#C9A84C] text-sm font-bold hover:underline">Go to Dashboard</Link>
      </div>
    );
  }

  const { booking, show, movie, screen, theatre, seats } = data;
  const byCategory = (seats as any[]).reduce((acc: Record<string, any[]>, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen text-white pb-20 font-poppins" style={{ background: "#080808" }}>
      {/* ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[260px] pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse at center top, rgba(34,197,94,0.06) 0%, transparent 65%)" }} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-14">
        {/* ── SUCCESS HEADER ── */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Booking Confirmed!</h1>
          <p className="text-sm text-neutral-500 font-inter">Your seats are locked in. Enjoy the show.</p>
        </div>

        {/* ── TICKET CARD ── */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.2)", background: "#0d0d0d" }}>
          {/* gold top stripe */}
          <div className="h-1 w-full" style={{ background: "linear-gradient(to right, transparent, #C9A84C 30%, #E8C96A 50%, #C9A84C 70%, transparent)" }} />

          {/* movie info */}
          <div className="flex gap-4 p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <img
              src={getImageUrl(movie.posterUrl)} alt={movie.title}
              className="w-20 aspect-[2/3] object-cover rounded-xl flex-shrink-0"
              style={{ border: "1px solid rgba(201,168,76,0.2)" }}
            />
            <div className="flex flex-col justify-center">
              <h2 className="font-black text-lg text-white leading-tight">{movie.title}</h2>
              <span className="text-[10px] font-black tracking-wider uppercase mt-1" style={{ color: "#C9A84C" }}>
                {movie.genre?.split("/")[0]}
              </span>
              <span className="text-xs text-neutral-500 font-inter mt-1">{show.language || movie.language}</span>
            </div>
          </div>

          {/* show details */}
          <div className="grid grid-cols-2 gap-0 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            {[
              { icon: <Calendar className="w-3.5 h-3.5" />, label: "Date", value: show.date },
              { icon: <Clock className="w-3.5 h-3.5" />,    label: "Time", value: show.startTime },
              { icon: <MapPin className="w-3.5 h-3.5" />,   label: "Theatre", value: theatre.name },
              { icon: <Monitor className="w-3.5 h-3.5" />,  label: "Screen", value: `${screen.type} · Screen ${screen.number}` },
            ].map(({ icon, label, value }) => (
              <div key={label} className="p-4 flex items-start gap-2.5 border-b border-r"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <span style={{ color: "rgba(201,168,76,0.5)", marginTop: 2 }}>{icon}</span>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-600 font-inter">{label}</p>
                  <p className="text-xs font-bold text-white mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* seats */}
          <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <p className="text-[9px] uppercase tracking-widest text-neutral-600 font-inter mb-3">Seats</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(byCategory).map(([cat, catSeats]) => (
                <div key={cat} className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider mr-1" style={{ color: CATEGORY_TEXT[cat] ?? "#aaa" }}>{cat}</span>
                  {(catSeats as any[]).sort((a, b) => a.row.localeCompare(b.row) || a.number - b.number).map(s => (
                    <span key={s.id} className="px-2 py-1 rounded-md text-[10px] font-black font-inter"
                      style={{ background: CATEGORY_COLOR[cat] ?? "rgba(255,255,255,0.1)", color: CATEGORY_TEXT[cat] ?? "#aaa" }}>
                      {s.row}{s.number}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* booking code + amount */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-neutral-600 font-inter mb-1">Booking Code</p>
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4" style={{ color: "#C9A84C" }} />
                <span className="font-black text-lg tracking-widest" style={{ color: "#C9A84C" }}>{booking.code}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-widest text-neutral-600 font-inter mb-1">Total Paid</p>
              <p className="font-black text-xl text-white">₹{booking.totalAmount}</p>
            </div>
          </div>

          {/* status bar */}
          <div className="px-5 pb-5">
            <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
              style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ade80" }}>
              <CheckCircle className="w-3.5 h-3.5" />
              {booking.status.toUpperCase()}
            </div>
          </div>
        </div>

        {/* ── ACTIONS ── */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => navigate("/")}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
          >
            <Home className="w-4 h-4" /> Home
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
            style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96A)", color: "#000" }}
          >
            <LayoutDashboard className="w-4 h-4" /> My Bookings
          </button>
        </div>
      </div>
    </div>
  );
};
