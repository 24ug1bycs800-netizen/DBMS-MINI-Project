import React, { useEffect, useMemo, useState } from "react";
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

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const ROW_ORDER = "ABCDEFGHIJKLMN";

const ZONE_CONFIG: Record<string, {
  color: string; glow: string; bg: string; border: string;
  label: string; priceKey: "priceRecliner" | "pricePremium" | "priceRegular";
}> = {
  Recliner: {
    color: "#c9a84c", glow: "rgba(201,168,76,0.12)",
    bg: "rgba(201,168,76,0.04)", border: "rgba(201,168,76,0.14)",
    label: "RECLINER", priceKey: "priceRecliner",
  },
  Premium: {
    color: "rgba(255,255,255,0.7)", glow: "rgba(255,255,255,0.06)",
    bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.12)",
    label: "PREMIUM", priceKey: "pricePremium",
  },
  Regular: {
    color: "rgba(255,255,255,0.35)", glow: "rgba(255,255,255,0.04)",
    bg: "transparent", border: "transparent",
    label: "REGULAR", priceKey: "priceRegular",
  },
};

const SEAT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  booked:   { bg: "rgba(255,255,255,0.02)",  border: "rgba(255,255,255,0.05)", text: "rgba(255,255,255,0.08)" },
  selected: { bg: "rgba(201,168,76,0.18)",   border: "rgba(201,168,76,0.85)",  text: "#c9a84c" },
  Regular:  { bg: "rgba(255,255,255,0.04)",  border: "rgba(255,255,255,0.18)", text: "rgba(255,255,255,0.4)" },
  Premium:  { bg: "rgba(255,255,255,0.05)",  border: "rgba(255,255,255,0.28)", text: "rgba(255,255,255,0.65)" },
  Recliner: { bg: "rgba(201,168,76,0.07)",   border: "rgba(201,168,76,0.45)",  text: "#c9a84c" },
};

// Splits a row into left-wing | (optional center) | right-wing
const getRowSections = (rowSeats: Seat[]) => {
  const n = rowSeats.length;
  if (n <= 8) {
    const mid = Math.floor(n / 2);
    return { left: rowSeats.slice(0, mid), center: null as Seat[] | null, right: rowSeats.slice(mid) };
  }
  const wing = Math.max(3, Math.floor(n * 0.25));
  return {
    left:   rowSeats.slice(0, wing),
    center: rowSeats.slice(wing, n - wing),
    right:  rowSeats.slice(n - wing),
  };
};

// ─── SEAT BUTTON (cinema seat shape: backrest + cushion) ─────────────────────

