import React from "react";
import { Link } from "react-router-dom";
import { Film, Mail, MapPin, Phone } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Outfit:wght@300;400;500;600&display=swap');

        .cc-footer {
          background: #050508;
          border-top: 1px solid rgba(255,255,255,0.06);
          font-family: 'Outfit', sans-serif;
          position: relative;
          overflow: hidden;
        }
        .cc-footer::before { display: none; }
        .cc-footer-glow { display: none; }
        .cc-footer-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 4rem 2rem 2rem;
        }
        .cc-footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr;
          gap: 3rem;
          padding-bottom: 3rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        @media (max-width: 768px) {
          .cc-footer-grid { grid-template-columns: 1fr 1fr; gap: 2rem; }
          .cc-footer-brand { grid-column: 1 / -1; }
        }
        @media (max-width: 480px) {
          .cc-footer-grid { grid-template-columns: 1fr; }
        }

        .cc-footer-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Playfair Display', serif;
          font-size: 1.4rem;
          font-weight: 900;
          color: #c9a84c;
          margin-bottom: 1rem;
          text-decoration: none;
        }
        .cc-footer-logo-icon {
          width: 28px; height: 28px;
          background: rgba(201,168,76,0.1);
          border: 1px solid rgba(201,168,76,0.2);
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .cc-footer-logo-icon svg { color: #050508; width: 16px; height: 16px; }

        .cc-footer-desc {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.35);
          line-height: 1.7;
          max-width: 280px;
          margin-bottom: 1.5rem;
        }
        .cc-footer-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 4px;
          font-size: 0.65rem;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 500;
        }

        .cc-footer-col h4 {
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.28);
          margin-bottom: 1.25rem;
        }
        .cc-footer-col ul { list-style: none; padding: 0; margin: 0; }
        .cc-footer-col ul li { margin-bottom: 0.65rem; }
        .cc-footer-col ul li a {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.4);
          text-decoration: none;
          transition: color 0.2s;
          display: inline-block;
        }
        .cc-footer-col ul li a:hover { color: rgba(255,255,255,0.85); }

        .cc-contact-item {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 0.85rem;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.4);
        }
        .cc-contact-item svg { color: rgba(201,168,76,0.6); flex-shrink: 0; }
        .cc-contact-item a {
          color: rgba(255,255,255,0.4);
          text-decoration: none;
          transition: color 0.2s;
        }
        .cc-contact-item a:hover { color: rgba(255,255,255,0.75); }

        .cc-footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1.5rem;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .cc-footer-bottom p {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.02em;
        }
        .cc-footer-bottom span {
          font-size: 0.7rem;
          color: rgba(212, 168, 83, 0.4);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .cc-divider-line {
          width: 24px; height: 1px;
          background: rgba(201,168,76,0.35);
          margin-bottom: 1.25rem;
        }
      `}</style>

      <footer className="cc-footer">
        <div className="cc-footer-glow" />
        <div className="cc-footer-inner">
          <div className="cc-footer-grid">

            {/* Brand */}
            <div className="cc-footer-brand">
              <Link to="/" className="cc-footer-logo">
                <span className="cc-footer-logo-icon"><Film /></span>
                CineCircle
              </Link>
              <p className="cc-footer-desc">
                Revolutionizing the way you plan and experience cinema. 
                Decide, coordinate, and book tickets with your crew — 
                seamlessly and in style.
              </p>
              <span className="cc-footer-badge">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4A853", display: "inline-block" }} />
                DBMS Mini Project 2026
              </span>
            </div>

            {/* Explore */}
            <div className="cc-footer-col">
              <div className="cc-divider-line" />
              <h4>Explore</h4>
              <ul>
                <li><a href="/">Now Showing</a></li>
                <li><a href="/">Coming Soon</a></li>
                <li><a href="/movie-nights">Movie Nights</a></li>
                <li><a href="/">Cinemas Near You</a></li>
              </ul>
            </div>

            {/* Company */}
            <div className="cc-footer-col">
              <div className="cc-divider-line" />
              <h4>Company</h4>
              <ul>
                <li><a href="#">About Us</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Privacy Policy</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div className="cc-footer-col">
              <div className="cc-divider-line" />
              <h4>Contact</h4>
              <div className="cc-contact-item">
                <Mail size={13} />
                <a href="mailto:support@cinecircle.com">support@cinecircle.com</a>
              </div>
              <div className="cc-contact-item">
                <MapPin size={13} />
                <span>Bengaluru, Karnataka</span>
              </div>
              <div className="cc-contact-item">
                <Phone size={13} />
                <span>+91 80 0000 0000</span>
              </div>
            </div>

          </div>

          <div className="cc-footer-bottom">
            <p>© 2026 CineCircle. Crafted with cinematic passion. All rights reserved.</p>
            <span>Designed for the Big Screen</span>
          </div>
        </div>
      </footer>
    </>
  );
};
