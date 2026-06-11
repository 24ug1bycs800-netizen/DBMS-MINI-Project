import { Request, Response } from "express";
import { db } from "../db/db";
import Razorpay from "razorpay";
import {
  bookings, bookingSeats, payments, seats, shows,
  movies, screens, theatres, wishlist, reviews,seatLocks,
} from "../db/schema";
import {
  and,
  eq,
  lt,
  inArray,
  desc
} from "drizzle-orm";
import crypto from "crypto";
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});
 
// GET SEAT MAP FOR A SHOW
export const getSeatsForShow = async (req: Request, res: Response) => {
  try {
    const showId = parseInt(req.params.showId);
    if (isNaN(showId)) return res.status(400).json({ error: "Invalid show ID" });

    const showRows = await db
      .select({
        id: shows.id,
        language: shows.language,
        startTime: shows.startTime,
        date: shows.date,
        priceRegular: shows.priceRegular,
        pricePremium: shows.pricePremium,
        priceRecliner: shows.priceRecliner,
        screen: {
          id: screens.id,
          number: screens.number,
          type: screens.type,
          theatreId: screens.theatreId,
        },
        theatre: {
          id: theatres.id,
          name: theatres.name,
          address: theatres.address,
        },
        movie: {
          id: movies.id,
          title: movies.title,
          description: movies.description,
          genre: movies.genre,
          language: movies.language,
          durationMins: movies.durationMins,
          rating: movies.rating,
          ratingValue: movies.ratingValue,
          releaseDate: movies.releaseDate,
          trailerUrl: movies.trailerUrl,
          posterUrl: movies.posterUrl,
          isNowShowing: movies.isNowShowing,
          trending: movies.trending,
          topRated: movies.topRated,
        },
      })
      .from(shows)
      .innerJoin(screens, eq(shows.screenId, screens.id))
      .innerJoin(theatres, eq(screens.theatreId, theatres.id))
      .innerJoin(movies, eq(shows.movieId, movies.id))
      .where(eq(shows.id, showId))
      .limit(1);

    const showItem = showRows[0];
    if (!showItem) return res.status(404).json({ error: "Show not found" });

    const [allSeatsList, bookedSeatsRows] = await Promise.all([
      db.select().from(seats).where(eq(seats.screenId, showItem.screen.id)),
      db
        .select({ seatId: bookingSeats.seatId })
        .from(bookingSeats)
        .innerJoin(bookings, eq(bookingSeats.bookingId, bookings.id))
        .where(and(eq(bookings.showId, showId), eq(bookings.status, "confirmed"))),
    ]);

    const bookedSeatIds = new Set(bookedSeatsRows.map((seat) => seat.seatId));
 
    const seatsLayout = allSeatsList.map((seat) => ({
      ...seat,
      status: bookedSeatIds.has(seat.id) ? "booked" : "available",
    }));
 
    return res.status(200).json({
      show: {
        id: showItem.id,
        startTime: showItem.startTime,
        date: showItem.date,
        priceRegular: showItem.priceRegular,
        pricePremium: showItem.pricePremium,
        priceRecliner: showItem.priceRecliner,
        movie: showItem.movie,
        screen: showItem.screen,
        theatre: showItem.theatre,
      },
      seats: seatsLayout,
    });
  } catch (err) {
    console.error("Fetch show seat layout error:", err);
    return res.status(500).json({ error: "Internal server error fetching seats layout" });
  }
};
 
// CREATE BOOKING ORDER
export const createBooking = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { showId, seatIds } = req.body;
 
    if (!showId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ error: "showId and a non-empty array of seatIds are required" });
    }
 
    const showInt = parseInt(showId);
    const dbShows = await db.select().from(shows).where(eq(shows.id, showInt)).limit(1);
    const showItem = dbShows[0];
    if (!showItem) return res.status(404).json({ error: "Show not found" });
            // Remove expired locks
await db
  .delete(seatLocks)
  .where(
    lt(seatLocks.expiresAt, new Date())
  );

