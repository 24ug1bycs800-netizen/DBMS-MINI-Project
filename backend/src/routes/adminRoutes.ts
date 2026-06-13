import { Router } from 'express';
import {
  getDashboardStats,
  addMovie,
  updateMovie,
  addShow,
  addCity,
  addTheatre,
  deleteTheatre,
  deleteScreen,
  updateShow,
  addScreen,
  addBulkScreens,
  generateShows,
  deleteMovie,
  deleteShow,
  bulkDeleteShows,
  expireShows,
  getAllCities,
  getAllMovies,
  getAllTheatres,
  getAllScreens,
  getAllShows,
  syncMovies,
  getMovieNightAnalytics,
} from "../controllers/adminController";
import { authenticateJWT, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', authenticateJWT, requireAdmin, getDashboardStats);

// ── TMDB Sync ─────────────────────────────────────────────────────────────────
router.post('/sync-movies', authenticateJWT, requireAdmin, syncMovies);

// ── Movie Night Analytics ─────────────────────────────────────────────────────
router.get('/movie-nights', authenticateJWT, requireAdmin, getMovieNightAnalytics);

// ── Read ──────────────────────────────────────────────────────────────────────
router.get('/cities',   authenticateJWT, requireAdmin, getAllCities);
router.get('/theatres', authenticateJWT, requireAdmin, getAllTheatres);
router.get('/screens',  authenticateJWT, requireAdmin, getAllScreens);
router.get('/movies',   authenticateJWT, requireAdmin, getAllMovies);
router.get('/shows',    authenticateJWT, requireAdmin, getAllShows);

// ── Create ────────────────────────────────────────────────────────────────────
router.post('/cities',         authenticateJWT, requireAdmin, addCity);
router.post('/movies',         authenticateJWT, requireAdmin, addMovie);
router.post('/shows',          authenticateJWT, requireAdmin, addShow);
router.post('/theatres',       authenticateJWT, requireAdmin, addTheatre);
router.post('/screens',        authenticateJWT, requireAdmin, addScreen);
router.post('/screens/bulk',   authenticateJWT, requireAdmin, addBulkScreens);
router.post('/generate-shows', authenticateJWT, requireAdmin, generateShows);

// ── Update ────────────────────────────────────────────────────────────────────
router.put('/movies/:id', authenticateJWT, requireAdmin, updateMovie);
router.put('/shows/:id',  authenticateJWT, requireAdmin, updateShow);

// ── Lifecycle ─────────────────────────────────────────────────────────────────
router.post('/shows/expire', authenticateJWT, requireAdmin, expireShows);

// ── Delete ────────────────────────────────────────────────────────────────────
router.delete('/movies/:id',    authenticateJWT, requireAdmin, deleteMovie);
router.delete('/shows/bulk',    authenticateJWT, requireAdmin, bulkDeleteShows);
router.delete('/shows/:id',     authenticateJWT, requireAdmin, deleteShow);
router.delete('/theatres/:id',  authenticateJWT, requireAdmin, deleteTheatre);
router.delete('/screens/:id',   authenticateJWT, requireAdmin, deleteScreen);

export default router;
