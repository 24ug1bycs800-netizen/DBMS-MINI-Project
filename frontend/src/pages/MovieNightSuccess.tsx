import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { CheckCircle, Ticket, Users, MapPin, Clock, Film, ArrowLeft } from "lucide-react";
import api from "../services/api.js";

interface SeatAssignment {
  userId: number;
  fullName: string;
  seatRow: string;
  seatNumber: number;
  seatCategory: string;
  bookingCode: string;
}

interface NightDetails {
  id: number;
  title: string;
  status: string;
  recommendation?: {
    movie: { title: string; posterUrl: string; genre: string; durationMins: number; };
    show: { startTime: string; date: string; };
    theatre: { name: string; address: string; };
    city: { name: string; };
    screenType: string;
    screenNumber: number;
  };
}

const getImageUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
};

const CATEGORY_COLOR: Record<string, string> = {
  Recliner: "#C9A84C",
  Premium: "rgba(255,255,255,0.65)",
  Regular: "rgba(255,255,255,0.45)",
};

export const MovieNightSuccess: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const nightId = parseInt(id!);

  const [night, setNight] = useState<NightDetails | null>(null);
  const [assignments, setAssignments] = useState<SeatAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [nightRes, seatsRes] = await Promise.all([
          api.get(`/movie-nights/${nightId}`),
          api.get(`/movie-nights/${nightId}/seats`),
        ]);
        const d = nightRes.data;
        setNight({ ...d.movieNight, recommendation: d.recommendation ?? null });
        setAssignments(seatsRes.data.assignments ?? []);
      } catch {
        // page still renders with whatever loaded
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [nightId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080808" }}>
        <div className="w-10 h-10 rounded-full border-t-2 animate-spin" style={{ borderColor: "#C9A84C" }} />
      </div>
    );
  }

  const rec = night?.recommendation;
  const myAssignment = assignments.find(a => a.userId === user?.id) ?? null;

  return (
    <div className="min-h-screen text-white pb-24 font-poppins" style={{ background: "#080808" }}>
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse at center top, rgba(74,222,128,0.06) 0%, transparent 65%)" }} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-8 py-12">

        {/* Back */}
        <button onClick={() => navigate(`/movie-nights/${nightId}`)}
          className="flex items-center gap-1.5 text-neutral-600 hover:text-white transition-colors text-xs font-semibold mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Movie Night
        </button>

        {/* Success hero */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)" }}>
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
            {night?.title ?? "Movie Night"} — Booked!
          </h1>
          <p className="text-neutral-500 font-inter text-sm">
            Your squad's seats are confirmed. See everyone at the theatre!
          </p>
        </div>

        {/* Movie info card */}
        {rec && (
          <div className="rounded-2xl p-5 mb-6 flex gap-5"
            style={{ background: "#0d0d0d", border: "1px solid rgba(201,168,76,0.15)" }}>
            <img src={getImageUrl(rec.movie.posterUrl)} alt={rec.movie.title}
              className="w-20 aspect-[2/3] object-cover rounded-xl flex-shrink-0"
              style={{ border: "1px solid rgba(201,168,76,0.1)" }} />
            <div className="flex-1 min-w-0 space-y-2">
              <h2 className="font-black text-white text-base leading-tight">{rec.movie.title}</h2>
              <p className="text-[10px] text-neutral-500 font-inter">{rec.movie.genre} · {rec.movie.durationMins} min</p>
              <div className="space-y-1 pt-1 font-inter text-[11px] text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span>{rec.show.date} · {rec.show.startTime}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span>{rec.theatre.name}, {rec.city.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Film className="w-3 h-3 flex-shrink-0" />
                  <span>{rec.screenType} · Screen {rec.screenNumber}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My ticket highlight */}
        {myAssignment && (
          <div className="rounded-2xl p-5 mb-6"
            style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.04))", border: "1px solid rgba(201,168,76,0.3)" }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "rgba(201,168,76,0.6)" }}>Your Seat</p>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-black" style={{ color: "#C9A84C" }}>
                  {myAssignment.seatRow}{myAssignment.seatNumber}
                </div>
                <div className="text-xs font-bold mt-1" style={{ color: CATEGORY_COLOR[myAssignment.seatCategory] ?? "#C9A84C" }}>
                  {myAssignment.seatCategory}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-neutral-600 font-inter mb-1">Booking Code</div>
                <div className="text-sm font-black tracking-wider text-white">{myAssignment.bookingCode}</div>
              </div>
            </div>
          </div>
        )}

        {/* All seat assignments */}
        {assignments.length > 0 && (
          <div className="rounded-2xl p-5 mb-6" style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="font-black text-sm text-white flex items-center gap-2 mb-4">
              <Users className="w-4 h-4" style={{ color: "#6ee7e7" }} /> Squad Seats
              <span className="text-[10px] text-neutral-600 font-normal">({assignments.length})</span>
            </h3>
            <div className="space-y-2">
              {assignments.map(a => {
                const isMe = a.userId === user?.id;
                return (
                  <div key={a.userId} className="flex items-center justify-between px-3 py-3 rounded-xl"
                    style={{
                      background: isMe ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)",
                      border: isMe ? "1px solid rgba(201,168,76,0.2)" : "1px solid rgba(255,255,255,0.04)",
                    }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                        style={{ background: "rgba(212,175,55,0.12)", color: "#d4af37" }}>
                        {a.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          {a.fullName}
                          {isMe && <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>YOU</span>}
                        </p>
                        <p className="text-[9px] text-neutral-600 font-inter">{a.bookingCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black" style={{ color: CATEGORY_COLOR[a.seatCategory] ?? "#C9A84C" }}>
                        {a.seatRow}{a.seatNumber}
                      </div>
                      <div className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold">{a.seatCategory}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000", boxShadow: "0 6px 20px rgba(212,175,55,0.2)" }}>
            <Ticket className="w-4 h-4" /> Go to Dashboard
          </button>
          <button
            onClick={() => navigate(`/movie-nights/${nightId}`)}
            className="flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
            <ArrowLeft className="w-4 h-4" /> Movie Night Details
          </button>
        </div>

      </div>
    </div>
  );
};
