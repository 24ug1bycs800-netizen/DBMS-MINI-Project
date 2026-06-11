import { Router } from "express";

import {
  getSeatsForShow,
  createBooking,
  cancelBooking,
  verifyPayment,
  getMyBookings,
  getBookingByCode,
  toggleWishlist,
  getMyWishlist,
  addReview,
} from "../controllers/bookingController";
import { authenticateJWT } from "../middleware/authMiddleware";

const router = Router();

router.get("/shows/:showId/seats", getSeatsForShow);

router.post("/create", authenticateJWT, createBooking);
router.post("/verify", authenticateJWT, verifyPayment);
router.get("/my-bookings", authenticateJWT, getMyBookings);
router.patch(
  "/:id/cancel",
  authenticateJWT,
  cancelBooking
);
router.get("/confirm/:code", authenticateJWT, getBookingByCode);
router.post("/wishlist/toggle", authenticateJWT, toggleWishlist);
router.get("/wishlist", authenticateJWT, getMyWishlist);
router.post("/reviews", authenticateJWT, addReview);

export default router;
