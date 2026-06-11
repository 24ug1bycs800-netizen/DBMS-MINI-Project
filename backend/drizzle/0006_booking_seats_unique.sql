-- Prevent the same seat from being added twice to the same booking.
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_booking_seat_unique" UNIQUE ("booking_id", "seat_id");
