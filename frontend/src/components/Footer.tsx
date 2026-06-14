import React from "react";
import { Link } from "react-router-dom";
import { Film, Mail, MapPin, Phone, Popcorn } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer style={{
      background: "#080F1E",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      fontFamily: "'Inter', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Top glow */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 600, height: 1,
        background: "linear-gradient(90deg, transparent, rgba(229,9,20,0.4), transparent)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)",
        width: 500, height: 200,
        background: "radial-gradient(ellipse, rgba(229,9,20,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "3.5rem 2rem 2rem" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1.5fr",
          gap: "3rem",
          paddingBottom: "2.5rem",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }} className="footer-grid">

          {/* Brand */}
          <div>
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", marginBottom: "1rem" }}>
              <div style={{
                width: 30, height: 30, borderRadius: 7,
                background: "#E50914",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Film size={16} color="#fff" />
              </div>
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700, fontSize: "1.15rem",
                color: "#F9FAFB",
              }}>CineCircle</span>
            </Link>
            <p style={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.7, maxWidth: 280, marginBottom: "1.25rem" }}>
              Plan movie nights with friends. Vote on what to watch, pick seats together, and make memories.
            </p>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 12px",
              background: "rgba(229,9,20,0.07)",
              border: "1px solid rgba(229,9,20,0.15)",
              borderRadius: 6,
              fontSize: "0.68rem", color: "rgba(229,9,20,0.7)",
              letterSpacing: "0.08em", textTransform: "uppercase",
              fontWeight: 500,
            }}>
              <Popcorn size={11} />
              DBMS Mini Project 2026
            </div>
          </div>

          {/* Explore */}
          <FooterCol title="Explore" links={[
            { label: "Now Showing", href: "/" },
            { label: "Coming Soon", href: "/" },
            { label: "Movie Nights", href: "/movie-nights" },
            { label: "My Bookings", href: "/dashboard" },
          ]} />

          {/* Company */}
          <FooterCol title="Company" links={[
            { label: "About Us", href: "#" },
            { label: "Careers", href: "#" },
            { label: "Terms of Service", href: "#" },
            { label: "Privacy Policy", href: "#" },
          ]} />

          {/* Contact */}
          <div>
            <h4 style={{
              fontSize: "0.68rem", fontWeight: 600,
              letterSpacing: "0.12em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.25)",
              marginBottom: "1.1rem",
              fontFamily: "'Space Grotesk', sans-serif",
            }}>Contact</h4>
            {[
              { icon: <Mail size={13} />, text: "support@cinecircle.com", href: "mailto:support@cinecircle.com" },
              { icon: <MapPin size={13} />, text: "Bengaluru, Karnataka" },
              { icon: <Phone size={13} />, text: "+91 80 0000 0000" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "0.75rem" }}>
                <span style={{ color: "#E50914", display: "flex", flexShrink: 0 }}>{item.icon}</span>
                {item.href
                  ? <a href={item.href} style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.35)", textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.8)")}
                    onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.35)")}
                    >{item.text}</a>
                  : <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.35)" }}>{item.text}</span>
                }
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.73rem", color: "rgba(255,255,255,0.18)" }}>
            © 2026 CineCircle. All rights reserved.
          </p>
          <span style={{ fontSize: "0.68rem", color: "rgba(229,9,20,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Built for the Big Screen
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .footer-grid > div:first-child { grid-column: 1 / -1; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
};

const FooterCol: React.FC<{ title: string; links: { label: string; href: string }[] }> = ({ title, links }) => (
  <div>
    <h4 style={{
      fontSize: "0.68rem", fontWeight: 600,
      letterSpacing: "0.12em", textTransform: "uppercase",
      color: "rgba(255,255,255,0.25)",
      marginBottom: "1.1rem",
      fontFamily: "'Space Grotesk', sans-serif",
    }}>{title}</h4>
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {links.map(l => (
        <li key={l.label} style={{ marginBottom: "0.6rem" }}>
          <a href={l.href} style={{
            fontSize: "0.83rem",
            color: "rgba(255,255,255,0.37)",
            textDecoration: "none",
            transition: "color 0.2s",
            display: "inline-block",
          }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.82)")}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.37)")}
          >{l.label}</a>
        </li>
      ))}
    </ul>
  </div>
);
