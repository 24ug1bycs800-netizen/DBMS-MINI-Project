import { Router } from 'express';
import {
  getDashboardStats,
  addMovie,
  updateMovie,
  addShow,
  addTheatre,
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
} from "../controllers/adminController";
import { authenticateJWT, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', authenticateJWT, requireAdmin, getDashboardStats);

// ── Read ──────────────────────────────────────────────────────────────────────
router.get('/cities',   authenticateJWT, requireAdmin, getAllCities);
router.get('/theatres', authenticateJWT, requireAdmin, getAllTheatres);
router.get('/screens',  authenticateJWT, requireAdmin, getAllScreens);
router.get('/movies',   authenticateJWT, requireAdmin, getAllMovies);
router.get('/shows',    authenticateJWT, requireAdmin, getAllShows);

// ── Create ────────────────────────────────────────────────────────────────────
router.post('/movies',         authenticateJWT, requireAdmin, addMovie);
router.post('/shows',          authenticateJWT, requireAdmin, addShow);
router.post('/theatres',       authenticateJWT, requireAdmin, addTheatre);
router.post('/screens',        authenticateJWT, requireAdmin, addScreen);
router.post('/screens/bulk',   authenticateJWT, requireAdmin, addBulkScreens);
router.post('/generate-shows', authenticateJWT, requireAdmin, generateShows);

// ── Update ────────────────────────────────────────────────────────────────────
router.put('/movies/:id', authenticateJWT, requireAdmin, updateMovie);

// ── Lifecycle ─────────────────────────────────────────────────────────────────
// Soft-expires all shows whose date < today (preserves booking history)
router.post('/shows/expire', authenticateJWT, requireAdmin, expireShows);

// ── Delete ────────────────────────────────────────────────────────────────────
router.delete('/movies/:id',  authenticateJWT, requireAdmin, deleteMovie);
router.delete('/shows/:id',   authenticateJWT, requireAdmin, deleteShow);
// Bulk delete by scope: { scope: 'screen'|'theatre'|'city', scopeId: number }
router.delete('/shows/bulk',  authenticateJWT, requireAdmin, bulkDeleteShows);

export default router;
