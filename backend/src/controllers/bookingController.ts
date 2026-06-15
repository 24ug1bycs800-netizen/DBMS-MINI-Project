import { Request, Response } from "express";
import { db } from "../db/db";
import Razorpay from "razorpay";
import {
  bookings, bookingSeats, payments, seats, shows,
  movies, screens, theatres, wishlist, reviews, seatLocks, notifications,
  movieNightSeatAssignments, movieNightMembers, movieNights, users,
} from "../db/schema";
import {
  and,
  asc,
  eq,
  lt,
  inArray,
  desc,
  sql,
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
 
// SMART SEAT SUGGESTION
// Given a show and a party size, returns the single best block of contiguous
// (same row, consecutive numbers) available seats — preferring central columns
// and middle rows for the best viewing experience. Optionally filters by category.
const ROW_ORDER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const suggestSeats = async (req: Request, res: Response) => {
  try {
    const showId = parseInt(req.params.showId);
    const count = parseInt(String(req.query.count ?? "2"));
    const category = req.query.category ? String(req.query.category) : null;

    if (Number.isNaN(showId)) return res.status(400).json({ error: "Invalid show ID" });
    if (Number.isNaN(count) || count < 1 || count > 10) {
      return res.status(400).json({ error: "count must be between 1 and 10" });
    }

    // Resolve the show's screen
    const showRows = await db.select().from(shows).where(eq(shows.id, showId)).limit(1);
    const show = showRows[0];
    if (!show) return res.status(404).json({ error: "Show not found" });

    // Drop expired locks first so they don't block suggestions
    await db.delete(seatLocks).where(lt(seatLocks.expiresAt, new Date()));

    // Pull all seats for the screen + the seats that are unavailable
    // (confirmed bookings OR currently held locks) in parallel.
    const [allSeats, bookedRows, lockRows] = await Promise.all([
      db.select().from(seats).where(eq(seats.screenId, show.screenId)),
      db
        .select({ seatId: bookingSeats.seatId })
        .from(bookingSeats)
        .innerJoin(bookings, eq(bookingSeats.bookingId, bookings.id))
        .where(and(eq(bookings.showId, showId), eq(bookings.status, "confirmed"))),
      db.select({ seatId: seatLocks.seatId }).from(seatLocks).where(eq(seatLocks.showId, showId)),
    ]);

    const unavailable = new Set<number>([
      ...bookedRows.map((r) => r.seatId),
      ...lockRows.map((r) => r.seatId),
    ]);

    // Group available seats by row, sorted by seat number.
    const byRow = new Map<string, typeof allSeats>();
    for (const seat of allSeats) {
      if (unavailable.has(seat.id)) continue;
      if (category && seat.category !== category) continue;
      const arr = byRow.get(seat.row) ?? [];
      arr.push(seat);
      byRow.set(seat.row, arr);
    }

    const rowLetters = [...byRow.keys()];
    const middleRowIdx = (Math.min(...rowLetters.map((r) => ROW_ORDER.indexOf(r))) +
      Math.max(...rowLetters.map((r) => ROW_ORDER.indexOf(r)))) / 2;

    // Slide a window of `count` over each row; keep only windows where every seat
    // is consecutive (number gap of exactly 1). Score each by how central it is.
    let best: { seats: typeof allSeats; score: number } | null = null;

    for (const [rowLetter, rowSeatsUnsorted] of byRow) {
      const rowSeats = [...rowSeatsUnsorted].sort((a, b) => a.number - b.number);
      const rowMinNum = rowSeats[0]?.number ?? 0;
      const rowMaxNum = rowSeats[rowSeats.length - 1]?.number ?? 0;
      const rowCenterNum = (rowMinNum + rowMaxNum) / 2;
      const rowIdx = ROW_ORDER.indexOf(rowLetter);

      for (let i = 0; i + count <= rowSeats.length; i++) {
        const window = rowSeats.slice(i, i + count);
        const contiguous = window.every(
          (s, k) => k === 0 || s.number === window[k - 1].number + 1
        );
        if (!contiguous) continue;

        const windowCenter = (window[0].number + window[count - 1].number) / 2;
        // Lower score = better: central columns weighted, middle rows weighted.
        const score =
          Math.abs(windowCenter - rowCenterNum) +
          Math.abs(rowIdx - middleRowIdx) * 1.5;

        if (!best || score < best.score) best = { seats: window, score };
      }
    }

    if (!best) {
      return res.status(200).json({
        contiguous: false,
        message: `No block of ${count} adjacent seats is available${category ? ` in ${category}` : ""}.`,
        seats: [],
        seatIds: [],
      });
    }

    const priceFor = (cat: string) =>
      cat === "Premium" ? show.pricePremium : cat === "Recliner" ? show.priceRecliner : show.priceRegular;
    const totalPrice = best.seats.reduce((sum, s) => sum + priceFor(s.category), 0);

    return res.status(200).json({
      contiguous: true,
      seatIds: best.seats.map((s) => s.id),
      seats: best.seats.map((s) => ({ id: s.id, row: s.row, number: s.number, category: s.category })),
      labels: best.seats.map((s) => `${s.row}${s.number}`),
      totalPrice,
    });
  } catch (err) {
    console.error("suggestSeats error:", err);
    return res.status(500).json({ error: "Internal server error suggesting seats" });
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

    // Clean up expired locks before any checks
    await db.delete(seatLocks).where(lt(seatLocks.expiresAt, new Date()));

    // Use a transaction so seat-conflict check + booking insert are atomic
    const { newBooking, razorpayOrderId, order } = await db.transaction(async (tx) => {
      const dbShows = await tx.select().from(shows).where(eq(shows.id, showInt)).limit(1);
      const showItem = dbShows[0];
      if (!showItem) throw Object.assign(new Error("Show not found"), { statusCode: 404 });

      // Check seat locks held by other users
      const activeLocks = await tx
        .select()
        .from(seatLocks)
        .where(and(eq(seatLocks.showId, showInt), inArray(seatLocks.seatId, seatIds)));

      if (activeLocks.some(lock => lock.userId !== user.id)) {
        throw Object.assign(new Error("One or more seats are currently reserved."), { statusCode: 409 });
      }

      // Check already-confirmed seats (single JOIN query — no N+1)
      const bookedRows = await tx
        .select({ seatId: bookingSeats.seatId })
        .from(bookingSeats)
        .innerJoin(bookings, eq(bookingSeats.bookingId, bookings.id))
        .where(and(eq(bookings.showId, showInt), eq(bookings.status, "confirmed")));

      const bookedSeatIds = new Set(bookedRows.map(r => r.seatId));
      if (seatIds.some((sId: number) => bookedSeatIds.has(sId))) {
        throw Object.assign(new Error("One or more selected seats are already booked."), { statusCode: 409 });
      }

      // Fetch requested seats and calculate total
      const seatsList = await tx
        .select()
        .from(seats)
        .where(and(eq(seats.screenId, showItem.screenId), inArray(seats.id, seatIds)));

      let totalAmount = 0;
      for (const seat of seatsList) {
        if (seat.category === "Premium") totalAmount += showItem.pricePremium;
        else if (seat.category === "Recliner") totalAmount += showItem.priceRecliner;
        else totalAmount += showItem.priceRegular;
      }

      const bookingCode = `CC-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

      // Create Razorpay order (outside DB but inside try so errors bubble to rollback)
      const order = await razorpay.orders.create({
        amount: totalAmount * 100,
        currency: "INR",
        receipt: bookingCode,
      });

      // Insert booking
      const inserted = await tx.insert(bookings).values({
        userId: user.id,
        showId: showInt,
        totalAmount,
        status: "pending",
        code: bookingCode,
      }).returning();
      const newBooking = inserted[0];

      // Link seats in one batch
      await tx.insert(bookingSeats).values(seatIds.map((sId: number) => ({ bookingId: newBooking.id, seatId: sId })));

      // Insert payment record
      await tx.insert(payments).values({
        bookingId: newBooking.id,
        razorpayOrderId: order.id,
        status: "pending",
      });

      return { newBooking, razorpayOrderId: order.id, order };
    });

    return res.status(201).json({
      success: true,
      booking: newBooking,
      razorpayOrderId,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error("Create booking error:", err);
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
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
      .set({ status: "cancelled" })
      .where(eq(bookings.id, bookingId));

    await db.insert(notifications).values({
      userId: booking.userId,
      message: `Your booking ${booking.code} has been cancelled.`,
    });

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
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, movieNightId: rawNightId } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        error: "razorpayOrderId, razorpayPaymentId and razorpaySignature are required",
      });
    }

    // Verify Razorpay signature to prevent fake payment confirmations.
    // SECURITY: this check is MANDATORY — a missing/invalid signature must never confirm a booking.
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    const sigBuf = Buffer.from(razorpaySignature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const paymentItems = await db.select().from(payments).where(eq(payments.razorpayOrderId, razorpayOrderId)).limit(1);
    const paymentItem = paymentItems[0];
    if (!paymentItem) return res.status(404).json({ error: "Order transaction not found" });

    await db.update(payments)
      .set({ status: "success", razorpayPaymentId })
      .where(eq(payments.id, paymentItem.id));

    const updated = await db.update(bookings)
      .set({ status: "confirmed" })
      .where(eq(bookings.id, paymentItem.bookingId))
      .returning();
    const updatedBooking = updated[0];

    const movieNightId = rawNightId ? parseInt(rawNightId) : null;

    if (movieNightId && !isNaN(movieNightId)) {
      // Get booked seats in selection order (bookingSeats insertion order = user's pick order)
      const bookedSeatRows = await db
        .select({ seat: seats, bsId: bookingSeats.id })
        .from(bookingSeats)
        .innerJoin(seats, eq(bookingSeats.seatId, seats.id))
        .where(eq(bookingSeats.bookingId, updatedBooking.id))
        .orderBy(asc(bookingSeats.id));

      // Get members: organizer first, then by join time
      const memberRows = await db
        .select({ userId: movieNightMembers.userId, role: movieNightMembers.role, fullName: users.fullName })
        .from(movieNightMembers)
        .innerJoin(users, eq(movieNightMembers.userId, users.id))
        .where(eq(movieNightMembers.movieNightId, movieNightId))
        .orderBy(
          sql`CASE WHEN ${movieNightMembers.role} = 'ORGANIZER' THEN 0 ELSE 1 END`,
          asc(movieNightMembers.joinedAt)
        );

      // Zip members → seats (one seat per member in order)
      const assignments = memberRows.slice(0, bookedSeatRows.length).map((m, i) => ({
        movieNightId,
        userId: m.userId,
        bookingId: updatedBooking.id,
        seatId: bookedSeatRows[i].seat.id,
      }));

      if (assignments.length > 0) {
        await db.insert(movieNightSeatAssignments).values(assignments).onConflictDoNothing();
      }

      // Link booking to the night and mark night as BOOKED
      await db.update(bookings).set({ movieNightId }).where(eq(bookings.id, updatedBooking.id));
      const [night] = await db.select({ title: movieNights.title }).from(movieNights).where(eq(movieNights.id, movieNightId));
      await db.update(movieNights).set({ status: "BOOKED", updatedAt: new Date() }).where(eq(movieNights.id, movieNightId));

      // Send each member their seat assignment notification
      for (let i = 0; i < assignments.length; i++) {
        const s = bookedSeatRows[i].seat;
        await db.insert(notifications).values({
          userId: assignments[i].userId,
          message: `🎬 ${night?.title ?? "Movie Night"} is booked! Your seat: ${s.row}${s.number}. Code: ${updatedBooking.code}`,
        });
      }
    } else {
      // Regular single booking notification
      await db.insert(notifications).values({
        userId: updatedBooking.userId,
        message: `Booking confirmed! Your ticket code is ${updatedBooking.code}. Enjoy the show 🎬`,
      });
    }

    return res.status(200).json({
      message: "Payment verified and ticket confirmed!",
      booking: updatedBooking,
      ticketCode: updatedBooking?.code,
      movieNightId: movieNightId ?? null,
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

    // Validate movieId
    const movieIdInt = parseInt(movieId);
    if (!movieId || Number.isNaN(movieIdInt)) {
      return res.status(400).json({ error: "A valid movieId is required" });
    }

    // Validate rating: must be an integer between 1 and 5
    const ratingInt = parseInt(rating);
    if (Number.isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
      return res.status(400).json({ error: "rating must be an integer between 1 and 5" });
    }

    // Validate comment length (optional field)
    if (comment !== undefined && comment !== null) {
      if (typeof comment !== "string") {
        return res.status(400).json({ error: "comment must be text" });
      }
      if (comment.length > 1000) {
        return res.status(400).json({ error: "comment must be 1000 characters or fewer" });
      }
    }

    // The movie must exist
    const movieExists = await db.select({ id: movies.id }).from(movies).where(eq(movies.id, movieIdInt)).limit(1);
    if (!movieExists[0]) {
      return res.status(404).json({ error: "Movie not found" });
    }

    // Authorization: only users who actually booked (and confirmed) a show of this
    // movie may review it. Prevents review spam from users who never watched it.
    const hasBooked = await db
      .select({ id: bookings.id })
      .from(bookings)
      .innerJoin(shows, eq(bookings.showId, shows.id))
      .where(and(
        eq(bookings.userId, user.id),
        eq(shows.movieId, movieIdInt),
        eq(bookings.status, "confirmed"),
      ))
      .limit(1);
    if (!hasBooked[0]) {
      return res.status(403).json({ error: "You can only review movies you have booked" });
    }

    // One review per user per movie
    const existingReview = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.userId, user.id), eq(reviews.movieId, movieIdInt)))
      .limit(1);
    if (existingReview[0]) {
      return res.status(409).json({ error: "You have already reviewed this movie" });
    }

    const inserted = await db.insert(reviews).values({
      userId: user.id,
      movieId: movieIdInt,
      rating: ratingInt,
      comment: comment ?? null,
    }).returning();

    return res.status(201).json({ message: "Review added successfully", review: inserted[0] });
  } catch (err) {
    console.error("Add review error:", err);
    return res.status(500).json({ error: "Internal server error adding review" });
  }
};
