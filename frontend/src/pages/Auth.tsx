import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { motion, AnimatePresence } from "framer-motion";
import { Film, User, Mail, Lock, AlertCircle, Loader, ArrowLeft, CheckCircle, Popcorn } from "lucide-react";
import api from "../services/api.js";

type View = "login" | "register" | "forgot" | "forgot-sent";

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 20 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -20 }),
};

export const Auth: React.FC = () => {
  const [view, setView] = useState<View>("login");
  const [dir, setDir] = useState(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = (location.state as any)?.from || "/";

  const go = (next: View, direction = 1) => {
    setDir(direction);
    setError("");
    setView(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (view === "login") {
        await login(email, password);
        navigate(redirectPath, { replace: true });
      } else if (view === "register") {
        await register(email, password, fullName);
        navigate(redirectPath, { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      go("forgot-sent", 1);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <Popcorn size={16} />, text: "Create shared Movie Night rooms" },
    { icon: <Film size={16} />, text: "Vote on movies with friends" },
    { icon: <CheckCircle size={16} />, text: "Book group seats with ease" },
  ];

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: "#0B1120",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* ── LEFT PANEL (desktop only) ───────────────────────────────────── */}
      <div
        className="hidden lg:flex"
        style={{
          width: "45%", flexShrink: 0,
          position: "relative", overflow: "hidden",
          background: "linear-gradient(160deg, #0F1A2E 0%, #0B1120 100%)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "3rem",
        }}
      >
        {/* Background pattern */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(229,9,20,0.07) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245,158,11,0.04) 0%, transparent 40%)`,
          pointerEvents: "none",
        }} />

        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.025,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }} />

        {/* Logo */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "#E50914",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Film size={20} color="#fff" />
            </div>
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700, fontSize: "1.3rem", color: "#F9FAFB",
              letterSpacing: "-0.01em",
            }}>CineCircle</span>
          </div>
        </div>

        {/* Main copy */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 12px",
            background: "rgba(229,9,20,0.12)",
            border: "1px solid rgba(229,9,20,0.25)",
            borderRadius: 6,
            marginBottom: 20,
          }}>
            <Popcorn size={13} color="#E50914" />
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#E50914", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Space Grotesk', sans-serif" }}>
              Movie Nights
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "2.4rem",
            color: "#F9FAFB",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}>
            Plan Movie<br />Nights Together
          </h1>
          <p style={{ color: "#6B7280", fontSize: "0.9rem", lineHeight: 1.65, maxWidth: 320, marginBottom: 36 }}>
            Decide what to watch, when to go, and book seats with friends — all from one place.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: "rgba(229,9,20,0.1)",
                  border: "1px solid rgba(229,9,20,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#E50914",
                }}>
                  {f.icon}
                </div>
                <span style={{ fontSize: "0.85rem", color: "#9CA3AF" }}>{f.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <p style={{ position: "relative", zIndex: 1, fontSize: "0.72rem", color: "#374151", fontFamily: "'Inter', sans-serif" }}>
          CineCircle · Collaborative Cinema Booking
        </p>
      </div>

      {/* ── RIGHT PANEL — Forms ─────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "2rem 1.5rem",
        position: "relative",
        minWidth: 0,
      }}>
        {/* Mobile logo */}
        <div className="lg:hidden" style={{ position: "absolute", top: 28, left: 24, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "#E50914", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Film size={15} color="#fff" />
          </div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#F9FAFB" }}>CineCircle</span>
        </div>

        <div style={{ width: "100%", maxWidth: 400 }}>
          <AnimatePresence mode="wait" custom={dir}>
            {/* ── LOGIN ──────────────────────────────────────────────────── */}
            {view === "login" && (
              <motion.div key="login" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.25, ease: "easeOut" }}>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.6rem", color: "#F9FAFB", marginBottom: 6, letterSpacing: "-0.01em" }}>
                  Welcome back
                </h2>
                <p style={{ color: "#6B7280", fontSize: "0.85rem", marginBottom: 28 }}>Sign in to your CineCircle account</p>

                {error && <ErrorBox message={error} />}

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <FormField icon={<Mail size={15} />} label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" />
                  <FormField icon={<Lock size={15} />} label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />

                  <div style={{ textAlign: "right", marginTop: -6 }}>
                    <button type="button" onClick={() => go("forgot", 1)}
                      style={{ background: "none", border: "none", color: "#E50914", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                      Forgot password?
                    </button>
                  </div>

                  <SubmitButton loading={loading} label="Sign In" />
                </form>

                <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.82rem", color: "#6B7280" }}>
                  Don't have an account?{" "}
                  <button onClick={() => go("register", 1)}
                    style={{ background: "none", border: "none", color: "#F59E0B", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: "0.82rem" }}>
                    Create one
                  </button>
                </p>
              </motion.div>
            )}

            {/* ── REGISTER ───────────────────────────────────────────────── */}
            {view === "register" && (
              <motion.div key="register" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.25, ease: "easeOut" }}>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.6rem", color: "#F9FAFB", marginBottom: 6, letterSpacing: "-0.01em" }}>
                  Join CineCircle
                </h2>
                <p style={{ color: "#6B7280", fontSize: "0.85rem", marginBottom: 28 }}>Plan movie nights with your crew</p>

                {error && <ErrorBox message={error} />}

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <FormField icon={<User size={15} />} label="Full Name" type="text" value={fullName} onChange={setFullName} placeholder="Enter full name" />
                  <FormField icon={<Mail size={15} />} label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" />
                  <FormField icon={<Lock size={15} />} label="Password" type="password" value={password} onChange={setPassword} placeholder="Min 8 characters" />
                  <SubmitButton loading={loading} label="Create Account" />
                </form>

                <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.82rem", color: "#6B7280" }}>
                  Already have an account?{" "}
                  <button onClick={() => go("login", -1)}
                    style={{ background: "none", border: "none", color: "#F59E0B", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: "0.82rem" }}>
                    Sign in
                  </button>
                </p>
              </motion.div>
            )}

            {/* ── FORGOT PASSWORD ─────────────────────────────────────────── */}
            {view === "forgot" && (
              <motion.div key="forgot" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.25, ease: "easeOut" }}>
                <button onClick={() => go("login", -1)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: "0.82rem", marginBottom: 24, fontFamily: "'Inter', sans-serif", padding: 0 }}>
                  <ArrowLeft size={14} /> Back to sign in
                </button>

                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.6rem", color: "#F9FAFB", marginBottom: 6, letterSpacing: "-0.01em" }}>
                  Reset password
                </h2>
                <p style={{ color: "#6B7280", fontSize: "0.85rem", marginBottom: 28 }}>
                  Enter your email and we'll send you a reset link.
                </p>

                {error && <ErrorBox message={error} />}

                <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <FormField icon={<Mail size={15} />} label="Email Address" type="email" value={email} onChange={setEmail} placeholder="email@example.com" />
                  <SubmitButton loading={loading} label="Send Reset Link" />
                </form>
              </motion.div>
            )}

            {/* ── FORGOT SENT ─────────────────────────────────────────────── */}
            {view === "forgot-sent" && (
              <motion.div key="forgot-sent" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{ textAlign: "center" }}>
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  style={{
                    width: 64, height: 64, borderRadius: "50%",
                    background: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 20px",
                  }}
                >
                  <CheckCircle size={28} color="#10B981" />
                </motion.div>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.4rem", color: "#F9FAFB", marginBottom: 8 }}>
                  Check your inbox
                </h2>
                <p style={{ color: "#6B7280", fontSize: "0.85rem", lineHeight: 1.65, maxWidth: 320, margin: "0 auto 28px" }}>
                  We sent a password reset link to <strong style={{ color: "#F9FAFB" }}>{email}</strong>. Check your inbox and follow the link to reset your password.
                </p>
                <button onClick={() => go("login", -1)}
                  style={{
                    padding: "10px 24px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#F9FAFB", fontSize: "0.85rem", fontWeight: 500,
                    cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  }}>
                  Back to sign in
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ErrorBox: React.FC<{ message: string }> = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 14px",
      background: "rgba(239,68,68,0.07)",
      border: "1px solid rgba(239,68,68,0.2)",
      borderRadius: 10,
      marginBottom: 16,
    }}
  >
    <AlertCircle size={15} color="#F87171" style={{ flexShrink: 0 }} />
    <span style={{ fontSize: "0.82rem", color: "#F87171", fontFamily: "'Inter', sans-serif" }}>{message}</span>
  </motion.div>
);

const FormField: React.FC<{
  icon: React.ReactNode;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}> = ({ icon, label, type, value, onChange, placeholder }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#9CA3AF", marginBottom: 7, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          color: focused ? "#E50914" : "#4B5563",
          display: "flex", alignItems: "center",
          transition: "color 0.2s",
          pointerEvents: "none",
        }}>
          {icon}
        </span>
        <input
          type={type}
          required
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            paddingLeft: 38, paddingRight: 14, paddingTop: 12, paddingBottom: 12,
            background: focused ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
            border: focused ? "1px solid rgba(229,9,20,0.45)" : "1px solid rgba(255,255,255,0.08)",
            boxShadow: focused ? "0 0 0 3px rgba(229,9,20,0.06)" : "none",
            borderRadius: 10,
            color: "#F9FAFB",
            fontSize: "0.875rem",
            fontFamily: "'Inter', sans-serif",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
        />
      </div>
    </div>
  );
};

const SubmitButton: React.FC<{ loading: boolean; label: string }> = ({ loading, label }) => (
  <motion.button
    type="submit"
    disabled={loading}
    whileHover={{ scale: loading ? 1 : 1.01 }}
    whileTap={{ scale: loading ? 1 : 0.98 }}
    style={{
      width: "100%", padding: "13px",
      background: loading ? "rgba(229,9,20,0.5)" : "#E50914",
      border: "none", borderRadius: 10,
      color: "#fff", fontSize: "0.88rem", fontWeight: 600,
      cursor: loading ? "not-allowed" : "pointer",
      fontFamily: "'Space Grotesk', sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      boxShadow: loading ? "none" : "0 6px 20px rgba(229,9,20,0.25)",
      transition: "background 0.2s, box-shadow 0.2s",
      marginTop: 4,
    }}
  >
    {loading ? <Loader size={16} style={{ animation: "spin 0.8s linear infinite" }} /> : label}
  </motion.button>
);
