import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import {
  Moon, Users, Copy, Check, Star,
  Clock, MapPin, Ticket, CheckCircle, XCircle, Sparkles,
  ArrowRight, AlertCircle, Wallet, Film, RefreshCw, Ban, Plus,
  Share2, Play, Timer, MessageCircle, Send,
} from "lucide-react";
import api from "../services/api.js";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Member { userId: number; fullName: string; email: string; profilePic?: string; role: string; joinedAt: string; }
interface Preference { userId: number; preferredGenres: string[]; preferredTime: string; budgetLimit: number; preferredLocation?: string; }
interface Recommendation {
  id: number;
  genreScore: number; timeScore: number; budgetScore: number; locationScore: number; compatibilityScore: number;
  movie: { id: number; title: string; posterUrl: string; genre: string; language: string; durationMins: number; rating: string; ratingValue: string; trailerUrl?: string; overview?: string; };
  show: { id: number; startTime: string; date: string; priceRegular: number; pricePremium: number; priceRecliner: number; language: string; };
  theatre: { id: number; name: string; address: string; };
  city: { id: number; name: string; };
  screenType: string; screenNumber: number;
}
interface Vote { userId: number; vote: string; fullName: string; }
interface Contribution { id: number; userId: number; contributionAmount: number; status: string; paidAt?: string; fullName: string; profilePic?: string; }
interface MovieNight { id: number; title: string; description?: string; organizerId: number; inviteCode: string; status: string; createdAt: string; }
interface SeatAssignment { userId: number; fullName: string; seatRow: string; seatNumber: number; seatCategory: string; bookingCode: string; }
interface ChatMessage { id: number; message: string; createdAt: string; userId: number; userFullName: string; userProfilePic?: string; }

// ─── GENRE OPTIONS ────────────────────────────────────────────────────────────

const GENRES = ["Action", "Drama", "Comedy", "Thriller", "Horror", "Romance", "Sci-Fi", "Animation", "Crime", "Adventure"];
const TIME_SLOTS = [
  { value: "MORNING", label: "Morning", sub: "6 AM – 12 PM", icon: "🌅" },
  { value: "AFTERNOON", label: "Afternoon", sub: "12 PM – 6 PM", icon: "☀️" },
  { value: "EVENING", label: "Evening", sub: "6 PM – 9 PM", icon: "🌆" },
  { value: "NIGHT", label: "Night", sub: "9 PM – 12 AM", icon: "🌙" },
];

const getImageUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
};

// ─── SMALL UI ATOMS ───────────────────────────────────────────────────────────

const ScoreBar: React.FC<{ label: string; score: number; color: string }> = ({ label, score, color }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] font-bold font-inter">
      <span className="text-neutral-500">{label}</span>
      <span style={{ color }}>{score}%</span>
    </div>
    <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
    </div>
  </div>
);

