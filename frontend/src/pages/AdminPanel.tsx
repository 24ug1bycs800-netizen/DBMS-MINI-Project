import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import {
  LayoutDashboard, Film, Calendar, PlusCircle, AlertCircle,
  CheckCircle, BarChart3, LineChart, PieChart, Users, Wallet,
  Compass, Trash2, Search, MapPin, ChevronRight, ChevronDown,
  Clock, Check, X, Plus, Layers, Pencil, Building2, Monitor,
} from "lucide-react";
import api from "../services/api.js";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface KPI { totalRevenue: number; totalBookings: number; totalUsers: number; activeGroupRooms: number; }
interface AdminMovie { id: number; title: string; description: string; language: string; genre: string; durationMins: number; rating: string; ratingValue: string; releaseDate: string; trailerUrl?: string; posterUrl: string; isNowShowing: boolean; }
interface AdminTheatre { id: number; name: string; cityId: number; address: string; }
interface AdminShow { id: number; movieId: number; movieTitle: string; moviePosterUrl: string; movieLanguage: string; language?: string; screenId: number; screenNumber: number; screenType: string; theatreId: number; theatreName: string; cityId: number; cityName: string; startTime: string; date: string; priceRegular: number; pricePremium: number; priceRecliner: number; status: string; }

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ALL_24H_TIMES: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const period = h < 12 ? "AM" : "PM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(displayH).padStart(2, "0")}:${m} ${period}`;
});

const getToday = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};

const TAB_LABELS: Record<string, string> = {
  dashboard: "Analytics", "add-movie": "Add Movie",
  "add-show": "Schedule Show", manage: "Manage Data",
};

const MOVIE_LANGUAGES = ["Hindi", "Kannada", "Tamil", "Telugu", "Malayalam", "English"];

// ─── SMALL UI HELPERS ─────────────────────────────────────────────────────────
const inputCls = "w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl focus:border-[#d4af37] focus:outline-none text-white text-xs font-inter transition-colors";
const selectCls = `${inputCls} appearance-none cursor-pointer`;

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">{children}</label>
);

const GoldBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }> = ({ children, loading, className = "", ...props }) => (
  <button
    {...props}
    disabled={props.disabled || loading}
    className={`px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    style={{ background: "linear-gradient(135deg, #d4af37, #f4d03f)", color: "#000", boxShadow: "0 4px 16px rgba(212,175,55,0.25)" }}
  >
    {loading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : children}
  </button>
);

const GhostBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = "", ...props }) => (
  <button
    {...props}
    className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition-all hover:border-neutral-600 ${className}`}
    style={{ background: "transparent", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
  >
    {children}
  </button>
);

const StatusPill: React.FC<{ status: string }> = ({ status }) => (
  <span
    className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
    style={status === "active"
      ? { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }
      : { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }
    }
  >
    {status}
  </span>
);

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────
const WizardSteps: React.FC<{ step: number }> = ({ step }) => {
  const steps = ["Location", "Movie", "Schedule", "Preview"];
  return (
    <div className="flex items-center mb-8">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 transition-all"
              style={
                i + 1 < step
                  ? { background: "#d4af37", color: "#000" }
                  : i + 1 === step
                  ? { background: "#d4af37", color: "#000", boxShadow: "0 0 0 4px rgba(212,175,55,0.2)" }
                  : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {i + 1 < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span
              className="text-xs font-bold hidden sm:block"
              style={{ color: i + 1 <= step ? "#fff" : "rgba(255,255,255,0.25)" }}
            >
              {label}
            </span>
          </div>
          {i < 3 && (
            <div
              className="flex-1 h-px mx-3"
              style={{ background: i + 1 < step ? "#d4af37" : "rgba(255,255,255,0.06)" }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export const AdminPanel: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // ── Dashboard ────────────────────────────────────────────────────────────────
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [charts, setCharts] = useState<any>(null);

  // ── Shared data ──────────────────────────────────────────────────────────────
  const [movies, setMovies] = useState<AdminMovie[]>([]);
  const [shows, setShows] = useState<AdminShow[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [theatreList, setTheatreList] = useState<AdminTheatre[]>([]);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"dashboard" | "add-movie" | "add-show" | "manage">("dashboard");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // ── Add Movie form ────────────────────────────────────────────────────────────
  const [movieTitle, setMovieTitle] = useState("");
  const [movieDesc, setMovieDesc] = useState("");
  const [movieGenre, setMovieGenre] = useState("");
  const [movieLangs, setMovieLangs] = useState<string[]>(["Hindi"]);
  const [movieDur, setMovieDur] = useState("135");
  const [movieRating, setMovieRating] = useState("UA");
  const [movieRel, setMovieRel] = useState(getToday());
  const [moviePoster, setMoviePoster] = useState("");
  const [movieTrailer, setMovieTrailer] = useState("");
  const [movieShowing, setMovieShowing] = useState(true);

  const toggleMovieLanguage = (language: string) => {
    setMovieLangs((current) => {
      if (current.includes(language)) {
        return current.filter((item) => item !== language);
      }
      return [...current, language];
    });
  };

  // ── Wizard (add-show) ─────────────────────────────────────────────────────────
  const [wStep, setWStep] = useState<1 | 2 | 3 | 4>(1);
  // Step 1 – Location
  const [wCity, setWCity] = useState<{ id: number; name: string } | null>(null);
  const [wTheatre, setWTheatre] = useState<{ id: number; name: string } | null>(null);
  const [wScreen, setWScreen] = useState<{ id: number; number: number; type: string } | null>(null);
  const [wTheatres, setWTheatres] = useState<any[]>([]);
  const [wScreens, setWScreens] = useState<any[]>([]);
  const [loadingTheatres, setLoadingTheatres] = useState(false);
  const [loadingScreens, setLoadingScreens] = useState(false);
  // Step 2 – Movie
  const [wMovie, setWMovie] = useState<AdminMovie | null>(null);
  const [wMovieSearch, setWMovieSearch] = useState("");
  const [wShowLanguage, setWShowLanguage] = useState("");
  // Step 3 – Schedule
  const [wMode, setWMode] = useState<"auto7" | "custom">("auto7");
  const [wCustomDate, setWCustomDate] = useState(getToday());
  const [wTimes, setWTimes] = useState(["10:00 AM", "02:00 PM"]);
  const [wPriceReg, setWPriceReg] = useState("150");
  const [wPricePrem, setWPricePrem] = useState("250");
  const [wPriceRec, setWPriceRec] = useState("450");
  const [wLoading, setWLoading] = useState(false);

  // ── Manage tab ────────────────────────────────────────────────────────────────
  const [manageSearch, setManageSearch] = useState("");
  const [manageCityFilter, setManageCityFilter] = useState<number | "">("");
  const [expandedMovies, setExpandedMovies] = useState<Set<number>>(new Set());
  const [newTheatreCityId, setNewTheatreCityId] = useState("");
  const [newTheatreName, setNewTheatreName] = useState("");
  const [newTheatreAddress, setNewTheatreAddress] = useState("");
  const [newScreenTheatreId, setNewScreenTheatreId] = useState("");
  const [newScreenNumber, setNewScreenNumber] = useState("1");
  const [newScreenType, setNewScreenType] = useState("2D");

  // ── Bulk Screens ──────────────────────────────────────────────────────────────
  const [bulkScreenTheatreId, setBulkScreenTheatreId] = useState("");
  const [bulkScreenCount, setBulkScreenCount] = useState("3");
  const [bulkScreenType, setBulkScreenType] = useState("2D");

  // ── Edit Movie Modal ──────────────────────────────────────────────────────────
  const [editingMovie, setEditingMovie] = useState<AdminMovie | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editGenre, setEditGenre] = useState("");
  const [editLangs, setEditLangs] = useState<string[]>(["Hindi"]);
  const [editDur, setEditDur] = useState("135");
  const [editRating, setEditRating] = useState("UA");
  const [editRatingValue, setEditRatingValue] = useState("7.0");
  const [editRel, setEditRel] = useState(getToday());
  const [editPoster, setEditPoster] = useState("");
  const [editTrailer, setEditTrailer] = useState("");
  const [editShowing, setEditShowing] = useState(true);

  // ─── DATA FETCHING ─────────────────────────────────────────────────────────
  const fetchStats = async () => {
    try {
      const res = await api.get("/admin/stats");
      setKpi(res.data.kpi);
      setCharts(res.data.charts);
    } catch (e) { console.error(e); }
  };

  const fetchAll = async () => {
    try {
      const [moviesRes, showsRes, citiesRes, theatresRes] = await Promise.all([
        api.get("/admin/movies"),
        api.get("/admin/shows"),
        api.get("/admin/cities"),
        api.get("/admin/theatres"),
      ]);
      setMovies(moviesRes.data || []);
      setShows(showsRes.data || []);
      setCityList(citiesRes.data || []);
      setTheatreList(theatresRes.data || []);
    } catch (e) { console.error("fetchAll error:", e); }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "admin") { navigate("/"); return; }
    fetchStats();
    fetchAll();
  }, [user, authLoading]);

  // Cascade: city → theatres
  useEffect(() => {
    if (!wCity) { setWTheatres([]); setWTheatre(null); setWScreens([]); setWScreen(null); return; }
    setLoadingTheatres(true);
    api.get(`/admin/theatres?cityId=${wCity.id}`)
      .then(r => setWTheatres(r.data || []))
      .catch(() => setWTheatres([]))
      .finally(() => setLoadingTheatres(false));
  }, [wCity]);

  // Cascade: theatre → screens
  useEffect(() => {
    if (!wTheatre) { setWScreens([]); setWScreen(null); return; }
    setLoadingScreens(true);
    api.get(`/admin/screens?theatreId=${wTheatre.id}`)
      .then(r => setWScreens(r.data || []))
      .catch(() => setWScreens([]))
      .finally(() => setLoadingScreens(false));
  }, [wTheatre]);

  // ─── WIZARD HANDLERS ───────────────────────────────────────────────────────
  const resetWizard = () => {
    setWStep(1); setWCity(null); setWTheatre(null); setWScreen(null);
    setWMovie(null); setWMovieSearch(""); setWShowLanguage("");
    setWMode("auto7"); setWCustomDate(getToday());
    setWTimes(["10:00 AM", "02:00 PM"]);
    setWPriceReg("150"); setWPricePrem("250"); setWPriceRec("450");
  };

  const handleGenerateShows = async () => {
    if (!wMovie) return;
    setWLoading(true); setMsg(""); setErr("");
    try {
      const payload: Record<string, unknown> = {
        movieId: wMovie.id,
        cityIds: wCity ? [wCity.id] : cityList.map((c: any) => c.id),
        theatreIds: wCity && wTheatre ? [wTheatre.id] : [],
        screenIds: wCity && wScreen ? [wScreen.id] : [],
        startTimes: wTimes,
        language: wShowLanguage || wMovie.language.split(",")[0]?.trim(),
        priceRegular: parseInt(wPriceReg) || 150,
        pricePremium: parseInt(wPricePrem) || 250,
        priceRecliner: parseInt(wPriceRec) || 450,
      };
      if (wMode === "auto7") {
        payload.days = 7;
      } else {
        payload.days = 1;
        payload.startDate = wCustomDate;
      }
      const res = await api.post("/admin/generate-shows", payload);
      const { created, skipped, screens: matchedScreens } = res.data;
      if (created === 0 && skipped > 0) {
        setErr(
          `No free screen slots found. ${matchedScreens || 0} screen${matchedScreens === 1 ? "" : "s"} matched your selection, but all selected time slots are already occupied. Add another screen to this theatre or choose a different time.`
        );
      } else {
        setMsg(`${created} shows created${skipped > 0 ? ` (${skipped} occupied slots skipped)` : ""}`);
        resetWizard();
      }
      fetchAll();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Failed to generate shows");
    } finally {
      setWLoading(false);
    }
  };

  // ─── MANAGE HANDLERS ───────────────────────────────────────────────────────
  const handleDeleteShow = async (id: number) => {
    if (!window.confirm("Delete this show?")) return;
    try {
      await api.delete(`/admin/shows/${id}`);
      setMsg("Show deleted");
      fetchAll();
    } catch { setErr("Failed to delete show"); }
  };

  const handleDeleteMovie = async (id: number) => {
    if (!window.confirm("Delete this movie and all its shows?")) return;
    try {
      await api.delete(`/admin/movies/${id}`);
      setMsg("Movie deleted");
      fetchAll();
    } catch { setErr("Failed to delete movie"); }
  };

  const handleAddTheatre = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(""); setErr("");
    try {
      await api.post("/admin/theatres", {
        name: newTheatreName,
        cityId: parseInt(newTheatreCityId),
        address: newTheatreAddress,
      });
      setMsg("Theatre added. Add screens to it before scheduling shows.");
      setNewTheatreName(""); setNewTheatreAddress("");
      fetchAll();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Failed to add theatre.");
    }
  };

  const handleAddScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(""); setErr("");
    try {
      await api.post("/admin/screens", {
        theatreId: parseInt(newScreenTheatreId),
        number: parseInt(newScreenNumber),
        type: newScreenType,
      });
      setMsg("Screen added with default seats. You can schedule shows on it now.");
      setNewScreenNumber("1"); setNewScreenType("2D");
      fetchAll();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Failed to add screen.");
    }
  };

  const handleBulkScreens = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(""); setErr("");
    try {
      const res = await api.post("/admin/screens/bulk", {
        theatreId: parseInt(bulkScreenTheatreId),
        count: parseInt(bulkScreenCount),
        type: bulkScreenType,
      });
      setMsg(res.data.message);
      setBulkScreenTheatreId(""); setBulkScreenCount("3");
      fetchAll();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Failed to add screens.");
    }
  };

  const openEditMovie = (movie: AdminMovie) => {
    setEditingMovie(movie);
    setEditTitle(movie.title);
    setEditDesc(movie.description || "");
    setEditGenre(movie.genre);
    setEditLangs(movie.language.split(",").map(l => l.trim()).filter(Boolean));
    setEditDur(String(movie.durationMins));
    setEditRating(movie.rating);
    setEditRatingValue(movie.ratingValue || "7.0");
    setEditRel(movie.releaseDate || getToday());
    setEditPoster(movie.posterUrl);
    setEditTrailer(movie.trailerUrl || "");
    setEditShowing(movie.isNowShowing);
    setMsg(""); setErr("");
  };

  const handleUpdateMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovie) return;
    setMsg(""); setErr("");
    if (editLangs.length === 0) { setErr("Select at least one language."); return; }
    try {
      await api.put(`/admin/movies/${editingMovie.id}`, {
        title: editTitle, description: editDesc, genre: editGenre,
        language: editLangs, durationMins: parseInt(editDur),
        rating: editRating, ratingValue: editRatingValue,
        releaseDate: editRel, posterUrl: editPoster,
        trailerUrl: editTrailer.trim(), isNowShowing: editShowing,
      });
      setMsg(`"${editTitle}" updated successfully!`);
      setEditingMovie(null);
      fetchAll();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Failed to update movie.");
    }
  };

  const toggleEditLanguage = (lang: string) => {
    setEditLangs(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);
  };



  // ─── ADD MOVIE HANDLER ─────────────────────────────────────────────────────
  const handleAddMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(""); setErr("");
    if (movieLangs.length === 0) {
      setErr("Please select at least one language.");
      return;
    }
    try {
      await api.post("/admin/movies", {
        title: movieTitle, description: movieDesc, genre: movieGenre,
        language: movieLangs, durationMins: parseInt(movieDur),
        rating: movieRating, releaseDate: movieRel,
        posterUrl: moviePoster, trailerUrl: movieTrailer.trim(), isNowShowing: movieShowing,
      });
      setMsg("Movie added successfully!");
      setMovieTitle(""); setMovieDesc(""); setMovieGenre(""); setMoviePoster("");
      setMovieTrailer(""); setMovieLangs(["Hindi"]);
      fetchAll();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Failed to add movie.");
    }
  };

  // ─── SHOWS BY MOVIE (manage tab) ──────────────────────────────────────────
  const showsByMovie = useMemo(() => {
    const q = manageSearch.toLowerCase();
    const result: Record<number, AdminShow[]> = {};
    for (const show of shows) {
      if (manageCityFilter && show.cityId !== manageCityFilter) continue;
      if (q &&
        !show.movieTitle?.toLowerCase().includes(q) &&
        !show.theatreName?.toLowerCase().includes(q) &&
        !show.cityName?.toLowerCase().includes(q)) continue;
      if (!result[show.movieId]) result[show.movieId] = [];
      result[show.movieId].push(show);
    }
    return result;
  }, [shows, manageSearch, manageCityFilter]);

  const filteredMovies = useMemo(() => {
    const q = manageSearch.toLowerCase();
    if (!q && !manageCityFilter) return movies;
    return movies.filter(m =>
      m.title.toLowerCase().includes(q) || (showsByMovie[m.id]?.length ?? 0) > 0
    );
  }, [movies, manageSearch, manageCityFilter, showsByMovie]);

  const filteredMoviesForWizard = useMemo(() =>
    movies.filter(m => m.isNowShowing && (!wMovieSearch || m.title.toLowerCase().includes(wMovieSearch.toLowerCase()))),
    [movies, wMovieSearch]
  );

  const movieLanguageOptions = useMemo(
    () => (wMovie?.language || "")
      .split(",")
      .map(language => language.trim())
      .filter(Boolean),
    [wMovie]
  );

  // ─── ESTIMATED SHOWS COUNT ─────────────────────────────────────────────────
  const estimatedShows = useMemo(() => {
    const days = wMode === "auto7" ? 7 : 1;
    // When All Cities: we don't have exact screen counts, show per-city estimate × city count
    if (!wCity) return `${cityList.length}+ cities`;
    const screensCount = wScreen ? 1 : wTheatre ? wScreens.length : wTheatres.length || 1;
    return days * wTimes.length * screensCount;
  }, [wMode, wScreen, wTheatre, wScreens, wCity, wTheatres, wTimes, cityList]);

  // ─── CARD ─────────────────────────────────────────────────────────────────
  const card = "p-6 rounded-2xl border border-neutral-900"
  const cardDark = `${card} bg-[#0d0d0d]`;

  return (
    <div className="min-h-screen bg-background text-white pb-20 font-poppins">
      <div className="max-w-7xl mx-auto px-6 sm:px-12 py-12 space-y-8">

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-neutral-900 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-wider flex items-center gap-2">
              <LayoutDashboard className="w-8 h-8 text-primary" /> Admin Console
            </h1>
            <p className="text-xs text-neutral-500 font-inter mt-1.5">
              CineCircle operations dashboard — movies, scheduling, analytics, lifecycle management.
            </p>
          </div>
          <div className="flex gap-2 text-xs font-semibold flex-wrap">
            {(["dashboard", "add-movie", "add-show", "manage"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setMsg(""); setErr(""); }}
                className={`px-4 py-2 rounded-xl border transition-all ${
                  activeTab === tab
                    ? "border-[#d4af37] bg-[#d4af37]/10 text-white"
                    : "border-neutral-900 bg-neutral-950/40 text-neutral-500 hover:border-neutral-700"
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* ── ALERTS ────────────────────────────────────────────────────────── */}
        {msg && (
          <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-xl flex items-center gap-2 text-sm text-green-400 font-inter">
            <CheckCircle className="w-4 h-4 flex-shrink-0" /> {msg}
          </div>
        )}
        {err && (
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-sm text-red-400 font-inter">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {err}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── ANALYTICS DASHBOARD ────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "dashboard" && (!kpi || !charts ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`${cardDark} animate-pulse`}>
                <div className="w-10 h-10 rounded-xl bg-neutral-800 mb-4" />
                <div className="w-24 h-2.5 rounded-full bg-neutral-800 mb-3" />
                <div className="w-16 h-6 rounded-full bg-neutral-800" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: <Wallet className="w-5 h-5 text-primary" />, label: "Total Revenue", value: `Rs ${kpi.totalRevenue}`, bg: "bg-primary/10" },
                { icon: <Film className="w-5 h-5 text-accent" />, label: "Total Bookings", value: `${kpi.totalBookings} tickets`, bg: "bg-accent/10" },
                { icon: <Users className="w-5 h-5 text-indigo-400" />, label: "Registered Users", value: `${kpi.totalUsers} users`, bg: "bg-indigo-600/10" },
                { icon: <BarChart3 className="w-5 h-5 text-success" />, label: "Planning Rooms", value: `${kpi.activeGroupRooms} active`, bg: "bg-success/10" },
              ].map(({ icon, label, value, bg }) => (
                <div key={label} className={cardDark}>
                  <div className={`p-2.5 rounded-xl w-fit mb-4 ${bg}`}>{icon}</div>
                  <span className="block text-xs text-neutral-500 font-inter">{label}</span>
                  <strong className="text-xl sm:text-2xl font-black text-white mt-1.5 block">{value}</strong>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Daily Revenue */}
              <div className={cardDark}>
                <h3 className="font-bold text-sm text-white mb-6 flex items-center gap-2 border-b border-neutral-900 pb-3">
                  <LineChart className="w-4 h-4 text-primary" /> Daily Revenue Trends
                </h3>
                <div className="h-48 flex items-end gap-3 justify-around pt-6 font-inter text-[9px] text-neutral-500">
                  {charts.dailyBookings.map((p: any, idx: number) => {
                    const maxVal = Math.max(...charts.dailyBookings.map((x: any) => x.revenue), 1);
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 w-full">
                        <span className="text-white font-bold">Rs {p.revenue}</span>
                        <div className="w-full bg-neutral-900 rounded-lg overflow-hidden h-32 flex items-end">
                          <div className="w-full bg-primary rounded-lg" style={{ height: `${Math.max(8, (p.revenue / maxVal) * 100)}%` }} />
                        </div>
                        <span className="truncate max-w-10">{p.date.substring(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Popular Movies */}
              <div className={cardDark}>
                <h3 className="font-bold text-sm text-white mb-6 flex items-center gap-2 border-b border-neutral-900 pb-3">
                  <BarChart3 className="w-4 h-4 text-accent" /> Popular Movies by Revenue
                </h3>
                <div className="space-y-4 pt-2">
                  {charts.popularMovies.slice(0, 4).map((p: any, idx: number) => {
                    const maxVal = Math.max(...charts.popularMovies.map((x: any) => x.revenue), 1);
                    return (
                      <div key={idx} className="space-y-1 font-inter text-xs">
                        <div className="flex justify-between font-semibold">
                          <span className="text-white">{p.title}</span>
                          <span className="text-neutral-500">Rs {p.revenue} ({p.bookings})</span>
                        </div>
                        <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${(p.revenue / maxVal) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Cities */}
              <div className={cardDark}>
                <h3 className="font-bold text-sm text-white mb-6 flex items-center gap-2 border-b border-neutral-900 pb-3">
                  <Compass className="w-4 h-4 text-indigo-400" /> Location Breakdown
                </h3>
                <div className="space-y-4 pt-2">
                  {charts.popularCities.slice(0, 4).map((p: any, idx: number) => {
                    const maxVal = Math.max(...charts.popularCities.map((x: any) => x.bookings), 1);
                    return (
                      <div key={idx} className="space-y-1 font-inter text-xs">
                        <div className="flex justify-between font-semibold">
                          <span className="text-white">{p.name}</span>
                          <span className="text-neutral-500">{p.bookings} tickets</span>
                        </div>
                        <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(p.bookings / maxVal) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Booking Mix */}
              <div className={cardDark}>
                <h3 className="font-bold text-sm text-white mb-6 flex items-center gap-2 border-b border-neutral-900 pb-3">
                  <PieChart className="w-4 h-4 text-success" /> Booking Model Mix
                </h3>
                <div className="flex items-center justify-around h-40 pt-4">
                  {charts.groupBookingUsage.map((u: any, idx: number) => {
                    const totalVal = charts.groupBookingUsage.reduce((s: number, x: any) => s + x.value, 0) || 1;
                    return (
                      <div key={idx} className="text-center font-inter">
                        <div className={`text-3xl font-black ${idx === 0 ? "text-primary" : "text-success"}`}>
                          {Math.round((u.value / totalVal) * 100)}%
                        </div>
                        <div className="text-xs text-neutral-500 font-semibold mt-2">{u.name}</div>
                        <div className="text-[10px] text-neutral-600 mt-1">{u.value} bookings</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── ADD MOVIE ──────────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "add-movie" && (
          <div className={`${cardDark} max-w-3xl mx-auto w-full`}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-primary" /> Add New Movie
            </h2>
            <form onSubmit={handleAddMovie} className="grid grid-cols-1 md:grid-cols-2 gap-5 font-inter text-xs">
              <div>
                <FieldLabel>Movie Title</FieldLabel>
                <input className={inputCls} required placeholder="e.g. Karuppu" value={movieTitle} onChange={e => setMovieTitle(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Genre Tags</FieldLabel>
                <input className={inputCls} required placeholder="e.g. Action/Thriller" value={movieGenre} onChange={e => setMovieGenre(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Synopsis</FieldLabel>
                <textarea className={inputCls} required rows={4} placeholder="Write a description..." value={movieDesc} onChange={e => setMovieDesc(e.target.value)} style={{ resize: "none" }} />
              </div>
              <div>
                <FieldLabel>Languages</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {MOVIE_LANGUAGES.map(language => {
                    const selected = movieLangs.includes(language);
                    return (
                      <label
                        key={language}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                          selected
                            ? "border-[#d4af37] bg-[#d4af37]/10 text-white"
                            : "border-neutral-800 bg-neutral-950 text-neutral-500 hover:border-neutral-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleMovieLanguage(language)}
                          className="w-3.5 h-3.5 rounded"
                        />
                        <span className="font-bold">{language}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <FieldLabel>Duration (Minutes)</FieldLabel>
                <input className={inputCls} type="number" required value={movieDur} onChange={e => setMovieDur(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Censor Rating</FieldLabel>
                <select className={selectCls} value={movieRating} onChange={e => setMovieRating(e.target.value)}>
                  <option value="U">U (Universal)</option>
                  <option value="UA">UA (Parental Guidance)</option>
                  <option value="A">A (Adults Only)</option>
                </select>
              </div>
              <div>
                <FieldLabel>Release Date</FieldLabel>
                <input className={inputCls} type="date" required value={movieRel} min={getToday()} onChange={e => setMovieRel(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Poster Image URL</FieldLabel>
                <input className={inputCls} type="text" value={moviePoster} onChange={e => setMoviePoster(e.target.value)} placeholder="Paste poster URL" />
                {moviePoster && (
                  <img src={moviePoster} alt="Preview" loading="lazy" decoding="async"
                    className="mt-3 w-24 h-36 object-cover rounded-lg border border-neutral-800"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
              </div>
              <div className="md:col-span-2">
                <FieldLabel>YouTube Trailer URL (Optional)</FieldLabel>
                <input
                  className={inputCls}
                  type="text"
                  value={movieTrailer}
                  onChange={e => setMovieTrailer(e.target.value)}
                  placeholder="e.g. https://www.youtube.com/watch?v=..."
                />
                {movieTrailer && (
                  <a
                    href={movieTrailer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold"
                    style={{ color: "#d4af37" }}
                  >
                    ▶ Preview trailer
                  </a>
                )}
              </div>
              <div className="flex items-center gap-3.5 mt-2">
                <input type="checkbox" id="showing" checked={movieShowing} onChange={e => setMovieShowing(e.target.checked)} className="w-4 h-4 rounded" />
                <label htmlFor="showing" className="font-bold text-white cursor-pointer text-xs">Set as Now Showing</label>
              </div>
              <GoldBtn type="submit" className="md:col-span-2">Add Movie to Catalog</GoldBtn>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── SCHEDULE SHOW (4-STEP WIZARD) ──────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "add-show" && (
          <div className={`${cardDark} max-w-3xl mx-auto w-full`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" /> Schedule Showtimes
              </h2>
              {wStep > 1 && (
                <button onClick={resetWizard} className="text-[10px] text-neutral-600 hover:text-neutral-400 font-bold uppercase tracking-widest flex items-center gap-1">
                  <X className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
            <p className="text-[10px] text-neutral-600 font-inter mb-6">Generates 7-day schedules with min. 2 shows/day. Duplicates are skipped automatically.</p>

            <WizardSteps step={wStep} />

            {/* ── STEP 1: LOCATION ──────────────────────────────────────── */}
            {wStep === 1 && (
              <div className="space-y-5">
                <div
                  className="p-4 rounded-xl flex items-center gap-3 text-xs font-inter"
                  style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)" }}
                >
                  <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: "#d4af37" }} />
                  <span className="text-neutral-400">Leave city as <strong className="text-neutral-300">All Cities</strong> to schedule across every location, or pick a specific city to narrow down.</span>
                </div>

                {/* City */}
                <div>
                  <FieldLabel>City {cityList.length > 0 && <span className="text-neutral-600 normal-case font-normal ml-1">({cityList.length} available)</span>}</FieldLabel>
                  <select
                    className={selectCls}
                    value={wCity?.id ?? ""}
                    onChange={e => {
                      const found = cityList.find((c: any) => c.id === parseInt(e.target.value));
                      setWCity(found ?? null);
                    }}
                  >
                    <option value="">— All Cities —</option>
                    {cityList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {!wCity && cityList.length > 0 && (
                    <p className="mt-1.5 text-[10px] text-neutral-600 font-inter">
                      Shows will be generated across all {cityList.length} cities and their screens.
                    </p>
                  )}
                </div>

                {/* Theatre + Screen — only shown when a specific city is selected */}
                {wCity && (
                  <>
                    <div>
                      <FieldLabel>
                        Theatre
                        {!loadingTheatres && <span className="text-neutral-600 normal-case font-normal ml-1">({wTheatres.length} in {wCity.name})</span>}
                      </FieldLabel>
                      {loadingTheatres ? (
                        <div className={`${inputCls} flex items-center gap-2 text-neutral-600`}>
                          <div className="w-3 h-3 border border-neutral-600 border-t-[#d4af37] rounded-full animate-spin" /> Loading theatres…
                        </div>
                      ) : (
                        <select
                          className={selectCls}
                          value={wTheatre?.id ?? ""}
                          onChange={e => {
                            const found = wTheatres.find((t: any) => t.id === parseInt(e.target.value));
                            setWTheatre(found ?? null);
                          }}
                        >
                          <option value="">— All Theatres in {wCity.name} —</option>
                          {wTheatres.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      )}
                    </div>

                    <div>
                      <FieldLabel>
                        Screen (Optional)
                        {wTheatre && !loadingScreens && <span className="text-neutral-600 normal-case font-normal ml-1">({wScreens.length} screens)</span>}
                      </FieldLabel>
                      {loadingScreens ? (
                        <div className={`${inputCls} flex items-center gap-2 text-neutral-600`}>
                          <div className="w-3 h-3 border border-neutral-600 border-t-[#d4af37] rounded-full animate-spin" /> Loading screens…
                        </div>
                      ) : (
                        <select
                          className={selectCls}
                          disabled={!wTheatre}
                          value={wScreen?.id ?? ""}
                          onChange={e => {
                            const found = wScreens.find((s: any) => s.id === parseInt(e.target.value));
                            setWScreen(found ?? null);
                          }}
                        >
                          <option value="">— All Screens —</option>
                          {wScreens.map((s: any) => <option key={s.id} value={s.id}>Screen {s.number} ({s.type})</option>)}
                        </select>
                      )}
                    </div>
                  </>
                )}

                <GoldBtn onClick={() => setWStep(2)}>
                  Next: Select Movie <ChevronRight className="w-4 h-4" />
                </GoldBtn>
              </div>
            )}

            {/* ── STEP 2: MOVIE ─────────────────────────────────────────── */}
            {wStep === 2 && (
              <div className="space-y-5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                  <input
                    className={`${inputCls} pl-9`}
                    placeholder="Search movies…"
                    value={wMovieSearch}
                    onChange={e => setWMovieSearch(e.target.value)}
                  />
                </div>

                {filteredMoviesForWizard.length === 0 ? (
                  <div className="text-center py-10 text-neutral-700 font-inter text-sm">No movies match your search.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                    {filteredMoviesForWizard.map(movie => (
                      <div
                        key={movie.id}
                        onClick={() => {
                          setWMovie(movie);
                          setWShowLanguage(movie.language.split(",")[0]?.trim() || "");
                        }}
                        className="cursor-pointer rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
                        style={{
                          border: wMovie?.id === movie.id ? "2px solid #d4af37" : "2px solid rgba(255,255,255,0.05)",
                          boxShadow: wMovie?.id === movie.id ? "0 0 16px rgba(212,175,55,0.2)" : "none",
                        }}
                      >
                        <div className="relative aspect-[2/3] overflow-hidden bg-neutral-900">
                          <img src={movie.posterUrl} alt={movie.title} loading="lazy" decoding="async"
                            className="w-full h-full object-cover" />
                          {wMovie?.id === movie.id && (
                            <div className="absolute inset-0 flex items-center justify-center"
                              style={{ background: "rgba(212,175,55,0.15)" }}>
                              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                                style={{ background: "#d4af37" }}>
                                <Check className="w-4 h-4 text-black" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-2 bg-neutral-900">
                          <p className="font-black text-xs text-white truncate">{movie.title}</p>
                          <p className="text-[9px] text-neutral-500 font-inter mt-0.5">{movie.language} · {movie.isNowShowing ? "Now Showing" : "Coming Soon"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <GhostBtn onClick={() => setWStep(1)}>← Back</GhostBtn>
                  <GoldBtn disabled={!wMovie} onClick={() => setWStep(3)}>
                    Next: Configure Schedule <ChevronRight className="w-4 h-4" />
                  </GoldBtn>
                </div>
              </div>
            )}

            {/* ── STEP 3: SCHEDULE ──────────────────────────────────────── */}
            {wStep === 3 && (
              <div className="space-y-6">
                <div>
                  <FieldLabel>Show Language</FieldLabel>
                  <select
                    className={selectCls}
                    value={wShowLanguage || movieLanguageOptions[0] || ""}
                    onChange={e => setWShowLanguage(e.target.value)}
                  >
                    {movieLanguageOptions.map(language => (
                      <option key={language} value={language}>{language}</option>
                    ))}
                  </select>
                </div>

                {/* Mode toggle */}
                <div>
                  <FieldLabel>Schedule Mode</FieldLabel>
                  <div className="flex gap-2">
                    {(["auto7", "custom"] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setWMode(m)}
                        className="flex-1 py-3 rounded-xl text-xs font-black transition-all"
                        style={wMode === m
                          ? { background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000" }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }
                        }
                      >
                        {m === "auto7" ? "Auto — Next 7 Days" : "Custom Date"}
                      </button>
                    ))}
                  </div>
                </div>

                {wMode === "custom" && (
                  <div>
                    <FieldLabel>Select Date</FieldLabel>
                    <input className={inputCls} type="date" value={wCustomDate} min={getToday()} onChange={e => setWCustomDate(e.target.value)} />
                  </div>
                )}

                {/* Show times */}
                <div>
                  <FieldLabel>
                    Show Times
                    <span className="text-neutral-600 normal-case font-normal ml-1">
                      (min 2 · {wTimes.length} selected)
                    </span>
                  </FieldLabel>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                    {ALL_24H_TIMES.map(t => {
                      const selected = wTimes.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() =>
                            setWTimes(prev =>
                              selected
                                ? prev.length > 2 ? prev.filter(v => v !== t) : prev
                                : [...prev, t]
                            )
                          }
                          className="py-1.5 rounded-lg text-[10px] font-bold transition-all"
                          style={selected
                            ? { background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000" }
                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }
                          }
                          title={selected && wTimes.length <= 2 ? "Minimum 2 required" : ""}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                  {wTimes.length < 2 && (
                    <p className="mt-2 text-[10px] text-red-400 font-inter">Select at least 2 time slots.</p>
                  )}
                </div>

                {/* Pricing */}
                <div>
                  <FieldLabel>Ticket Pricing (Rs)</FieldLabel>
                  <div className="grid grid-cols-3 gap-3">
                    {[["Regular", wPriceReg, setWPriceReg], ["Premium", wPricePrem, setWPricePrem], ["Recliner", wPriceRec, setWPriceRec]].map(([label, val, setter]) => (
                      <div key={label as string}>
                        <label className="block text-[9px] font-bold text-neutral-600 uppercase mb-1.5">{label as string}</label>
                        <input className={inputCls} type="number" value={val as string}
                          onChange={e => (setter as (v: string) => void)(e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <GhostBtn onClick={() => setWStep(2)}>← Back</GhostBtn>
                  <GoldBtn disabled={wTimes.length < 2} onClick={() => setWStep(4)}>
                    Preview Schedule <ChevronRight className="w-4 h-4" />
                  </GoldBtn>
                </div>
              </div>
            )}

            {/* ── STEP 4: PREVIEW & CONFIRM ──────────────────────────────── */}
            {wStep === 4 && (
              <div className="space-y-6">
                {/* Summary card */}
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(212,175,55,0.15)" }}>
                  <div className="px-5 py-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                    style={{ background: "rgba(212,175,55,0.06)", borderBottom: "1px solid rgba(212,175,55,0.1)", color: "#d4af37" }}>
                    <Layers className="w-3.5 h-3.5" /> Schedule Preview
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Movie row */}
                    <div className="flex items-start gap-4">
                      <img src={wMovie?.posterUrl} alt={wMovie?.title} loading="lazy" decoding="async"
                        className="w-12 h-[72px] rounded-lg object-cover flex-shrink-0 border border-neutral-800" />
                      <div>
                        <p className="text-[10px] text-neutral-600 font-black uppercase tracking-widest mb-1">Movie</p>
                        <p className="font-black text-white">{wMovie?.title}</p>
                        <p className="text-xs text-neutral-500 font-inter">{wMovie?.language}</p>
                      </div>
                    </div>

                    <div className="h-px bg-neutral-900" />

                    {/* Location + schedule details */}
                    <div className="grid grid-cols-2 gap-4 text-xs font-inter">
                      <div>
                        <p className="text-[10px] text-neutral-600 font-black uppercase tracking-widest mb-1">Location</p>
                        <p className="text-white font-bold">{wCity ? wCity.name : `All Cities (${cityList.length})`}</p>
                        <p className="text-neutral-500">{wCity ? (wTheatre?.name ?? "All Theatres") : "All Theatres"}</p>
                        <p className="text-neutral-600">{wCity && wScreen ? `Screen ${wScreen.number} (${wScreen.type})` : "All Screens"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-600 font-black uppercase tracking-widest mb-1">Schedule</p>
                        <p className="text-white font-bold">{wMode === "auto7" ? "Next 7 days from today" : wCustomDate}</p>
                        <p className="text-neutral-500">{wTimes.join(" · ")}</p>
                        <p className="text-neutral-600">{wShowLanguage || movieLanguageOptions[0]} · {wTimes.length} shows/day/screen</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-600 font-black uppercase tracking-widest mb-1">Pricing</p>
                        <p className="text-white">Reg Rs {wPriceReg}</p>
                        <p className="text-neutral-500">Prem Rs {wPricePrem}</p>
                        <p className="text-neutral-600">Rec Rs {wPriceRec}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-600 font-black uppercase tracking-widest mb-1">Est. Created</p>
                        <p className="text-3xl font-black" style={{ color: "#d4af37" }}>{estimatedShows}</p>
                        <p className="text-neutral-600">shows (dupes skipped)</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <GhostBtn onClick={() => setWStep(3)}>← Edit</GhostBtn>
                  <GoldBtn loading={wLoading} onClick={handleGenerateShows} className="flex-1 justify-center">
                    {typeof estimatedShows === "number"
                      ? `Confirm & Generate ${estimatedShows} Shows`
                      : `Confirm & Generate Across All Cities`}
                  </GoldBtn>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── MANAGE DATA ────────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "manage" && (
          <div className="space-y-8">

            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Movies", value: movies.length, color: "text-primary" },
                { label: "Total Shows", value: shows.length, color: "text-accent" },
                { label: "Active Shows", value: shows.filter(s => s.status === "active").length, color: "text-green-400" },
                { label: "Expired Shows", value: shows.filter(s => s.status === "expired").length, color: "text-red-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className={`${cardDark} py-4`}>
                  <p className="text-xs text-neutral-500 font-inter">{label}</p>
                  <p className={`text-2xl font-black ${color} mt-1`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Search + filter bar */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input
                  className={`${inputCls} pl-9`}
                  placeholder="Search by movie, theatre, or city…"
                  value={manageSearch}
                  onChange={e => setManageSearch(e.target.value)}
                />
              </div>
              <select
                className={`${selectCls} w-auto min-w-36`}
                value={manageCityFilter}
                onChange={e => setManageCityFilter(e.target.value ? parseInt(e.target.value) : "")}
              >
                <option value="">All Cities</option>
                {cityList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div
                className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
                style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", color: "rgba(74,222,128,0.6)" }}
              >
                <Clock className="w-3.5 h-3.5" /> Past shows auto-deleted at midnight
              </div>
            </div>

            {/* ── MOVIES + SHOWTIMES ───────────────────────────────────────── */}
            <div className={cardDark}>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Film className="w-5 h-5 text-primary" /> Movies &amp; Showtimes
                <span className="text-neutral-600 font-normal text-sm">({filteredMovies.length} movies)</span>
              </h2>

              {filteredMovies.length === 0 ? (
                <p className="text-sm text-neutral-600 py-8 text-center font-inter">
                  {manageSearch || manageCityFilter ? "No movies match your search." : "No movies found."}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredMovies.map(movie => {
                    const movieShows = (showsByMovie[movie.id] ?? [])
                      .slice()
                      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
                    const isOpen = expandedMovies.has(movie.id);

                    return (
                      <div key={movie.id} className="rounded-xl border border-neutral-800 overflow-hidden">
                        {/* Movie header row */}
                        <div
                          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-neutral-900/40 transition-colors"
                          onClick={() => setExpandedMovies(prev => {
                            const next = new Set(prev);
                            if (next.has(movie.id)) next.delete(movie.id); else next.add(movie.id);
                            return next;
                          })}
                        >
                          <div className="flex items-center gap-3">
                            <img src={movie.posterUrl} alt={movie.title} loading="lazy" decoding="async"
                              className="w-9 h-[52px] rounded-lg object-cover flex-shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-neutral-500" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />}
                                <p className="font-black text-sm text-white">{movie.title}</p>
                                <span className="text-[10px] text-neutral-600 font-inter">{movie.language} · {movie.genre}</span>
                              </div>
                              <p className="text-[10px] text-neutral-600 font-inter ml-5">
                                {movieShows.length > 0
                                  ? <span className="text-accent font-bold">{movieShows.length} show{movieShows.length !== 1 ? "s" : ""} scheduled</span>
                                  : <span className="text-neutral-700">No shows scheduled</span>
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); openEditMovie(movie); }}
                              className="p-2 rounded-lg text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors"
                              title="Edit movie details"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleDeleteMovie(movie.id); }}
                              className="p-2 rounded-lg text-red-500 hover:bg-red-900/20 transition-colors"
                              title="Delete movie and all its shows"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Show timings */}
                        {isOpen && (
                          <div className="border-t border-neutral-800/60 bg-neutral-950/40">
                            {movieShows.length === 0 ? (
                              <p className="text-xs text-neutral-700 py-4 text-center font-inter">No shows scheduled for this movie.</p>
                            ) : (
                              <div className="divide-y divide-neutral-800/40">
                                {movieShows.map(show => (
                                  <div
                                    key={show.id}
                                    className="flex items-center justify-between px-5 py-2.5"
                                  >
                                    <div className="flex items-center gap-4 min-w-0">
                                      {/* Date + time */}
                                      <div className="flex-shrink-0 text-center w-16">
                                        <p className="text-[10px] font-black text-white">{show.date.substring(5)}</p>
                                        <p className="text-[10px] text-neutral-500 font-inter">{show.startTime}</p>
                                      </div>
                                      <div className="w-px h-8 bg-neutral-800 flex-shrink-0" />
                                      {/* Screen + theatre */}
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">
                                          Screen {show.screenNumber}
                                          <span className="text-[10px] font-normal text-neutral-500 ml-1.5">({show.screenType})</span>
                                          <span className="text-[10px] font-normal text-neutral-500 ml-1.5">{show.language || show.movieLanguage}</span>
                                          <span className="text-neutral-600 mx-1.5">·</span>
                                          {show.theatreName}
                                        </p>
                                        <p className="text-[10px] text-neutral-600 font-inter truncate">
                                          {show.cityName} &nbsp;·&nbsp; Rs {show.priceRegular} / {show.pricePremium} / {show.priceRecliner}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <StatusPill status={show.status} />
                                      <button
                                        onClick={() => handleDeleteShow(show.id)}
                                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-900/20 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── ADD THEATRE ─────────────────────────────────────────────── */}
            <div className={cardDark}>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Add New Theatre
              </h2>
              <form onSubmit={handleAddTheatre} className="grid grid-cols-1 md:grid-cols-3 gap-4 font-inter text-xs">
                <div>
                  <FieldLabel>City</FieldLabel>
                  <select className={selectCls} required value={newTheatreCityId} onChange={e => setNewTheatreCityId(e.target.value)}>
                    <option value="">— Select City —</option>
                    {cityList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Theatre Name</FieldLabel>
                  <input className={inputCls} required placeholder="e.g. PVR IMAX Orion" value={newTheatreName} onChange={e => setNewTheatreName(e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Address</FieldLabel>
                  <input className={inputCls} required placeholder="Street, Area, City" value={newTheatreAddress} onChange={e => setNewTheatreAddress(e.target.value)} />
                </div>
                <GoldBtn type="submit" className="md:col-span-3 w-fit">
                  <Plus className="w-4 h-4" /> Add Theatre
                </GoldBtn>
              </form>
            </div>

            {/* ── BULK ADD SCREENS ─────────────────────────────────────────── */}
            <div className={cardDark}>
              <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-accent" /> Add Screens to Theatre
              </h2>
              <p className="text-[10px] text-neutral-600 font-inter mb-4">
                Adds multiple screens at once, auto-numbered from the next available slot. Each screen gets 60 seats (Regular / Premium / Recliner).
              </p>
              <form onSubmit={handleBulkScreens} className="grid grid-cols-1 md:grid-cols-4 gap-4 font-inter text-xs">
                <div className="md:col-span-2">
                  <FieldLabel>Theatre</FieldLabel>
                  <select className={selectCls} required value={bulkScreenTheatreId} onChange={e => setBulkScreenTheatreId(e.target.value)}>
                    <option value="">— Select Theatre —</option>
                    {theatreList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Number of Screens</FieldLabel>
                  <select className={selectCls} value={bulkScreenCount} onChange={e => setBulkScreenCount(e.target.value)}>
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} screen{n !== 1 ? "s" : ""}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Screen Type</FieldLabel>
                  <select className={selectCls} value={bulkScreenType} onChange={e => setBulkScreenType(e.target.value)}>
                    <option value="2D">2D</option>
                    <option value="3D">3D</option>
                    <option value="IMAX">IMAX</option>
                  </select>
                </div>
                <GoldBtn type="submit" className="md:col-span-4 w-fit">
                  <Plus className="w-4 h-4" /> Add {bulkScreenCount} Screen{parseInt(bulkScreenCount) !== 1 ? "s" : ""}
                </GoldBtn>
              </form>
            </div>

          </div>
        )}

      </div>

      {/* ── EDIT MOVIE MODAL ────────────────────────────────────────────── */}
      {editingMovie && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)" }}
        onClick={e => { if (e.target === e.currentTarget) setEditingMovie(null); }}
      >
        <div
          className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl"
          style={{ background: "#0d0d0d", border: "1px solid rgba(212,175,55,0.25)", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-900">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" /> Edit Movie
              <span className="text-neutral-600 font-normal text-sm">— {editingMovie.title}</span>
            </h2>
            <button onClick={() => setEditingMovie(null)} className="p-2 rounded-xl hover:bg-neutral-900 transition-colors text-neutral-500">
              <X className="w-4 h-4" />
            </button>
          </div>
          {err && (
            <div className="mx-6 mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400 font-inter">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {err}
            </div>
          )}
          <form onSubmit={handleUpdateMovie} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 font-inter text-xs">
            <div>
              <FieldLabel>Movie Title</FieldLabel>
              <input className={inputCls} required value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Genre Tags</FieldLabel>
              <input className={inputCls} required placeholder="e.g. Action/Thriller" value={editGenre} onChange={e => setEditGenre(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Synopsis</FieldLabel>
              <textarea className={inputCls} required rows={4} value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ resize: "none" }} />
            </div>
            <div>
              <FieldLabel>Languages</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {MOVIE_LANGUAGES.map(lang => {
                  const sel = editLangs.includes(lang);
                  return (
                    <label key={lang} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${sel ? "border-[#d4af37] bg-[#d4af37]/10 text-white" : "border-neutral-800 bg-neutral-950 text-neutral-500 hover:border-neutral-700"}`}>
                      <input type="checkbox" checked={sel} onChange={() => toggleEditLanguage(lang)} className="w-3.5 h-3.5 rounded" />
                      <span className="font-bold">{lang}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <FieldLabel>Duration (Minutes)</FieldLabel>
                <input className={inputCls} type="number" required value={editDur} onChange={e => setEditDur(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Censor Rating</FieldLabel>
                <select className={selectCls} value={editRating} onChange={e => setEditRating(e.target.value)}>
                  <option value="U">U (Universal)</option>
                  <option value="UA">UA (Parental Guidance)</option>
                  <option value="A">A (Adults Only)</option>
                </select>
              </div>
              <div>
                <FieldLabel>Rating Score (e.g. 8.2)</FieldLabel>
                <input className={inputCls} type="number" step="0.1" min="0" max="10" value={editRatingValue} onChange={e => setEditRatingValue(e.target.value)} placeholder="0.0 – 10.0" />
              </div>
              <div>
                <FieldLabel>Release Date</FieldLabel>
                <input className={inputCls} type="date" required value={editRel} onChange={e => setEditRel(e.target.value)} />
              </div>
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Poster Image URL</FieldLabel>
              <input className={inputCls} value={editPoster} onChange={e => setEditPoster(e.target.value)} placeholder="Paste poster URL" />
              {editPoster && (
                <img src={editPoster} alt="Preview" loading="lazy" decoding="async"
                  className="mt-3 w-24 h-36 object-cover rounded-lg border border-neutral-800"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
            </div>
            <div className="md:col-span-2">
              <FieldLabel>YouTube Trailer URL</FieldLabel>
              <input className={inputCls} value={editTrailer} onChange={e => setEditTrailer(e.target.value)} placeholder="e.g. https://www.youtube.com/watch?v=..." />
              {editTrailer && (
                <a href={editTrailer} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold"
                  style={{ color: "#d4af37" }}>
                  ▶ Preview trailer
                </a>
              )}
            </div>
            <div className="flex items-center gap-3.5">
              <input type="checkbox" id="editShowing" checked={editShowing} onChange={e => setEditShowing(e.target.checked)} className="w-4 h-4 rounded" />
              <label htmlFor="editShowing" className="font-bold text-white cursor-pointer text-xs">Now Showing</label>
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2 border-t border-neutral-900">
              <GhostBtn type="button" onClick={() => setEditingMovie(null)}>Cancel</GhostBtn>
              <GoldBtn type="submit" className="flex-1 justify-center">Save Changes</GoldBtn>
            </div>
          </form>
        </div>
      </div>
    )}
    </div>
  );
};
