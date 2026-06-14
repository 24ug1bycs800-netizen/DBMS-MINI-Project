import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    // Add nullable movie_night_id column to bookings
    await client.query(`
      ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS movie_night_id INTEGER REFERENCES movie_nights(id) ON DELETE SET NULL;
    `);
    console.log("Added movie_night_id to bookings.");

    // Create seat-assignment table (one row per member per night)
    await client.query(`
      CREATE TABLE IF NOT EXISTS movie_night_seat_assignments (
        id            SERIAL PRIMARY KEY,
        movie_night_id INTEGER NOT NULL REFERENCES movie_nights(id) ON DELETE CASCADE,
        user_id        INTEGER NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
        booking_id     INTEGER NOT NULL REFERENCES bookings(id)      ON DELETE CASCADE,
        seat_id        INTEGER NOT NULL REFERENCES seats(id)         ON DELETE CASCADE,
        assigned_at    TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(movie_night_id, user_id),
        UNIQUE(movie_night_id, seat_id)
      );
    `);
    console.log("Created movie_night_seat_assignments table.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
