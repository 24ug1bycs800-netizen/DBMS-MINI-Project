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
      setError(err.response?.data?.error || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "#0a0a0a",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 8,
    color: "#f0ebe0",
    width: "100%",
    padding: "0.75rem 1rem 0.75rem 2.75rem",
    fontSize: "0.875rem",
    fontFamily: "Inter, sans-serif",
    outline: "none",
    transition: "border-color 0.2s ease",
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "rgba(201,168,76,0.4)";
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "rgba(255,255,255,0.07)";
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 font-inter"
         style={{ background: "#080808" }}>
      <div className="w-full max-w-sm">

        {/* LOGO */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="p-3.5 rounded-lg" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.18)" }}>
            <Film className="w-6 h-6" style={{ color: "#c9a84c" }} />
          </div>
          <div className="text-center">
            <span className="text-xl font-bold tracking-[0.1em] uppercase"
              style={{ fontFamily: "'Playfair Display', serif", color: "#c9a84c" }}>
              CineCircle
            </span>
            <p className="text-[10px] mt-1 tracking-[0.2em] uppercase font-inter" style={{ color: "rgba(255,255,255,0.22)" }}>
              Cinema Booking
            </p>
          </div>
        </div>

        {/* CARD */}
        <div className="rounded-xl overflow-hidden"
          style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
          {/* top accent line */}
          <div className="h-px" style={{ background: "rgba(201,168,76,0.35)" }} />

          <div className="p-7">
            <div className="mb-7">
              <h2 className="text-xl font-bold text-white"
                  style={{ fontFamily: "'Playfair Display', serif" }}>
                {isLogin ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-xs mt-1.5 font-inter" style={{ color: "rgba(255,255,255,0.3)" }}>
                {isLogin ? "Sign in to continue" : "Join CineCircle today"}
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-lg flex items-center gap-2.5 text-xs font-inter"
                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-red-400">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-[10px] font-semibold mb-1.5 tracking-[0.12em] uppercase font-inter"
                    style={{ color: "rgba(255,255,255,0.35)" }}>
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4" style={{ color: "rgba(255,255,255,0.2)" }} />
                    <input type="text" required placeholder="Your name" value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold mb-1.5 tracking-[0.12em] uppercase font-inter"
                  style={{ color: "rgba(255,255,255,0.35)" }}>
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4" style={{ color: "rgba(255,255,255,0.2)" }} />
                  <input type="email" required placeholder="email@example.com" value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold mb-1.5 tracking-[0.12em] uppercase font-inter"
                  style={{ color: "rgba(255,255,255,0.35)" }}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4" style={{ color: "rgba(255,255,255,0.2)" }} />
                  <input type="password" required placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                style={{ background: "#c9a84c", color: "#000", borderRadius: 7, marginTop: "0.25rem" }}
                onMouseEnter={e => !loading && (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : isLogin ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-4">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              <span className="text-[10px] tracking-widest uppercase font-inter" style={{ color: "rgba(255,255,255,0.2)" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>

            <p className="text-center text-xs font-inter" style={{ color: "rgba(255,255,255,0.3)" }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(""); }}
                className="font-semibold transition-opacity hover:opacity-75"
                style={{ color: "#c9a84c" }}
              >
                {isLogin ? "Create one" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
