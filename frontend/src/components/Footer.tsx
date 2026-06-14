import React from "react";
import { Link } from "react-router-dom";
import { Film, Mail, MapPin, Phone } from "lucide-react";

export const Footer: React.FC = () => (
  <footer style={{ background:"#050505", borderTop:"1px solid rgba(201,168,76,0.1)", fontFamily:"'Inter',sans-serif", position:"relative", overflow:"hidden" }}>
    {/* Gold top line */}
    <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:600, height:1, background:"linear-gradient(90deg,transparent,#C9A84C,transparent)" }} />
    {/* Ambient glow */}
    <div style={{ position:"absolute", top:-80, left:"50%", transform:"translateX(-50%)", width:500, height:200, background:"radial-gradient(ellipse,rgba(201,168,76,0.05) 0%,transparent 70%)", pointerEvents:"none" }} />

    <div style={{ maxWidth:1400, margin:"0 auto", padding:"3.5rem 2rem 2rem", position:"relative" }}>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1.5fr", gap:"3rem", paddingBottom:"2.5rem", borderBottom:"1px solid rgba(255,255,255,0.04)" }} className="footer-grid">

        {/* Brand */}
        <div>
          <Link to="/" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none", marginBottom:"1rem" }}>
            <div style={{ width:30, height:30, borderRadius:7, background:"linear-gradient(135deg,#C9A84C,#E8C96A)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Film size={15} color="#080808" />
            </div>
            <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:"1.2rem", background:"linear-gradient(135deg,#C9A84C,#E8C96A)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>CineCircle</span>
          </Link>
          <p style={{ fontSize:"0.82rem", color:"rgba(255,255,255,0.28)", lineHeight:1.75, maxWidth:275, marginBottom:"1.25rem" }}>
            Plan movie nights, vote on what to watch, and book seats with friends — all in one place.
          </p>
          <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", background:"rgba(201,168,76,0.06)", border:"1px solid rgba(201,168,76,0.15)", borderRadius:4, fontSize:"0.65rem", color:"rgba(201,168,76,0.6)", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"'Poppins',sans-serif" }}>
            DBMS Mini Project 2026
          </span>
        </div>

        {/* Explore */}
        <FooterCol title="Explore" links={[
          { label:"Now Showing", href:"/" },
          { label:"Coming Soon", href:"/" },
          { label:"Movie Nights", href:"/movie-nights" },
          { label:"My Bookings", href:"/dashboard" },
        ]} />

        {/* Company */}
        <FooterCol title="Company" links={[
          { label:"About Us", href:"#" },
          { label:"Careers", href:"#" },
          { label:"Terms", href:"#" },
          { label:"Privacy", href:"#" },
        ]} />

        {/* Contact */}
        <div>
          <h4 style={{ fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"rgba(201,168,76,0.5)", marginBottom:"1.1rem", fontFamily:"'Poppins',sans-serif" }}>Contact</h4>
          {[
            { icon:<Mail size={12}/>, text:"support@cinecircle.com", href:"mailto:support@cinecircle.com" },
            { icon:<MapPin size={12}/>, text:"Bengaluru, Karnataka" },
            { icon:<Phone size={12}/>, text:"+91 80 0000 0000" },
          ].map((it, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:"0.7rem" }}>
              <span style={{ color:"#C9A84C", display:"flex", flexShrink:0 }}>{it.icon}</span>
              {it.href
                ? <a href={it.href} style={{ fontSize:"0.8rem", color:"rgba(255,255,255,0.3)", textDecoration:"none" }}
                    onMouseEnter={e=>(e.currentTarget.style.color="#C9A84C")}
                    onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.3)")}
                  >{it.text}</a>
                : <span style={{ fontSize:"0.8rem", color:"rgba(255,255,255,0.3)" }}>{it.text}</span>
              }
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:"1.5rem", flexWrap:"wrap", gap:"0.5rem" }}>
        <p style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.15)" }}>© 2026 CineCircle. All rights reserved.</p>
        <span style={{ fontSize:"0.65rem", color:"rgba(201,168,76,0.35)", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"'Poppins',sans-serif" }}>Crafted for the Big Screen</span>
      </div>
    </div>

    <style>{`
      @media(max-width:768px){ .footer-grid{ grid-template-columns:1fr 1fr !important; } .footer-grid>div:first-child{ grid-column:1/-1; } }
      @media(max-width:480px){ .footer-grid{ grid-template-columns:1fr !important; } }
    `}</style>
  </footer>
);

const FooterCol: React.FC<{ title: string; links: { label:string; href:string }[] }> = ({ title, links }) => (
  <div>
    <h4 style={{ fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"rgba(201,168,76,0.5)", marginBottom:"1.1rem", fontFamily:"'Poppins',sans-serif" }}>{title}</h4>
    <ul style={{ listStyle:"none", padding:0, margin:0 }}>
      {links.map(l => (
        <li key={l.label} style={{ marginBottom:"0.55rem" }}>
          <a href={l.href} style={{ fontSize:"0.8rem", color:"rgba(255,255,255,0.3)", textDecoration:"none", transition:"color 0.2s" }}
            onMouseEnter={e=>(e.currentTarget.style.color="rgba(255,255,255,0.75)")}
            onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.3)")}
          >{l.label}</a>
        </li>
      ))}
    </ul>
  </div>
);
