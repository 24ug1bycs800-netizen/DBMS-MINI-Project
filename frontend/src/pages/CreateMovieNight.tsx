import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { Moon, ArrowLeft, Plus, FileText } from "lucide-react";
import api from "../services/api.js";

export const CreateMovieNight: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setErr("Title is required."); return; }
    setSubmitting(true); setErr("");
    try {
      const res = await api.post("/movie-nights", { title: title.trim(), description: description.trim() || undefined });
      navigate(`/movie-nights/${res.data.movieNight.id}`);
    } catch (err: any) {
      setErr(err.response?.data?.error || "Failed to create movie night.");
      setSubmitting(false);
    }
  };

  const inputCls = "w-full p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl focus:border-[#d4af37] focus:outline-none text-white text-sm font-inter transition-colors placeholder-neutral-700";

  return (
    <div className="min-h-screen bg-[#080808] text-white pb-24 font-poppins flex items-start justify-center px-6 pt-12">
      <div className="w-full max-w-lg">
        {/* Back */}
        <button
          onClick={() => navigate("/movie-nights")}
          className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-sm font-semibold mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Movie Nights
        </button>

        {/* Card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#0d0d0d", border: "1px solid rgba(212,175,55,0.15)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
          {/* Card header */}
          <div className="px-8 pt-8 pb-6 border-b border-neutral-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)" }}>
              <Moon className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Create Movie Night</h1>
              <p className="text-[11px] text-neutral-500 font-inter mt-0.5">Your squad will get an invite link to join.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
            {err && (
              <div className="p-3.5 rounded-xl bg-red-900/20 border border-red-500/30 text-sm text-red-400 font-inter">{err}</div>
            )}

            <div>
              <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">
                Movie Night Title *
              </label>
              <input
                className={inputCls}
                placeholder='e.g. "Friday Night Squad" or "Diwali Movie Marathon"'
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={120}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Description
                <span className="normal-case font-normal ml-1 text-neutral-700">(optional)</span>
              </label>
              <textarea
                className={`${inputCls} resize-none`}
                placeholder="What's the occasion? Who's invited? Any vibes?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>

            {/* How it works */}
            <div className="rounded-xl p-4 space-y-2.5" style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.1)" }}>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(212,175,55,0.6)" }}>How it works</p>
              {[
                "Create and share the invite code with friends",
                "Everyone submits their genre, time & budget preferences",
                "The AI engine picks the best matching movie + show",
                "Members vote, split the cost, and book together",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5" style={{ background: "rgba(212,175,55,0.15)", color: "#d4af37" }}>{i + 1}</span>
                  <span className="text-[11px] text-neutral-500 font-inter leading-relaxed">{step}</span>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all transition-opacity hover:opacity-85 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#c9a84c", color: "#000", borderRadius: 7 }}
            >
              {submitting
                ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                : <><Plus className="w-4 h-4" /> Create Movie Night</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
