import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { useCityStore } from "../store/useCityStore.js";
import { CitySelectorModal } from "./CitySelectorModal.js";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film, MapPin, User, LogOut, ChevronDown,
  LayoutDashboard, Ticket, Popcorn, Menu, X,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { selectedCity } = useCityStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => { setMobileOpen(false); setMenuOpen(false); }, [location.pathname]);

  const handleLogout = () => { logout(); navigate("/"); };
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          width: "100%",
          transition: "all 0.35s ease",
          background: scrolled
            ? "rgba(11, 17, 32, 0.92)"
            : "rgba(11, 17, 32, 0.6)",
          backdropFilter: scrolled ? "blur(20px)" : "blur(8px)",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "blur(8px)",
          borderBottom: scrolled
            ? "1px solid rgba(255,255,255,0.06)"
            : "1px solid transparent",
          boxShadow: scrolled ? "0 4px 30px rgba(0,0,0,0.4)" : "none",
        }}
      >
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 1.5rem", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          {/* LEFT — Logo + City */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <Link
              to="/"
              style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#E50914",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Film size={17} color="#fff" />
              </div>
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: "1.15rem",
                color: "#F9FAFB",
                letterSpacing: "-0.01em",
              }}>
                CineCircle
              </span>
            </Link>

            <button
              onClick={() => setModalOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 100,
                color: "rgba(255,255,255,0.55)",
                fontSize: "0.78rem",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "'Inter', sans-serif",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.85)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)";
              }}
            >
              <MapPin size={12} />
              <span>{selectedCity.name}</span>
              <ChevronDown size={11} style={{ opacity: 0.6 }} />
            </button>
          </div>

          {/* CENTER — Nav links (desktop) */}
          <div className="hidden sm:flex" style={{ alignItems: "center", gap: "0.25rem" }}>
            <NavLink to="/" active={isActive("/") && location.pathname === "/"} label="Movies" />
            <MovieNightsLink active={isActive("/movie-nights")} />
          </div>

          {/* RIGHT — Auth + Mobile toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {user ? (
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(255,255,255,0.8)",
                    padding: "4px 6px",
                    borderRadius: 8,
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#F59E0B")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    border: "1.5px solid rgba(245,158,11,0.4)",
                    background: "rgba(245,158,11,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden",
                  }}>
                    {user.profilePic
                      ? <img src={user.profilePic} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <User size={14} color="#F59E0B" />
                    }
                  </div>
                  <span className="hidden sm:block" style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", fontWeight: 500 }}>
                    {user.fullName?.split(" ")[0]}
                  </span>
                  <ChevronDown size={13} style={{ opacity: 0.5 }} />
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: "absolute", right: 0, top: "calc(100% + 10px)",
                        width: 220,
                        background: "rgba(11, 17, 32, 0.98)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                        boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
                        backdropFilter: "blur(20px)",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#F9FAFB", fontFamily: "'Inter', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {user.fullName}
                        </p>
                        <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Inter', sans-serif" }}>
                          {user.email}
                        </p>
                      </div>
                      <DropdownItem to="/dashboard" icon={<Ticket size={13} />} label="My Bookings" onClick={() => setMenuOpen(false)} />
                      <DropdownItem to="/movie-nights" icon={<Popcorn size={13} />} label="Movie Nights" onClick={() => setMenuOpen(false)} />
                      {user.role === "admin" && (
                        <>
                          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} />
                          <DropdownItem to="/admin" icon={<LayoutDashboard size={13} />} label="Admin Dashboard" onClick={() => setMenuOpen(false)} accent />
                        </>
                      )}
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} />
                      <button
                        onClick={handleLogout}
                        style={{
                          display: "flex", alignItems: "center", gap: 9,
                          padding: "10px 14px", width: "100%",
                          background: "none", border: "none", cursor: "pointer",
                          color: "rgba(239,68,68,0.7)",
                          fontSize: "0.82rem", fontFamily: "'Inter', sans-serif",
                          transition: "all 0.15s", textAlign: "left",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.color = "#EF4444";
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.color = "rgba(239,68,68,0.7)";
                          (e.currentTarget as HTMLButtonElement).style.background = "none";
                        }}
                      >
                        <LogOut size={13} /> Log Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/auth"
                style={{
                  padding: "7px 18px",
                  background: "#E50914",
                  borderRadius: 7,
                  color: "#fff",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  fontFamily: "'Space Grotesk', sans-serif",
                  transition: "opacity 0.2s",
                  display: "inline-block",
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.87")}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = "1")}
              >
                Sign In
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              className="sm:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", padding: 4 }}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                overflow: "hidden",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(11,17,32,0.97)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div style={{ padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <MobileLink to="/" label="Movies" />
                <MobileLink to="/movie-nights" label="Movie Nights" red />
                {user && <MobileLink to="/dashboard" label="My Bookings" />}
                {user?.role === "admin" && <MobileLink to="/admin" label="Admin Dashboard" />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <CitySelectorModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const NavLink: React.FC<{ to: string; label: string; active: boolean }> = ({ to, label, active }) => (
  <Link
    to={to}
    style={{
      padding: "6px 14px",
      borderRadius: 7,
      textDecoration: "none",
      fontSize: "0.875rem",
      fontWeight: active ? 600 : 400,
      color: active ? "#F9FAFB" : "rgba(255,255,255,0.5)",
      background: active ? "rgba(255,255,255,0.06)" : "transparent",
      fontFamily: "'Inter', sans-serif",
      transition: "all 0.2s",
    }}
    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.85)"; }}
    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.5)"; }}
  >
    {label}
  </Link>
);

const MovieNightsLink: React.FC<{ active: boolean }> = ({ active }) => (
  <Link
    to="/movie-nights"
    style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 14px",
      borderRadius: 7,
      textDecoration: "none",
      fontSize: "0.875rem",
      fontWeight: 600,
      color: active ? "#fff" : "rgba(255,255,255,0.75)",
      background: active ? "#E50914" : "rgba(229,9,20,0.1)",
      border: active ? "none" : "1px solid rgba(229,9,20,0.25)",
      fontFamily: "'Space Grotesk', sans-serif",
      transition: "all 0.2s",
    }}
    onMouseEnter={e => {
      if (!active) {
        (e.currentTarget as HTMLAnchorElement).style.background = "rgba(229,9,20,0.18)";
        (e.currentTarget as HTMLAnchorElement).style.color = "#fff";
      }
    }}
    onMouseLeave={e => {
      if (!active) {
        (e.currentTarget as HTMLAnchorElement).style.background = "rgba(229,9,20,0.1)";
        (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.75)";
      }
    }}
  >
    <Popcorn size={13} />
    Movie Nights
  </Link>
);

const DropdownItem: React.FC<{ to: string; icon: React.ReactNode; label: string; onClick: () => void; accent?: boolean }> = ({ to, icon, label, onClick, accent }) => (
  <Link
    to={to}
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 9,
      padding: "10px 14px",
      color: accent ? "#F59E0B" : "rgba(255,255,255,0.55)",
      textDecoration: "none",
      fontSize: "0.82rem",
      fontFamily: "'Inter', sans-serif",
      transition: "all 0.15s",
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLAnchorElement).style.color = accent ? "#FCD34D" : "#F9FAFB";
      (e.currentTarget as HTMLAnchorElement).style.background = accent ? "rgba(245,158,11,0.07)" : "rgba(255,255,255,0.04)";
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLAnchorElement).style.color = accent ? "#F59E0B" : "rgba(255,255,255,0.55)";
      (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
    }}
  >
    {icon} {label}
  </Link>
);

const MobileLink: React.FC<{ to: string; label: string; red?: boolean }> = ({ to, label, red }) => (
  <Link
    to={to}
    style={{
      padding: "10px 14px",
      borderRadius: 8,
      textDecoration: "none",
      fontSize: "0.9rem",
      fontWeight: 500,
      color: red ? "#FF4444" : "rgba(255,255,255,0.7)",
      background: red ? "rgba(229,9,20,0.08)" : "transparent",
      fontFamily: "'Inter', sans-serif",
      display: "block",
    }}
  >
    {label}
  </Link>
);
