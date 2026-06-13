import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { Film, User, Mail, Lock, AlertCircle, Loader } from "lucide-react";

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = (location.state as any)?.from || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          "Authentication failed. Please verify credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-[#080808] font-poppins relative overflow-hidden">
      {/* FILM GRAIN TEXTURE OVERLAY */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* RADIAL GOLD GLOW — top center */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center top, rgba(212,175,55,0.12) 0%, transparent 70%)",
        }}
      />

      {/* CORNER ACCENTS */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-[#d4af37] opacity-20 rounded-tl-sm" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-[#d4af37] opacity-20 rounded-br-sm" />

      <div className="w-full max-w-md relative z-10">
        {/* LOGO ABOVE CARD */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-xl bg-[#d4af37] opacity-20" />
            <div className="relative p-4 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/5">
              <Film className="w-8 h-8 text-[#d4af37]" />
            </div>
          </div>
          <div className="text-center">
            <span
              className="text-2xl font-black tracking-[0.2em] uppercase"
              style={{
                background: "linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              CineCircle
            </span>
            <p className="text-[10px] text-neutral-600 tracking-[0.3em] uppercase font-inter mt-1">
              Premium Cinema Experience
            </p>
          </div>
        </div>

        {/* CARD */}
        <div
          className="rounded-2xl relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #141414 0%, #0e0e0e 100%)",
            border: "1px solid rgba(212,175,55,0.15)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,175,55,0.1)",
          }}
        >
          {/* TOP GOLD LINE */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(to right, transparent, #d4af37 30%, #f4d03f 50%, #d4af37 70%, transparent)",
            }}
          />

          <div className="p-8">
            {/* TITLE */}
            <div className="mb-8">
              <h2 className="text-2xl font-black text-white tracking-wide">
                {isLogin ? "Welcome Back" : "Join CineCircle"}
              </h2>
              <p className="text-xs text-neutral-500 font-inter mt-1.5">
                {isLogin
                  ? "Sign in to access your cinematic portal"
                  : "Start planning with friends today"}
              </p>
              {/* GOLD UNDERLINE ACCENT */}
              <div className="mt-3 w-8 h-0.5 bg-[#d4af37] rounded-full" />
            </div>

            {/* ERROR BOX */}
            {error && (
              <div className="mb-6 p-4 rounded-xl flex items-center gap-2.5 text-sm font-inter"
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-red-400">{error}</span>
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-5 font-inter text-sm">
              {!isLogin && (
                <div>
                  <label className="block text-[10px] font-bold text-[#d4af37] mb-2 tracking-[0.15em] uppercase">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-600" />
                    <input
                      type="text"
                      required
                      placeholder="Enter full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl text-white text-sm transition-all focus:outline-none"
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
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-[#d4af37] mb-2 tracking-[0.15em] uppercase">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-600" />
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-white text-sm transition-all focus:outline-none"
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
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#d4af37] mb-2 tracking-[0.15em] uppercase">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-600" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-white text-sm transition-all focus:outline-none"
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
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #c9a227 100%)",
                  color: "#000",
                  boxShadow: "0 8px 24px rgba(212,175,55,0.25)",
                }}
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            {/* DIVIDER */}
            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-neutral-900" />
              <span className="text-[10px] text-neutral-700 tracking-widest uppercase font-inter">
                or
              </span>
              <div className="flex-1 h-px bg-neutral-900" />
            </div>

            {/* TOGGLE */}
            <div className="text-center text-xs text-neutral-600 font-inter">
              <span>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="font-bold transition-colors hover:opacity-80"
                style={{ color: "#d4af37" }}
              >
                {isLogin ? "Create one" : "Sign in here"}
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM TAGLINE */}
        <p className="text-center text-[10px] text-neutral-800 font-inter mt-6 tracking-widest uppercase">
          Luxury Cinema Booking · Est. 2026
        </p>
      </div>
    </div>
  );
};
