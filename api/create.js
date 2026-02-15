// POST /api/create - Create a new red packet record in Redis
// The actual USDC transfer happens on-chain via the user's wallet
import { createClient } from '@vercel/kv';

const kv = () => createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { packetId, sender, mode, totalAmount, totalCount, txHash } = req.body;

    if (!packetId || !sender || !mode || !totalAmount || !totalCount || !txHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['lucky', 'fixed'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode' });
    }

    const now = Date.now();
    const packet = {
      id: packetId,
      sender, // { fid, username, displayName, pfpUrl }
      mode,
      totalAmount,
      totalCount,
      remainingAmount: totalAmount,
      remainingCount: totalCount,
      claims: [],
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000, // 24h
      contractTxHash: txHash,
      status: 'active',
    };

    const redis = kv();
    await redis.set(`packet:${packetId}`, JSON.stringify(packet), { ex: 86400 + 3600 }); // 25h TTL
    // Add to sender's history
    await redis.lpush(`user:${sender.fid}:sent`, packetId);
    await redis.expire(`user:${sender.fid}:sent`, 30 * 86400); // 30 days

    return res.status(200).json({ success: true, packet });
  } catch (err) {
    console.error('create error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