const cardCls = "rounded-2xl p-6 space-y-4" as const;
const cardStyle = { background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)" } as const;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export const MovieNightDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [night, setNight] = useState<MovieNight | null>(null);
  const [myRole, setMyRole] = useState("MEMBER");
  const [members, setMembers] = useState<Member[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [seatAssignments, setSeatAssignments] = useState<SeatAssignment[]>([]);
  const [fetching, setFetching] = useState(true);
  const [err, setErr] = useState("");

  // Preference form state
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [budget, setBudget] = useState("300");
  const [location, setLocation] = useState("");
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefMsg, setPrefMsg] = useState("");

  // Misc loading states
  const [recLoading, setRecLoading] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [bookLoading, setBookLoading] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  const nightId = parseInt(id!);
  const prefFilledRef = useRef(false);
  const [countdown, setCountdown] = useState("");

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Live countdown for BOOKED status
  useEffect(() => {
    if (!recommendation || !night || night.status !== "BOOKED") return;
    const showDateStr = `${recommendation.show.date}`;
    const showTimeStr = recommendation.show.startTime; // e.g. "10:30 PM"
    const parse = () => {
      const [time, period] = showTimeStr.split(" ");
      const [hStr, mStr] = time.split(":");
      let h = parseInt(hStr); const m = parseInt(mStr);
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      const d = new Date(showDateStr);
      d.setHours(h, m, 0, 0);
      return d;
    };
    const tick = () => {
      const diff = parse().getTime() - Date.now();
      if (diff <= 0) { setCountdown("Show started!"); return; }
      const days = Math.floor(diff / 86400000);
      const hrs  = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(days > 0 ? `${days}d ${hrs}h ${mins}m` : `${hrs}h ${mins}m ${secs}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [recommendation, night?.status]);

  const handleShare = () => {
    const msg = `🎬 Join our Movie Night "${night?.title}"!\nUse invite code: ${night?.inviteCode}\nOpen CineCircle → Movie Nights → Join`;
    if (navigator.share) {
      navigator.share({ title: "Movie Night Invite", text: msg }).catch(() => {});
    } else {
      navigator.clipboard.writeText(msg);
      setActionMsg("Invite message copied! Share it with your squad.");
      setTimeout(() => setActionMsg(""), 3000);
    }
  };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/movie-nights/${nightId}/messages`);
      setChatMessages(res.data.messages);
      // Scroll within the chat container only — never touch the page scroll position.
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 50);
    } catch { /* silent */ }
  }, [nightId]);

  // Poll chat every 5s
  useEffect(() => {
    if (!night) return;
    fetchMessages();
    const t = setInterval(fetchMessages, 5000);
    return () => clearInterval(t);
  }, [night?.id, fetchMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatSending) return;
    setChatSending(true);
    try {
      await api.post(`/movie-nights/${nightId}/messages`, { message: chatInput.trim() });
      setChatInput("");
      fetchMessages();
    } catch { /* silent */ } finally { setChatSending(false); }
  };

  const fetchNight = useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    if (!silent) setErr("");
    try {
      const res = await api.get(`/movie-nights/${nightId}`);
      const d = res.data;
      setNight(d.movieNight);
      setMyRole(d.myRole);
      setMembers(d.members);
      setPreferences(d.preferences);
      setRecommendation(d.recommendation);
      setVotes(d.votes);
      setContributions(d.contributions);
      if (d.seatAssignments) setSeatAssignments(d.seatAssignments);

      // Pre-fill preference form only on first load
      if (!prefFilledRef.current) {
        prefFilledRef.current = true;
        const myPref = d.preferences.find((p: Preference) => p.userId === user?.id);
        if (myPref) {
          setSelectedGenres(myPref.preferredGenres);
          setSelectedTime(myPref.preferredTime);
          setBudget(String(myPref.budgetLimit));
          setLocation(myPref.preferredLocation || "");
        }
      }
    } catch (e: any) {
      if (!silent) setErr(e.response?.data?.error || "Failed to load.");
    } finally {
      if (!silent) setFetching(false);
    }
  }, [nightId, user?.id]);

  useEffect(() => {
    if (!loading && !user) { navigate("/auth"); return; }
    if (!loading) fetchNight();
  }, [loading, user, fetchNight]);

  // Poll every 5 s while page is open; stop on terminal statuses
  useEffect(() => {
    if (!night || night.status === "BOOKED" || night.status === "CANCELLED") return;
    const id = setInterval(() => fetchNight(true), 5000);
    return () => clearInterval(id);
  }, [night?.status, fetchNight]);

  const copyInvite = () => {
    navigator.clipboard.writeText(night?.inviteCode ?? "");
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // ── PREFERENCE SUBMIT ────────────────────────────────────────────────────────
  const handleSubmitPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGenres.length === 0) { setPrefMsg("Select at least one genre."); return; }
    if (!selectedTime) { setPrefMsg("Select a preferred time."); return; }
    setPrefLoading(true); setPrefMsg("");
    try {
      await api.post(`/movie-nights/${nightId}/preferences`, {
        preferredGenres: selectedGenres, preferredTime: selectedTime,
        budgetLimit: parseInt(budget) || 300, preferredLocation: location.trim() || undefined,
      });
      setPrefMsg("✓ Preferences saved!");
      fetchNight(true);
    } catch (e: any) { setPrefMsg(e.response?.data?.error || "Failed to save."); }
    finally { setPrefLoading(false); }
  };

  // ── GENERATE RECOMMENDATION ──────────────────────────────────────────────────
  const handleGenerate = async () => {
    setRecLoading(true); setActionMsg("");
    try {
      await api.post(`/movie-nights/${nightId}/recommend`);
      setActionMsg("Recommendation generated!");
      fetchNight(true);
    } catch (e: any) { setActionMsg(e.response?.data?.error || "Failed."); }
    finally { setRecLoading(false); }
  };

  // ── VOTE ────────────────────────────────────────────────────────────────────
  const handleVote = async (v: "ACCEPT" | "REJECT") => {
    setVoteLoading(true); setActionMsg("");
    try {
      const res = await api.post(`/movie-nights/${nightId}/vote`, { vote: v });
      setActionMsg(res.data.message);
      fetchNight(true);
    } catch (e: any) { setActionMsg(e.response?.data?.error || "Failed."); }
    finally { setVoteLoading(false); }
  };

  // ── MARK PAID ───────────────────────────────────────────────────────────────
  const handlePay = async () => {
    setPayLoading(true); setActionMsg("");
    try {
      const res = await api.post(`/movie-nights/${nightId}/contributions/pay`);
      setActionMsg(res.data.message);
      fetchNight(true);
    } catch (e: any) { setActionMsg(e.response?.data?.error || "Failed."); }
    finally { setPayLoading(false); }
  };

  // ── COMPLETE BOOKING ─────────────────────────────────────────────────────────
  const handleBook = async () => {
    setBookLoading(true); setActionMsg("");
    try {
      const res = await api.post(`/movie-nights/${nightId}/book`);
      navigate(`/shows/${res.data.showId}/booking`, {
        state: { movieNightId: nightId, memberCount: members.length },
      });
    } catch (e: any) { setActionMsg(e.response?.data?.error || "Failed."); setBookLoading(false); }
  };

  // ── REGENERATE (from REJECTED) ───────────────────────────────────────────────
  const handleRegenerate = async () => {
    setRegenLoading(true); setActionMsg("");
    try {
      await api.post(`/movie-nights/${nightId}/regenerate`);
      setActionMsg("New recommendation generated! Cast your votes.");
      fetchNight(true);
    } catch (e: any) { setActionMsg(e.response?.data?.error || "Failed."); }
    finally { setRegenLoading(false); }
  };

  // ── CANCEL MOVIE NIGHT ───────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!window.confirm("Cancel this Movie Night? This cannot be undone.")) return;
    setCancelLoading(true); setActionMsg("");
    try {
      await api.post(`/movie-nights/${nightId}/cancel`);
      fetchNight(true);
    } catch (e: any) { setActionMsg(e.response?.data?.error || "Failed."); }
    finally { setCancelLoading(false); }
  };

  const myVote = useMemo(() => votes.find(v => v.userId === user?.id)?.vote, [votes, user]);
  const myContrib = useMemo(() => contributions.find(c => c.userId === user?.id), [contributions, user]);
  const paidCount = useMemo(() => contributions.filter(c => c.status === "PAID").length, [contributions]);
  const myPrefSubmitted = useMemo(() => preferences.some(p => p.userId === user?.id), [preferences, user]);

  const inputCls = "w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl focus:border-[#d4af37] focus:outline-none text-white text-xs font-inter transition-colors";

  if (loading || fetching) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-t-2 animate-spin" style={{ borderColor: "#d4af37" }} />
    </div>
  );

  if (err || !night) return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center gap-4 text-white">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-red-400 font-inter">{err || "Movie night not found."}</p>
      <button onClick={() => navigate("/movie-nights")} className="text-[#d4af37] font-bold text-sm hover:underline">← Back</button>
    </div>
  );

  const isOrganizer = myRole === "ORGANIZER";
  const status = night.status;

  return (
    <div className="min-h-screen bg-[#080808] text-white pb-24 font-poppins">

      {/* ── HERO HEADER ──────────────────────────────────────────────────────── */}
      <div className="px-6 sm:px-16 pt-10 pb-8 border-b border-neutral-900" style={{ background: "linear-gradient(180deg, rgba(212,175,55,0.04) 0%, transparent 100%)" }}>
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate("/movie-nights")} className="flex items-center gap-1.5 text-neutral-600 hover:text-white transition-colors text-xs font-semibold mb-5">
            ← All Movie Nights
          </button>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg,#d4af37,#f4d03f)" }}>
                  <Moon className="w-4 h-4 text-black" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">{night.title}</h1>
              </div>
              {night.description && <p className="text-sm text-neutral-500 font-inter ml-11">{night.description}</p>}
            </div>
            {/* Invite code chip + share */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={copyInvite}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all hover:scale-105"
                style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: "#d4af37" }}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : night.inviteCode}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-black text-xs transition-all hover:scale-105"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                title="Share invite"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Status progress bar */}
          <div className="mt-6 ml-0">
            {(() => {
              const steps = ["COLLECTING_PREFERENCES", "RECOMMENDED", "PAYMENT_PENDING", "READY_TO_BOOK", "BOOKED"];
              const stepLabels = ["Preferences", "Recommendation", "Payment", "Ready", "Booked"];
              const isRejected = status === "REJECTED";
              const isCancelled = status === "CANCELLED";
              const current = isCancelled ? -1 : isRejected ? 1
                : steps.indexOf(status === "APPROVED" ? "PAYMENT_PENDING" : status);
              return (
                <div className="flex items-center gap-0">
                  {steps.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black transition-all"
                          style={
                            isRejected && i === 1
                              ? { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171" }
                              : i <= current
                                ? { background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000" }
                                : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.08)" }
                          }
                        >
                          {isRejected && i === 1 ? <XCircle className="w-3 h-3" /> : i < current ? <Check className="w-3 h-3" /> : i + 1}
                        </div>
                        <span className="text-[8px] font-bold mt-1 hidden sm:block"
                          style={{ color: isRejected && i === 1 ? "#f87171" : i <= current ? "#d4af37" : "rgba(255,255,255,0.2)" }}>
                          {stepLabels[i]}
                        </span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className="flex-1 h-0.5 mx-1" style={{ background: i < current ? "linear-gradient(to right,#d4af37,#d4af37)" : "rgba(255,255,255,0.06)" }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 sm:px-16 pt-8 space-y-6">

        {/* Action feedback */}
        {actionMsg && (
          <div className="p-3.5 rounded-xl text-sm font-inter flex items-center gap-2"
            style={{ background: actionMsg.includes("Failed") || actionMsg.includes("Error") ? "rgba(239,68,68,0.1)" : "rgba(74,222,128,0.08)",
              border: `1px solid ${actionMsg.includes("Failed") ? "rgba(239,68,68,0.3)" : "rgba(74,222,128,0.2)"}`,
              color: actionMsg.includes("Failed") ? "#f87171" : "#4ade80" }}>
            {actionMsg.includes("Failed") ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
            {actionMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── SECTION: COLLECTING PREFERENCES ───────────────────────────── */}
            {(status === "COLLECTING_PREFERENCES") && (
              <>
                {/* Member list */}
                <div className={cardCls} style={cardStyle}>
                  <div className="flex items-center justify-between">
                    <h2 className="font-black text-sm text-white flex items-center gap-2">
                      <Users className="w-4 h-4" style={{ color: "#6ee7e7" }} /> Members
                      <span className="text-[10px] text-neutral-600 font-normal">({members.length})</span>
                    </h2>
                    <span className="text-[10px] text-neutral-600 font-inter">{preferences.length}/{members.length} submitted</span>
                  </div>
                  <div className="space-y-2">
                    {members.map(m => {
                      const hasPref = preferences.some(p => p.userId === m.userId);
                      return (
                        <div key={m.userId} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "rgba(212,175,55,0.12)", color: "#d4af37" }}>
                              {m.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{m.fullName}</p>
                              <p className="text-[9px] text-neutral-600 font-inter">{m.role === "ORGANIZER" ? "Organizer" : "Member"}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-black px-2 py-1 rounded-lg" style={hasPref
                            ? { background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }
                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.2)" }}>
                            {hasPref ? "✓ Submitted" : "Pending"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Preference form */}
                <div className={cardCls} style={{ ...cardStyle, border: myPrefSubmitted ? "1px solid rgba(74,222,128,0.15)" : "1px solid rgba(212,175,55,0.15)" }}>
                  <h2 className="font-black text-sm text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: "#d4af37" }} />
                    {myPrefSubmitted ? "Update Your Preferences" : "Submit Your Preferences"}
                  </h2>
                  <form onSubmit={handleSubmitPrefs} className="space-y-5">
                    {/* Genres */}
                    <div>
                      <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">Preferred Genres *</label>
                      <div className="flex flex-wrap gap-2">
                        {GENRES.map(g => {
                          const sel = selectedGenres.includes(g);
                          return (
                            <button key={g} type="button"
                              onClick={() => setSelectedGenres(prev => sel ? prev.filter(x => x !== g) : [...prev, g])}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                              style={sel
                                ? { background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.35)", color: "#d4af37" }
                                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }}
                            >{g}</button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time slot */}
                    <div>
                      <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">Preferred Time *</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {TIME_SLOTS.map(ts => (
                          <button key={ts.value} type="button"
                            onClick={() => setSelectedTime(ts.value)}
                            className="p-3 rounded-xl text-left transition-all"
                            style={selectedTime === ts.value
                              ? { background: "rgba(192,132,252,0.12)", border: "1px solid rgba(192,132,252,0.3)", color: "#c084fc" }
                              : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}
                          >
                            <div className="text-base mb-1">{ts.icon}</div>
                            <div className="text-xs font-bold">{ts.label}</div>
                            <div className="text-[9px] font-inter mt-0.5 opacity-60">{ts.sub}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Budget */}
                    <div>
                      <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">
                        Budget Limit — ₹{parseInt(budget) || 0} per ticket
                      </label>
                      <input type="range" min="100" max="1000" step="50" value={budget} onChange={e => setBudget(e.target.value)}
                        className="w-full accent-[#d4af37]" />
                      <div className="flex justify-between text-[9px] text-neutral-700 font-inter mt-1">
                        <span>₹100</span><span>₹1000</span>
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Preferred City
                        <span className="normal-case font-normal ml-1 text-neutral-700">(optional)</span>
                      </label>
                      <input className={inputCls} placeholder="e.g. Bengaluru" value={location} onChange={e => setLocation(e.target.value)} />
                    </div>

                    {prefMsg && <p className="text-xs font-inter" style={{ color: prefMsg.startsWith("✓") ? "#4ade80" : "#f87171" }}>{prefMsg}</p>}

                    <button type="submit" disabled={prefLoading}
                      className="w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000" }}>
                      {prefLoading
                        ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        : <><Sparkles className="w-3.5 h-3.5" />{myPrefSubmitted ? "Update Preferences" : "Save Preferences"}</>}
                    </button>
                  </form>
                </div>

                {/* Generate recommendation (organizer) */}
                {isOrganizer && (
                  <div className="p-5 rounded-2xl" style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-white">Generate Recommendation</p>
                        <p className="text-[11px] text-neutral-600 font-inter mt-0.5">
                          {preferences.length}/{members.length} members submitted preferences
                        </p>
                      </div>
                      <button onClick={handleGenerate} disabled={recLoading || preferences.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000" }}>
                        {recLoading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><Sparkles className="w-3.5 h-3.5" />Generate</>}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── SECTION: RECOMMENDATION / VOTING ──────────────────────────── */}
            {(status === "RECOMMENDED") && recommendation && (
              <>
                {/* Recommendation card */}
                <div className={cardCls} style={{ ...cardStyle, border: "1px solid rgba(192,132,252,0.2)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4" style={{ color: "#c084fc" }} />
                    <h2 className="font-black text-sm" style={{ color: "#c084fc" }}>AI Recommendation</h2>
                  </div>
                  <div className="flex gap-5">
                    {/* Poster */}
                    <div className="w-24 h-36 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-900 relative group">
                      <img src={getImageUrl(recommendation.movie.posterUrl)} alt={recommendation.movie.title}
                        className="w-full h-full object-cover" loading="lazy" />
                      {recommendation.movie.trailerUrl && (
                        <a href={recommendation.movie.trailerUrl} target="_blank" rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "rgba(0,0,0,0.6)" }}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(212,175,55,0.9)" }}>
                            <Play className="w-4 h-4 text-black fill-black" />
                          </div>
                        </a>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <h3 className="font-black text-lg text-white leading-tight">{recommendation.movie.title}</h3>
                      <p className="text-[11px] text-neutral-500 font-inter">{recommendation.movie.genre} · {recommendation.movie.language} · {recommendation.movie.durationMins}min</p>
                      {recommendation.movie.overview && (
                        <p className="text-[10px] text-neutral-600 font-inter leading-relaxed line-clamp-2">{recommendation.movie.overview}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold">
                        <span className="flex items-center gap-1" style={{ color: "#d4af37" }}><Star className="w-3 h-3 fill-[#d4af37]" />{recommendation.movie.ratingValue}</span>
                        <span className="text-neutral-700">·</span>
                        <span className="text-neutral-400 flex items-center gap-1"><Clock className="w-3 h-3" />{recommendation.show.startTime}</span>
                        <span className="text-neutral-700">·</span>
                        <span className="text-neutral-400">{recommendation.show.date}</span>
                      </div>
                      <div className="pt-1 space-y-0.5">
                        <p className="text-xs font-bold text-white">{recommendation.theatre.name}</p>
                        <p className="text-[10px] text-neutral-600 font-inter flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {recommendation.city.name} · {recommendation.theatre.address}
                        </p>
                        <p className="text-[10px] font-bold mt-1" style={{ color: "#6ee7e7" }}>
                          Screen {recommendation.screenNumber} · {recommendation.screenType} · ₹{recommendation.show.priceRegular}/seat
                        </p>
                      </div>
                      {recommendation.movie.trailerUrl && (
                        <a href={recommendation.movie.trailerUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all hover:scale-105"
                          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
                          <Play className="w-3 h-3 fill-[#f87171]" /> Watch Trailer
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Compatibility score */}
                  <div className="mt-4 pt-4 border-t border-neutral-900">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Compatibility Score</p>
                      <div className="text-3xl font-black" style={{ color: "#c084fc" }}>{recommendation.compatibilityScore}%</div>
                    </div>
                    <div className="space-y-3">
                      <ScoreBar label="Genre Match (40%)" score={recommendation.genreScore} color="#d4af37" />
                      <ScoreBar label="Time Match (30%)" score={recommendation.timeScore} color="#c084fc" />
                      <ScoreBar label="Budget Match (20%)" score={recommendation.budgetScore} color="#6ee7e7" />
                      <ScoreBar label="Location Match (10%)" score={recommendation.locationScore} color="#4ade80" />
                    </div>
                  </div>
                </div>

                {/* Voting */}
                <div className={cardCls} style={cardStyle}>
                  <h2 className="font-black text-sm text-white flex items-center gap-2">
                    <Users className="w-4 h-4" style={{ color: "#6ee7e7" }} /> Vote
                    <span className="text-[10px] text-neutral-600 font-normal">
                      {votes.length}/{members.length} voted · {votes.filter(v => v.vote === "ACCEPT").length} accept
                    </span>
                  </h2>

                  {/* My vote */}
                  {!myVote ? (
                    <div className="flex gap-3">
                      <button onClick={() => handleVote("ACCEPT")} disabled={voteLoading}
                        className="flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-40"
                        style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                        <CheckCircle className="w-4 h-4" /> Accept
                      </button>
                      <button onClick={() => handleVote("REJECT")} disabled={voteLoading}
                        className="flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-40"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold"
                      style={myVote === "ACCEPT"
                        ? { background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }
                        : { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                      {myVote === "ACCEPT" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      You voted {myVote}
                    </div>
                  )}

                  {/* Votes list */}
                  {votes.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-neutral-900">
                      {votes.map(v => (
                        <div key={v.userId} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                          <span className="text-xs font-bold text-white">{v.fullName}</span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg"
                            style={v.vote === "ACCEPT"
                              ? { background: "rgba(74,222,128,0.08)", color: "#4ade80" }
                              : { background: "rgba(239,68,68,0.08)", color: "#f87171" }}>
                            {v.vote}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Re-generate option for organizer */}
                  {isOrganizer && (
                    <button onClick={handleGenerate} disabled={recLoading}
                      className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:border-neutral-700 disabled:opacity-40"
                      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>
                      <RefreshCw className="w-3.5 h-3.5" /> Re-generate recommendation
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ── SECTION: CONTRIBUTIONS ────────────────────────────────────── */}
            {(status === "PAYMENT_PENDING" || status === "READY_TO_BOOK" || status === "BOOKED") && (
              <div className={cardCls} style={{ ...cardStyle, border: "1px solid rgba(251,146,60,0.15)" }}>
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-sm text-white flex items-center gap-2">
                    <Wallet className="w-4 h-4" style={{ color: "#fb923c" }} /> Cost Split
                  </h2>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-lg" style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)", color: "#fb923c" }}>
                    {paidCount}/{contributions.length} Paid
                  </span>
                </div>

                {/* My share highlight */}
                {myContrib && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.18)" }}>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">Your Share</p>
                        <p className="text-2xl font-black" style={{ color: "#d4af37" }}>₹{myContrib.contributionAmount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-neutral-500 font-inter">Split across</p>
                        <p className="text-xs font-black text-white">{contributions.length} members</p>
                      </div>
                    </div>
                    <p className="text-[9px] font-inter px-1 flex items-center gap-1" style={{ color: "rgba(251,146,60,0.55)" }}>
                      <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" />
                      Estimated at Regular seat price — final cost may vary by seat category chosen
                    </p>
                  </div>
                )}

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-neutral-900 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${contributions.length ? (paidCount / contributions.length) * 100 : 0}%`, background: "linear-gradient(90deg,#fb923c,#f4d03f)" }} />
                  </div>
                  <p className="text-[10px] text-neutral-600 font-inter text-right">{paidCount} of {contributions.length} members paid</p>
                </div>

                {/* Contribution rows */}
                <div className="space-y-2">
                  {contributions.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "rgba(212,175,55,0.1)", color: "#d4af37" }}>
                          {c.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{c.fullName}</p>
                          <p className="text-[9px] text-neutral-600 font-inter">₹{c.contributionAmount}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-black px-2 py-1 rounded-lg"
                        style={c.status === "PAID"
                          ? { background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }
                          : { background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)", color: "#fb923c" }}>
                        {c.status === "PAID" ? "✓ Paid" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Acknowledge contribution (simulated payment for demo) */}
                {myContrib && myContrib.status === "PENDING" && status === "PAYMENT_PENDING" && (
                  <div className="space-y-2">
                    <button onClick={handlePay} disabled={payLoading}
                      className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg,#fb923c,#f59e0b)", color: "#000" }}>
                      {payLoading
                        ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        : <><Wallet className="w-4 h-4" />Acknowledge ₹{myContrib.contributionAmount} Contribution</>}
                    </button>
                    <p className="text-[9px] text-center font-inter" style={{ color: "rgba(255,255,255,0.2)" }}>
                      Demo mode — no real payment is charged here
                    </p>
                  </div>
                )}

                {/* Book now */}
                {status === "READY_TO_BOOK" && isOrganizer && (
                  <div className="pt-2">
                    <div className="flex items-center gap-2 mb-3 p-3 rounded-xl" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)" }}>
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-green-400">All contributions collected! Ready to book.</p>
                        <p className="text-[10px] font-inter mt-0.5" style={{ color: "rgba(74,222,128,0.6)" }}>
                          You'll select {members.length} seat{members.length !== 1 ? "s" : ""} — one per member. Seats are auto-assigned by join order.
                        </p>
                      </div>
                    </div>
                    <button onClick={handleBook} disabled={bookLoading}
                      className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000", boxShadow: "0 6px 24px rgba(212,175,55,0.25)" }}>
                      {bookLoading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><Ticket className="w-4 h-4" />Select {members.length} Seats<ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── SECTION: REJECTED ─────────────────────────────────────────── */}
            {status === "REJECTED" && (
              <div className="space-y-4">
                {/* Banner */}
                <div className="p-8 rounded-2xl text-center space-y-4"
                  style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.18)" }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                    style={{ background: "rgba(239,68,68,0.1)" }}>
                    <XCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white mb-1">Recommendation Rejected</h3>
                    <p className="text-sm text-neutral-500 font-inter">
                      {isOrganizer
                        ? "The majority voted against this pick. Regenerate to try again or cancel the night."
                        : "The majority voted against this pick. Waiting for the organizer to decide next steps."}
                    </p>
                  </div>

                  {/* Rejected rec summary */}
                  {recommendation && (
                    <div className="flex items-center gap-3 p-3 rounded-xl text-left mx-auto max-w-xs"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <img src={getImageUrl(recommendation.movie.posterUrl)} alt=""
                        className="w-10 h-14 rounded-lg object-cover flex-shrink-0 opacity-40" />
                      <div>
                        <p className="text-xs font-black text-neutral-500 line-through leading-snug">{recommendation.movie.title}</p>
                        <p className="text-[9px] text-neutral-700 font-inter mt-1">{recommendation.show.startTime} · {recommendation.show.date}</p>
                        <p className="text-[9px] text-neutral-700 font-inter">{recommendation.theatre.name}</p>
                      </div>
                    </div>
                  )}

                  {/* Vote tally */}
                  <div className="flex items-center justify-center gap-8 pt-2 border-t border-neutral-900">
                    <div className="text-center">
                      <div className="text-2xl font-black text-green-400">{votes.filter(v => v.vote === "ACCEPT").length}</div>
                      <div className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold mt-0.5">Accepted</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-red-400">{votes.filter(v => v.vote === "REJECT").length}</div>
                      <div className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold mt-0.5">Rejected</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-neutral-600">{members.length - votes.length}</div>
                      <div className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold mt-0.5">Abstained</div>
                    </div>
                  </div>
                </div>

                {/* Organizer actions */}
                {isOrganizer ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button onClick={handleRegenerate} disabled={regenLoading}
                      className="py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-40"
                      style={{ background: "rgba(192,132,252,0.08)", border: "1px solid rgba(192,132,252,0.25)", color: "#c084fc" }}>
                      {regenLoading
                        ? <div className="w-4 h-4 border-2 border-[#c084fc]/30 border-t-[#c084fc] rounded-full animate-spin" />
                        : <><RefreshCw className="w-4 h-4" /> Regenerate Recommendation</>}
                    </button>
                    <button onClick={handleCancel} disabled={cancelLoading}
                      className="py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-40"
                      style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
                      {cancelLoading
                        ? <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                        : <><Ban className="w-4 h-4" /> Cancel Movie Night</>}
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl text-center"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <p className="text-xs text-neutral-600 font-inter">Waiting for the organizer to regenerate or cancel.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── SECTION: CANCELLED ─────────────────────────────────────────── */}
            {status === "CANCELLED" && (
              <div className="p-8 rounded-2xl text-center space-y-4"
                style={{ background: "rgba(107,114,128,0.04)", border: "1px solid rgba(107,114,128,0.15)" }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "rgba(107,114,128,0.1)" }}>
                  <Ban className="w-8 h-8 text-neutral-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white mb-1">Movie Night Cancelled</h3>
                  <p className="text-sm text-neutral-500 font-inter">
                    This movie night has been cancelled by group consensus. No further actions are available.
                  </p>
                </div>
                {isOrganizer && (
                  <button
                    onClick={() => navigate("/movie-nights/create")}
                    className="px-6 py-3 rounded-xl font-black text-sm inline-flex items-center gap-2 hover:scale-105 transition-all"
                    style={{ background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000", boxShadow: "0 6px 20px rgba(212,175,55,0.2)" }}>
                    <Plus className="w-4 h-4" /> Plan a New Night
                  </button>
                )}
              </div>
            )}

            {/* ── SECTION: BOOKED ───────────────────────────────────────────── */}
            {status === "BOOKED" && (
              <div className="space-y-4">
                {/* Success banner + countdown */}
                <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.2)" }}>
                  <div className="p-6 text-center space-y-3">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(74,222,128,0.1)" }}>
                      <CheckCircle className="w-7 h-7 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white mb-1">Movie Night Booked!</h3>
                      <p className="text-sm text-neutral-500 font-inter">Your squad's seats are confirmed. Enjoy the movie! 🎬</p>
                    </div>
                    <button
                      onClick={() => navigate(`/movie-nights/${nightId}/booked`)}
                      className="px-5 py-2.5 rounded-xl font-black text-xs inline-flex items-center gap-2 transition-all hover:scale-105"
                      style={{ background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000", boxShadow: "0 6px 20px rgba(212,175,55,0.2)" }}>
                      <Ticket className="w-3.5 h-3.5" /> View Tickets & Seats
                    </button>
                  </div>
                  {/* Countdown */}
                  {countdown && countdown !== "Show started!" && (
                    <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: "rgba(74,222,128,0.12)", background: "rgba(74,222,128,0.02)" }}>
                      <div className="flex items-center gap-2 text-xs text-neutral-500 font-inter">
                        <Timer className="w-3.5 h-3.5 text-green-400" /> Show starts in
                      </div>
                      <div className="font-black text-lg tracking-wider" style={{ color: "#4ade80", fontVariantNumeric: "tabular-nums" }}>
                        {countdown}
                      </div>
                    </div>
                  )}
                  {countdown === "Show started!" && (
                    <div className="px-6 py-3 border-t text-center text-xs font-bold text-green-400" style={{ borderColor: "rgba(74,222,128,0.12)" }}>
                      🍿 The show has started — enjoy!
                    </div>
                  )}
                </div>

                {/* Seat assignments */}
                {seatAssignments.length > 0 && (
                  <div className={cardCls} style={{ ...cardStyle, border: "1px solid rgba(201,168,76,0.15)" }}>
                    <h2 className="font-black text-sm text-white flex items-center gap-2">
                      <Ticket className="w-4 h-4" style={{ color: "#d4af37" }} /> Seat Assignments
                    </h2>
                    <div className="space-y-2">
                      {seatAssignments.map(a => (
                        <div key={a.userId} className="flex items-center justify-between px-3 py-3 rounded-xl"
                          style={{ background: a.userId === user?.id ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.02)", border: a.userId === user?.id ? "1px solid rgba(212,175,55,0.2)" : "1px solid rgba(255,255,255,0.04)" }}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "rgba(212,175,55,0.12)", color: "#d4af37" }}>
                              {a.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                {a.fullName}
                                {a.userId === user?.id && <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(212,175,55,0.15)", color: "#d4af37" }}>YOU</span>}
                              </p>
                              <p className="text-[9px] text-neutral-600 font-inter">Code: {a.bookingCode}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black" style={{ color: "#d4af37" }}>{a.seatRow}{a.seatNumber}</div>
                            <div className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold">{a.seatCategory}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* ── RIGHT COLUMN: sidebar info ──────────────────────────────────── */}
          <div className="space-y-4">
            {/* Members summary */}
            <div className="p-4 rounded-2xl" style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3 flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Squad ({members.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {members.map(m => (
                  <div key={m.userId} title={m.fullName}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "rgba(212,175,55,0.12)", color: "#d4af37", border: "2px solid rgba(212,175,55,0.2)" }}>
                    {m.fullName.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>

            {/* Invite code card */}
            <div className="p-4 rounded-2xl" style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Invite Code</p>
              <div className="text-2xl font-black tracking-[0.2em] text-center py-3 rounded-xl" style={{ background: "rgba(212,175,55,0.06)", color: "#d4af37" }}>
                {night.inviteCode}
              </div>
              <button onClick={copyInvite}
                className="w-full mt-2 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)", color: "#d4af37" }}>
                {copied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy Code</>}
              </button>
            </div>

            {/* Recommendation mini card (if exists and status passed) */}
            {recommendation && status !== "COLLECTING_PREFERENCES" && (
              <div className="p-4 rounded-2xl space-y-3" style={{ background: "#0d0d0d", border: "1px solid rgba(192,132,252,0.15)" }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "rgba(192,132,252,0.6)" }}>Recommended</p>
                <div className="flex gap-3 items-start">
                  <img src={getImageUrl(recommendation.movie.posterUrl)} alt=""
                    className="w-12 h-[72px] rounded-lg object-cover flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black text-white leading-snug">{recommendation.movie.title}</p>
                    <p className="text-[9px] text-neutral-600 font-inter mt-1">{recommendation.show.startTime} · {recommendation.show.date}</p>
                    <p className="text-[9px] font-bold mt-1" style={{ color: "#c084fc" }}>{recommendation.compatibilityScore}% match</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-inter border-t border-neutral-900 pt-2">
                  <Film className="w-3 h-3" />
                  <span>{recommendation.theatre.name} · {recommendation.city.name}</span>
                </div>
              </div>
            )}

            {/* ── SQUAD CHAT ─────────────────────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)", height: 360 }}>
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.3)" }}>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5" style={{ color: "#6ee7e7" }} />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#6ee7e7" }}>Squad Chat</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-neutral-600">LIVE</span>
                </div>
              </div>

              {/* Messages */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-800">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2">
                    <MessageCircle className="w-6 h-6 text-neutral-800" />
                    <p className="text-[10px] text-neutral-700 font-inter text-center">No messages yet.<br />Start the conversation!</p>
                  </div>
                ) : chatMessages.map(msg => {
                  const isMe = msg.userId === user?.id;
                  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      {/* Avatar */}
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5"
                        style={{ background: isMe ? "rgba(212,175,55,0.18)" : "rgba(255,255,255,0.06)", color: isMe ? "#d4af37" : "#888" }}>
                        {msg.userFullName.charAt(0).toUpperCase()}
                      </div>
                      {/* Bubble */}
                      <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                        {!isMe && <span className="text-[8px] font-bold text-neutral-600 px-1">{msg.userFullName.split(" ")[0]}</span>}
                        <div className="px-2.5 py-1.5 rounded-2xl text-[11px] leading-relaxed font-inter"
                          style={isMe
                            ? { background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.2)", color: "#e8e8e8", borderBottomRightRadius: 4 }
                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#aaa", borderBottomLeftRadius: 4 }}>
                          {msg.message}
                        </div>
                        <span className="text-[8px] text-neutral-700 px-1 font-inter">{time}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="px-3 py-2.5 flex gap-2 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)" }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as any); } }}
                  placeholder="Type a message…"
                  maxLength={500}
                  style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "8px 12px", color: "#f0f0f0", fontSize: "0.75rem", fontFamily: "'Inter', sans-serif", outline: "none" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.35)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                />
                <button type="submit" disabled={!chatInput.trim() || chatSending}
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
                  style={{ background: chatInput.trim() ? "linear-gradient(135deg,#d4af37,#f4d03f)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {chatSending
                    ? <div className="w-3 h-3 border border-black/30 border-t-black rounded-full animate-spin" />
                    : <Send className="w-3.5 h-3.5" style={{ color: chatInput.trim() ? "#000" : "#444" }} />}
                </button>
              </form>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