// Get active locks
    const activeLocks = await db
      .select()
      .from(seatLocks)
      .where(
        and(
          eq(seatLocks.showId, showInt),
          inArray(seatLocks.seatId, seatIds)
        )
      );

    // If another user locked them
    const conflictingLocks = activeLocks.filter(
      (lock) => lock.userId !== user.id
    );

    if (conflictingLocks.length > 0) {
      return res.status(409).json({
        error: "One or more seats are currently reserved."
      });
  }
 
    // Get seats belonging to this screen
    let seatsList = await db.select().from(seats).where(eq(seats.screenId, showItem.screenId));
    seatsList = seatsList.filter((s) => seatIds.includes(s.id));
 
    // Check for already booked seats
    const activeBookings = await db.select().from(bookings).where(
      and(eq(bookings.showId, showInt), eq(bookings.status, "confirmed"))
    );
    const bookedSeatIds: number[] = [];
    for (const booking of activeBookings) {
      const linkedSeats = await db.select().from(bookingSeats).where(eq(bookingSeats.bookingId, booking.id));
      linkedSeats.forEach((ls) => bookedSeatIds.push(ls.seatId));
    }
 
    if (seatIds.some((sId: number) => bookedSeatIds.includes(sId))) {
      return res.status(409).json({ error: "One or more selected seats are already booked." });
    }
 
    // Calculate total
    let totalAmount = 0;
    seatsList.forEach((seat) => {
      if (seat.category === "Premium") totalAmount += showItem.pricePremium;
      else if (seat.category === "Recliner") totalAmount += showItem.priceRecliner;
      else totalAmount += showItem.priceRegular;
    });
 
    const bookingCode = `CC-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

const order = await razorpay.orders.create({
  amount: totalAmount * 100, // Razorpay uses paise
  currency: "INR",
  receipt: bookingCode,
});

const razorpayOrderId = order.id;
    // Insert booking
    const inserted = await db.insert(bookings).values({
      userId: user.id,
      showId: showInt,
      totalAmount,
      status: "pending",
      code: bookingCode,
    }).returning();
    const newBooking = inserted[0];
 
    // Link seats
    for (const sId of seatIds) {
      await db.insert(bookingSeats).values({ bookingId: newBooking.id, seatId: sId });
    }
 
    // Insert payment record
    await db.insert(payments).values({
      bookingId: newBooking.id,
      razorpayOrderId,
      status: "pending",
    });
 
  return res.status(201).json({
  success: true,
  booking: newBooking,
  razorpayOrderId: order.id,
  amount: order.amount,
  currency: order.currency,
  key: process.env.RAZORPAY_KEY_ID,
});
  } catch (err) {
    console.error("Create booking error:", err);
    return res.status(500).json({ error: "Internal server error creating booking" });
  }
};
export const cancelBooking = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as any).user;

    const bookingId = parseInt(req.params.id);

    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
    });

    if (!booking) {
      return res.status(404).json({
        error: "Booking not found",
      });
    }

    if (booking.userId !== user.id) {
      return res.status(403).json({
        error: "Unauthorized",
      });
    }

    await db
      .update(bookings)
      .set({
        status: "cancelled",
      })
      .where(eq(bookings.id, bookingId));

    return res.json({
      success: true,
      message: "Booking cancelled",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Cancellation failed",
    });
  }
};
// VERIFY PAYMENT & CONFIRM BOOKING
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { razorpayOrderId, razorpayPaymentId } = req.body;
    if (!razorpayOrderId) return res.status(400).json({ error: "razorpayOrderId is required" });
 
    const mockPaymentId = razorpayPaymentId || `pay_${crypto.randomBytes(8).toString("hex")}`;
 
    const paymentItems = await db.select().from(payments).where(eq(payments.razorpayOrderId, razorpayOrderId)).limit(1);
    const paymentItem = paymentItems[0];
    if (!paymentItem) return res.status(404).json({ error: "Order transaction not found" });
 
    await db.update(payments).set({ status: "success", razorpayPaymentId: mockPaymentId }).where(eq(payments.id, paymentItem.id));
 
    const updated = await db.update(bookings).set({ status: "confirmed" }).where(eq(bookings.id, paymentItem.bookingId)).returning();
    const updatedBooking = updated[0];
 
    return res.status(200).json({
      message: "Payment verified and ticket confirmed!",
      booking: updatedBooking,
      ticketCode: updatedBooking?.code,
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    return res.status(500).json({ error: "Internal server error verifying payment" });
  }
};
 
// GET USER BOOKING HISTORY
export const getMyBookings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, user.id))
      .orderBy(desc(bookings.id));

    if (userBookings.length === 0) {
      return res.status(200).json({ bookings: [] });
    }

    const bookingIds = userBookings.map((booking) => booking.id);
    const showIds = [...new Set(userBookings.map((booking) => booking.showId))];

    const [showRows, bookingSeatRows] = await Promise.all([
      db
        .select({
          show: shows,
          movie: movies,
          screen: screens,
          theatre: theatres,
        })
        .from(shows)
        .innerJoin(movies, eq(shows.movieId, movies.id))
        .innerJoin(screens, eq(shows.screenId, screens.id))
        .innerJoin(theatres, eq(screens.theatreId, theatres.id))
        .where(inArray(shows.id, showIds)),
      db
        .select({
          bookingId: bookingSeats.bookingId,
          seat: seats,
        })
        .from(bookingSeats)
        .innerJoin(seats, eq(bookingSeats.seatId, seats.id))
        .where(inArray(bookingSeats.bookingId, bookingIds)),
    ]);

    const showMap = new Map(
      showRows.map((row) => [
        row.show.id,
        {
          show: row.show,
          movie: row.movie,
          theatre: row.theatre,
          screen: row.screen,
        },
      ])
    );

    const seatsByBooking = new Map<number, typeof seats.$inferSelect[]>();
    bookingSeatRows.forEach((row) => {
      const existing = seatsByBooking.get(row.bookingId) || [];
      existing.push(row.seat);
      seatsByBooking.set(row.bookingId, existing);
    });

    const list = userBookings
      .map((booking) => {
        const details = showMap.get(booking.showId);
        if (!details) return null;

        return {
          ...booking,
          show: details.show,
          movie: details.movie,
          theatre: details.theatre,
          screen: details.screen,
          seats: seatsByBooking.get(booking.id) || [],
        };
      })
      .filter(Boolean);

    return res.status(200).json({ bookings: list });
  } catch (err) {
    console.error("Fetch bookings error:", err);
    return res.status(500).json({ error: "Internal server error fetching booking history" });
  }
};
 
// GET BOOKING BY CODE (confirmation page)
export const getBookingByCode = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { code } = req.params;

    const rows = await db
      .select({
        booking: bookings,
        show: shows,
        movie: movies,
        screen: screens,
        theatre: theatres,
      })
      .from(bookings)
      .innerJoin(shows, eq(bookings.showId, shows.id))
      .innerJoin(movies, eq(shows.movieId, movies.id))
      .innerJoin(screens, eq(shows.screenId, screens.id))
      .innerJoin(theatres, eq(screens.theatreId, theatres.id))
      .where(and(eq(bookings.code, code), eq(bookings.userId, user.id)))
      .limit(1);

    const row = rows[0];
    if (!row) return res.status(404).json({ error: "Booking not found" });

    const seatRows = await db
      .select({ seat: seats })
      .from(bookingSeats)
      .innerJoin(seats, eq(bookingSeats.seatId, seats.id))
      .where(eq(bookingSeats.bookingId, row.booking.id));

    return res.status(200).json({
      booking: row.booking,
      show: row.show,
      movie: row.movie,
      screen: row.screen,
      theatre: row.theatre,
      seats: seatRows.map((r) => r.seat),
    });
  } catch (err) {
    console.error("getBookingByCode error:", err);
    return res.status(500).json({ error: "Booking not found" });
  }
};

// TOGGLE WISHLIST
export const toggleWishlist = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { movieId } = req.body;
    if (!movieId) return res.status(400).json({ error: "movieId is required" });
 
    const existing = await db.select().from(wishlist).where(
      and(eq(wishlist.userId, user.id), eq(wishlist.movieId, parseInt(movieId)))
    ).limit(1);
 
    if (existing[0]) {
      await db.delete(wishlist).where(eq(wishlist.id, existing[0].id));
      return res.status(200).json({ success: true, isWishlisted: false });
    }
 
    await db.insert(wishlist).values({ userId: user.id, movieId: parseInt(movieId) });
    return res.status(200).json({ success: true, isWishlisted: true });
  } catch (err) {
    console.error("Toggle wishlist error:", err);
    return res.status(500).json({ error: "Internal server error updating wishlist" });
  }
};
 
// GET WISHLIST
export const getMyWishlist = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const myWish = await db.select().from(wishlist).where(eq(wishlist.userId, user.id));
    const mIds = myWish.map((w) => w.movieId);
    const allMovies = await db.select().from(movies);
    const movieItems = allMovies.filter((m) => mIds.includes(m.id));
    return res.status(200).json({ wishlist: movieItems });
  } catch (err) {
    console.error("Fetch wishlist error:", err);
    return res.status(500).json({ error: "Internal server error fetching wishlist" });
  }
};
 
// ADD REVIEW
export const addReview = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { movieId, rating, comment } = req.body;
 
    if (!movieId || !rating) {
      return res.status(400).json({ error: "movieId and rating are required" });
    }
 
    const inserted = await db.insert(reviews).values({
      userId: user.id,
      movieId: parseInt(movieId),
      rating: parseInt(rating),
      comment,
    }).returning();
 
    return res.status(201).json({ message: "Review added successfully", review: inserted[0] });
  } catch (err) {
    console.error("Add review error:", err);
    return res.status(500).json({ error: "Internal server error adding review" });
  }
};
