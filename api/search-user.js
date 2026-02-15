// GET /api/search-user?q=<query> - Search Farcaster users by username
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q } = req.query;
  if (!q || q.length < 2) return res.status(200).json({ users: [] });

  try {
    const r = await fetch(
      `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(q)}&limit=5`,
      { headers: { accept: 'application/json', api_key: NEYNAR_API_KEY } }
    );
    if (!r.ok) return res.status(200).json({ users: [] });
    const data = await r.json();
    const users = (data.result?.users || []).map(u => ({
      fid: u.fid,
      username: u.username,
      display_name: u.display_name,
      pfp_url: u.pfp_url,
    }));
    return res.status(200).json({ users });
  } catch {
    return res.status(200).json({ users: [] });
  }
}
