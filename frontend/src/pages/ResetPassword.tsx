import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Loader, CheckCircle, AlertCircle, Film } from "lucide-react";
import api from "../services/api.js";

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [focused, setFocused] = useState<"pwd" | "confirm" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword: password });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0B1120", padding: "2rem 1.5rem",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 36 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#E50914", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Film size={17} color="#fff" />
          </div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#F9FAFB" }}>CineCircle</span>
        </div>

        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: "center" }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <CheckCircle size={28} color="#10B981" />
            </div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.4rem", color: "#F9FAFB", marginBottom: 8 }}>
              Password updated
            </h2>
            <p style={{ color: "#6B7280", fontSize: "0.85rem", lineHeight: 1.65, marginBottom: 28 }}>
              Your password has been reset. You can now sign in with your new password.
            </p>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/auth")}
              style={{
                padding: "12px 28px",
                background: "#E50914", borderRadius: 9, border: "none",
                color: "#fff", fontSize: "0.88rem", fontWeight: 600,
                cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Sign In
            </motion.button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.6rem", color: "#F9FAFB", marginBottom: 6, letterSpacing: "-0.01em" }}>
              Set new password
            </h2>
            <p style={{ color: "#6B7280", fontSize: "0.85rem", marginBottom: 28 }}>
              Choose a strong password for your account.
            </p>

            {!token && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, marginBottom: 20 }}>
                <AlertCircle size={15} color="#F87171" />
                <span style={{ fontSize: "0.82rem", color: "#F87171" }}>Invalid or expired reset link. Please request a new one.</span>
              </div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, marginBottom: 16 }}>
                <AlertCircle size={15} color="#F87171" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: "0.82rem", color: "#F87171" }}>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "New Password", value: password, onChange: setPassword, key: "pwd" as const },
                { label: "Confirm Password", value: confirm, onChange: setConfirm, key: "confirm" as const },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#9CA3AF", marginBottom: 7, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    {f.label}
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                      color: focused === f.key ? "#E50914" : "#4B5563",
                      display: "flex", alignItems: "center", transition: "color 0.2s", pointerEvents: "none",
                    }}>
                      <Lock size={15} />
                    </span>
                    <input
                      type="password" required value={f.value}
                      onChange={e => f.onChange(e.target.value)}
                      placeholder="••••••••"
                      onFocus={() => setFocused(f.key)}
                      onBlur={() => setFocused(null)}
                      style={{
                        width: "100%", paddingLeft: 38, paddingRight: 14, paddingTop: 12, paddingBottom: 12,
                        background: focused === f.key ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                        border: focused === f.key ? "1px solid rgba(229,9,20,0.45)" : "1px solid rgba(255,255,255,0.08)",
                        boxShadow: focused === f.key ? "0 0 0 3px rgba(229,9,20,0.06)" : "none",
                        borderRadius: 10, color: "#F9FAFB", fontSize: "0.875rem",
                        fontFamily: "'Inter', sans-serif", outline: "none",
                        transition: "border-color 0.2s, box-shadow 0.2s",
                      }}
                    />
                  </div>
                </div>
              ))}

              <motion.button
                type="submit"
                disabled={loading || !token}
                whileHover={{ scale: loading || !token ? 1 : 1.01 }}
                whileTap={{ scale: loading || !token ? 1 : 0.98 }}
                style={{
                  width: "100%", padding: "13px",
                  background: loading || !token ? "rgba(229,9,20,0.4)" : "#E50914",
                  border: "none", borderRadius: 10,
                  color: "#fff", fontSize: "0.88rem", fontWeight: 600,
                  cursor: loading || !token ? "not-allowed" : "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: loading ? "none" : "0 6px 20px rgba(229,9,20,0.25)",
                  marginTop: 4,
                }}
              >
                {loading ? <Loader size={16} style={{ animation: "spin 0.8s linear infinite" }} /> : "Reset Password"}
              </motion.button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
};
