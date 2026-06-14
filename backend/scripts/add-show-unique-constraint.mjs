import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    // Remove duplicate shows, keeping the one with the smallest id per (screen_id, date, start_time)
    const delResult = await client.query(`
      DELETE FROM shows
      WHERE id NOT IN (
        SELECT MIN(id) FROM shows GROUP BY screen_id, date, start_time
      )
    `);
    console.log(`Removed ${delResult.rowCount} duplicate show(s).`);

    // Add the unique constraint only if it doesn't exist yet
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'shows_screen_date_time_unique'
        ) THEN
          ALTER TABLE shows
            ADD CONSTRAINT shows_screen_date_time_unique
            UNIQUE (screen_id, date, start_time);
          RAISE NOTICE 'Constraint added.';
        ELSE
          RAISE NOTICE 'Constraint already exists, skipping.';
        END IF;
      END $$;
    `);
    console.log("Unique constraint on (screen_id, date, start_time) is in place.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
