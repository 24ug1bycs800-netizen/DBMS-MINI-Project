export default async function handler(req, res) {
  const path = String(req.query?.path ?? "");
  if (!path.startsWith("/")) {
    return res.status(400).json({ error: "Invalid path" });
  }

  const token = process.env.TMDB_READ_TOKEN ?? "";
  if (!token) {
    return res.status(503).json({ error: "TMDB_READ_TOKEN not configured on Vercel" });
  }

  try {
    const upstream = await fetch(`https://api.themoviedb.org/3${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: String(err) });
  }
}
