import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Loader, CheckCircle, AlertCircle, Film } from "lucide-react";
import api from "../services/api.js";

const G = "#C9A84C";

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
      background: "#080808", padding: "2rem 1.5rem", fontFamily: "'Inter', sans-serif",
    }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 36 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#C9A84C,#E8C96A)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Film size={17} color="#080808" />
          </div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "1.1rem", background: "linear-gradient(135deg,#C9A84C,#E8C96A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            CineCircle
          </span>
        </div>

        {done ? (
          <div style={{ textAlign: "center", animation: "fadeUp 0.4s ease both" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
            }}>
              <CheckCircle size={28} color="#4ade80" />
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "1.4rem", color: "#f0f0f0", marginBottom: 8 }}>
              Password updated
            </h2>
            <p style={{ color: "#555", fontSize: "0.85rem", lineHeight: 1.65, marginBottom: 28 }}>
              Your password has been reset. You can now sign in with your new password.
            </p>
            <button
              onClick={() => navigate("/auth")}
              style={{
                padding: "12px 28px",
                background: "linear-gradient(135deg,#C9A84C,#E8C96A)",
                borderRadius: 9, border: "none",
                color: "#000", fontSize: "0.88rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "'Poppins', sans-serif",
                boxShadow: "0 6px 20px rgba(201,168,76,0.25)",
              }}
            >
              Sign In
            </button>
          </div>
        ) : (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "1.6rem", color: "#f0f0f0", marginBottom: 6, letterSpacing: "-0.01em" }}>
              Set new password
            </h2>
            <p style={{ color: "#555", fontSize: "0.85rem", marginBottom: 28 }}>
              Choose a strong password for your account.
            </p>

            {!token && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, marginBottom: 20 }}>
                <AlertCircle size={15} color="#f87171" />
                <span style={{ fontSize: "0.82rem", color: "#f87171" }}>Invalid or expired reset link. Please request a new one.</span>
              </div>
            )}

            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, marginBottom: 16 }}>
                <AlertCircle size={15} color="#f87171" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: "0.82rem", color: "#f87171" }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "New Password", value: password, onChange: setPassword, key: "pwd" as const },
                { label: "Confirm Password", value: confirm, onChange: setConfirm, key: "confirm" as const },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: focused === f.key ? G : "#555", marginBottom: 7, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Poppins', sans-serif", transition: "color 0.2s" }}>
                    {f.label}
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                      color: focused === f.key ? G : "#444",
                      display: "flex", alignItems: "center", transition: "color 0.2s", pointerEvents: "none",
                    }}>
                      <Lock size={14} />
                    </span>
                    <input
                      type="password" required value={f.value}
                      onChange={e => f.onChange(e.target.value)}
                      placeholder="••••••••"
                      onFocus={() => setFocused(f.key)}
                      onBlur={() => setFocused(null)}
                      style={{
                        width: "100%", paddingLeft: 38, paddingRight: 14, paddingTop: 11, paddingBottom: 11,
                        background: focused === f.key ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.02)",
                        border: focused === f.key ? "1px solid rgba(201,168,76,0.5)" : "1px solid rgba(255,255,255,0.07)",
                        boxShadow: focused === f.key ? "0 0 0 3px rgba(201,168,76,0.05)" : "none",
                        borderRadius: 10, color: "#f0f0f0", fontSize: "0.875rem",
                        fontFamily: "'Inter', sans-serif", outline: "none",
                        transition: "border-color 0.2s, box-shadow 0.2s",
                      }}
                    />
                  </div>
                </div>
              ))}

              <button
                type="submit"
                disabled={loading || !token}
                style={{
                  width: "100%", padding: "13px", marginTop: 4,
                  background: loading || !token ? "rgba(201,168,76,0.4)" : "linear-gradient(135deg,#C9A84C,#E8C96A)",
                  border: "none", borderRadius: 10,
                  color: "#000", fontSize: "0.88rem", fontWeight: 700,
                  cursor: loading || !token ? "not-allowed" : "pointer",
                  fontFamily: "'Poppins', sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: loading ? "none" : "0 6px 20px rgba(201,168,76,0.2)",
                  transition: "opacity 0.2s",
                }}
              >
                {loading ? <Loader size={16} style={{ animation: "spin 0.8s linear infinite" }} /> : "Reset Password"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
