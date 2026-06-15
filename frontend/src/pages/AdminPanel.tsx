import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import {
  LayoutDashboard, Film, Calendar, PlusCircle, AlertCircle,
  CheckCircle, BarChart3, LineChart, PieChart, Users, Wallet,
  Compass, Trash2, Search, MapPin, ChevronRight, ChevronDown,
  Check, X, Plus, Layers, Pencil, Building2, Monitor, CalendarX,
  RefreshCw, Moon, Sparkles,
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
  dashboard: "Analytics", "movie-hub": "Movie Hub",
  "add-show": "Schedule Show", manage: "Manage Data", "movie-nights": "Movie Nights",
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
  const [thisMonth, setThisMonth] = useState<any>(null);

  // ── Shared data ──────────────────────────────────────────────────────────────
  const [movies, setMovies] = useState<AdminMovie[]>([]);
  const [shows, setShows] = useState<AdminShow[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [theatreList, setTheatreList] = useState<AdminTheatre[]>([]);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"dashboard" | "movie-hub" | "add-show" | "manage" | "movie-nights">("dashboard");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // ── Movie Hub / TMDB Sync ─────────────────────────────────────────────────────
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ upserted: number; skipped: number; total: number } | null>(null);

  // ── Movie Nights analytics ────────────────────────────────────────────────────
  const [mnAnalytics, setMnAnalytics] = useState<{ total: number; byStatus: Record<string, number>; recent: any[] } | null>(null);

  const fetchMnAnalytics = async () => {
    try {
      const res = await api.get("/admin/movie-nights");
      setMnAnalytics(res.data);
    } catch (e) { console.error(e); }
  };

  const handleSyncMovies = async () => {
    setSyncLoading(true); setSyncResult(null); setMsg(""); setErr("");
    try {
      // /api/tmdb is a Vercel serverless function — proxies TMDB from Vercel's
      // US servers, bypassing India ISP blocks on themoviedb.org
      const tmdbFetch = async (path: string) => {
        const r = await fetch(`/api/tmdb?path=${encodeURIComponent(path)}`);
        if (!r.ok) throw new Error(`TMDB proxy ${r.status}`);
        return r.json();
      };

      const npData = await tmdbFetch("/movie/now_playing?region=IN&language=en-US&page=1");
      const nowPlaying: any[] = npData.results ?? [];
      if (!nowPlaying.length) throw new Error("TMDB returned no movies");

      // Fetch details sequentially to avoid TMDB rate limits
      const details: Record<string, any> = {};
      for (const m of nowPlaying) {
        try {
          const d = await tmdbFetch(`/movie/${m.id}?append_to_response=release_dates,videos`);
          const { runtime, release_dates, videos } = d;
          details[String(m.id)] = { runtime, release_dates, videos };
        } catch {
          // skip — backend will use defaults
        }
      }

      const res = await api.post("/admin/sync-movies", { nowPlaying, details });
      setSyncResult(res.data);
      setMsg(`Sync complete — ${res.data.upserted} movies updated from TMDB.`);
      fetchAll();
    } catch (error: any) {
      const d = error.response?.data;
      setErr(d?.error ?? error.message ?? "TMDB sync failed");
      if (d?.detail) console.error("Sync detail:", d.detail);
    } finally {
      setSyncLoading(false);
    }
  };

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
  // Step 3 – Schedule
  const [wLanguageTimes, setWLanguageTimes] = useState<Array<{ language: string; times: string[] }>>([
    { language: "Hindi", times: ["10:00 AM", "02:00 PM"] }
  ]);
  const [wActiveLangTab, setWActiveLangTab] = useState(0);
  const [wMode, setWMode] = useState<"auto7" | "custom">("auto7");
  const [wCustomDate, setWCustomDate] = useState(getToday());
  const [wScreenTypes, setWScreenTypes] = useState<string[]>(["2D", "3D", "IMAX"]);
  const [wPrices, setWPrices] = useState({
    "2D":   { reg: "150", prem: "250", rec: "450" },
    "3D":   { reg: "200", prem: "320", rec: "550" },
    "IMAX": { reg: "280", prem: "420", rec: "700" },
  });
  const setWPrice = (type: "2D"|"3D"|"IMAX", field: "reg"|"prem"|"rec", val: string) =>
    setWPrices(p => ({ ...p, [type]: { ...p[type], [field]: val } }));
  const [wLoading, setWLoading] = useState(false);

  // ── Manage tab ────────────────────────────────────────────────────────────────
  const [manageSearch, setManageSearch] = useState("");
  const [manageCityFilter, setManageCityFilter] = useState<number | "">("");
  const [expandedMovies, setExpandedMovies] = useState<Set<number>>(new Set());
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [expandedTheatres, setExpandedTheatres] = useState<Set<number>>(new Set());
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
  const [screenList, setScreenList] = useState<any[]>([]);
  const [newCityName, setNewCityName] = useState("");

  // ── Edit Show Modal ───────────────────────────────────────────────────────────
  const [editingShow, setEditingShow] = useState<AdminShow | null>(null);
  const [editShowDate, setEditShowDate] = useState("");
  const [editShowTime, setEditShowTime] = useState("");
  const [editShowPriceReg, setEditShowPriceReg] = useState("");
  const [editShowPricePrem, setEditShowPricePrem] = useState("");
  const [editShowPriceRec, setEditShowPriceRec] = useState("");

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
      setThisMonth(res.data.thisMonth || null);
    } catch (e) { console.error(e); }
  };

  const fetchAll = async () => {
    const [moviesRes, showsRes, citiesRes, theatresRes, screensRes] = await Promise.allSettled([
      api.get("/admin/movies"),
      api.get("/admin/shows"),
      api.get("/admin/cities"),
      api.get("/admin/theatres"),
      api.get("/admin/screens"),
    ]);
    if (moviesRes.status === "fulfilled")   setMovies(moviesRes.value.data || []);
    if (showsRes.status === "fulfilled")    setShows(showsRes.value.data || []);
    if (citiesRes.status === "fulfilled")   setCityList(citiesRes.value.data || []);
    if (theatresRes.status === "fulfilled") setTheatreList(theatresRes.value.data || []);
    if (screensRes.status === "fulfilled")  setScreenList(screensRes.value.data || []);
    if (citiesRes.status === "rejected")    console.error("Cities load failed:", citiesRes.reason);
    if (showsRes.status === "rejected")     console.error("Shows load failed:", showsRes.reason);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "admin") { navigate("/"); return; }
    fetchStats();
    fetchAll();
  }, [user, authLoading]);

  useEffect(() => {
    if (activeTab === "movie-nights") fetchMnAnalytics();
  }, [activeTab]);

  // Cascade: city → theatres
  useEffect(() => {
    if (!wCity) { setWTheatres([]); setWTheatre(null); setWScreens([]); setWScreen(null); return; }
    setLoadingTheatres(true);
    api.get(`/admin/theatres?cityId=${wCity.id}`)
      .then(r => setWTheatres(r.data || []))
      .catch(() => setWTheatres([]))
      .finally(() => setLoadingTheatres(false));
  }, [wCity]);

  // Cascade: theatre → screens (auto-select first screen so we never blast all screens)
  useEffect(() => {
    if (!wTheatre) { setWScreens([]); setWScreen(null); return; }
    setLoadingScreens(true);
    api.get(`/admin/screens?theatreId=${wTheatre.id}`)
      .then(r => {
        const list = r.data || [];
        setWScreens(list);
        setWScreen(list[0] ?? null);
      })
      .catch(() => setWScreens([]))
      .finally(() => setLoadingScreens(false));
  }, [wTheatre]);

  // ─── WIZARD HANDLERS ───────────────────────────────────────────────────────
  const resetWizard = () => {
    setWStep(1); setWCity(null); setWTheatre(null); setWScreen(null);
    setWMovie(null); setWMovieSearch("");
    setWLanguageTimes([{ language: "Hindi", times: ["10:00 AM", "02:00 PM"] }]);
    setWActiveLangTab(0);
    setWScreenTypes(["2D", "3D", "IMAX"]);
    setWMode("auto7"); setWCustomDate(getToday());
    setWPrices({ "2D": { reg: "150", prem: "250", rec: "450" }, "3D": { reg: "200", prem: "320", rec: "550" }, "IMAX": { reg: "280", prem: "420", rec: "700" } });
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
        languageTimes: wLanguageTimes.map(lt => ({ language: lt.language, startTimes: lt.times })),
        screenTypes: wScreenTypes,
        pricesByType: {
          "2D":   { regular: parseInt(wPrices["2D"].reg)||150,   premium: parseInt(wPrices["2D"].prem)||250,   recliner: parseInt(wPrices["2D"].rec)||450   },
          "3D":   { regular: parseInt(wPrices["3D"].reg)||200,   premium: parseInt(wPrices["3D"].prem)||320,   recliner: parseInt(wPrices["3D"].rec)||550   },
          "IMAX": { regular: parseInt(wPrices["IMAX"].reg)||280, premium: parseInt(wPrices["IMAX"].prem)||420, recliner: parseInt(wPrices["IMAX"].rec)||700  },
        },
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

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(""); setErr("");
    if (!newCityName.trim()) { setErr("City name is required."); return; }
    try {
      await api.post("/admin/cities", { name: newCityName.trim() });
      setMsg(`City "${newCityName.trim()}" added.`);
      setNewCityName("");
      fetchAll();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Failed to add city.");
    }
  };

  const handleDeleteTheatre = async (id: number, name: string) => {
    if (!window.confirm(`Delete theatre "${name}" and all its screens & shows?`)) return;
    try {
      await api.delete(`/admin/theatres/${id}`);
      setMsg("Theatre deleted.");
      fetchAll();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Failed to delete theatre.");
    }
  };

  const handleDeleteScreen = async (id: number, theatreName: string, num: number) => {
    if (!window.confirm(`Delete Screen ${num} from "${theatreName}"? All its shows will also be deleted.`)) return;
    try {
      await api.delete(`/admin/screens/${id}`);
      setMsg("Screen deleted.");
      fetchAll();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Failed to delete screen.");
    }
  };

  const openEditShow = (show: AdminShow) => {
    setEditingShow(show);
    setEditShowDate(show.date);
    setEditShowTime(show.startTime);
    setEditShowPriceReg(String(show.priceRegular));
    setEditShowPricePrem(String(show.pricePremium));
    setEditShowPriceRec(String(show.priceRecliner));
    setErr("");
  };

  const handleUpdateShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShow) return;
    setMsg(""); setErr("");
    try {
      await api.put(`/admin/shows/${editingShow.id}`, {
        date: editShowDate,
        startTime: editShowTime,
        priceRegular: parseInt(editShowPriceReg),
        pricePremium: parseInt(editShowPricePrem),
        priceRecliner: parseInt(editShowPriceRec),
      });
      setMsg("Show updated.");
      setEditingShow(null);
      fetchAll();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Failed to update show.");
    }
  };

  const handleDeleteAllShows = async (movieId: number, movieTitle: string) => {
    if (!window.confirm(`Delete ALL shows for "${movieTitle}"? Bookings are preserved.`)) return;
    try {
      await api.delete("/admin/shows/bulk", { data: { scope: "movie", scopeId: movieId } });
      setMsg(`All shows for "${movieTitle}" deleted.`);
      fetchAll();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Failed to delete shows.");
    }
  };

  const handleAddTheatre = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(""); setErr("");
    const parsedCityId = parseInt(newTheatreCityId);
    if (!newTheatreName.trim() || !newTheatreAddress.trim() || isNaN(parsedCityId)) {
      setErr("Please fill in all fields and select a city.");
      return;
    }
    try {
      await api.post("/admin/theatres", {
        name: newTheatreName.trim(),
        cityId: parsedCityId,
        address: newTheatreAddress.trim(),
      });
      setMsg("Theatre added. Add screens to it before scheduling shows.");
      setNewTheatreName(""); setNewTheatreAddress(""); setNewTheatreCityId("");
      fetchAll();
    } catch (error: any) {
      setErr(error.response?.data?.error || "Failed to add theatre. Please try again.");
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

  // ─── LANGUAGE-TIME HELPERS ─────────────────────────────────────────────────
  const addWLanguage = (lang: string) => {
    if (wLanguageTimes.some(lt => lt.language === lang)) return;
    const newIndex = wLanguageTimes.length;
    setWLanguageTimes(prev => [...prev, { language: lang, times: ["10:00 AM", "02:00 PM"] }]);
    setWActiveLangTab(newIndex);
  };

  const removeWLanguage = (index: number) => {
    setWLanguageTimes(prev => prev.filter((_, i) => i !== index));
    setWActiveLangTab(prev => (prev >= index && prev > 0 ? prev - 1 : prev));
  };

  const addAllWLanguages = () => {
    const existing = new Set(wLanguageTimes.map(lt => lt.language));
    const toAdd = movieLanguageOptions.filter(l => !existing.has(l));
    if (toAdd.length === 0) return;
    setWLanguageTimes(prev => [...prev, ...toAdd.map(l => ({ language: l, times: ["10:00 AM", "02:00 PM"] }))]);
  };

  const toggleLangTime = (langIndex: number, time: string) => {
    setWLanguageTimes(prev => prev.map((lt, i) => {
      if (i !== langIndex) return lt;
      const inTimes = lt.times.includes(time);
      const times = inTimes
        ? (lt.times.length > 2 ? lt.times.filter(t => t !== time) : lt.times)
        : [...lt.times, time];
      return { ...lt, times };
    }));
  };

  // ─── ESTIMATED SHOWS COUNT ─────────────────────────────────────────────────
  const estimatedShows = useMemo(() => {
    const days = wMode === "auto7" ? 7 : 1;
    // When All Cities: we don't have exact screen counts, show per-city estimate × city count
    if (!wCity) return `${cityList.length}+ cities`;
    const screensCount = wScreen ? 1 : wTheatre ? wScreens.length : wTheatres.length || 1;
    const totalSlots = wLanguageTimes.reduce((sum, lt) => sum + lt.times.length, 0);
    return days * totalSlots * screensCount;
  }, [wMode, wScreen, wTheatre, wScreens, wCity, wTheatres, wLanguageTimes, cityList]);

  // ─── CARD ─────────────────────────────────────────────────────────────────
  const card = "p-6 rounded-2xl border border-neutral-900"
  const cardDark = `${card} bg-[#0d0d0d]`;

  return (
    <div className="min-h-screen bg-background text-white font-poppins flex items-start">

      {/* ── SIDEBAR ───────────────────────────────────────────────────────── */}
      <aside
        className="w-56 shrink-0 sticky top-[68px] max-h-[calc(100vh-68px)] overflow-y-auto flex flex-col"
        style={{ background: "#090909", borderRight: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="px-4 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl" style={{ background: "linear-gradient(135deg, #d4af37, #f4d03f)" }}>
              <Monitor className="w-4 h-4 text-black" />
            </div>
            <div>
              <p className="text-[9px] font-black tracking-[0.2em] uppercase" style={{ color: "#d4af37" }}>CineCircle</p>
              <p className="text-sm font-black text-white leading-none mt-0.5">Admin</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {([
            { id: "dashboard"    as const, icon: <LayoutDashboard className="w-4 h-4" />, label: "Analytics"     },
            { id: "movie-hub"    as const, icon: <Film className="w-4 h-4" />,             label: "Movie Hub"     },
            { id: "movie-nights" as const, icon: <Moon className="w-4 h-4" />,             label: "Movie Nights"  },
            { id: "add-show"     as const, icon: <Calendar className="w-4 h-4" />,         label: "Schedule Show" },
            { id: "manage"       as const, icon: <Layers className="w-4 h-4" />,           label: "Manage Data"   },
          ]).map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setMsg(""); setErr(""); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
              style={activeTab === id
                ? { background: "rgba(212,175,55,0.09)", borderLeft: "2px solid #d4af37", color: "#fff", paddingLeft: "10px" }
                : { background: "transparent", borderLeft: "2px solid transparent", color: "rgba(255,255,255,0.35)", paddingLeft: "10px" }
              }
            >
              <span style={{ color: activeTab === id ? "#d4af37" : "rgba(255,255,255,0.28)" }}>{icon}</span>
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <p className="text-[9px] font-inter text-center tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.12)" }}>Operations v1</p>
        </div>
      </aside>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 px-8 py-10 pb-20 space-y-8">

        {/* ── PAGE TITLE ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-5 border-b border-neutral-900">
          <div>
            <h1 className="text-2xl font-black text-white tracking-wider">{TAB_LABELS[activeTab]}</h1>
            <p className="text-[11px] text-neutral-500 font-inter mt-1">CineCircle · Admin Console</p>
          </div>
          <span className="text-[10px] text-neutral-700 font-inter font-semibold tracking-wider">{getToday()}</span>
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
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[0,1,2,3].map(i => (
                <div key={i} className={`${cardDark} animate-pulse`}>
                  <div className="w-10 h-10 rounded-xl bg-neutral-800 mb-4" />
                  <div className="w-24 h-2.5 rounded-full bg-neutral-800 mb-3" />
                  <div className="w-16 h-6 rounded-full bg-neutral-800" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0,1,2,3].map(i => (
                <div key={i} className={`${cardDark} animate-pulse h-52`} />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── KPI CARDS ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  icon: <Wallet className="w-5 h-5" />, label: "Total Revenue",
                  value: `₹${(kpi.totalRevenue / 1000).toFixed(1)}K`,
                  sub: `Avg ₹${(kpi as any).avgRevenue?.toLocaleString() || "—"}/booking`,
                  gradient: "from-amber-500/10 to-amber-900/5", iconColor: "#d4af37", border: "rgba(212,175,55,0.18)"
                },
                {
                  icon: <Film className="w-5 h-5" />, label: "Total Bookings",
                  value: kpi.totalBookings.toLocaleString(),
                  sub: `${charts.groupBookingUsage[1]?.value || 0} via Movie Nights`,
                  gradient: "from-blue-500/10 to-blue-900/5", iconColor: "#60a5fa", border: "rgba(96,165,250,0.18)"
                },
                {
                  icon: <Users className="w-5 h-5" />, label: "Registered Users",
                  value: kpi.totalUsers.toLocaleString(),
                  sub: "All time signups",
                  gradient: "from-purple-500/10 to-purple-900/5", iconColor: "#a78bfa", border: "rgba(167,139,250,0.18)"
                },
                {
                  icon: <Moon className="w-5 h-5" />, label: "Group Rooms",
                  value: kpi.activeGroupRooms.toLocaleString(),
                  sub: "Collaborative sessions",
                  gradient: "from-green-500/10 to-green-900/5", iconColor: "#4ade80", border: "rgba(74,222,128,0.18)"
                },
              ].map(({ icon, label, value, sub, gradient, iconColor, border }) => (
                <div
                  key={label}
                  className={`p-5 rounded-2xl bg-gradient-to-br ${gradient} relative overflow-hidden`}
                  style={{ border: `1px solid ${border}` }}
                >
                  <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10" style={{ background: iconColor }} />
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-black tracking-widest uppercase text-neutral-500">{label}</span>
                    <span style={{ color: iconColor }}>{icon}</span>
                  </div>
                  <strong className="text-2xl font-black text-white block">{value}</strong>
                  <span className="text-[10px] text-neutral-600 font-inter mt-1 block">{sub}</span>
                </div>
              ))}
            </div>

            {/* ── THIS MONTH SECTION ── */}
            {thisMonth && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid rgba(212,175,55,0.2)", background: "linear-gradient(160deg,#0f0e09,#0b0b0b)" }}
              >
                {/* Header */}
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{ borderBottom: "1px solid rgba(212,175,55,0.1)", background: "rgba(212,175,55,0.04)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#d4af37" }} />
                    <h3 className="font-black text-sm text-white">{thisMonth.label}</h3>
                    <span
                      className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
                      style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)", color: "#d4af37" }}
                    >
                      This Month
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-600 font-inter">vs last month</span>
                </div>

                <div className="p-6 space-y-6">
                  {/* KPI row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      {
                        label: "Revenue",
                        value: `₹${thisMonth.revenue >= 1000 ? (thisMonth.revenue / 1000).toFixed(1) + "K" : thisMonth.revenue}`,
                        delta: thisMonth.revenueDelta,
                        color: "#d4af37",
                      },
                      {
                        label: "Bookings",
                        value: thisMonth.bookings,
                        delta: thisMonth.bookingsDelta,
                        color: "#60a5fa",
                      },
                      {
                        label: "Avg / Booking",
                        value: `₹${thisMonth.avgRevenue}`,
                        delta: null,
                        color: "#a78bfa",
                      },
                      {
                        label: "Active Days",
                        value: thisMonth.dailyActivity.filter((d: any) => d.bookings > 0).length,
                        delta: null,
                        color: "#4ade80",
                      },
                    ].map(({ label, value, delta, color }) => (
                      <div
                        key={label}
                        className="p-4 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mb-2">{label}</p>
                        <p className="text-xl font-black text-white">{value}</p>
                        {delta !== null && (
                          <p
                            className="text-[10px] font-bold mt-1 flex items-center gap-1"
                            style={{ color: delta >= 0 ? "#4ade80" : "#f87171" }}
                          >
                            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs last month
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Daily activity this month */}
                    <div
                      className="md:col-span-2 p-4 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-4">Daily Bookings This Month</p>
                      {thisMonth.dailyActivity.length === 0 ? (
                        <p className="text-xs text-neutral-700 font-inter py-4 text-center">No bookings yet this month.</p>
                      ) : (
                        <div className="flex items-end gap-1.5 h-28">
                          {thisMonth.dailyActivity.map((d: any, i: number) => {
                            const maxV = Math.max(...thisMonth.dailyActivity.map((x: any) => x.revenue), 1);
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                <div
                                  className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-inter px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                                >
                                  ₹{d.revenue} · {d.bookings}
                                </div>
                                <div className="w-full flex items-end" style={{ height: 80 }}>
                                  <div
                                    className="w-full rounded-t transition-all"
                                    style={{
                                      height: `${Math.max(3, (d.revenue / maxV) * 100)}%`,
                                      background: d.bookings > 0 ? "rgba(212,175,55,0.6)" : "rgba(255,255,255,0.04)",
                                    }}
                                  />
                                </div>
                                <span className="text-[7px] text-neutral-700 font-inter">{d.date.substring(8)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Top movies this month */}
                    <div
                      className="p-4 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-4">Top Movies</p>
                      {thisMonth.topMovies.length === 0 ? (
                        <p className="text-xs text-neutral-700 font-inter py-4 text-center">No data yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {thisMonth.topMovies.map((m: any, i: number) => {
                            const maxV = Math.max(...thisMonth.topMovies.map((x: any) => x.revenue), 1);
                            const medals = ["🥇", "🥈", "🥉", "4", "5"];
                            return (
                              <div key={i} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-inter">
                                  <span className="text-white font-semibold truncate flex items-center gap-1.5 max-w-[65%]">
                                    <span>{medals[i]}</span>
                                    <span className="truncate">{m.title}</span>
                                  </span>
                                  <span className="text-neutral-500 tabular-nums flex-shrink-0">₹{m.revenue}</span>
                                </div>
                                <div className="w-full h-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${(m.revenue / maxV) * 100}%`, background: "#d4af37" }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── MONTHLY REVENUE BAR CHART ── */}
            <div className={cardDark}>
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-neutral-900">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" style={{ color: "#d4af37" }} /> Monthly Revenue
                </h3>
                <span className="text-[10px] text-neutral-600 font-inter">Last 6 months</span>
              </div>
              <div className="flex items-end gap-3 h-44 pt-2">
                {(charts.monthlyRevenue || []).map((m: any, idx: number) => {
                  const maxVal = Math.max(...(charts.monthlyRevenue || []).map((x: any) => x.revenue), 1);
                  const pct = Math.max(4, (m.revenue / maxVal) * 100);
                  const isLast = idx === (charts.monthlyRevenue || []).length - 1;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[9px] text-neutral-500 font-inter opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        ₹{m.revenue.toLocaleString()}
                      </span>
                      <div className="w-full rounded-t-lg overflow-hidden flex items-end" style={{ height: 120 }}>
                        <div
                          className="w-full rounded-t-lg transition-all duration-700"
                          style={{
                            height: `${pct}%`,
                            background: isLast
                              ? "linear-gradient(180deg,#f4d03f,#d4af37)"
                              : "rgba(212,175,55,0.35)",
                            boxShadow: isLast ? "0 0 12px rgba(212,175,55,0.3)" : "none",
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-inter text-neutral-600">{m.label}</span>
                      <span className="text-[8px] font-inter text-neutral-700">{m.bookings} tickets</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ── POPULAR MOVIES ── */}
              <div className={cardDark}>
                <h3 className="font-bold text-sm text-white mb-5 flex items-center gap-2 border-b border-neutral-900 pb-3">
                  <Film className="w-4 h-4" style={{ color: "#d4af37" }} /> Top Movies by Revenue
                </h3>
                <div className="space-y-4">
                  {charts.popularMovies.slice(0, 5).map((p: any, idx: number) => {
                    const maxVal = Math.max(...charts.popularMovies.map((x: any) => x.revenue), 1);
                    const medals = ["🥇", "🥈", "🥉", "4.", "5."];
                    return (
                      <div key={idx} className="space-y-1.5 font-inter text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-semibold flex items-center gap-2">
                            <span className="text-sm">{medals[idx]}</span>{p.title}
                          </span>
                          <span className="text-neutral-500 tabular-nums">₹{p.revenue.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${(p.revenue / maxVal) * 100}%`, background: idx === 0 ? "#d4af37" : "rgba(212,175,55,0.4)" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── BOOKING MIX (GROUP VS INDIVIDUAL) ── */}
              <div className={cardDark}>
                <h3 className="font-bold text-sm text-white mb-5 flex items-center gap-2 border-b border-neutral-900 pb-3">
                  <PieChart className="w-4 h-4" style={{ color: "#d4af37" }} /> Booking Split
                </h3>
                <div className="space-y-5 pt-2">
                  {charts.groupBookingUsage.map((u: any, idx: number) => {
                    const totalVal = charts.groupBookingUsage.reduce((s: number, x: any) => s + x.value, 0) || 1;
                    const pct = Math.round((u.value / totalVal) * 100);
                    const colors = ["#d4af37", "#60a5fa"];
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-inter">
                          <span className="font-semibold" style={{ color: colors[idx] }}>{u.name}</span>
                          <span className="text-neutral-400 font-bold">{pct}% · {u.value} bookings</span>
                        </div>
                        <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: colors[idx] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-neutral-900 grid grid-cols-2 gap-3">
                    {charts.groupBookingUsage.map((u: any, idx: number) => {
                      const totalVal = charts.groupBookingUsage.reduce((s: number, x: any) => s + x.value, 0) || 1;
                      const colors = ["#d4af37", "#60a5fa"];
                      return (
                        <div key={idx} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                          <div className="text-2xl font-black" style={{ color: colors[idx] }}>
                            {Math.round((u.value / totalVal) * 100)}%
                          </div>
                          <div className="text-[9px] text-neutral-600 font-inter mt-1">{u.name}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── LOCATION BREAKDOWN ── */}
              <div className={cardDark}>
                <h3 className="font-bold text-sm text-white mb-5 flex items-center gap-2 border-b border-neutral-900 pb-3">
                  <MapPin className="w-4 h-4" style={{ color: "#d4af37" }} /> Top Locations
                </h3>
                <div className="space-y-4">
                  {charts.popularCities.slice(0, 5).map((p: any, idx: number) => {
                    const maxVal = Math.max(...charts.popularCities.map((x: any) => x.bookings), 1);
                    return (
                      <div key={idx} className="space-y-1.5 font-inter text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-semibold">{p.name}</span>
                          <span className="text-neutral-500 tabular-nums">{p.bookings} tickets</span>
                        </div>
                        <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(p.bookings / maxVal) * 100}%`, background: "rgba(167,139,250,0.6)" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── DAILY RECENT ACTIVITY ── */}
              <div className={cardDark}>
                <h3 className="font-bold text-sm text-white mb-5 flex items-center gap-2 border-b border-neutral-900 pb-3">
                  <LineChart className="w-4 h-4" style={{ color: "#d4af37" }} /> Recent Daily Activity
                </h3>
                <div className="flex items-end gap-1.5 h-32">
                  {charts.dailyBookings.slice(-14).map((p: any, idx: number) => {
                    const maxVal = Math.max(...charts.dailyBookings.map((x: any) => x.revenue), 1);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                        <div className="w-full rounded-t overflow-hidden flex items-end" style={{ height: 90 }}>
                          <div
                            className="w-full rounded-t transition-all duration-500"
                            style={{
                              height: `${Math.max(4, (p.revenue / maxVal) * 100)}%`,
                              background: "rgba(96,165,250,0.5)",
                            }}
                          />
                        </div>
                        <span className="text-[7px] text-neutral-700 font-inter">{p.date.substring(5)}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-neutral-600 font-inter mt-3 text-center">Last 14 days</p>
              </div>
            </div>
          </div>
        ))}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── MOVIE HUB ──────────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "movie-hub" && (
          <div className="space-y-8 max-w-4xl mx-auto w-full">

            {/* TMDB Sync card */}
            <div className={cardDark}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4" style={{ color: "rgba(212,175,55,0.8)" }} /> Movie Catalog
                  </h2>
                  <p className="text-xs text-neutral-500 font-inter max-w-sm">
                    Sync live data from TMDB to populate your movie library.
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleSyncMovies}
                    disabled={syncLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? "animate-spin" : ""}`} />
                    {syncLoading ? "Syncing…" : "Sync from TMDB"}
                  </button>
                </div>
              </div>
              {syncResult && (
                <div className="mt-4 flex gap-3 font-inter text-xs flex-wrap">
                  <span className="px-3 py-1.5 rounded-lg" style={{ background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.18)", color: "#d4af37" }}>
                    {syncResult.upserted} synced
                  </span>
                  <span className="px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
                    {syncResult.skipped} skipped
                  </span>
                  <span className="px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }}>
                    {syncResult.total} total
                  </span>
                </div>
              )}
            </div>

            {/* Movie catalog list */}
            <div className={cardDark}>
              <h3 className="font-semibold text-sm text-white mb-4 flex items-center gap-2 border-b border-neutral-900 pb-3">
                <Film className="w-4 h-4" style={{ color: "rgba(212,175,55,0.6)" }} /> Catalog ({movies.length} movies)
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {movies.length === 0 ? (
                  <p className="text-xs text-neutral-600 font-inter py-4 text-center">No movies yet. Run a TMDB sync or add manually below.</p>
                ) : movies.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <img src={m.posterUrl} alt={m.title} loading="lazy"
                      className="w-8 h-11 object-cover rounded-lg flex-shrink-0 bg-neutral-900"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{m.title}</p>
                      <p className="text-[10px] text-neutral-500 font-inter">{m.genre} · {m.durationMins} min · {m.rating}</p>
                    </div>
                    <StatusPill status={m.isNowShowing ? "active" : "inactive"} />
                  </div>
                ))}
              </div>
            </div>

            {/* Manual add form */}
            <div className={cardDark}>
              <h2 className="text-base font-bold mb-5 flex items-center gap-2 border-b border-neutral-900 pb-3">
                <PlusCircle className="w-4 h-4 text-primary" /> Add Movie Manually
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
                  <textarea className={inputCls} required rows={3} placeholder="Write a description..." value={movieDesc} onChange={e => setMovieDesc(e.target.value)} style={{ resize: "none" }} />
                </div>
                <div>
                  <FieldLabel>Languages</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {MOVIE_LANGUAGES.map(language => {
                      const selected = movieLangs.includes(language);
                      return (
                        <label key={language} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${selected ? "border-[#d4af37] bg-[#d4af37]/10 text-white" : "border-neutral-800 bg-neutral-950 text-neutral-500 hover:border-neutral-700"}`}>
                          <input type="checkbox" checked={selected} onChange={() => toggleMovieLanguage(language)} className="w-3.5 h-3.5 rounded" />
                          <span className="font-bold">{language}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-4">
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
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Poster Image URL</FieldLabel>
                  <input className={inputCls} type="text" value={moviePoster} onChange={e => setMoviePoster(e.target.value)} placeholder="Paste poster URL" />
                  {moviePoster && (
                    <img src={moviePoster} alt="Preview" loading="lazy" decoding="async"
                      className="mt-3 w-20 h-28 object-cover rounded-lg border border-neutral-800"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>YouTube Trailer URL (Optional)</FieldLabel>
                  <input className={inputCls} type="text" value={movieTrailer} onChange={e => setMovieTrailer(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
                  {movieTrailer && (
                    <a href={movieTrailer} target="_blank" rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold" style={{ color: "#d4af37" }}>
                      ▶ Preview trailer
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3.5 mt-1">
                  <input type="checkbox" id="showing" checked={movieShowing} onChange={e => setMovieShowing(e.target.checked)} className="w-4 h-4 rounded" />
                  <label htmlFor="showing" className="font-bold text-white cursor-pointer text-xs">Set as Now Showing</label>
                </div>
                <GoldBtn type="submit" className="md:col-span-2">Add Movie to Catalog</GoldBtn>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── MOVIE NIGHTS ANALYTICS ─────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "movie-nights" && (
          <div className="space-y-6 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500 font-inter">Live data from all Movie Night sessions.</p>
              <button
                onClick={fetchMnAnalytics}
                className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all hover:text-white"
                style={{ color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {!mnAnalytics ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[0,1,2].map(i => (
                  <div key={i} className={`${cardDark} animate-pulse`}>
                    <div className="w-16 h-2.5 rounded-full bg-neutral-800 mb-3" />
                    <div className="w-10 h-6 rounded-full bg-neutral-800" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* KPI row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Nights",      value: mnAnalytics.total },
                    { label: "Collecting Prefs",  value: mnAnalytics.byStatus["COLLECTING_PREFERENCES"] ?? 0 },
                    { label: "Recommended",       value: mnAnalytics.byStatus["RECOMMENDED"] ?? 0 },
                    { label: "Booked",            value: mnAnalytics.byStatus["BOOKED"] ?? 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-4 rounded-xl" style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</p>
                      <p className="text-2xl font-bold text-white">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Status breakdown */}
                <div className={cardDark}>
                  <h3 className="font-semibold text-sm text-white mb-4 flex items-center gap-2 border-b border-neutral-900 pb-3">
                    <BarChart3 className="w-4 h-4" style={{ color: "rgba(212,175,55,0.6)" }} /> Status Breakdown
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(mnAnalytics.byStatus).map(([status, count]) => {
                      const total = mnAnalytics.total || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={status} className="space-y-1 font-inter text-xs">
                          <div className="flex justify-between">
                            <span className="text-white font-semibold">{status.replace(/_/g, " ")}</span>
                            <span className="text-neutral-500">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "rgba(212,175,55,0.7)" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent nights */}
                <div className={cardDark}>
                  <h3 className="font-semibold text-sm text-white mb-4 flex items-center gap-2 border-b border-neutral-900 pb-3">
                    <Moon className="w-4 h-4" style={{ color: "rgba(212,175,55,0.6)" }} /> Recent Movie Nights
                  </h3>
                  <div className="space-y-2">
                    {mnAnalytics.recent.length === 0 ? (
                      <p className="text-xs text-neutral-600 font-inter py-3 text-center">No movie nights yet.</p>
                    ) : mnAnalytics.recent.map((n: any) => (
                      <div key={n.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">{n.title}</p>
                          <p className="text-[10px] text-neutral-500 font-inter">{n.memberCount} members · {new Date(n.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className="text-[9px] font-semibold uppercase tracking-wide px-2 py-1 rounded flex-shrink-0"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
                          {n.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
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
                        Screen
                        {wTheatre && !loadingScreens && <span className="text-neutral-600 normal-case font-normal ml-1">({wScreens.length} available)</span>}
                      </FieldLabel>
                      {loadingScreens ? (
                        <div className={`${inputCls} flex items-center gap-2 text-neutral-600`}>
                          <div className="w-3 h-3 border border-neutral-600 border-t-[#d4af37] rounded-full animate-spin" /> Loading screens…
                        </div>
                      ) : (
                        <>
                          <select
                            className={selectCls}
                            disabled={!wTheatre || wScreens.length === 0}
                            value={wScreen?.id ?? ""}
                            onChange={e => {
                              const found = wScreens.find((s: any) => s.id === parseInt(e.target.value));
                              setWScreen(found ?? null);
                            }}
                          >
                            {wScreens.map((s: any) => <option key={s.id} value={s.id}>Screen {s.number} ({s.type})</option>)}
                          </select>
                          {!wTheatre && (
                            <p className="mt-1.5 text-[10px] text-neutral-600 font-inter">
                              Select a theatre first to pick a specific screen.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* Screen type filter */}
                <div>
                  <FieldLabel>Screen Types to Schedule</FieldLabel>
                  <div className="flex gap-2">
                    {(["2D", "3D", "IMAX"] as const).map(type => {
                      const active = wScreenTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setWScreenTypes(prev =>
                            active ? prev.filter(t => t !== type) : [...prev, type]
                          )}
                          className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                          style={active
                            ? { background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000" }
                            : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }
                          }
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                  {wScreenTypes.length === 0 && (
                    <p className="mt-1.5 text-[10px] text-red-400 font-inter">Select at least one screen type.</p>
                  )}
                  <p className="mt-1.5 text-[10px] text-neutral-600 font-inter">
                    Only screens matching selected types will receive shows.
                  </p>
                </div>

                <GoldBtn disabled={wScreenTypes.length === 0} onClick={() => setWStep(2)}>
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
                          const firstLang = movie.language.split(",")[0]?.trim() || "Hindi";
                          setWLanguageTimes([{ language: firstLang, times: ["10:00 AM", "02:00 PM"] }]);
                          setWActiveLangTab(0);
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
                {/* Languages & Show Times */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <FieldLabel>Languages &amp; Show Times</FieldLabel>
                    {movieLanguageOptions.length > 1 && (
                      <button
                        onClick={addAllWLanguages}
                        disabled={movieLanguageOptions.every(l => wLanguageTimes.some(lt => lt.language === l))}
                        className="text-[10px] font-black px-3 py-1.5 rounded-lg transition-all disabled:opacity-30"
                        style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: "#d4af37" }}
                      >
                        All Languages
                      </button>
                    )}
                  </div>

                  {/* Language tabs */}
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    {wLanguageTimes.map((lt, i) => (
                      <button
                        key={i}
                        onClick={() => setWActiveLangTab(i)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all"
                        style={wActiveLangTab === i
                          ? { background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000" }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }
                        }
                      >
                        {lt.language || "Language"}
                        <span style={{ opacity: 0.65 }}>({lt.times.length})</span>
                        {wLanguageTimes.length > 1 && (
                          <X className="w-3 h-3 ml-0.5" onClick={e => { e.stopPropagation(); removeWLanguage(i); }} />
                        )}
                      </button>
                    ))}
                    {movieLanguageOptions.filter(l => !wLanguageTimes.some(lt => lt.language === l)).length > 0 && (
                      <select
                        className={`${selectCls} w-auto min-w-[140px]`}
                        value=""
                        onChange={e => { if (e.target.value) { addWLanguage(e.target.value); (e.target as HTMLSelectElement).value = ""; } }}
                      >
                        <option value="" style={{ background: "#0a0a0a" }}>+ Add Language</option>
                        {movieLanguageOptions
                          .filter(l => !wLanguageTimes.some(lt => lt.language === l))
                          .map(l => <option key={l} value={l} style={{ background: "#0a0a0a" }}>{l}</option>)
                        }
                      </select>
                    )}
                  </div>

                  {/* Active language's time picker */}
                  {wLanguageTimes.map((lt, i) => i !== wActiveLangTab ? null : (
                    <div key={i} className="space-y-2.5">
                      <p className="text-[10px] font-inter text-neutral-600 mb-2">
                        Show times for <span className="text-white font-bold">{lt.language}</span>
                        <span className="ml-2" style={{ color: "#d4af37" }}>{lt.times.length} selected</span>
                      </p>
                      {([
                        { label: "Late Night", hours: [0,1,2,3,4,5] },
                        { label: "Morning",    hours: [6,7,8,9,10,11] },
                        { label: "Afternoon",  hours: [12,13,14,15,16,17] },
                        { label: "Evening",    hours: [18,19,20,21,22,23] },
                      ] as { label: string; hours: number[] }[]).map(({ label, hours }) => {
                        const to24 = (t: string) => { const [tp, per] = t.split(" "); let h = parseInt(tp); if (per === "AM" && h === 12) h = 0; else if (per === "PM" && h !== 12) h += 12; return h; };
                        const periodTimes = ALL_24H_TIMES.filter(t => hours.includes(to24(t)));
                        const selCount = periodTimes.filter(t => lt.times.includes(t)).length;
                        return (
                          <div key={label} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <div className="flex items-center gap-2 mb-2.5">
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">{label}</span>
                              {selCount > 0 && (
                                <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md" style={{ background: "rgba(212,175,55,0.12)", color: "#d4af37" }}>
                                  {selCount} selected
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-6 gap-1.5">
                              {periodTimes.map(t => {
                                const selected = lt.times.includes(t);
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => toggleLangTime(i, t)}
                                    className="py-2 rounded-lg text-[11px] font-bold transition-all"
                                    style={selected
                                      ? { background: "linear-gradient(135deg,#d4af37,#f4d03f)", color: "#000" }
                                      : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }
                                    }
                                    title={selected && lt.times.length <= 2 ? "Minimum 2 required" : ""}
                                  >
                                    {t}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {wLanguageTimes.some(lt => lt.times.length < 2) && (
                    <p className="mt-2 text-[10px] text-red-400 font-inter">Each language needs at least 2 show times.</p>
                  )}
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

                {/* Pricing per screen type */}
                <div>
                  <FieldLabel>Ticket Pricing by Screen Type (₹)</FieldLabel>
                  <div className="space-y-4">
                    {(["2D", "3D", "IMAX"] as const).filter(type => wScreenTypes.includes(type)).map(type => (
                      <div key={type} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="px-4 py-2 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <span className="text-[10px] font-black uppercase tracking-widest"
                            style={{ color: type === "IMAX" ? "rgba(255,255,255,0.9)" : type === "3D" ? "rgba(255,255,255,0.65)" : "#d4af37" }}>
                            {type}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 p-4">
                          {(["reg", "prem", "rec"] as const).map(field => (
                            <div key={field}>
                              <label className="block text-[9px] font-bold text-neutral-600 uppercase mb-1.5">
                                {field === "reg" ? "Regular" : field === "prem" ? "Premium" : "Recliner"}
                              </label>
                              <input
                                className={inputCls}
                                type="number"
                                value={wPrices[type][field]}
                                onChange={e => setWPrice(type, field, e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <GhostBtn onClick={() => setWStep(2)}>← Back</GhostBtn>
                  <GoldBtn
                    disabled={wLanguageTimes.length === 0 || wLanguageTimes.some(lt => lt.times.length < 2)}
                    onClick={() => setWStep(4)}
                  >
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
                        <p className="text-white font-bold mb-1.5">{wMode === "auto7" ? "Next 7 days from today" : wCustomDate}</p>
                        {wLanguageTimes.map((lt, i) => (
                          <p key={i} className="text-[11px] font-inter leading-relaxed">
                            <span className="font-bold text-neutral-300">{lt.language}:</span>
                            <span className="text-neutral-500 ml-1">{lt.times.join(" · ")}</span>
                          </p>
                        ))}
                        <p className="text-neutral-600 text-[10px] mt-1">
                          {wLanguageTimes.reduce((s, lt) => s + lt.times.length, 0)} total slots/day/screen
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] text-neutral-600 font-black uppercase tracking-widest mb-2">Pricing by Screen</p>
                        <div className="space-y-1">
                          {(["2D", "3D", "IMAX"] as const).filter(t => wScreenTypes.includes(t)).map(t => (
                            <p key={t} className="text-xs font-inter">
                              <span className="font-black mr-2" style={{ color: t === "IMAX" ? "rgba(212,175,55,0.9)" : t === "3D" ? "rgba(255,255,255,0.6)" : "rgba(212,175,55,0.55)" }}>{t}</span>
                              <span className="text-white">₹{wPrices[t].reg}</span>
                              <span className="text-neutral-500"> / ₹{wPrices[t].prem}</span>
                              <span className="text-neutral-600"> / ₹{wPrices[t].rec}</span>
                            </p>
                          ))}
                        </div>
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
              {([
                { label: "Total Movies",   value: movies.length,                                   Icon: Film        },
                { label: "Total Shows",    value: shows.length,                                    Icon: Calendar    },
                { label: "Active Shows",   value: shows.filter(s => s.status === "active").length, Icon: CheckCircle },
                { label: "Total Theatres", value: theatreList.length,                              Icon: Building2   },
              ] as { label: string; value: number; Icon: React.FC<any> }[]).map(({ label, value, Icon }) => (
                <div key={label} className="rounded-xl p-5 flex items-start justify-between gap-3" style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</p>
                    <p className="text-3xl font-bold text-white">{value}</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.14)" }}>
                    <Icon className="w-4 h-4" style={{ color: "rgba(212,175,55,0.7)" }} />
                  </div>
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
                                  ? <span className="font-bold" style={{ color: "rgba(212,175,55,0.8)" }}>{movieShows.length} show{movieShows.length !== 1 ? "s" : ""} scheduled</span>
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
                              onClick={e => { e.stopPropagation(); handleDeleteAllShows(movie.id, movie.title); }}
                              className="p-2 rounded-lg text-orange-400 hover:bg-orange-900/20 transition-colors"
                              title="Delete all shows for this movie"
                            >
                              <CalendarX className="w-4 h-4" />
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
                              <div className="divide-y divide-neutral-800/30">
                                {movieShows.map(show => (
                                  <div key={show.id} className="px-4 py-3 hover:bg-neutral-900/30 transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-start gap-3 min-w-0">
                                        {/* Date + time badge */}
                                        <div className="flex-shrink-0 rounded-xl px-2.5 py-2 text-center min-w-[56px]" style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.12)" }}>
                                          <p className="text-[9px] font-black text-neutral-500 uppercase tracking-wider leading-none mb-1">{show.date.substring(5)}</p>
                                          <p className="text-[11px] font-black leading-none" style={{ color: "#d4af37" }}>{show.startTime}</p>
                                        </div>
                                        {/* Info */}
                                        <div className="min-w-0 pt-0.5">
                                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                            <span className="text-xs font-bold text-white">{show.theatreName}</span>
                                            <span className="text-neutral-700 text-[10px]">·</span>
                                            <span className="text-[10px] font-bold text-neutral-400">Scr {show.screenNumber}</span>
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>{show.screenType}</span>
                                            <StatusPill status={show.status} />
                                          </div>
                                          <p className="text-[10px] text-neutral-600 font-inter truncate">
                                            {show.cityName} · {show.language || show.movieLanguage} · ₹{show.priceRegular} / {show.pricePremium} / {show.priceRecliner}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
                                        <button
                                          onClick={() => openEditShow(show)}
                                          className="p-1.5 rounded-lg text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors"
                                          title="Edit show"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteShow(show.id)}
                                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-900/20 transition-colors"
                                          title="Delete show"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
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

            {/* ── INFRASTRUCTURE ─────────────────────────────────────────── */}
            <div className={cardDark}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)" }}>
                  <Building2 className="w-5 h-5" style={{ color: "#d4af37" }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">Infrastructure</h2>
                  <p className="text-[10px] text-neutral-600 font-inter">Manage cities, theatres &amp; screens</p>
                </div>
              </div>

              {/* Add City */}
              <div className="mb-4 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-3.5 h-3.5" style={{ color: "#d4af37" }} />
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(212,175,55,0.8)" }}>Add City</p>
                </div>
                <form onSubmit={handleAddCity} className="flex items-end gap-3 font-inter text-xs">
                  <div className="flex-1">
                    <input className={inputCls} required placeholder="e.g. Bengaluru" value={newCityName} onChange={e => setNewCityName(e.target.value)} />
                  </div>
                  <GoldBtn type="submit" className="flex-shrink-0"><Plus className="w-3.5 h-3.5" /> Add City</GoldBtn>
                </form>
              </div>

              {/* Add Theatre */}
              <div className="mb-4 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-3.5 h-3.5" style={{ color: "rgba(212,175,55,0.6)" }} />
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(212,175,55,0.6)" }}>Add Theatre</p>
                </div>
                <form onSubmit={handleAddTheatre} className="grid grid-cols-1 md:grid-cols-3 gap-3 font-inter text-xs">
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
                    <Plus className="w-3.5 h-3.5" /> Add Theatre
                  </GoldBtn>
                </form>
              </div>

              {/* Add Screens */}
              <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="w-3.5 h-3.5" style={{ color: "rgba(212,175,55,0.6)" }} />
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(212,175,55,0.6)" }}>Add Screens</p>
                  <span className="text-[9px] text-neutral-700 font-inter ml-1">2D→200 · 3D→156 · IMAX→234 seats</span>
                </div>
                <form onSubmit={handleBulkScreens} className="grid grid-cols-1 md:grid-cols-4 gap-3 font-inter text-xs">
                  <div className="md:col-span-2">
                    <FieldLabel>Theatre</FieldLabel>
                    <select className={selectCls} required value={bulkScreenTheatreId} onChange={e => setBulkScreenTheatreId(e.target.value)}>
                      <option value="">— Select Theatre —</option>
                      {theatreList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Count</FieldLabel>
                    <select className={selectCls} value={bulkScreenCount} onChange={e => setBulkScreenCount(e.target.value)}>
                      {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}{n !== 1 ? " screens" : " screen"}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Type</FieldLabel>
                    <select className={selectCls} value={bulkScreenType} onChange={e => setBulkScreenType(e.target.value)}>
                      <option value="2D">2D</option>
                      <option value="3D">3D</option>
                      <option value="IMAX">IMAX</option>
                    </select>
                  </div>
                  <GoldBtn type="submit" className="md:col-span-4 w-fit">
                    <Plus className="w-3.5 h-3.5" /> Add {bulkScreenCount} Screen{parseInt(bulkScreenCount) !== 1 ? "s" : ""}
                  </GoldBtn>
                </form>
              </div>
            </div>

            {/* ── THEATRES & SCREENS LIST ─────────────────────────────────── */}
            <div className={cardDark}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5" style={{ color: "rgba(212,175,55,0.7)" }} /> Theatres &amp; Screens
                </h2>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-lg" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)", color: "rgba(212,175,55,0.7)" }}>
                  {theatreList.length} theatre{theatreList.length !== 1 ? "s" : ""}
                </span>
              </div>
              {theatreList.length === 0 ? (
                <p className="text-sm text-neutral-600 py-8 text-center font-inter">No theatres added yet.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(
                    theatreList.reduce((acc: Record<string, typeof theatreList>, t) => {
                      const city = cityList.find((c: any) => c.id === t.cityId);
                      const key = city?.name ?? "Unknown";
                      (acc[key] = acc[key] || []).push(t);
                      return acc;
                    }, {})
                  ).sort(([a], [b]) => a.localeCompare(b)).map(([cityName, cityTheatres]) => {
                    const cityOpen = expandedCities.has(cityName);
                    const totalScreens = cityTheatres.reduce((sum, t) =>
                      sum + screenList.filter((s: any) => s.theatreId === t.id).length, 0);
                    return (
                      <div key={cityName} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(212,175,55,0.12)" }}>
                        {/* City accordion header */}
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-left select-none transition-colors hover:bg-[#d4af37]/5"
                          style={{ background: cityOpen ? "rgba(212,175,55,0.06)" : "rgba(212,175,55,0.03)" }}
                          onClick={() => setExpandedCities(prev => {
                            const next = new Set(prev);
                            cityOpen ? next.delete(cityName) : next.add(cityName);
                            return next;
                          })}
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)" }}>
                            <MapPin className="w-3.5 h-3.5" style={{ color: "#d4af37" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white">{cityName}</p>
                            <p className="text-[10px] font-inter" style={{ color: "rgba(212,175,55,0.5)" }}>
                              {cityTheatres.length} theatre{cityTheatres.length !== 1 ? "s" : ""} · {totalScreens} screen{totalScreens !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="flex-shrink-0 transition-transform duration-200" style={{ transform: cityOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                            <ChevronDown className="w-4 h-4" style={{ color: "#d4af37" }} />
                          </div>
                        </button>

                        {/* City content */}
                        {cityOpen && (
                          <div className="border-t px-3 py-3 space-y-2" style={{ borderColor: "rgba(212,175,55,0.1)", background: "rgba(0,0,0,0.2)" }}>
                            {cityTheatres.map(t => {
                              const tScreens = screenList
                                .filter((s: any) => s.theatreId === t.id)
                                .sort((a: any, b: any) => a.number - b.number);
                              const theatreOpen = expandedTheatres.has(t.id);
                              return (
                                <div key={t.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                                  {/* Theatre accordion header */}
                                  <button
                                    className="w-full flex items-center gap-3 px-3.5 py-3 text-left select-none transition-colors"
                                    style={{ background: theatreOpen ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)" }}
                                    onClick={() => setExpandedTheatres(prev => {
                                      const next = new Set(prev);
                                      theatreOpen ? next.delete(t.id) : next.add(t.id);
                                      return next;
                                    })}
                                  >
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                      <Building2 className="w-3.5 h-3.5" style={{ color: "rgba(212,175,55,0.6)" }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-black text-sm text-white truncate">{t.name}</p>
                                      <p className="text-[10px] text-neutral-600 font-inter truncate">{t.address}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>
                                        {tScreens.length} scr
                                      </span>
                                      <button
                                        onClick={e => { e.stopPropagation(); handleDeleteTheatre(t.id, t.name); }}
                                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-900/20 transition-colors"
                                        title="Delete theatre"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                      <div className="transition-transform duration-200" style={{ transform: theatreOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                                        <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />
                                      </div>
                                    </div>
                                  </button>

                                  {/* Screens list */}
                                  {theatreOpen && (
                                    <div className="border-t px-3.5 py-3" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.25)" }}>
                                      {tScreens.length === 0 ? (
                                        <p className="text-[10px] text-neutral-700 font-inter py-1">No screens added to this theatre.</p>
                                      ) : (
                                        <div className="flex flex-wrap gap-2">
                                          {tScreens.map((s: any) => (
                                            <div key={s.id} className="flex items-center gap-1.5 pl-2.5 pr-1 py-1.5 rounded-lg" style={{
                                              background: "rgba(255,255,255,0.03)",
                                              border: "1px solid rgba(255,255,255,0.07)",
                                            }}>
                                              <span className="text-[10px] font-black" style={{ color: s.type === "IMAX" ? "rgba(212,175,55,0.9)" : "rgba(255,255,255,0.5)" }}>
                                                Scr {s.number}
                                              </span>
                                              <span className="text-[9px] font-bold" style={{ color: s.type === "IMAX" ? "rgba(212,175,55,0.5)" : "rgba(255,255,255,0.2)" }}>
                                                {s.type}
                                              </span>
                                              <button
                                                onClick={() => handleDeleteScreen(s.id, t.name, s.number)}
                                                className="p-0.5 rounded text-red-500/40 hover:text-red-400 transition-colors"
                                                title="Delete screen"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
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
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* ── EDIT MOVIE MODAL ────────────────────────────────────────────── */}
      {/* ── EDIT SHOW MODAL ─────────────────────────────────────────────── */}
      {editingShow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)" }}
          onClick={e => { if (e.target === e.currentTarget) setEditingShow(null); }}
        >
          <div
            className="w-full max-w-lg rounded-2xl"
            style={{ background: "#0d0d0d", border: "1px solid rgba(212,175,55,0.25)", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-900">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Pencil className="w-4 h-4" style={{ color: "#d4af37" }} /> Edit Show
                <span className="text-neutral-600 font-normal text-sm">— {editingShow.movieTitle}</span>
              </h2>
              <button onClick={() => setEditingShow(null)} className="p-2 rounded-xl hover:bg-neutral-900 transition-colors text-neutral-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateShow} className="p-6 space-y-4 font-inter text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Date</FieldLabel>
                  <input type="date" className={inputCls} required value={editShowDate} onChange={e => setEditShowDate(e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Start Time</FieldLabel>
                  <select className={selectCls} required value={editShowTime} onChange={e => setEditShowTime(e.target.value)}>
                    {ALL_24H_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <FieldLabel>Regular (₹)</FieldLabel>
                  <input type="number" className={inputCls} required min={1} value={editShowPriceReg} onChange={e => setEditShowPriceReg(e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Premium (₹)</FieldLabel>
                  <input type="number" className={inputCls} required min={1} value={editShowPricePrem} onChange={e => setEditShowPricePrem(e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Recliner (₹)</FieldLabel>
                  <input type="number" className={inputCls} required min={1} value={editShowPriceRec} onChange={e => setEditShowPriceRec(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3 pt-2 border-t border-neutral-900">
                <GhostBtn type="button" onClick={() => setEditingShow(null)}>Cancel</GhostBtn>
                <GoldBtn type="submit" className="flex-1 justify-center">Save Changes</GoldBtn>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <Pencil className="w-5 h-5" style={{ color: "#d4af37" }} /> Edit Movie
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
