import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { Film, User, Mail, Lock, AlertCircle, Loader, ArrowLeft, CheckCircle } from "lucide-react";
import api from "../services/api.js";

type View = "login" | "register" | "forgot" | "forgot-sent";

const G = "#C9A84C";

export const Auth: React.FC = () => {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = (location.state as any)?.from || "/";

  const go = (v: View) => { setError(""); setView(v); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      if (view === "login") await login(email, password);
      else await register(email, password, fullName);
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || "Authentication failed. Please check your credentials.");
    } finally { setLoading(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await api.post("/auth/forgot-password", { email }); go("forgot-sent"); }
    catch (err: any) { setError(err.response?.data?.error || "Failed to send reset email."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#080808", display:"flex", fontFamily:"'Inter',sans-serif" }}>

      {/* Left panel — desktop only */}
      <div className="hidden lg:flex" style={{
        width:"44%", flexShrink:0, position:"relative", overflow:"hidden",
        background:"linear-gradient(160deg,#0c0c0c 0%,#080808 100%)",
        borderRight:"1px solid rgba(201,168,76,0.08)",
        flexDirection:"column", justifyContent:"space-between", padding:"3rem",
      }}>
        {/* Decorative */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 20% 60%,rgba(201,168,76,0.06) 0%,transparent 55%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(to right,transparent,rgba(201,168,76,0.25),transparent)" }} />

        {/* Logo */}
        <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:"linear-gradient(135deg,#C9A84C,#E8C96A)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Film size={18} color="#080808" />
          </div>
          <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:"1.3rem", background:"linear-gradient(135deg,#C9A84C,#E8C96A)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>CineCircle</span>
        </div>

        {/* Hero copy */}
        <div style={{ position:"relative", zIndex:1 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:"2.5rem", color:"#f0f0f0", lineHeight:1.1, letterSpacing:"-0.01em", marginBottom:16 }}>
            Cinema nights,<br /><em style={{ color:G }}>together.</em>
          </h1>
          <p style={{ color:"#555", fontSize:"0.88rem", lineHeight:1.75, maxWidth:310, marginBottom:36 }}>
            Decide what to watch, vote on showtimes, and book seats with friends — all from one shared room.
          </p>
          {["Create group booking rooms", "Vote on movies & showtimes", "Book seats side-by-side"].map((f, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:13 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:G, flexShrink:0 }} />
              <span style={{ fontSize:"0.83rem", color:"#777" }}>{f}</span>
            </div>
          ))}
        </div>

        <p style={{ position:"relative", zIndex:1, fontSize:"0.7rem", color:"#2a2a2a", fontFamily:"'Poppins',sans-serif", letterSpacing:"0.08em", textTransform:"uppercase" }}>
          Luxury Cinema Booking · Est. 2026
        </p>
      </div>

      {/* Right panel — forms */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem 1.5rem", position:"relative" }}>
        {/* Mobile logo */}
        <div className="lg:hidden" style={{ position:"absolute", top:24, left:24, display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:"linear-gradient(135deg,#C9A84C,#E8C96A)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Film size={14} color="#080808" />
          </div>
          <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:"1rem", color:"#f0f0f0" }}>CineCircle</span>
        </div>

        <div style={{ width:"100%", maxWidth:390 }}>

          {/* ── LOGIN ─────────────────────────────────────── */}
          {view === "login" && (
            <div style={{ animation:"fadeUp 0.4s ease both" }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:"1.75rem", color:"#f0f0f0", marginBottom:6 }}>Welcome back</h2>
              <p style={{ color:"#555", fontSize:"0.83rem", marginBottom:28 }}>Sign in to your CineCircle account</p>
              {error && <ErrBox msg={error} />}
              <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:15 }}>
                <Field icon={<Mail size={14}/>} label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" />
                <Field icon={<Lock size={14}/>} label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
                <div style={{ textAlign:"right", marginTop:-4 }}>
                  <button type="button" onClick={() => go("forgot")} style={{ background:"none", border:"none", color:G, fontSize:"0.76rem", fontWeight:600, cursor:"pointer", fontFamily:"'Poppins',sans-serif" }}>
                    Forgot password?
                  </button>
                </div>
                <Btn loading={loading} label="Sign In" />
              </form>
              <p style={{ textAlign:"center", marginTop:22, fontSize:"0.8rem", color:"#555" }}>
                No account?{" "}
                <button onClick={() => go("register")} style={{ background:"none", border:"none", color:G, fontWeight:600, cursor:"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem" }}>
                  Create one
                </button>
              </p>
            </div>
          )}

          {/* ── REGISTER ──────────────────────────────────── */}
          {view === "register" && (
            <div style={{ animation:"fadeUp 0.4s ease both" }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:"1.75rem", color:"#f0f0f0", marginBottom:6 }}>Join CineCircle</h2>
              <p style={{ color:"#555", fontSize:"0.83rem", marginBottom:28 }}>Plan movie nights with your crew</p>
              {error && <ErrBox msg={error} />}
              <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:15 }}>
                <Field icon={<User size={14}/>} label="Full Name" type="text" value={fullName} onChange={setFullName} placeholder="Your name" />
                <Field icon={<Mail size={14}/>} label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" />
                <Field icon={<Lock size={14}/>} label="Password" type="password" value={password} onChange={setPassword} placeholder="Min 8 characters" />
                <Btn loading={loading} label="Create Account" />
              </form>
              <p style={{ textAlign:"center", marginTop:22, fontSize:"0.8rem", color:"#555" }}>
                Already a member?{" "}
                <button onClick={() => go("login")} style={{ background:"none", border:"none", color:G, fontWeight:600, cursor:"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem" }}>
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* ── FORGOT ────────────────────────────────────── */}
          {view === "forgot" && (
            <div style={{ animation:"fadeUp 0.4s ease both" }}>
              <button onClick={() => go("login")} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:"0.8rem", marginBottom:22, fontFamily:"'Inter',sans-serif", padding:0 }}>
                <ArrowLeft size={13} /> Back to sign in
              </button>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:"1.75rem", color:"#f0f0f0", marginBottom:6 }}>Reset password</h2>
              <p style={{ color:"#555", fontSize:"0.83rem", marginBottom:28 }}>Enter your email and we'll send a reset link.</p>
              {error && <ErrBox msg={error} />}
              <form onSubmit={handleForgot} style={{ display:"flex", flexDirection:"column", gap:15 }}>
                <Field icon={<Mail size={14}/>} label="Email Address" type="email" value={email} onChange={setEmail} placeholder="email@example.com" />
                <Btn loading={loading} label="Send Reset Link" />
              </form>
            </div>
          )}

          {/* ── FORGOT SENT ───────────────────────────────── */}
          {view === "forgot-sent" && (
            <div style={{ textAlign:"center", animation:"fadeUp 0.4s ease both" }}>
              <div style={{ width:60, height:60, borderRadius:"50%", background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.25)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
                <CheckCircle size={26} color="#4ade80" />
              </div>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:"1.4rem", color:"#f0f0f0", marginBottom:8 }}>Check your inbox</h2>
              <p style={{ color:"#555", fontSize:"0.83rem", lineHeight:1.7, maxWidth:300, margin:"0 auto 26px" }}>
                A password reset link was sent to <strong style={{ color:"#f0f0f0" }}>{email}</strong>.
              </p>
              <button onClick={() => go("login")} style={{ padding:"9px 22px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, color:"#f0f0f0", fontSize:"0.82rem", fontWeight:500, cursor:"pointer" }}>
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Shared field ─────────────────────────────────────────────────────────── */
const Field: React.FC<{ icon:React.ReactNode; label:string; type:string; value:string; onChange:(v:string)=>void; placeholder:string }> = ({ icon, label, type, value, onChange, placeholder }) => {
  const [f, setF] = useState(false);
  return (
    <div>
      <label style={{ display:"block", fontSize:"0.7rem", fontWeight:700, color: f ? "#C9A84C" : "#555", marginBottom:7, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"'Poppins',sans-serif", transition:"color 0.2s" }}>{label}</label>
      <div style={{ position:"relative" }}>
        <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color: f ? "#C9A84C" : "#444", display:"flex", alignItems:"center", transition:"color 0.2s", pointerEvents:"none" }}>{icon}</span>
        <input type={type} required value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          onFocus={()=>setF(true)} onBlur={()=>setF(false)}
          style={{
            width:"100%", paddingLeft:38, paddingRight:14, paddingTop:11, paddingBottom:11,
            background: f ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.02)",
            border: f ? "1px solid rgba(201,168,76,0.5)" : "1px solid rgba(255,255,255,0.07)",
            boxShadow: f ? "0 0 0 3px rgba(201,168,76,0.05)" : "none",
            borderRadius:10, color:"#f0f0f0", fontSize:"0.875rem",
            fontFamily:"'Inter',sans-serif", outline:"none", transition:"all 0.2s",
          }}
        />
      </div>
    </div>
  );
};

