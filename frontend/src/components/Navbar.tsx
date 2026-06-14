import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { Film, User, LogOut, ChevronDown, LayoutDashboard, Ticket, Moon, Menu, X } from "lucide-react";

const G = "#C9A84C"; // gold

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => { setMobileOpen(false); setMenuOpen(false); }, [pathname]);

  return (
    <>
      <style>{`
        .cc-nav { position:sticky; top:0; z-index:50; width:100%; transition:all 0.35s ease; font-family:'Poppins',sans-serif; }
        .cc-nav.scrolled { background:rgba(5,5,5,0.94); backdrop-filter:blur(20px); border-bottom:1px solid rgba(201,168,76,0.12); box-shadow:0 4px 40px rgba(0,0,0,0.6); }
        .cc-nav.top { background:linear-gradient(180deg,rgba(8,8,8,0.9) 0%,transparent 100%); border-bottom:1px solid transparent; }
        .cc-inner { max-width:1400px; margin:0 auto; padding:0 1.5rem; height:66px; display:flex; align-items:center; justify-content:space-between; }
        .cc-logo { display:flex; align-items:center; gap:9px; text-decoration:none; }
        .cc-logo-icon { width:32px; height:32px; background:linear-gradient(135deg,#C9A84C,#E8C96A); border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .cc-logo-text { font-family:'Playfair Display',serif; font-weight:900; font-size:1.3rem; background:linear-gradient(135deg,#C9A84C 0%,#E8C96A 50%,#C9A84C 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; letter-spacing:0.04em; }
        .cc-city-btn { display:flex; align-items:center; gap:5px; padding:5px 12px; background:rgba(201,168,76,0.07); border:1px solid rgba(201,168,76,0.2); border-radius:100px; color:#C9A84C; font-size:0.76rem; font-weight:500; cursor:pointer; transition:all 0.2s; }
        .cc-city-btn:hover { background:rgba(201,168,76,0.13); }
        .cc-nav-link { color:rgba(255,255,255,0.45); text-decoration:none; font-size:0.83rem; font-weight:400; letter-spacing:0.02em; transition:color 0.2s; padding:5px 12px; border-radius:6px; }
        .cc-nav-link:hover { color:rgba(255,255,255,0.85); }
        .cc-nav-link.active { color:#fff; background:rgba(255,255,255,0.05); }
        .cc-nights-link { display:flex; align-items:center; gap:5px; padding:5px 13px; border:1px solid rgba(201,168,76,0.22); border-radius:6px; color:#C9A84C; text-decoration:none; font-size:0.83rem; font-weight:600; transition:all 0.2s; }
        .cc-nights-link:hover { background:rgba(201,168,76,0.08); border-color:rgba(201,168,76,0.45); }
        .cc-nights-link.active { background:rgba(201,168,76,0.1); }
        .cc-user-btn { display:flex; align-items:center; gap:7px; background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.75); transition:color 0.2s; padding:3px 5px; border-radius:7px; }
        .cc-user-btn:hover { color:#C9A84C; }
        .cc-avatar { width:32px; height:32px; border-radius:50%; border:1.5px solid rgba(201,168,76,0.35); background:rgba(201,168,76,0.08); display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .cc-dropdown { position:absolute; right:0; top:calc(100% + 10px); width:215px; background:rgba(8,8,8,0.97); border:1px solid rgba(201,168,76,0.15); border-radius:12px; box-shadow:0 20px 60px rgba(0,0,0,0.85); backdrop-filter:blur(20px); overflow:hidden; animation:dropIn 0.18s ease both; }
        @keyframes dropIn { from{opacity:0;transform:translateY(-7px)} to{opacity:1;transform:translateY(0)} }
        .cc-dropdown-header { padding:12px 14px; border-bottom:1px solid rgba(255,255,255,0.05); }
        .cc-drop-name { font-size:0.85rem; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .cc-drop-email { font-size:0.72rem; color:rgba(255,255,255,0.3); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'Inter',sans-serif; }
        .cc-drop-item { display:flex; align-items:center; gap:9px; padding:10px 14px; color:rgba(255,255,255,0.5); text-decoration:none; font-size:0.8rem; transition:all 0.15s; background:none; border:none; width:100%; cursor:pointer; text-align:left; }
        .cc-drop-item:hover { color:#fff; background:rgba(255,255,255,0.04); }
        .cc-drop-item.gold { color:#C9A84C; }
        .cc-drop-item.gold:hover { color:#E8C96A; background:rgba(201,168,76,0.07); }
        .cc-drop-item.danger { color:rgba(239,68,68,0.65); }
        .cc-drop-item.danger:hover { color:#ef4444; background:rgba(239,68,68,0.07); }
        .cc-drop-div { border-top:1px solid rgba(255,255,255,0.05); }
        .cc-signin { padding:7px 18px; background:linear-gradient(135deg,#C9A84C,#E8C96A); border:none; border-radius:7px; color:#000; font-size:0.8rem; font-weight:700; cursor:pointer; text-decoration:none; transition:opacity 0.2s; font-family:'Poppins',sans-serif; display:inline-block; letter-spacing:0.02em; }
        .cc-signin:hover { opacity:0.85; }
        .cc-left { display:flex; align-items:center; gap:1.25rem; }
        .cc-center { display:flex; align-items:center; gap:0.25rem; }
        .cc-right { display:flex; align-items:center; gap:0.75rem; position:relative; }
        .cc-hamburger { background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.6); padding:4px; display:none; }
        @media(max-width:640px){ .cc-center{ display:none; } .cc-hamburger{ display:block; } }
        .cc-mobile { border-top:1px solid rgba(201,168,76,0.08); background:rgba(5,5,5,0.97); backdrop-filter:blur(20px); overflow:hidden; }
        .cc-mobile-link { display:block; padding:11px 1.5rem; color:rgba(255,255,255,0.6); text-decoration:none; font-size:0.88rem; border-bottom:1px solid rgba(255,255,255,0.04); transition:color 0.15s; }
        .cc-mobile-link:hover { color:#fff; }
        .cc-mobile-link.gold { color:#C9A84C; }
      `}</style>

      <nav className={`cc-nav ${scrolled ? "scrolled" : "top"}`}>
        <div className="cc-inner">
          <div className="cc-left">
            <Link to="/" className="cc-logo">
              <span className="cc-logo-icon"><Film size={17} color="#080808" /></span>
              <span className="cc-logo-text">CineCircle</span>
            </Link>
          </div>

          <div className="cc-center">
            <Link to="/" className={`cc-nav-link${pathname === "/" ? " active" : ""}`}>Movies</Link>
            <Link to="/movie-nights" className={`cc-nights-link${pathname.startsWith("/movie-nights") ? " active" : ""}`}>
              <Moon size={13} /> Movie Nights
            </Link>
          </div>

          <div className="cc-right">
            {user ? (
              <div ref={dropRef} style={{ position:"relative" }}>
                <button className="cc-user-btn" onClick={() => setMenuOpen(!menuOpen)}>
                  <span className="cc-avatar">
                    {user.profilePic ? <img src={user.profilePic} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <User size={14} color={G} />}
                  </span>
                  <span style={{ fontSize:"0.83rem", fontWeight:500, display:"none" }} className="sm:block">{user.fullName?.split(" ")[0]}</span>
                  <ChevronDown size={13} style={{ opacity:0.45 }} />
                </button>
                {menuOpen && (
                  <div className="cc-dropdown">
                    <div className="cc-dropdown-header">
                      <div className="cc-drop-name">{user.fullName}</div>
                      <div className="cc-drop-email">{user.email}</div>
                    </div>
                    <Link to="/dashboard" className="cc-drop-item" onClick={() => setMenuOpen(false)}><Ticket size={13} /> My Bookings</Link>
                    <Link to="/movie-nights" className="cc-drop-item" onClick={() => setMenuOpen(false)}><Moon size={13} /> Movie Nights</Link>
                    {user.role === "admin" && (
                      <div className="cc-drop-div">
                        <Link to="/admin" className="cc-drop-item gold" onClick={() => setMenuOpen(false)}><LayoutDashboard size={13} /> Admin Dashboard</Link>
                      </div>
                    )}
                    <div className="cc-drop-div">
                      <button className="cc-drop-item danger" onClick={() => { logout(); navigate("/"); setMenuOpen(false); }}><LogOut size={13} /> Log Out</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/auth" className="cc-signin">Sign In</Link>
            )}
            <button className="cc-hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="cc-mobile">
            <Link to="/" className="cc-mobile-link">Movies</Link>
            <Link to="/movie-nights" className="cc-mobile-link gold">Movie Nights</Link>
            {user && <Link to="/dashboard" className="cc-mobile-link">My Bookings</Link>}
            {user?.role === "admin" && <Link to="/admin" className="cc-mobile-link gold">Admin</Link>}
          </div>
        )}
      </nav>

    </>
  );
};
