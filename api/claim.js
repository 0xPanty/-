// POST /api/claim - Claim a red packet
// Server calculates amount (lucky/fixed), calls contract, updates Redis
import { createClient } from '@vercel/kv';
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const kv = () => createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const HONGBAO_ADDRESS = process.env.HONGBAO_CONTRACT_ADDRESS;

const ABI = parseAbi([
  'function claimPacket(bytes32 packetId, address claimant, uint256 amount) external',
]);

function calcLuckyAmount(remaining, remainingCount) {
  if (remainingCount === 1) return remaining;
  // Double-average random: each person gets 0.01 ~ 2x average
  const avg = remaining / BigInt(remainingCount);
  const min = BigInt(1); // 0.000001 USDC (1 unit)
  const max = avg * 2n;
  const range = max - min;
  // Simple random using timestamp + Math.random
  const rand = BigInt(Math.floor(Math.random() * Number(range)));
  const amount = min + rand;
  // Ensure at least 1 unit left for each remaining person
  const maxAllowed = remaining - BigInt(remainingCount - 1);
  return amount > maxAllowed ? maxAllowed : amount;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { packetId, claimer } = req.body;
    // claimer: { fid, username, pfpUrl, address }

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
    // Check already claimed
    if (packet.claims.some(c => c.fid === claimer.fid)) {
      return res.status(400).json({ error: 'Already claimed' });
    }

    // Calculate amount
    const remaining = BigInt(packet.remainingAmount);
    const remainingCount = packet.remainingCount;
    let claimAmount;

    if (packet.mode === 'lucky') {
      claimAmount = calcLuckyAmount(remaining, remainingCount);
    } else {
      // Fixed: equal split
      claimAmount = remaining / BigInt(remainingCount);
    }

    // Call contract
    const account = privateKeyToAccount(process.env.SERVER_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(),
    });
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

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
    // Add to claimer's history
    await redis.lpush(`user:${claimer.fid}:claimed`, packetId);
    await redis.expire(`user:${claimer.fid}:claimed`, 30 * 86400);

    return res.status(200).json({
      success: true,
      amount: claimAmount.toString(),
      txHash: hash,
      packet,
    });
  } catch (err) {
    console.error('claim error:', err);
    return res.status(500).json({ error: 'Claim failed' });
  }
}