const ErrBox: React.FC<{ msg:string }> = ({ msg }) => (
  <div style={{ display:"flex", alignItems:"center", gap:9, padding:"11px 13px", background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:9, marginBottom:16 }}>
    <AlertCircle size={14} color="#f87171" style={{ flexShrink:0 }} />
    <span style={{ fontSize:"0.8rem", color:"#f87171", fontFamily:"'Inter',sans-serif" }}>{msg}</span>
  </div>
);

const Btn: React.FC<{ loading:boolean; label:string }> = ({ loading, label }) => (
  <button type="submit" disabled={loading}
    style={{
      width:"100%", padding:"12px", marginTop:4,
      background: loading ? "rgba(201,168,76,0.5)" : "linear-gradient(135deg,#C9A84C,#E8C96A)",
      border:"none", borderRadius:10, color:"#000",
      fontSize:"0.85rem", fontWeight:700, cursor: loading ? "not-allowed" : "pointer",
      fontFamily:"'Poppins',sans-serif", letterSpacing:"0.03em",
      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
      boxShadow: loading ? "none" : "0 6px 20px rgba(201,168,76,0.2)",
      transition:"opacity 0.2s",
    }}
  >
    {loading ? <Loader size={15} style={{ animation:"spin 0.8s linear infinite" }} /> : label}
  </button>
);