const SeatBtn: React.FC<{
  seat: Seat;
  isSelected: boolean;
  onClick: () => void;
}> = ({ seat, isSelected, onClick }) => {
  const isBooked = seat.status === "booked";
  const c = isBooked
    ? SEAT_COLORS.booked
    : isSelected
    ? SEAT_COLORS.selected
    : (SEAT_COLORS[seat.category] ?? SEAT_COLORS.Regular);
  const glow = isSelected ? "0 0 10px rgba(201,168,76,0.3)" : "none";

  return (
    <button
      disabled={isBooked}
      onClick={onClick}
      className="flex flex-col items-center transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed focus:outline-none"
      title={isBooked ? "Booked" : `${seat.row}${seat.number}`}
    >
      {/* Backrest */}
      <div style={{
        width: 22, height: 14,
        background: c.bg,
        border: `1.2px solid ${c.border}`,
        borderRadius: "4px 4px 0 0",
        borderBottom: "none",
        boxShadow: glow,
      }} />
      {/* Cushion with seat number */}
      <div style={{
        width: 26, height: 13,
        background: c.bg,
        border: `1.2px solid ${c.border}`,
        borderRadius: "0 0 3px 3px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 8,
        fontWeight: 900,
        fontFamily: "monospace",
        color: c.text,
        boxShadow: glow,
      }}>
        {isBooked ? "×" : seat.number}
      </div>
    </button>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export const SeatBooking: React.FC = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [show, setShow] = useState<ShowDetails | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lockExpiry, setLockExpiry] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState("");

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

  // 5-min countdown — starts on first seat pick, resets when all deselected
  useEffect(() => {
    if (selectedSeats.length > 0 && !lockExpiry) {
      setLockExpiry(new Date(Date.now() + 5 * 60 * 1000));
    }
    if (selectedSeats.length === 0) { setLockExpiry(null); setTimeLeft(""); }
  }, [selectedSeats.length]);

  useEffect(() => {
    if (!lockExpiry) return;
    const tick = () => {
      const rem = lockExpiry.getTime() - Date.now();
      if (rem <= 0) {
        setSelectedSeats([]); setLockExpiry(null); setTimeLeft("");
        setError("Your seat selection expired. Please reselect.");
        return;
      }
      const m = Math.floor(rem / 60000);
      const s = Math.floor((rem % 60000) / 1000);
      setTimeLeft(`${m}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockExpiry]);

  const handleSeatClick = (seatId: number) => {
    const seat = seats.find(s => s.id === seatId)!;
    if (seat.status === "booked") return;
    setSelectedSeats(prev => {
      if (prev.includes(seatId)) return prev.filter(id => id !== seatId);
      if (prev.length >= 6) {
        setError("Maximum 6 seats per booking.");
        setTimeout(() => setError(""), 4000);
        return prev;
      }
      return [...prev, seatId];
    });
  };

  const getSelectedSeatNames = () =>
    seats.filter(s => selectedSeats.includes(s.id)).map(s => `${s.row}${s.number}`).join(", ");

  const calculateTotalPrice = () => {
    if (!show) return 0;
    return seats.filter(s => selectedSeats.includes(s.id)).reduce((total, seat) => {
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
            const verifyRes = await api.post("/bookings/verify", {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            navigate(`/booking/confirm/${verifyRes.data.ticketCode}`);
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

  // Group seat rows into category zones (Recliner → Premium → Regular, top to bottom)
  const seatRows = useMemo(() =>
    Array.from(new Set(seats.map(s => s.row))).sort((a, b) => ROW_ORDER.indexOf(a) - ROW_ORDER.indexOf(b)),
    [seats]
  );

  const categoryZones = useMemo(() => {
    const zones: { category: string; rows: string[] }[] = [];
    for (const row of seatRows) {
      const cat = seats.find(s => s.row === row)?.category ?? "Regular";
      const last = zones[zones.length - 1];
      if (last && last.category === cat) last.rows.push(row);
      else zones.push({ category: cat, rows: [row] });
    }
    return zones;
  }, [seatRows, seats]);

  const isImax = show?.screen.type === "IMAX";
  const is3D   = show?.screen.type === "3D";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080808" }}>
        <div className="w-10 h-10 rounded-full border-t-2 animate-spin" style={{ borderColor: "#d4af37" }} />
      </div>
    );
  }
  if (!show) return null;

  return (
    <div className="min-h-screen text-white pb-24 font-poppins relative" style={{ background: "#080808" }}>
      {/* Film grain */}
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none z-0"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse at center top, rgba(212,175,55,0.05) 0%, transparent 65%)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* ── SEAT GRID ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col items-center">

          {/* SCREEN GRAPHIC */}
          <div className={`w-full mb-12 flex flex-col items-center relative ${isImax ? "max-w-2xl" : "max-w-xl"}`}>
            {/* Screen type badge */}
            <div className="mb-4 px-3.5 py-1 text-[9px] font-semibold tracking-[0.18em] uppercase font-inter" style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: isImax ? "#c9a84c" : "rgba(255,255,255,0.4)",
              borderRadius: 4,
            }}>
              {isImax ? "IMAX" : is3D ? "3D" : "Standard"}
            </div>

            {/* Screen bar */}
            <div className={`w-full ${isImax ? "h-0.5" : "h-px"}`} style={{
              background: "linear-gradient(to right, transparent, rgba(255,255,255,0.15) 20%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.15) 80%, transparent)",
            }} />

            {/* Perspective lines */}
            <svg className={`mt-0.5 opacity-[0.06] ${isImax ? "w-10/12" : "w-7/12"}`} viewBox="0 0 300 30" fill="none">
              <line x1="150" y1="0" x2="0"   y2="30" stroke="#ffffff" strokeWidth="0.6" />
              <line x1="150" y1="0" x2="300" y2="30" stroke="#ffffff" strokeWidth="0.6" />
            </svg>

            <p className="text-[9px] tracking-[0.3em] uppercase mt-2 font-inter" style={{ color: "rgba(212,175,55,0.35)" }}>
              All Eyes This Way · {seats.length} seats · {seats.filter(s => s.status !== "booked").length} available
            </p>
          </div>

          {/* SEAT ZONES */}
          <div className="overflow-x-auto pb-4 w-full flex flex-col items-center">
            <div className="space-y-4">
              {categoryZones.map(({ category, rows }) => {
                const zone = ZONE_CONFIG[category] ?? ZONE_CONFIG.Regular;
                const price = show[zone.priceKey];

                return (
                  <div key={category}>
                    {/* Zone header */}
                    <div className="flex items-center gap-3 mb-2.5 px-1">
                      <div className="flex-1 h-px" style={{ background: zone.border || "rgba(255,255,255,0.07)" }} />
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: zone.color }}>
                          {zone.label}
                        </span>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-md" style={{
                          background: zone.glow, color: zone.color,
                          border: `1px solid ${zone.border || "rgba(255,255,255,0.07)"}`,
                        }}>
                          ₹{price}
                        </span>
                        <span className="text-[9px] text-neutral-700 font-inter">{rows.length} row{rows.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex-1 h-px" style={{ background: zone.border || "rgba(255,255,255,0.07)" }} />
                    </div>

                    {/* Rows */}
                    <div className="space-y-2">
                      {rows.map(rowLetter => {
                        const rowSeats = seats
                          .filter(s => s.row === rowLetter)
                          .sort((a, b) => a.number - b.number);
                        const { left, center, right } = getRowSections(rowSeats);

                        return (
                          <div key={rowLetter} className="flex items-center gap-1.5">
                            {/* Left row label */}
                            <span className="w-5 text-center text-[10px] font-black font-mono flex-shrink-0"
                              style={{ color: "rgba(212,175,55,0.3)" }}>
                              {rowLetter}
                            </span>

                            {/* Left wing */}
                            <div className="flex gap-1">
                              {left.map(seat => (
                                <SeatBtn
                                  key={seat.id}
                                  seat={seat}
                                  isSelected={selectedSeats.includes(seat.id)}
                                  onClick={() => handleSeatClick(seat.id)}
                                />
                              ))}
                            </div>

                            {/* Aisle gap */}
                            <div className="w-5 flex-shrink-0" />

                            {/* Center section */}
                            {center && (
                              <>
                                <div className="flex gap-1">
                                  {center.map(seat => (
                                    <SeatBtn
                                      key={seat.id}
                                      seat={seat}
                                      isSelected={selectedSeats.includes(seat.id)}
                                      onClick={() => handleSeatClick(seat.id)}
                                    />
                                  ))}
                                </div>
                                {/* Aisle gap */}
                                <div className="w-5 flex-shrink-0" />
                              </>
                            )}

                            {/* Right wing */}
                            <div className="flex gap-1">
                              {right.map(seat => (
                                <SeatBtn
                                  key={seat.id}
                                  seat={seat}
                                  isSelected={selectedSeats.includes(seat.id)}
                                  onClick={() => handleSeatClick(seat.id)}
                                />
                              ))}
                            </div>

                            {/* Right row label */}
                            <span className="w-5 text-center text-[10px] font-black font-mono flex-shrink-0"
                              style={{ color: "rgba(212,175,55,0.3)" }}>
                              {rowLetter}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LEGEND */}
          <div className="flex flex-wrap gap-5 mt-12 justify-center">
            {[
              { label: `Regular ₹${show.priceRegular}`,  c: SEAT_COLORS.Regular  },
              { label: `Premium ₹${show.pricePremium}`,  c: SEAT_COLORS.Premium  },
              { label: `Recliner ₹${show.priceRecliner}`, c: SEAT_COLORS.Recliner },
              { label: "Selected",                        c: SEAT_COLORS.selected },
              { label: "Booked",                          c: SEAT_COLORS.booked   },
            ].map(({ label, c }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div style={{ width: 16, height: 10, background: c.bg, border: `1.2px solid ${c.border}`, borderRadius: "3px 3px 0 0", borderBottom: "none" }} />
                  <div style={{ width: 19, height: 9,  background: c.bg, border: `1.2px solid ${c.border}`, borderRadius: "0 0 2px 2px" }} />
                </div>
                <span className="text-[10px] text-neutral-600 font-inter">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── CHECKOUT SIDEBAR ───────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Movie card */}
          <div className="p-5 rounded-2xl relative overflow-hidden"
            style={{ background: "linear-gradient(160deg, #111 0%, #0c0c0c 100%)", border: "1px solid rgba(212,175,55,0.1)" }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.3) 40%, transparent)" }} />
            <div className="flex gap-4">
              <img src={getImageUrl(show.movie.posterUrl)} alt={show.movie.title}
                className="w-20 aspect-[2/3] object-cover rounded-xl flex-shrink-0"
                style={{ border: "1px solid rgba(212,175,55,0.15)" }} />
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
            <div className="mt-5 pt-4 space-y-2.5 font-inter text-xs text-neutral-600"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              {[
                { label: "Theatre",    value: show.theatre.name },
                { label: "Date & Time", value: `${show.date} @ ${show.startTime}` },
                { label: "Screen",     value: `${show.screen.type} · Screen ${show.screen.number}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span>{label}</span>
                  <span className="font-bold text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Booking summary */}
          <div className="p-5 rounded-2xl"
            style={{ background: "linear-gradient(160deg, #111 0%, #0c0c0c 100%)", border: "1px solid rgba(212,175,55,0.1)" }}>
            <h4 className="font-black text-sm text-white mb-4 flex items-center gap-2">
              <Ticket className="w-4 h-4" style={{ color: "#d4af37" }} /> Booking Summary
            </h4>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl flex items-center gap-2 text-xs font-inter"
                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-red-400">{error}</span>
              </div>
            )}

            <div className="space-y-3 font-inter text-xs text-neutral-600 mb-5 pb-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="flex justify-between">
                <span>Selected Seats</span>
                <span className="font-black text-white truncate max-w-[140px]">{getSelectedSeatNames() || "None"}</span>
              </div>
              <div className="flex justify-between">
                <span>Seat Count</span>
                <span className="font-black text-white">{selectedSeats.length} <span className="text-neutral-700 font-normal">/ 6 max</span></span>
              </div>
            </div>

            <div className="flex justify-between items-center mb-5">
              <span className="font-black text-white">Total Amount</span>
              <span className="text-2xl font-black" style={{ color: "#d4af37" }}>₹{calculateTotalPrice()}</span>
            </div>

            <button
              onClick={handleCheckoutSubmit}
              disabled={selectedSeats.length === 0}
              className="w-full py-3 font-semibold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-25 disabled:pointer-events-none"
              style={{
                background: selectedSeats.length > 0 ? "#c9a84c" : "rgba(255,255,255,0.04)",
                color: selectedSeats.length > 0 ? "#000" : "rgba(255,255,255,0.2)",
                borderRadius: 7,
              }}
            >
              {selectedSeats.length > 0 ? `Confirm & Pay ₹${calculateTotalPrice()}` : "Select Seats to Continue"}
            </button>

            {selectedSeats.length > 0 && timeLeft && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-inter"
                style={{ color: parseInt(timeLeft) <= 1 ? "#f87171" : "rgba(212,175,55,0.6)" }}>
                <span>Selection expires in</span>
                <span className="font-black tabular-nums">{timeLeft}</span>
              </div>
            )}
            {selectedSeats.length > 0 && !timeLeft && (
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
