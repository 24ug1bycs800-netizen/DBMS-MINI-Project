import { Router } from "express";
import { authenticateJWT } from "../middleware/authMiddleware";
import {
  createMovieNight,
  joinMovieNight,
  getMyMovieNights,
  getMovieNight,
  submitPreferences,
  generateRecommendation,
  voteRecommendation,
  regenerateRecommendation,
  cancelMovieNight,
  markContributionPaid,
  completeBooking,
} from "../controllers/movieNightController";

const router = Router();

router.post("/", authenticateJWT, createMovieNight);
router.get("/", authenticateJWT, getMyMovieNights);
router.post("/join/:inviteCode", authenticateJWT, joinMovieNight);
router.get("/:id", authenticateJWT, getMovieNight);
router.post("/:id/preferences", authenticateJWT, submitPreferences);
router.post("/:id/recommend", authenticateJWT, generateRecommendation);
router.post("/:id/vote", authenticateJWT, voteRecommendation);
router.post("/:id/regenerate", authenticateJWT, regenerateRecommendation);
router.post("/:id/cancel", authenticateJWT, cancelMovieNight);
router.post("/:id/contributions/pay", authenticateJWT, markContributionPaid);
router.post("/:id/book", authenticateJWT, completeBooking);

export default router;
