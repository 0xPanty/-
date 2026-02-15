// POST /api/claim - Claim a red packet
import { createClient } from '@vercel/kv';
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const kv = () => createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const HONGBAO_ADDRESS = process.env.HONGBAO_CONTRACT_ADDRESS;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

async function getUserScore(fid) {
  try {
    const res = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      headers: { accept: 'application/json', api_key: NEYNAR_API_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user = data.users?.[0];
    return user?.experimental?.neynar_user_score ?? null;
  } catch { return null; }
}

const ABI = parseAbi([
  'function claimPacket(bytes32 packetId, address claimant, uint256 amount) external',
]);

function calcLuckyAmount(remaining, remainingCount) {
  if (remainingCount === 1) return remaining;
  const avg = remaining / BigInt(remainingCount);
  const min = BigInt(1);
  const max = avg * 2n;
  const range = max - min;
  const rand = BigInt(Math.floor(Math.random() * Number(range)));
  const amount = min + rand;
  const maxAllowed = remaining - BigInt(remainingCount - 1);
  return amount > maxAllowed ? maxAllowed : amount;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { packetId, claimer } = req.body;

    if (!packetId || !claimer?.fid || !claimer?.address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const redis = kv();
    const raw = await redis.get(`packet:${packetId}`);
    if (!raw) return res.status(404).json({ error: 'Packet not found or expired' });

    const packet = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (packet.status !== 'active') {
      return res.status(400).json({ error: 'Packet is no longer active' });
    }
    if (Date.now() > packet.expiresAt) {
      return res.status(400).json({ error: 'Packet has expired' });
    }
    if (packet.remainingCount <= 0) {
      return res.status(400).json({ error: 'Packet fully claimed' });
    }
    if (packet.claims.some(c => c.fid === claimer.fid)) {
      return res.status(400).json({ error: 'Already claimed' });
    }

    // Exclusive mode: only the designated recipient can claim
    if (packet.mode === 'exclusive' && packet.recipientFid && claimer.fid !== packet.recipientFid) {
      return res.status(403).json({ error: 'This packet is for someone else' });
    }

    // Neynar score check
    if (packet.minScore && packet.minScore > 0) {
      const score = await getUserScore(claimer.fid);
      if (score === null) {
        return res.status(400).json({ error: 'Unable to verify your account score' });
      }
      if (score < packet.minScore) {
        return res.status(403).json({ error: `Minimum Neynar score ${packet.minScore} required. Your score: ${score.toFixed(2)}` });
      }
    }

    // Calculate amount
    const remaining = BigInt(packet.remainingAmount);
    const remainingCount = packet.remainingCount;
    let claimAmount;

    if (packet.mode === 'lucky') {
      claimAmount = calcLuckyAmount(remaining, remainingCount);
    } else {
      // normal + exclusive: equal split (exclusive is always 1 person)
      claimAmount = remaining / BigInt(remainingCount);
    }

    // Call contract
    const account = privateKeyToAccount(process.env.SERVER_PRIVATE_KEY);
    const walletClient = createWalletClient({ account, chain: base, transport: http() });
    const publicClient = createPublicClient({ chain: base, transport: http() });

    const hash = await walletClient.writeContract({
      address: HONGBAO_ADDRESS,
      abi: ABI,
      functionName: 'claimPacket',
      args: [packetId, claimer.address, claimAmount],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    // Update Redis
    const claim = {
      fid: claimer.fid,
      username: claimer.username,
      pfpUrl: claimer.pfpUrl,
      amount: claimAmount.toString(),
      claimedAt: Date.now(),
      txHash: hash,
    };
    packet.claims.push(claim);
    packet.remainingAmount = (remaining - claimAmount).toString();
    packet.remainingCount -= 1;
    if (packet.remainingCount === 0) packet.status = 'claimed';

    await redis.set(`packet:${packetId}`, JSON.stringify(packet), { ex: 86400 + 3600 });
    await redis.lpush(`user:${claimer.fid}:claimed`, packetId);
    await redis.expire(`user:${claimer.fid}:claimed`, 30 * 86400);

    // Activity feed
    const activity = JSON.stringify({
      type: 'claim',
      username: claimer.username,
      pfpUrl: claimer.pfpUrl,
      amount: claimAmount.toString(),
      senderUsername: packet.sender.username,
      mode: packet.mode,
      time: Date.now(),
    });
    await redis.lpush('plaza:activity', activity);
    await redis.ltrim('plaza:activity', 0, 99);
    await redis.expire('plaza:activity', 86400);

    return res.status(200).json({ success: true, amount: claimAmount.toString(), txHash: hash, packet });
  } catch (err) {
    console.error('claim error:', err);
    return res.status(500).json({ error: 'Claim failed' });
  }
}
