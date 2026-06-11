import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { Star, Ticket, AlertCircle } from "lucide-react";
import api from "../services/api.js";

declare global {
  interface Window { Razorpay: any; }
}

const getImageUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
};

interface ShowDetails {
  id: number;
  startTime: string;
  date: string;
  priceRegular: number;
  pricePremium: number;
  priceRecliner: number;
  movie: { id: number; title: string; posterUrl: string; genre: string; ratingValue: string; };
  screen: { id: number; number: number; type: string; };
  theatre: { id: number; name: string; address: string; };
}

interface Seat {
  id: number;
  row: string;
  number: number;
  category: string;
  status: string;
}

// ─── CATEGORY CONFIG ──────────────────────────────────────────────────────────
const CATEGORY_STYLES: Record<string, { idle: React.CSSProperties; hover: React.CSSProperties; label: string }> = {
  Regular: {
    idle: { border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "#555" },
    hover: { border: "1px solid rgba(212,175,55,0.4)", background: "rgba(212,175,55,0.06)", color: "#d4af37" },
    label: "Regular",
  },
  Premium: {
    idle: { border: "1px solid rgba(110,231,231,0.25)", background: "rgba(110,231,231,0.04)", color: "#4db6b6" },
    hover: { border: "1px solid rgba(110,231,231,0.6)", background: "rgba(110,231,231,0.1)", color: "#6ee7e7" },
    label: "Premium",
  },
  Recliner: {
    idle: { border: "1px solid rgba(212,175,55,0.35)", background: "rgba(212,175,55,0.05)", color: "#a08020" },
    hover: { border: "1px solid rgba(212,175,55,0.7)", background: "rgba(212,175,55,0.12)", color: "#d4af37" },
    label: "Recliner",
  },
};

const CATEGORY_ACCENT: Record<string, string> = {
  Regular:  "rgba(255,255,255,0.1)",
  Premium:  "rgba(110,231,231,0.2)",
  Recliner: "rgba(212,175,55,0.3)",
};

const ROW_ORDER = "ABCDEFGHIJKLMN";

const getScreenConfig = (type: string) => {
  const t = (type ?? "").toUpperCase();
  if (t === "IMAX") return { seatCls: "w-6 h-7", minWidth: "700px" };
  if (t === "3D")   return { seatCls: "w-7 h-7", minWidth: "630px" };
  return                   { seatCls: "w-7 h-7", minWidth: "660px" };
};

