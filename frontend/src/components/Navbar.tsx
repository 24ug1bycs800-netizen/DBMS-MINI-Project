import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { useCityStore } from "../store/useCityStore.js";
import { CitySelectorModal } from "./CitySelectorModal.js";
import {
  Film, MapPin, User, LogOut, ChevronDown,
  LayoutDashboard, Ticket, Moon,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { selectedCity } = useCityStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Outfit:wght@300;400;500;600&display=swap');

        .cc-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          width: 100%;
          transition: all 0.4s ease;
          font-family: 'Outfit', sans-serif;
        }
        .cc-nav.scrolled {
          background: rgba(5, 5, 8, 0.92);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(180, 140, 60, 0.2);
          box-shadow: 0 4px 40px rgba(0,0,0,0.6);
        }
        .cc-nav.top {
          background: linear-gradient(180deg, rgba(5,5,8,0.95) 0%, transparent 100%);
          border-bottom: 1px solid transparent;
        }
        .cc-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .cc-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          font-weight: 900;
          letter-spacing: 0.02em;
          background: linear-gradient(135deg, #D4A853 0%, #F0C070 50%, #B8860B 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .cc-logo-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #D4A853, #F0C070);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cc-logo-icon svg { color: #0a0a0f; width: 18px; height: 18px; }

        .cc-city-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(212, 168, 83, 0.08);
          border: 1px solid rgba(212, 168, 83, 0.25);
          border-radius: 100px;
          color: #D4A853;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Outfit', sans-serif;
        }
        .cc-city-btn:hover {
          background: rgba(212, 168, 83, 0.15);
          border-color: rgba(212, 168, 83, 0.5);
        }

        .cc-nav-links {
          display: flex;
          align-items: center;
          gap: 2rem;
        }
        .cc-nav-link {
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 400;
          letter-spacing: 0.02em;
          transition: color 0.2s;
          position: relative;
        }
        .cc-nav-link::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 1px;
          background: #C9A84C;
          transition: width 0.25s ease;
        }
        .cc-nav-link:hover { color: rgba(255,255,255,0.9); }
        .cc-nav-link:hover::after { width: 100%; }

        .cc-group-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          color: rgba(255,255,255,0.55);
          text-decoration: none;
          font-size: 0.825rem;
          font-weight: 400;
          transition: all 0.2s;
        }
        .cc-group-link:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.18);
          color: rgba(255,255,255,0.9);
        }

        .cc-user-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          background: none;
          border: none;
          color: rgba(255,255,255,0.8);
          transition: color 0.2s;
          font-family: 'Outfit', sans-serif;
        }
        .cc-user-btn:hover { color: #D4A853; }
        .cc-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid rgba(212, 168, 83, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(212, 168, 83, 0.1);
          overflow: hidden;
        }
        .cc-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .cc-user-name { font-size: 0.875rem; font-weight: 400; }

        .cc-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 12px);
          width: 220px;
          background: rgba(10, 10, 15, 0.98);
          border: 1px solid rgba(212, 168, 83, 0.2);
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,168,83,0.05);
          overflow: hidden;
          backdrop-filter: blur(20px);
          animation: dropIn 0.2s ease;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cc-dropdown-header {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .cc-dropdown-header p:first-child {
          font-size: 0.875rem;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cc-dropdown-header p:last-child {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.35);
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cc-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 16px;
          color: rgba(255,255,255,0.55);
          text-decoration: none;
          font-size: 0.825rem;
          transition: all 0.15s;
          background: none;
          border: none;
          width: 100%;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          text-align: left;
        }
        .cc-dropdown-item:hover {
          color: #D4A853;
          background: rgba(212, 168, 83, 0.07);
        }
        .cc-dropdown-item.danger { color: rgba(239, 68, 68, 0.7); }
        .cc-dropdown-item.danger:hover { color: #ef4444; background: rgba(239,68,68,0.07); }
        .cc-dropdown-item.admin { color: #D4A853; }
        .cc-dropdown-divider { border-top: 1px solid rgba(255,255,255,0.06); }

        .cc-signin {
          padding: 7px 20px;
          background: #C9A84C;
          border: none;
          border-radius: 7px;
          color: #000;
          font-size: 0.825rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: opacity 0.2s, transform 0.2s;
          font-family: 'Outfit', sans-serif;
          letter-spacing: 0.01em;
          display: inline-block;
        }
        .cc-signin:hover {
          opacity: 0.85;
          transform: translateY(-1px);
        }

        .cc-right { display: flex; align-items: center; gap: 1.5rem; position: relative; }
        .cc-left  { display: flex; align-items: center; gap: 1.5rem; }
      `}</style>

      <nav className={`cc-nav ${scrolled ? "scrolled" : "top"}`}>
        <div className="cc-inner">
          {/* LEFT: Logo + City */}
          <div className="cc-left">
            <Link to="/" className="cc-logo">
              <span className="cc-logo-icon">
                <Film />
              </span>
              CineCircle
            </Link>
            <button onClick={() => setModalOpen(true)} className="cc-city-btn">
              <MapPin size={13} />
              {selectedCity.name}
              <ChevronDown size={12} style={{ opacity: 0.7 }} />
            </button>
          </div>

          {/* CENTER: Nav links */}
          <div className="cc-nav-links" style={{ display: "flex" }}>
            <Link to="/" className="cc-nav-link">Movies</Link>
            <Link to="/movie-nights" className="cc-group-link">
              <Moon size={13} />
              Movie Nights
            </Link>
          </div>

          {/* RIGHT: Auth */}
          <div className="cc-right">
            {user ? (
              <>
                <button onClick={() => setMenuOpen(!menuOpen)} className="cc-user-btn">
                  <span className="cc-avatar">
                    {user.profilePic
                      ? <img src={user.profilePic} alt="profile" />
                      : <User size={15} color="#D4A853" />
                    }
                  </span>
                  <span className="cc-user-name" style={{ display: "none" }}
                    ref={(el) => { if (el) el.style.display = window.innerWidth > 640 ? "block" : "none"; }}>
                    {user.fullName}
                  </span>
                  <ChevronDown size={14} style={{ opacity: 0.5 }} />
                </button>

                {menuOpen && (
                  <div className="cc-dropdown">
                    <div className="cc-dropdown-header">
                      <p>{user.fullName}</p>
                      <p>{user.email}</p>
                    </div>
                    <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="cc-dropdown-item">
                      <Ticket size={14} /> My Bookings
                    </Link>
                    <Link to="/movie-nights" onClick={() => setMenuOpen(false)} className="cc-dropdown-item">
                      <Moon size={14} /> Movie Nights
                    </Link>
                    {user.role === "admin" && (
                      <div className="cc-dropdown-divider">
                        <Link to="/admin" onClick={() => setMenuOpen(false)} className="cc-dropdown-item admin">
                          <LayoutDashboard size={14} /> Admin Dashboard
                        </Link>
                      </div>
                    )}
                    <div className="cc-dropdown-divider">
                      <button onClick={handleLogout} className="cc-dropdown-item danger">
                        <LogOut size={14} /> Log Out
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Link to="/auth" className="cc-signin">Sign In</Link>
            )}
          </div>
        </div>
      </nav>

      <CitySelectorModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
