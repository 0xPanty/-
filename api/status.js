// GET /api/status?id=<packetId> - Get red packet status
import { createClient } from '@vercel/kv';

const kv = () => createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing packet id' });

  try {
    const redis = kv();
    const raw = await redis.get(`packet:${id}`);
    if (!raw) return res.status(404).json({ error: 'Packet not found or expired' });

    const packet = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Check expiry
    if (packet.status === 'active' && Date.now() > packet.expiresAt) {
      packet.status = 'expired';
    }

    return res.status(200).json({ packet });
  } catch (err) {
    console.error('status error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