export const SeatBooking: React.FC = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [show, setShow] = useState<ShowDetails | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth", { state: { from: `/shows/${showId}/booking` } }); return; }
    const fetchSeats = async () => {
      try {
        const res = await api.get(`/bookings/shows/${showId}/seats`);
        setShow(res.data.show);
        setSeats(res.data.seats);
      } catch {
        setError("Unable to load theatre seat details.");
      } finally {
        setLoading(false);
      }
    };
    fetchSeats();
  }, [showId, user, authLoading]);

  const handleSeatClick = (seatId: number) => {
    const seat = seats.find((s) => s.id === seatId)!;
    if (seat.status === "booked") return;
    setSelectedSeats((prev) => {
      if (prev.includes(seatId)) return prev.filter((id) => id !== seatId);
      if (prev.length >= 6) {
        setError("Maximum 6 seats per booking.");
        setTimeout(() => setError(""), 4000);
        return prev;
      }
      return [...prev, seatId];
    });
  };

  const getSelectedSeatNames = () =>
    seats.filter((s) => selectedSeats.includes(s.id)).map((s) => `${s.row}${s.number}`).join(", ");

  const calculateTotalPrice = () => {
    if (!show) return 0;
    return seats
      .filter((s) => selectedSeats.includes(s.id))
      .reduce((total, seat) => {
        if (seat.category === "Premium") return total + show.pricePremium;
        if (seat.category === "Recliner") return total + show.priceRecliner;
        return total + show.priceRegular;
      }, 0);
  };

  const handleCheckoutSubmit = async () => {
    if (selectedSeats.length === 0) return;
    setError("");
    try {
      const res = await api.post("/bookings/create", { showId, seatIds: selectedSeats });
      const options = {
        key: res.data.key,
        amount: res.data.amount,
        currency: res.data.currency,
        name: "CineCircle",
        description: show?.movie.title,
        order_id: res.data.razorpayOrderId,
        handler: async function (response: any) {
          try {
            await api.post("/bookings/verify", {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
            });
            const refreshRes = await api.get(`/bookings/shows/${showId}/seats`);
            setSeats(refreshRes.data.seats);
            setSelectedSeats([]);
            navigate("/dashboard");
          } catch (err) { console.error(err); }
        },
        prefill: { name: user?.fullName, email: user?.email },
        theme: { color: "#d4af37" },
      };
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      const refreshRes = await api.get(`/bookings/shows/${showId}/seats`);
      setSeats(refreshRes.data.seats);
      setSelectedSeats([]);
    } catch (err: any) {
      setError(err.response?.data?.error || "Booking failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080808" }}>
        <div className="w-10 h-10 rounded-full border-t-2 animate-spin" style={{ borderColor: "#d4af37" }} />
      </div>
    );
  }
  if (!show) return null;

  const seatRows = Array.from(new Set(seats.map(s => s.row)))
    .sort((a, b) => ROW_ORDER.indexOf(a) - ROW_ORDER.indexOf(b));
  const screenCfg = getScreenConfig(show.screen.type);

  return (
    <div className="min-h-screen text-white pb-24 font-poppins relative" style={{ background: "#080808" }}>
      {/* FILM GRAIN */}
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none z-0"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}
      />
      {/* AMBIENT GLOW */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse at center top, rgba(212,175,55,0.05) 0%, transparent 65%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 py-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* ── SEAT GRID (left 2 cols) ───────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col items-center">
          {/* SCREEN GRAPHIC */}
          <div className={`w-full ${show.screen.type === "IMAX" ? "max-w-2xl" : "max-w-lg"} mb-14 flex flex-col items-center relative`}>
            {/* PROJECTOR BEAM */}
            <div
              className={`absolute -top-8 blur-2xl rounded-full pointer-events-none ${show.screen.type === "IMAX" ? "w-11/12 h-20" : "w-8/12 h-16"}`}
              style={{ background: show.screen.type === "IMAX" ? "rgba(212,175,55,0.09)" : show.screen.type === "3D" ? "rgba(110,231,231,0.06)" : "rgba(212,175,55,0.06)" }}
            />
            {/* SCREEN TYPE BADGE */}
            <div
              className="mb-4 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase"
              style={
                show.screen.type === "IMAX"
                  ? { background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.45)", color: "#f4d03f" }
                  : show.screen.type === "3D"
                  ? { background: "rgba(110,231,231,0.08)", border: "1px solid rgba(110,231,231,0.35)", color: "#6ee7e7" }
                  : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }
              }
            >
              {show.screen.type === "IMAX" ? "IMAX Experience" : show.screen.type === "3D" ? "3D Experience" : "Standard 2D"}
            </div>
            {/* SCREEN BAR */}
            <div
              className={`w-full rounded-full relative ${show.screen.type === "IMAX" ? "h-1" : "h-0.5"}`}
              style={{
                background: show.screen.type === "3D"
                  ? "linear-gradient(to right, transparent, rgba(110,231,231,0.4) 20%, #6ee7e7 50%, rgba(110,231,231,0.4) 80%, transparent)"
                  : "linear-gradient(to right, transparent, rgba(212,175,55,0.5) 20%, #d4af37 50%, rgba(212,175,55,0.5) 80%, transparent)",
                boxShadow: show.screen.type === "3D" ? "0 0 20px rgba(110,231,231,0.2)" : "0 0 20px rgba(212,175,55,0.2)",
              }}
            />
            {/* SCREEN PERSPECTIVE LINES */}
            <svg className={`mt-0.5 opacity-10 ${show.screen.type === "IMAX" ? "w-11/12" : "w-8/12"}`} viewBox="0 0 300 30" fill="none">
              <line x1="150" y1="0" x2="0" y2="30" stroke={show.screen.type === "3D" ? "#6ee7e7" : "#d4af37"} strokeWidth="0.5" />
              <line x1="150" y1="0" x2="300" y2="30" stroke={show.screen.type === "3D" ? "#6ee7e7" : "#d4af37"} strokeWidth="0.5" />
            </svg>
            <p className="text-[9px] tracking-[0.3em] uppercase mt-2 font-inter" style={{ color: "rgba(212,175,55,0.4)" }}>
              Screen This Way · {seats.length} seats · {seats.filter(s => s.status !== "booked").length} available
            </p>
          </div>

          {/* SEAT ROWS */}
          <div className="space-y-2 max-w-full overflow-x-auto pb-4">
            {seatRows.map((rowLetter, rowIndex) => {
              const rowSeats = seats
                .filter((s) => s.row === rowLetter)
                .sort((a, b) => a.number - b.number);
              const category = rowSeats[0]?.category || "Regular";
              const styles = CATEGORY_STYLES[category] || CATEGORY_STYLES.Regular;
              const prevCategory = rowIndex > 0
                ? seats.find(s => s.row === seatRows[rowIndex - 1])?.category
                : null;
              const isCategoryChange = !!prevCategory && prevCategory !== category;
              const { seatCls, minWidth } = screenCfg;
              const mid = Math.floor(rowSeats.length / 2);
              const leftSeats = rowSeats.slice(0, mid);
              const rightSeats = rowSeats.slice(mid);

              const renderSeatBtn = (seat: Seat) => {
                const isSelected = selectedSeats.includes(seat.id);
                const isBooked = seat.status === "booked";
                const seatStyle = isBooked
                  ? { border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)", color: "#2a2a2a", cursor: "not-allowed" }
                  : isSelected
                  ? { border: "1px solid rgba(34,197,94,0.6)", background: "rgba(34,197,94,0.15)", color: "#4ade80", boxShadow: "0 0 10px rgba(34,197,94,0.15)" }
                  : styles.idle;
                return (
                  <button
                    key={seat.id}
                    disabled={isBooked}
                    onClick={() => handleSeatClick(seat.id)}
                    className={`${seatCls} rounded-lg text-[10px] font-black font-inter transition-all flex items-center justify-center hover:scale-110`}
                    style={seatStyle}
                    onMouseEnter={(e) => {
                      if (!isBooked && !isSelected) Object.assign(e.currentTarget.style, styles.hover);
                    }}
                    onMouseLeave={(e) => {
                      if (!isBooked && !isSelected) Object.assign(e.currentTarget.style, styles.idle);
                    }}
                  >
                    {isBooked ? "×" : seat.number}
                  </button>
                );
              };

              return (
                <React.Fragment key={rowLetter}>
                  {isCategoryChange && (
                    <div className="flex items-center gap-3 my-2 opacity-70" style={{ minWidth }}>
                      <div className="flex-1 h-px" style={{ background: CATEGORY_ACCENT[category] }} />
                      <span className="text-[8px] font-black uppercase tracking-widest px-1"
                        style={{ color: CATEGORY_ACCENT[category] }}>
                        {category}
                      </span>
                      <div className="flex-1 h-px" style={{ background: CATEGORY_ACCENT[category] }} />
                    </div>
                  )}
                  <div className="flex items-center gap-2" style={{ minWidth }}>
                    <span className="w-5 text-[10px] font-black text-center font-inter flex-shrink-0" style={{ color: "rgba(212,175,55,0.4)" }}>
                      {rowLetter}
                    </span>
                    <div className="flex gap-1">
                      {leftSeats.map(renderSeatBtn)}
                      <div className="w-5 flex-shrink-0" />
                      {rightSeats.map(renderSeatBtn)}
                    </div>
                    <span className="text-[9px] font-black font-inter uppercase tracking-wider flex-shrink-0" style={{ color: "rgba(255,255,255,0.15)" }}>
                      {category}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* LEGEND */}
          <div className="flex flex-wrap gap-5 mt-12 justify-center">
            {[
              { label: "Regular", style: CATEGORY_STYLES.Regular.idle },
              { label: `Premium ₹${show.pricePremium}`, style: CATEGORY_STYLES.Premium.idle },
              { label: `Recliner ₹${show.priceRecliner}`, style: CATEGORY_STYLES.Recliner.idle },
              { label: "Selected", style: { border: "1px solid rgba(34,197,94,0.6)", background: "rgba(34,197,94,0.15)" } },
              { label: "Booked", style: { border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)" } },
            ].map(({ label, style }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded" style={style} />
                <span className="text-xs text-neutral-600 font-inter">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── CHECKOUT SIDEBAR ──────────────────────────────────────── */}
        <div className="space-y-5">
          {/* MOVIE CARD */}
          <div
            className="p-5 rounded-2xl relative overflow-hidden"
            style={{ background: "linear-gradient(160deg, #111 0%, #0c0c0c 100%)", border: "1px solid rgba(212,175,55,0.1)" }}
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.3) 40%, transparent)" }} />
            <div className="flex gap-4">
              <img
                src={getImageUrl(show.movie.posterUrl)}
                alt={show.movie.title}
                className="w-20 aspect-[2/3] object-cover rounded-xl flex-shrink-0"
                style={{ border: "1px solid rgba(212,175,55,0.15)" }}
              />
              <div>
                <h3 className="font-black text-white text-sm leading-tight">{show.movie.title}</h3>
                <span className="text-[10px] font-black tracking-wider uppercase mt-1.5 inline-block" style={{ color: "#d4af37" }}>
                  {show.movie.genre.split("/")[0]}
                </span>
                <div className="flex items-center gap-1 mt-2 text-xs text-neutral-600 font-inter">
                  <Star className="w-3 h-3 fill-[#d4af37] text-[#d4af37]" />
                  <span>{show.movie.ratingValue} / 10</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 space-y-2.5 font-inter text-xs text-neutral-600" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              {[
                { label: "Theatre", value: show.theatre.name },
                { label: "Date & Time", value: `${show.date} @ ${show.startTime}` },
                { label: "Screen", value: `${show.screen?.type} · Screen ${show.screen.number}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span>{label}</span>
                  <span className="font-bold text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* BOOKING SUMMARY */}
          <div
            className="p-5 rounded-2xl"
            style={{ background: "linear-gradient(160deg, #111 0%, #0c0c0c 100%)", border: "1px solid rgba(212,175,55,0.1)" }}
          >
            <h4 className="font-black text-sm text-white mb-4 flex items-center gap-2">
              <Ticket className="w-4 h-4" style={{ color: "#d4af37" }} /> Booking Summary
            </h4>

            {error && (
              <div
                className="mb-4 p-3.5 rounded-xl flex items-center gap-2 text-xs font-inter"
                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-red-400">{error}</span>
              </div>
            )}

            <div className="space-y-3 font-inter text-xs text-neutral-600 mb-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="flex justify-between">
                <span>Selected Seats</span>
                <span className="font-black text-white truncate max-w-[140px]">{getSelectedSeatNames() || "None"}</span>
              </div>
              <div className="flex justify-between">
                <span>Seat Count</span>
                <span className="font-black text-white">{selectedSeats.length}</span>
              </div>
            </div>

            {/* TOTAL */}
            <div className="flex justify-between items-center mb-5">
              <span className="font-black text-white">Total Amount</span>
              <span className="text-2xl font-black" style={{ color: "#d4af37" }}>
                ₹{calculateTotalPrice()}
              </span>
            </div>

            <button
              onClick={handleCheckoutSubmit}
              disabled={selectedSeats.length === 0}
              className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none"
              style={{
                background: selectedSeats.length > 0 ? "linear-gradient(135deg, #d4af37, #f4d03f)" : "rgba(255,255,255,0.04)",
                color: selectedSeats.length > 0 ? "#000" : "#333",
                boxShadow: selectedSeats.length > 0 ? "0 8px 24px rgba(212,175,55,0.25)" : "none",
              }}
            >
              {selectedSeats.length > 0 ? `Confirm & Pay ₹${calculateTotalPrice()}` : "Select Seats to Continue"}
            </button>

            {selectedSeats.length > 0 && (
              <p className="text-[10px] text-neutral-700 text-center mt-3 font-inter">
                Secure payment powered by Razorpay
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
