// GET /api/plaza - Get active public packets + recent claim activity
import { createClient } from '@vercel/kv';

const kv = () => createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const redis = kv();

    // Get active public packet IDs (normal + lucky, not exclusive)
    const packetIds = await redis.lrange('plaza:active', 0, 19); // last 20
    const packets = [];
    for (const id of packetIds || []) {
      const raw = await redis.get(`packet:${id}`);
      if (!raw) continue;
      const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (p.status === 'active' && Date.now() <= p.expiresAt && p.remainingCount > 0) {
        packets.push(p);
      }
    }

    // Get recent activity feed
    const activityRaw = await redis.lrange('plaza:activity', 0, 29); // last 30
    const activity = (activityRaw || []).map(item => {
      return typeof item === 'string' ? JSON.parse(item) : item;
    });

    return res.status(200).json({ packets, activity });
  } catch (err) {
    console.error('plaza error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
