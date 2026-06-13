import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { useCityStore } from "../store/useCityStore.js";
import {
  Users,
  Vote,
  CheckCircle,
  Trophy,
  Copy,
  Check,
  AlertCircle,
  Compass,
  ShieldAlert,
} from "lucide-react";
import api from "../services/api.js";

interface Room {
  id: number;
  name: string;
  creatorId: number;
  inviteCode: string;
  status: string;
  selectedMovieId?: number;
  selectedTheatreId?: number;
  selectedShowId?: number;
}

interface Member {
  id: number;
  joinedAt: string;
  user: { id: number; fullName: string; email: string; profilePic?: string };
}

interface VoteCount {
  id: number;
  title?: string;
  name?: string;
  startTime?: string;
  date?: string;
  votes: number;
}

// ─── VOTE PROGRESS BAR ────────────────────────────────────────────────────────
const VoteBar: React.FC<{
  label: string;
  votes: number;
  percent: number;
  myVote: boolean;
  barColor: string;
}> = ({ label, votes, percent, myVote, barColor }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center text-xs font-inter">
      <span className="text-white font-bold flex items-center gap-2">
        {label}
        {myVote && (
          <span
            className="text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" }}
          >
            My Vote
          </span>
        )}
      </span>
      <span className="text-neutral-600 font-inter text-[10px]">{votes} votes · {percent}%</span>
    </div>
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${percent}%`, background: barColor, boxShadow: `0 0 8px ${barColor}55` }}
      />
    </div>
  </div>
);

// ─── VOTING SECTION CARD ──────────────────────────────────────────────────────
const VotingCard: React.FC<{
  step: number;
  title: string;
  subtitle?: string;
  selectValue: number | "";
  onSelectChange: (val: number | "") => void;
  options: { id: number; label: string }[];
  onVote: () => void;
  votes: VoteCount[];
  totalVotes: number;
  rawVotes: any[];
  userId?: number;
  voteType: string;
  barColor: string;
  placeholder: string;
  voteBtnLabel: string;
}> = ({
  step, title, subtitle, selectValue, onSelectChange, options,
  onVote, votes, totalVotes, rawVotes, userId, voteType, barColor, placeholder, voteBtnLabel,
}) => (
  <div
    className="p-6 rounded-2xl space-y-5 relative overflow-hidden"
    style={{ background: "linear-gradient(160deg, #0f0f0f 0%, #0b0b0b 100%)", border: "1px solid rgba(255,255,255,0.05)" }}
  >
    {/* STEP NUMBER */}
    <div className="flex items-center gap-3">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
        style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37" }}
      >
        {step}
      </div>
      <div>
        <h3 className="font-black text-sm text-white">{title}</h3>
        {subtitle && <p className="text-[10px] text-neutral-700 font-inter mt-0.5">{subtitle}</p>}
      </div>
    </div>

    {/* SELECT + VOTE */}
    <div className="flex gap-2.5">
      <select
        value={selectValue}
        onChange={(e) => onSelectChange(e.target.value === "" ? "" : parseInt(e.target.value))}
        className="flex-grow p-3 rounded-xl text-white text-xs focus:outline-none transition-all appearance-none"
        style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.07)" }}
        onFocus={(e) => { e.target.style.border = "1px solid rgba(212,175,55,0.4)"; }}
        onBlur={(e) => { e.target.style.border = "1px solid rgba(255,255,255,0.07)"; }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
      <button
        onClick={onVote}
        disabled={selectValue === ""}
        className="px-5 py-3 rounded-xl font-black text-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-30 flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #d4af37, #f4d03f)", color: "#000" }}
      >
        {voteBtnLabel}
      </button>
    </div>

    {/* VOTE BARS */}
    {votes.length > 0 && (
      <div className="space-y-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        {votes.map((v) => {
          const percent = Math.round((v.votes / totalVotes) * 100);
          const myVote = rawVotes.some((rv) => rv.userId === userId && rv.voteType === voteType && rv.votedId === v.id);
          return (
            <VoteBar
              key={v.id}
              label={v.title || v.name || `${v.startTime} (${v.date})`}
              votes={v.votes}
              percent={percent}
              myVote={myVote}
              barColor={barColor}
            />
          );
        })}
      </div>
    )}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export const GroupBooking: React.FC = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedCity } = useCityStore();

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [moviesList, setMoviesList] = useState<any[]>([]);
  const [theatresList, setTheatresList] = useState<any[]>([]);
  const [showsList, setShowsList] = useState<any[]>([]);
  const [movieVotes, setMovieVotes] = useState<VoteCount[]>([]);
  const [theatreVotes, setTheatreVotes] = useState<VoteCount[]>([]);
  const [showtimeVotes, setShowtimeVotes] = useState<VoteCount[]>([]);
  const [rawVotes, setRawVotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [selectedMovieVote, setSelectedMovieVote] = useState<number | "">("");
  const [selectedTheatreVote, setSelectedTheatreVote] = useState<number | "">("");
  const [selectedShowtimeVote, setSelectedShowtimeVote] = useState<number | "">("");

  const fetchRoomData = async () => {
    try {
      const res = await api.get(`/groups/${inviteCode}`);
      setRoom(res.data.room);
      setMembers(res.data.members);
      setMovieVotes(res.data.votingResults.movies);
      setTheatreVotes(res.data.votingResults.theatres);
      setShowtimeVotes(res.data.votingResults.showtimes);
      setRawVotes(res.data.rawVotes);

      const r = res.data.room as Room;
      const nowMovies = await api.get("/movies?isNowShowing=true");
      setMoviesList(nowMovies.data.movies);
      const localTheatres = await api.get(`/theatres?citySlug=${selectedCity.slug}`);
      setTheatresList(localTheatres.data.theatres);

      const topMovie = res.data.votingResults.movies.sort((a: any, b: any) => b.votes - a.votes)[0];
      if (topMovie || r.selectedMovieId) {
        const mId = r.selectedMovieId || topMovie.id;
        const topTheatre = res.data.votingResults.theatres.sort((a: any, b: any) => b.votes - a.votes)[0];
        const theatreId = r.selectedTheatreId || topTheatre?.id;
        const showsRes = await api.get(
          `/shows?movieId=${mId}&theatreId=${theatreId}&citySlug=${selectedCity.slug}`
        );
        setShowsList(showsRes.data.shows);
      }
    } catch {
      setError("Unable to retrieve group room. Verify code correctness.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) { navigate("/auth", { state: { from: `/group/${inviteCode}` } }); return; }
    fetchRoomData();
  }, [inviteCode, user, selectedCity]);

  useEffect(() => {
    if (!room || room.status !== "voting") return;
    const interval = setInterval(fetchRoomData, 8000);
    return () => clearInterval(interval);
  }, [room]);

  // ✅ Copy only the invite code (not the full URL)
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room!.inviteCode);
    } catch {
      // Fallback for non-HTTPS / older browsers
      const el = document.createElement("textarea");
      el.value = room!.inviteCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCastVote = async (type: "movie" | "theatre" | "showtime", votedId: number) => {
    try {
      await api.post(`/groups/${room?.id}/vote`, { voteType: type, votedId });
      await fetchRoomData();
    } catch { console.error("Vote failed"); }
  };

  // ✅ Fixed: navigate directly using topShow.id after finalize — don't wait on fetchRoomData
  const handleFinalizeRoom = async () => {
    const topMovie = [...movieVotes].sort((a, b) => b.votes - a.votes)[0];
    const topTheatre = [...theatreVotes].sort((a, b) => b.votes - a.votes)[0];
    const topShow = [...showtimeVotes].sort((a, b) => b.votes - a.votes)[0];

    if (!topMovie || !topTheatre || !topShow) {
      setError("At least one vote needed for Movie, Theatre, and Showtime before finalization.");
      setTimeout(() => setError(""), 5000);
      return;
    }

    try {
      await api.post(`/groups/${room?.id}/finalize`, {
        movieId: topMovie.id,
        theatreId: topTheatre.id,
        showId: topShow.id,
      });

      // ✅ Navigate immediately using topShow.id — no need to wait for room refetch
      navigate(`/shows/${topShow.id}/booking`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to finalize choices.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080808" }}>
        <div className="w-10 h-10 rounded-full border-t-2 animate-spin" style={{ borderColor: "#d4af37" }} />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#080808" }}>
        <div
          className="max-w-md p-10 rounded-2xl text-center"
          style={{ background: "#0f0f0f", border: "1px solid rgba(239,68,68,0.15)" }}
        >
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(239,68,68,0.4)" }} />
          <h3 className="text-xl font-black text-white mb-2">Room Not Found</h3>
          <p className="text-sm text-neutral-600 font-inter">The room code is either invalid or expired.</p>
          <button
            onClick={() => navigate("/")}
            className="mt-7 px-6 py-2.5 rounded-xl font-black text-sm transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #d4af37, #f4d03f)", color: "#000" }}
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const isCreator = room.creatorId === user?.id;
  const totalMovieVotes = movieVotes.reduce((s, v) => s + v.votes, 0) || 1;
  const totalTheatreVotes = theatreVotes.reduce((s, v) => s + v.votes, 0) || 1;
  const totalShowtimeVotes = showtimeVotes.reduce((s, v) => s + v.votes, 0) || 1;

  // ✅ Derive finalShowId from room OR fall back to top showtime vote
  const finalShowId =
    room.selectedShowId ||
    [...showtimeVotes].sort((a, b) => b.votes - a.votes)[0]?.id;

  return (
    <div className="min-h-screen text-white pb-24 font-poppins relative" style={{ background: "#080808" }}>
      {/* FILM GRAIN */}
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none z-0"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}
      />
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse at center top, rgba(212,175,55,0.06) 0%, transparent 65%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 py-12 space-y-8">
        {/* ── ROOM HEADER ───────────────────────────────────────────── */}
        <div
          className="p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-5"
          style={{ background: "linear-gradient(160deg, #111 0%, #0d0d0d 100%)", border: "1px solid rgba(212,175,55,0.12)" }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.4) 30%, rgba(212,175,55,0.4) 70%, transparent)" }} />
          <div className="absolute top-0 right-0 w-80 h-48 blur-[90px] pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.05), transparent 70%)" }} />

          <div>
            <span
              className="text-[10px] font-black tracking-[0.2em] uppercase px-3 py-1 rounded-full"
              style={
                room.status === "voting"
                  ? { background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37" }
                  : { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }
              }
            >
              {room.status === "voting" ? "🗳 Voting Phase Active" : "🏆 Selections Finalized"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-3 text-white">{room.name}</h1>
            <p className="text-xs text-neutral-700 font-inter mt-1.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" /> City context: <strong className="text-neutral-500">{selectedCity.name}</strong>
            </p>
          </div>

          {/* INVITE CODE BADGE */}
          <div
            className="p-4 rounded-xl flex items-center gap-5"
            style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div>
              <span className="block text-[9px] text-neutral-700 font-bold uppercase tracking-widest">Room Code</span>
              <strong className="text-xl font-black font-mono tracking-wider" style={{ color: "#d4af37" }}>
                {room.inviteCode}
              </strong>
            </div>
            {/* ✅ Copies only the invite code */}
            <button
              onClick={handleCopyCode}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
              style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: "#d4af37" }}
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Code"}
            </button>
          </div>
        </div>

        {error && (
          <div
            className="p-4 rounded-xl flex items-center gap-2.5 text-sm font-inter"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-400">{error}</span>
          </div>
        )}

        {/* ── MAIN GRID ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* VOTING BOARDS */}
          <div className="lg:col-span-2 space-y-5">
            {room.status === "voting" ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 rounded-full" style={{ background: "#d4af37" }} />
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Vote className="w-5 h-5" style={{ color: "#d4af37" }} /> Cast Your Votes
                  </h2>
                </div>

                <VotingCard
                  step={1} title="Select Preferred Movie"
                  placeholder="— Choose Now Showing Movie —"
                  voteBtnLabel="Vote"
                  selectValue={selectedMovieVote}
                  onSelectChange={setSelectedMovieVote}
                  options={moviesList.map((m) => ({ id: m.id, label: `${m.title} (${m.language})` }))}
                  onVote={() => selectedMovieVote !== "" && handleCastVote("movie", selectedMovieVote)}
                  votes={movieVotes}
                  totalVotes={totalMovieVotes}
                  rawVotes={rawVotes}
                  userId={user?.id}
                  voteType="movie"
                  barColor="#d4af37"
                />

                <VotingCard
                  step={2} title="Select Preferred Theatre"
                  placeholder="— Choose Local Theatre —"
                  voteBtnLabel="Vote"
                  selectValue={selectedTheatreVote}
                  onSelectChange={setSelectedTheatreVote}
                  options={theatresList.map((t) => ({ id: t.id, label: t.name }))}
                  onVote={() => selectedTheatreVote !== "" && handleCastVote("theatre", selectedTheatreVote)}
                  votes={theatreVotes}
                  totalVotes={totalTheatreVotes}
                  rawVotes={rawVotes}
                  userId={user?.id}
                  voteType="theatre"
                  barColor="#6ee7e7"
                />

                <VotingCard
                  step={3} title="Select Preferred Showtime"
                  subtitle="Auto-computed from top voted movie & theatre"
                  placeholder="— Choose Available Showtime —"
                  voteBtnLabel="Vote"
                  selectValue={selectedShowtimeVote}
                  onSelectChange={setSelectedShowtimeVote}
                  options={showsList.map((s) => ({ id: s.id, label: `${s.startTime} (${s.date} · Screen ${s.screen.number})` }))}
                  onVote={() => selectedShowtimeVote !== "" && handleCastVote("showtime", selectedShowtimeVote)}
                  votes={showtimeVotes}
                  totalVotes={totalShowtimeVotes}
                  rawVotes={rawVotes}
                  userId={user?.id}
                  voteType="showtime"
                  barColor="#a78bfa"
                />
              </>
            ) : (
              /* ✅ FINALIZED CARD — uses finalShowId fallback */
              <div
                className="p-10 rounded-2xl flex flex-col items-center text-center relative overflow-hidden"
                style={{ background: "linear-gradient(160deg, #0c160c 0%, #090d09 100%)", border: "1px solid rgba(34,197,94,0.2)" }}
              >
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(34,197,94,0.4) 40%, transparent)" }} />
                <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(34,197,94,0.04), transparent 60%)" }} />

                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}
                >
                  <Trophy className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Room Choices Finalized!</h3>
                <p className="text-sm text-neutral-600 font-inter max-w-sm leading-relaxed mb-8">
                  Decisions are locked. All members can now proceed to seat selection and complete their booking.
                </p>
                <button
                  onClick={() => navigate(`/shows/${finalShowId}/booking`)}
                  disabled={!finalShowId}
                  className="px-8 py-3.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", boxShadow: "0 8px 24px rgba(34,197,94,0.2)" }}
                >
                  <CheckCircle className="w-4 h-4" /> Go to Seat Selection
                </button>
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <div className="space-y-5">
            {/* MEMBERS LIST */}
            <div
              className="p-5 rounded-2xl"
              style={{ background: "linear-gradient(160deg, #111 0%, #0c0c0c 100%)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <h4 className="font-black text-sm text-white mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: "#d4af37" }} />
                Members
                <span
                  className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black"
                  style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: "#d4af37" }}
                >
                  {members.length}
                </span>
              </h4>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    {m.user.profilePic ? (
                      <img src={m.user.profilePic} alt="pic" className="w-7 h-7 rounded-full flex-shrink-0" />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black uppercase flex-shrink-0"
                        style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: "#d4af37" }}
                      >
                        {m.user.fullName.substring(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="font-black text-xs text-white block truncate">{m.user.fullName}</span>
                      <span className="text-[9px] text-neutral-700 font-inter truncate block">{m.user.email}</span>
                    </div>
                    <span className="ml-auto text-[8px] font-black uppercase text-neutral-800 flex-shrink-0">Joined</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CREATOR CONTROL */}
            {room.status === "voting" && (
              <div
                className="p-5 rounded-2xl"
                style={{ background: "linear-gradient(160deg, #111 0%, #0c0c0c 100%)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <h4 className="font-black text-sm text-white mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4" style={{ color: "#d4af37" }} /> Creator Control
                </h4>
                <p className="text-xs text-neutral-700 font-inter leading-relaxed mb-4">
                  As the room leader, you can conclude voting and lock in the top-voted choices.
                </p>

                {isCreator ? (
                  <button
                    onClick={handleFinalizeRoom}
                    className="w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                    style={{ background: "linear-gradient(135deg, #d4af37, #f4d03f)", color: "#000" }}
                  >
                    <CheckCircle className="w-4 h-4" /> Conclude Voting & Finalize
                  </button>
                ) : (
                  <div
                    className="p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-neutral-700 font-inter"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "rgba(212,175,55,0.4)" }} />
                    <span>
                      Only the host (<strong className="text-neutral-500">{members.find((m) => m.user.id === room.creatorId)?.user.fullName || "Creator"}</strong>) can finalize voting. Stay synced!
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
