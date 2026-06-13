import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import jsPDF from "jspdf";
import QRCode from "qrcode";

import {
  Ticket,
  Heart,
  Moon,
  Download,
  ExternalLink,
  LogOut,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import api from "../services/api.js";

export const Dashboard: React.FC = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [nights, setNights] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"bookings" | "wishlist" | "nights">("bookings");
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    const fetchDashboardData = async () => {
      try {
        const bookingsRes = await api.get("/bookings/my-bookings");
        setBookings(bookingsRes.data.bookings);
        const wishRes = await api.get("/bookings/wishlist");
        setWishlist(wishRes.data.wishlist);
        const nightsRes = await api.get("/movie-nights");
        setNights(nightsRes.data.movieNights);
      } catch (err) {
        console.error("Failed to load dashboard statistics:", err);
      }
    };
    fetchDashboardData();
  }, [user, authLoading]);

  const isCancellable = (booking: any): boolean => {
    const date = booking.show?.date;
    const startTime = booking.show?.startTime;
    if (!date || !startTime) return false;
    const [time, period] = startTime.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    const [year, month, day] = date.split("-").map(Number);
    const showAt = new Date(year, month - 1, day, hours, minutes);
    return (showAt.getTime() - Date.now()) > 3 * 60 * 60 * 1000;
  };

  const handleCancelBooking = async (bookingId: number) => {
    setCancelling(true);
    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      setBookings((prev) =>
        prev.map((b) => b.id === bookingId ? { ...b, status: "cancelled" } : b)
      );
    } catch (err) {
      console.error("Failed to cancel booking", err);
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  const handlePrintTicket = async (booking: any) => {
    const doc = new jsPDF("landscape");
    doc.setFillColor(18, 18, 18);
    doc.roundedRect(8, 8, 281, 135, 8, 8, "F");
    doc.setDrawColor(255, 215, 0);
    doc.roundedRect(10, 10, 277, 131, 6, 6);
    doc.setTextColor(25, 25, 25);
    doc.setFontSize(52);
    doc.text("CINECIRCLE", 75, 85);
    try {
      const poster = new Image();
      poster.crossOrigin = "anonymous";
      poster.src = booking.movie.posterUrl;
      await new Promise((resolve, reject) => {
        poster.onload = resolve;
        poster.onerror = reject;
      });
      doc.addImage(poster, "JPEG", 20, 22, 42, 62);
      doc.setDrawColor(255, 215, 0);
      doc.roundedRect(19, 21, 44, 64, 2, 2);
    } catch {
      console.log("Poster load failed");
    }
    doc.setTextColor(255, 215, 0);
    doc.setFontSize(28);
    doc.text("CineCircle", 75, 28);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text("Premium Movie Ticket", 75, 38);
    for (let y = 15; y < 125; y += 4) {
      doc.line(180, y, 180, y + 2);
    }
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180);
    doc.text("MOVIE", 65, 60);
    doc.text("THEATRE", 65, 80);
    doc.text("DATE & TIME", 65, 102);
    doc.text("SEATS", 65, 122);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(booking.movie.title, 65, 70);
    doc.setFontSize(14);
    doc.text(booking.theatre.name, 65, 90);
    doc.text(`${booking.show.date} • ${booking.show.startTime}`, 65, 112);
    doc.setFontSize(16);
    doc.text(booking.seats.map((s: any) => `${s.row}${s.number}`).join(", "), 65, 128);
    doc.setDrawColor(255, 215, 0);
    doc.roundedRect(195, 20, 65, 30, 4, 4);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text("TICKET CODE", 214, 30);
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(booking.code, 202, 42);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`Booking #${booking.id}`, 202, 51);
    doc.text("AMOUNT PAID", 195, 72);
    doc.setFontSize(18);
    doc.text(`Rs ${booking.totalAmount}`, 195, 86);
    const qrData = `Movie: ${booking.movie.title}\nTheatre: ${booking.theatre.name}\nDate: ${booking.show.date}\nTime: ${booking.show.startTime}\nSeats: ${booking.seats.map((s: any) => `${s.row}${s.number}`).join(", ")}\nTicket Code: ${booking.code}\nBooking ID: ${booking.id}`;
    const qrImage = await QRCode.toDataURL(qrData);
    doc.text("SCAN AT ENTRY", 205, 98);
    doc.addImage(qrImage, "PNG", 205, 102, 22, 22);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Please carry a valid ID proof. Enjoy your movie!", 65, 136);
    doc.text("www.cinecircle.com", 205, 136);
    doc.save(`ticket-${booking.code}.pdf`);
  };

  if (!user) return null;

  const tabs = [
    { key: "bookings", label: "My Bookings", icon: Ticket, count: bookings.length },
    { key: "wishlist", label: "Wishlist", icon: Heart, count: wishlist.length },
    { key: "nights", label: "Movie Nights", icon: Moon, count: nights.length },
  ] as const;

  return (
    <div
      className="min-h-screen text-white pb-20 font-poppins relative"
      style={{ background: "#080808" }}
    >
      {/* FILM GRAIN */}
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 py-12 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* ─── SIDEBAR ─── */}
        <div
          className="lg:col-span-1 rounded-lg flex flex-col items-center text-center p-6"
          style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* AVATAR */}
          <div className="mb-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold uppercase"
              style={{
                background: "rgba(201,168,76,0.08)",
                border: "1px solid rgba(201,168,76,0.25)",
                color: "#c9a84c",
              }}
            >
              {user.fullName.substring(0, 2)}
            </div>
          </div>

          <h2 className="font-semibold text-white text-base leading-tight">{user.fullName}</h2>
          <span
            className="mt-2 px-2.5 py-0.5 text-[9px] font-semibold tracking-[0.18em] uppercase font-inter"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.35)",
              borderRadius: 4,
            }}
          >
            {user.role}
          </span>
          <p className="text-xs font-inter mt-3 truncate max-w-full" style={{ color: "rgba(255,255,255,0.28)" }}>{user.email}</p>

          {/* STATS STRIP */}
          <div
            className="w-full mt-6 grid grid-cols-3 rounded-lg overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {[
              { val: bookings.length, label: "Tickets" },
              { val: wishlist.length, label: "Saved" },
              { val: nights.length, label: "Nights" },
            ].map(({ val, label }, i) => (
              <div key={label} className="flex flex-col items-center py-3"
                style={{ borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <span className="text-base font-bold" style={{ color: "#c9a84c" }}>{val}</span>
                <span className="text-[9px] font-inter uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>{label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => { logout(); navigate("/"); }}
            className="mt-5 w-full py-2.5 text-xs font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-75"
            style={{
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.15)",
              color: "rgba(248,113,113,0.8)",
              borderRadius: 7,
            }}
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <div className="lg:col-span-3 space-y-6">
          {/* TAB STRIP */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)" }}>
            {tabs.map(({ key, label, icon: Icon, count }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className="flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  style={
                    active
                      ? { background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.22)", color: "#c9a84c" }
                      : { color: "rgba(255,255,255,0.28)", border: "1px solid transparent" }
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  <span
                    className="px-1.5 py-0.5 text-[9px] font-semibold"
                    style={{
                      background: active ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)",
                      color: active ? "#c9a84c" : "rgba(255,255,255,0.25)",
                      borderRadius: 3,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── BOOKINGS TAB ── */}
          {activeTab === "bookings" && (
            <div className="space-y-4">
              {bookings.length > 0 ? (
                bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-2xl overflow-hidden relative"
                    style={{
                      background: "#0f0f0f",
                      border: "1px solid rgba(212,175,55,0.1)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    }}
                  >
                    {/* GOLD GLOW BEHIND CANCELLED ITEMS */}
                    {booking.status === "cancelled" && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: "radial-gradient(ellipse at top right, rgba(239,68,68,0.04), transparent 60%)",
                        }}
                      />
                    )}

                    <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                      {/* POSTER + INFO */}
                      <div className="md:col-span-3 flex gap-4">
                        <div className="relative flex-shrink-0">
                          <img
                            src={booking.movie.posterUrl}
                            alt="pic"
                            className="w-16 sm:w-20 aspect-[2/3] object-cover rounded-xl"
                            style={{ border: "1px solid rgba(212,175,55,0.15)" }}
                          />
                        </div>
                        <div>
                          <h4 className="font-black text-white text-base leading-snug">{booking.movie.title}</h4>
                          <span className="text-[10px] font-black tracking-widest uppercase mt-1 inline-block" style={{ color: "#d4af37" }}>
                            {booking.movie.genre.split("/")[0]}
                          </span>
                          <div className="mt-3.5 grid grid-cols-2 gap-x-6 gap-y-1.5 font-inter text-xs text-neutral-600">
                            <div>Theatre: <strong className="text-white">{booking.theatre.name}</strong></div>
                            <div>Date: <strong className="text-white">{booking.show.date} @ {booking.show.startTime}</strong></div>
                            <div>
                              Seats:{" "}
                              <strong style={{ color: "#d4af37" }}>
                                {booking.seats.map((s: any) => `${s.row}${s.number}`).join(", ")}
                              </strong>
                            </div>
                            <div>
                              Code:{" "}
                              <strong className="text-white font-mono">{booking.code}</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* PRICE + ACTIONS */}
                      <div
                        className="md:col-span-1 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 flex flex-col gap-3 items-center text-center"
                        style={{ borderColor: "rgba(212,175,55,0.08)" }}
                      >
                        <div className="text-[10px] text-neutral-600 font-inter uppercase tracking-wider">Amount paid</div>
                        <div className="text-2xl font-black" style={{ color: "#d4af37" }}>
                          ₹{booking.totalAmount}
                        </div>
                        <span
                          className="text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full"
                          style={
                            booking.status === "cancelled"
                              ? { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }
                              : { background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)" }
                          }
                        >
                          {booking.status === "cancelled" ? "Cancelled" : "Confirmed"}
                        </span>

                        {booking.status !== "cancelled" ? (
                          <>
                            <button
                              onClick={() => handlePrintTicket(booking)}
                              className="w-full px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-85"
                              style={{
                                background: "rgba(212,175,55,0.07)",
                                border: "1px solid rgba(212,175,55,0.25)",
                                color: "#d4af37",
                              }}
                            >
                              <Download className="w-3.5 h-3.5" /> Download Pass
                            </button>
                            <button
                              onClick={() => setCancelTarget(booking)}
                              className="w-full px-4 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-85"
                              style={{
                                background: "rgba(239,68,68,0.08)",
                                border: "1px solid rgba(239,68,68,0.2)",
                                color: "#f87171",
                              }}
                            >
                              Cancel Ticket
                            </button>
                          </>
                        ) : (
                          <span
                            className="w-full px-4 py-2 rounded-xl text-xs font-bold text-center"
                            style={{ background: "rgba(239,68,68,0.05)", color: "#f87171" }}
                          >
                            Ticket Cancelled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<Ticket className="w-8 h-8" />}
                  message="No tickets yet. Book a screening to see your passes here."
                />
              )}
            </div>
          )}

          {/* ── WISHLIST TAB ── */}
          {activeTab === "wishlist" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {wishlist.length > 0 ? (
                wishlist.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => navigate(`/movies/${movie.id}`)}
                    className="group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                    style={{ border: "1px solid rgba(212,175,55,0.08)", background: "#111" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.35)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.08)")}
                  >
                    <div className="relative aspect-[2/3] overflow-hidden">
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-3">
                      <h4 className="font-black text-xs truncate text-white group-hover:text-[#d4af37] transition-colors">
                        {movie.title}
                      </h4>
                      <p className="text-[9px] text-neutral-600 font-inter mt-0.5">{movie.genre.split("/")[0]}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-4">
                  <EmptyState icon={<Heart className="w-8 h-8" />} message="No films wishlisted yet. Explore what's showing." />
                </div>
              )}
            </div>
          )}

          {/* ── MOVIE NIGHTS TAB ── */}
          {activeTab === "nights" && (
            <div className="space-y-3">
              {nights.length > 0 ? (
                nights.map((night) => (
                  <div
                    key={night.id}
                    onClick={() => navigate(`/movie-nights/${night.id}`)}
                    className="p-5 rounded-2xl cursor-pointer transition-opacity hover:opacity-85 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden group"
                    style={{
                      background: "#0f0f0f",
                      border: "1px solid rgba(212,175,55,0.08)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.08)")}
                  >
                    <div className="flex gap-4 items-center">
                      <div
                        className="p-3 rounded-xl flex-shrink-0"
                        style={{
                          background: "rgba(212,175,55,0.08)",
                          border: "1px solid rgba(212,175,55,0.2)",
                        }}
                      >
                        <Moon className="w-5 h-5" style={{ color: "#d4af37" }} />
                      </div>
                      <div>
                        <h4 className="font-black text-white text-sm group-hover:text-[#d4af37] transition-colors">
                          {night.title}
                        </h4>
                        <span className="text-[10px] text-neutral-600 font-inter mt-1 inline-block">
                          Code:{" "}
                          <strong className="font-mono" style={{ color: "#d4af37" }}>{night.inviteCode}</strong>
                          {" "}· {night.myRole === "ORGANIZER" ? "Organizer" : "Member"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 font-inter text-xs text-neutral-600">
                      <span>Members: <strong className="text-white">{night.memberCount}</strong></span>
                      <span
                        className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
                        style={
                          night.status === "BOOKED"
                            ? { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }
                            : night.status === "CANCELLED" || night.status === "REJECTED"
                              ? { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }
                              : { background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37" }
                        }
                      >
                        {night.status.replace(/_/g, " ")}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-neutral-700 group-hover:text-[#d4af37] transition-colors" />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={<Moon className="w-8 h-8" />} message="No movie nights yet. Plan one with your squad!" />
              )}
            </div>
          )}
        </div>
      </div>

    {/* ── CANCEL TICKET POPUP ───────────────────────────────────────── */}
    {cancelTarget && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
        onClick={e => { if (e.target === e.currentTarget) setCancelTarget(null); }}
      >
        <div
          className="w-full max-w-sm rounded-2xl overflow-hidden"
          style={{ background: "#111", border: "1px solid rgba(212,175,55,0.18)", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}
        >
          {/* header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="font-black text-sm text-white">Cancel Ticket</span>
            <button onClick={() => setCancelTarget(null)} className="text-neutral-600 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-5 space-y-4">
            {/* movie info strip */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <img src={cancelTarget.movie?.posterUrl} alt="" className="w-10 h-14 object-cover rounded-lg flex-shrink-0" style={{ border: "1px solid rgba(212,175,55,0.15)" }} />
              <div className="min-w-0">
                <p className="font-black text-xs text-white truncate">{cancelTarget.movie?.title}</p>
                <p className="text-[10px] text-neutral-500 font-inter mt-0.5">{cancelTarget.show?.date} · {cancelTarget.show?.startTime}</p>
                <p className="text-[10px] text-neutral-600 font-inter truncate">{cancelTarget.theatre?.name}</p>
              </div>
            </div>

            {isCancellable(cancelTarget) ? (
              <>
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                  <RefreshCw className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-green-400">Refund Eligible</p>
                    <p className="text-[11px] text-neutral-500 font-inter mt-1 leading-relaxed">
                      Your refund of <strong className="text-white">₹{cancelTarget.totalAmount}</strong> will be credited to your original payment method within <strong className="text-white">5–7 working days</strong>.
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-neutral-600 font-inter text-center">This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCancelTarget(null)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-85"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#888" }}
                  >
                    Keep Ticket
                  </button>
                  <button
                    onClick={() => handleCancelBooking(cancelTarget.id)}
                    disabled={cancelling}
                    className="flex-1 py-2.5 rounded-xl text-xs font-black transition-opacity hover:opacity-85 disabled:opacity-50"
                    style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
                  >
                    {cancelling ? "Cancelling…" : "Confirm & Refund"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-red-400">Cancellation Not Allowed</p>
                    <p className="text-[11px] text-neutral-500 font-inter mt-1 leading-relaxed">
                      Tickets cannot be cancelled within <strong className="text-white">3 hours</strong> of showtime. Please contact support if you need further assistance.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCancelTarget(null)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-85"
                  style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: "#d4af37" }}
                >
                  OK, Got It
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => (
  <div
    className="py-16 rounded-2xl flex flex-col items-center gap-3 text-center"
    style={{ background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(212,175,55,0.1)" }}
  >
    <div style={{ color: "rgba(212,175,55,0.2)" }}>{icon}</div>
    <p className="text-sm text-neutral-700 font-inter max-w-xs">{message}</p>
  </div>
);
