-- Enforce rating is between 1 and 5 stars
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_range"
  CHECK (rating >= 1 AND rating <= 5);

-- Prevent a user from wishlisting the same movie more than once
ALTER TABLE "wishlist"
  ADD CONSTRAINT "wishlist_user_movie_unique"
  UNIQUE (user_id, movie_id);

-- Ensure ticket prices are always positive
ALTER TABLE "shows"
  ADD CONSTRAINT "shows_prices_positive"
  CHECK (price_regular > 0 AND price_premium > 0 AND price_recliner > 0);
