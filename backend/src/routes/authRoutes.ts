import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  register,
  login,
  getProfile,
  updateProfile,
  refreshToken,
  forgotPassword,
  resetPassword,
} from "../controllers/authController";
import { authenticateJWT } from "../middleware/authMiddleware";

const router = Router();

// Throttle authentication endpoints to slow down brute-force / credential-stuffing
// and user-enumeration attacks. 10 attempts per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh-token", authLimiter, refreshToken);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);

router.get("/profile", authenticateJWT, getProfile);
router.put("/profile", authenticateJWT, updateProfile);

export default router;
