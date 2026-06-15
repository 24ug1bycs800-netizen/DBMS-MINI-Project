import { Router } from "express";
import { authenticateJWT } from "../middleware/authMiddleware";
import { getNotifications, markAllRead } from "../controllers/notificationController";

const router = Router();
router.get("/", authenticateJWT, getNotifications);
router.post("/read-all", authenticateJWT, markAllRead);

export default router;
