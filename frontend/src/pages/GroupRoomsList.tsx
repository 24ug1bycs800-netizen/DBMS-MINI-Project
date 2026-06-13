import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import {
  MessageSquare,
  PlusCircle,
  Compass,
  AlertCircle,
  Loader,
  ArrowRight,
  Users,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import api from "../services/api.js";

export const GroupRoomsList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteInput, setInviteInput] = useState("");
  const [roomNameInput, setRoomNameInput] = useState("");
  const [err, setErr] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchRooms = async () => {
    try {
      const res = await api.get("/groups/my-rooms");
      setRooms(res.data.rooms);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth", { state: { from: "/groups" } });
      return;
    }
    fetchRooms();
  }, [user]);

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInput) return;
    setErr("");
    setActionLoading(true);
    try {
      const res = await api.post("/groups/join", { inviteCode: inviteInput });
      navigate(`/group/${res.data.inviteCode}`);
    } catch (error: any) {
      setErr(error.response?.data?.error || "Failed to join room. Verify invite code.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyCode = async (e: React.MouseEvent, code: string, id: number) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteRoom = async (e: React.MouseEvent, roomId: number) => {
    e.stopPropagation();
    if (!window.confirm("Delete this room? This cannot be undone.")) return;
    setDeletingId(roomId);
    try {
      await api.delete(`/groups/${roomId}`);
      setRooms(prev => prev.filter(r => r.id !== roomId));
    } catch (error: any) {
      setErr(error.response?.data?.error || "Failed to delete room.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNameInput) return;
    setErr("");
    setActionLoading(true);
    try {
      const res = await api.post("/groups/create", { name: roomNameInput });
      navigate(`/group/${res.data.room.inviteCode}`);
    } catch (error: any) {
      setErr(error.response?.data?.error || "Failed to create planning room.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080808" }}>
        <div
          className="w-10 h-10 rounded-full border-t-2 animate-spin"
          style={{ borderColor: "#d4af37" }}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white pb-24 font-poppins relative"
      style={{ background: "#080808" }}
    >
      {/* FILM GRAIN */}
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* AMBIENT GLOW */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] pointer-events-none z-0"
        style={{
          background: "transparent",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-12 py-14 space-y-14">

        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <div className="relative">
          {/* VERTICAL GOLD ACCENT */}
          <div
            className="absolute -left-6 top-0 bottom-0 w-0.5 rounded-full"
            style={{ background: "linear-gradient(to bottom, #d4af37, transparent)" }}
          />
          <div className="flex items-center gap-3 mb-3">
            <div
              className="p-2.5 rounded-xl"
              style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)" }}
            >
              <MessageSquare className="w-5 h-5" style={{ color: "#d4af37" }} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-wide">
              Planning Rooms
            </h1>
          </div>
          <p className="text-sm text-neutral-600 font-inter leading-relaxed max-w-lg">
            Coordinate with your squad — vote on movies, sync showtimes, and lock in adjacent seats together.
          </p>
          {/* GOLD HAIRLINE */}
          <div
            className="mt-6 h-px"
            style={{ background: "linear-gradient(to right, rgba(212,175,55,0.4), transparent)" }}
          />
        </div>

        {/* ── ERROR ─────────────────────────────────────────────────────── */}
        {err && (
          <div
            className="p-4 rounded-xl flex items-center gap-2.5 text-sm font-inter"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-400">{err}</span>
          </div>
        )}

        {/* ── JOIN / CREATE PANELS ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* JOIN */}
          <ActionPanel
            title="Join Existing Room"
            description="Enter a 6-character invite code shared by your friend to join their planning workspace."
            icon={<Compass className="w-5 h-5" style={{ color: "#d4af37" }} />}
          >
            <form onSubmit={handleJoinRoom} className="flex gap-2.5">
              <input
                type="text"
                required
                maxLength={6}
                placeholder="INVITE CODE"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
                className="flex-grow px-4 py-3 rounded-xl font-mono uppercase tracking-widest text-sm text-white transition-all focus:outline-none"
                style={{
                  background: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
                onFocus={(e) => {
                  e.target.style.border = "1px solid rgba(212,175,55,0.5)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.06)";
                }}
                onBlur={(e) => {
                  e.target.style.border = "1px solid rgba(255,255,255,0.07)";
                  e.target.style.boxShadow = "none";
                }}
              />
              <GoldButton loading={actionLoading} icon={<Compass className="w-4 h-4" />} label="Join" />
            </form>
          </ActionPanel>

          {/* CREATE */}
          <ActionPanel
            title="Create New Room"
            description="Spawn a planning space for your squad. You'll be the host and coordinate final bookings."
            icon={<PlusCircle className="w-5 h-5" style={{ color: "#d4af37" }} />}
          >
            <form onSubmit={handleCreateRoom} className="flex gap-2.5">
              <input
                type="text"
                required
                placeholder="Room name (e.g. Friday Blockbuster)"
                value={roomNameInput}
                onChange={(e) => setRoomNameInput(e.target.value)}
                className="flex-grow px-4 py-3 rounded-xl text-sm text-white transition-all focus:outline-none"
                style={{
                  background: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
                onFocus={(e) => {
                  e.target.style.border = "1px solid rgba(212,175,55,0.5)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.06)";
                }}
                onBlur={(e) => {
                  e.target.style.border = "1px solid rgba(255,255,255,0.07)";
                  e.target.style.boxShadow = "none";
                }}
              />
              <GoldButton loading={actionLoading} icon={<PlusCircle className="w-4 h-4" />} label="Create" />
            </form>
          </ActionPanel>
        </div>

        {/* ── MY WORKSPACES ──────────────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 rounded-full" style={{ background: "#d4af37" }} />
            <h3 className="text-lg font-black text-white">My Workspaces</h3>
            <span
              className="ml-auto px-2.5 py-0.5 rounded-full text-[10px] font-black"
              style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: "#d4af37" }}
            >
              {rooms.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => navigate(`/group/${room.inviteCode}`)}
                  className="p-5 rounded-2xl cursor-pointer transition-all transition-opacity hover:opacity-85 flex justify-between items-center group relative overflow-hidden"
                  style={{
                    background: "linear-gradient(160deg, #111 0%, #0c0c0c 100%)",
                    border: "1px solid rgba(212,175,55,0.08)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)";
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(212,175,55,0.08)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
                  }}
                >
                  {/* SUBTLE GLOW */}
                  <div
                    className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.5), transparent)" }}
                  />

                  <div className="flex gap-3.5 items-center">
                    <div
                      className="p-3 rounded-xl flex-shrink-0"
                      style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.18)" }}
                    >
                      <MessageSquare className="w-5 h-5" style={{ color: "#d4af37" }} />
                    </div>
                    <div>
                      <h4 className="font-black text-white text-sm group-hover:text-[#d4af37] transition-colors leading-tight">
                        {room.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] font-mono tracking-widest" style={{ color: "#d4af37" }}>
                          {room.inviteCode}
                        </span>
                        <button
                          onClick={(e) => handleCopyCode(e, room.inviteCode, room.id)}
                          className="p-0.5 rounded transition-colors"
                          style={{ color: copiedId === room.id ? "#4ade80" : "rgba(212,175,55,0.5)" }}
                          title="Copy invite code"
                        >
                          {copiedId === room.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <span className="text-[9px] text-neutral-700">·</span>
                        <span className="flex items-center gap-0.5 text-[9px] text-neutral-600 font-inter">
                          <Users className="w-2.5 h-2.5" /> {room.membersCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
                      style={
                        room.status === "voting"
                          ? { background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37" }
                          : { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }
                      }
                    >
                      {room.status}
                    </span>
                    {room.creator?.id === user?.id && (
                      <button
                        onClick={(e) => handleDeleteRoom(e, room.id)}
                        disabled={deletingId === room.id}
                        className="p-1.5 rounded-lg transition-colors hover:bg-red-900/20 disabled:opacity-40"
                        style={{ color: "rgba(239,68,68,0.5)" }}
                        title="Delete room"
                      >
                        {deletingId === room.id
                          ? <Loader className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <ArrowRight
                      className="w-4 h-4 transition-all group-hover:translate-x-1"
                      style={{ color: "rgba(212,175,55,0.3)" }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div
                className="col-span-2 py-16 rounded-2xl flex flex-col items-center gap-3"
                style={{ border: "1px dashed rgba(212,175,55,0.1)", background: "rgba(212,175,55,0.01)" }}
              >
                <MessageSquare className="w-10 h-10" style={{ color: "rgba(212,175,55,0.15)" }} />
                <p className="text-sm text-neutral-700 font-inter text-center max-w-xs">
                  You haven't joined or created any planning rooms yet. Invite your squad above.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────

const ActionPanel: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, icon, children }) => (
  <div
    className="p-6 rounded-2xl flex flex-col gap-5 relative overflow-hidden"
    style={{
      background: "linear-gradient(160deg, #111 0%, #0d0d0d 100%)",
      border: "1px solid rgba(212,175,55,0.12)",
      boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
    }}
  >
    <div
      className="absolute top-0 left-0 right-0 h-px"
      style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.3) 40%, transparent)" }}
    />
    <div className="flex items-start gap-3">
      <div
        className="p-2 rounded-lg flex-shrink-0 mt-0.5"
        style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.18)" }}
      >
        {icon}
      </div>
      <div>
        <h3 className="font-black text-white text-base">{title}</h3>
        <p className="text-xs text-neutral-600 font-inter leading-relaxed mt-1">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const GoldButton: React.FC<{ loading: boolean; icon: React.ReactNode; label: string }> = ({
  loading,
  icon,
  label,
}) => (
  <button
    type="submit"
    disabled={loading}
    className="px-5 py-3 rounded-xl font-black text-sm flex items-center gap-1.5 transition-all transition-opacity hover:opacity-80 active:scale-95 disabled:opacity-50 flex-shrink-0"
    style={{
      background: "#c9a84c",
      color: "#000",
      boxShadow: "0 4px 16px rgba(212,175,55,0.25)",
    }}
  >
    {loading ? <Loader className="w-4 h-4 animate-spin" /> : <>{icon} {label}</>}
  </button>
);
