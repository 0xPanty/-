// GET /api/my-packets?fid=<fid>&type=sent|claimed - Get user's packet history
import { createClient } from '@vercel/kv';

const kv = () => createClient({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { fid, type = 'sent' } = req.query;
  if (!fid) return res.status(400).json({ error: 'Missing fid' });

  try {
    const redis = kv();
    const key = `user:${fid}:${type === 'claimed' ? 'claimed' : 'sent'}`;
    const ids = await redis.lrange(key, 0, 49); // Last 50

    if (!ids || ids.length === 0) {
      return res.status(200).json({ packets: [] });
    }

    const packets = [];
    for (const id of ids) {
      const raw = await redis.get(`packet:${id}`);
      if (raw) {
        const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (p.status === 'active' && Date.now() > p.expiresAt) p.status = 'expired';
        packets.push(p);
      }
    }

    return res.status(200).json({ packets });
  } catch (err) {
    console.error('my-packets error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
