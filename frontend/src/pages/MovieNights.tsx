import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import {
  Moon, Plus, Users, Calendar, CheckCircle, Clock,
  Ticket, ArrowRight, Hash, LogIn,
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

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  COLLECTING_PREFERENCES: { label: "Collecting Prefs", color: "#6ee7e7", bg: "rgba(110,231,231,0.08)", border: "rgba(110,231,231,0.2)", icon: <Clock className="w-3 h-3" /> },
  RECOMMENDED:            { label: "Vote Pending",     color: "#c084fc", bg: "rgba(192,132,252,0.08)", border: "rgba(192,132,252,0.2)", icon: <Moon className="w-3 h-3" /> },
  APPROVED:               { label: "Approved",         color: "#4ade80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.2)",  icon: <CheckCircle className="w-3 h-3" /> },
  PAYMENT_PENDING:        { label: "Payment Pending",  color: "#fb923c", bg: "rgba(251,146,60,0.08)",  border: "rgba(251,146,60,0.2)",  icon: <Clock className="w-3 h-3" /> },
  READY_TO_BOOK:          { label: "Ready to Book",    color: "#d4af37", bg: "rgba(212,175,55,0.08)",  border: "rgba(212,175,55,0.2)",  icon: <Ticket className="w-3 h-3" /> },
  BOOKED:                 { label: "Booked",           color: "#4ade80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.2)",  icon: <CheckCircle className="w-3 h-3" /> },
};

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

  if (loading || fetching) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-t-2 animate-spin" style={{ borderColor: "#d4af37" }} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808] text-white pb-24 font-poppins">
      {/* Header */}
      <div className="px-6 sm:px-16 pt-12 pb-8 border-b border-neutral-900">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-5xl mx-auto">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg,#d4af37,#f4d03f)" }}>
                <Moon className="w-5 h-5 text-black" />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">Movie Nights</h1>
            </div>
            <p className="text-sm text-neutral-500 font-inter">Plan, vote, split costs and book with your squad.</p>
          </div>
          <button
            onClick={() => navigate("/movie-nights/create")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000", boxShadow: "0 4px 20px rgba(212,175,55,0.3)" }}
          >
            <Plus className="w-4 h-4" /> Create Movie Night
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 sm:px-16 pt-8 space-y-8">
        {/* Join by code */}
        <div className="p-5 rounded-2xl" style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-3 flex items-center gap-2">
            <LogIn className="w-3.5 h-3.5" /> Join with Invite Code
          </p>
          <form onSubmit={handleJoin} className="flex gap-3">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
              <input
                className="w-full pl-9 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs font-bold tracking-widest placeholder-neutral-700 focus:border-[#d4af37] focus:outline-none transition-colors uppercase"
                placeholder="ENTER CODE"
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinErr(""); }}
                maxLength={10}
              />
            </div>
            <button
              type="submit"
              disabled={joinLoading || !joinCode.trim()}
              className="px-5 py-3 rounded-xl font-black text-xs flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000" }}
            >
              {joinLoading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><LogIn className="w-3.5 h-3.5" /> Join</>}
            </button>
          </form>
          {joinErr && <p className="text-xs text-red-400 font-inter mt-2">{joinErr}</p>}
        </div>

        {/* Nights grid */}
        {nights.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)" }}>
              <Moon className="w-8 h-8" style={{ color: "#d4af37" }} />
            </div>
            <p className="text-white font-black text-xl mb-2">No Movie Nights Yet</p>
            <p className="text-neutral-600 font-inter text-sm mb-6">Create one or join with an invite code to get started.</p>
            <button
              onClick={() => navigate("/movie-nights/create")}
              className="px-6 py-3 rounded-xl font-black text-sm inline-flex items-center gap-2 hover:scale-105 transition-all"
              style={{ background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000" }}
            >
              <Plus className="w-4 h-4" /> Create Movie Night
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {nights.map(night => {
              const meta = STATUS_META[night.status] ?? STATUS_META.COLLECTING_PREFERENCES;
              return (
                <div
                  key={night.id}
                  onClick={() => navigate(`/movie-nights/${night.id}`)}
                  className="group cursor-pointer p-5 rounded-2xl transition-all hover:-translate-y-1"
                  style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.25)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  {/* Status pill */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider"
                      style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}
                    >
                      {meta.icon} {meta.label}
                    </span>
                    <span className="text-[9px] text-neutral-700 font-inter uppercase tracking-widest">
                      {night.myRole === "ORGANIZER" ? "Host" : "Member"}
                    </span>
                  </div>

                  <h3 className="font-black text-base text-white group-hover:text-[#d4af37] transition-colors leading-snug mb-1 line-clamp-2">
                    {night.title}
                  </h3>
                  {night.description && (
                    <p className="text-[11px] text-neutral-600 font-inter line-clamp-2 mb-3">{night.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-neutral-900">
                    <div className="flex items-center gap-1.5 text-neutral-600">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{night.memberCount} member{night.memberCount !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-black" style={{ color: "#d4af37" }}>
                      Open <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
