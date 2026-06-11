-- Reset all serial sequences to be consistent with the actual max id in each table.
-- This fixes "duplicate key value violates unique constraint *_pkey" errors that
-- occur when rows were inserted with explicit IDs (e.g. during seeding), leaving
-- the sequence counter behind the real data.

SELECT setval('cities_id_seq',        COALESCE((SELECT MAX(id) FROM cities),        0) + 1, false);
SELECT setval('users_id_seq',         COALESCE((SELECT MAX(id) FROM users),         0) + 1, false);
SELECT setval('movies_id_seq',        COALESCE((SELECT MAX(id) FROM movies),        0) + 1, false);
SELECT setval('theatres_id_seq',      COALESCE((SELECT MAX(id) FROM theatres),      0) + 1, false);
SELECT setval('screens_id_seq',       COALESCE((SELECT MAX(id) FROM screens),       0) + 1, false);
SELECT setval('seats_id_seq',         COALESCE((SELECT MAX(id) FROM seats),         0) + 1, false);
SELECT setval('shows_id_seq',         COALESCE((SELECT MAX(id) FROM shows),         0) + 1, false);
SELECT setval('bookings_id_seq',      COALESCE((SELECT MAX(id) FROM bookings),      0) + 1, false);
SELECT setval('booking_seats_id_seq', COALESCE((SELECT MAX(id) FROM booking_seats), 0) + 1, false);
SELECT setval('payments_id_seq',      COALESCE((SELECT MAX(id) FROM payments),      0) + 1, false);
SELECT setval('seat_locks_id_seq',    COALESCE((SELECT MAX(id) FROM seat_locks),    0) + 1, false);
SELECT setval('reviews_id_seq',       COALESCE((SELECT MAX(id) FROM reviews),       0) + 1, false);
SELECT setval('wishlist_id_seq',      COALESCE((SELECT MAX(id) FROM wishlist),      0) + 1, false);
SELECT setval('notifications_id_seq', COALESCE((SELECT MAX(id) FROM notifications), 0) + 1, false);
SELECT setval('group_rooms_id_seq',   COALESCE((SELECT MAX(id) FROM group_rooms),   0) + 1, false);
SELECT setval('group_members_id_seq', COALESCE((SELECT MAX(id) FROM group_members), 0) + 1, false);
SELECT setval('votes_id_seq',         COALESCE((SELECT MAX(id) FROM votes),         0) + 1, false);
