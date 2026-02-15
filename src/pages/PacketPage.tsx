import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Share2 } from 'lucide-react';
import { formatUSDC, timeRemaining } from '@/utils/format';
import type { RedPacket } from '@/types';
// @ts-ignore
import { sdk } from '@farcaster/miniapp-sdk';

interface PacketPageProps {
  packetId: string;
  onBack: () => void;
}

export const PacketPage: React.FC<PacketPageProps> = ({ packetId, onBack }) => {
  const { user } = useAuth();
  const [packet, setPacket] = useState<RedPacket | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ amount: string; txHash: string } | null>(null);
  const [error, setError] = useState('');
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [coverLoading, setCoverLoading] = useState(true);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    fetchPacket();
  }, [packetId]);

  // Load cover when packet is fetched
  useEffect(() => {
    if (!packet) return;
    const fid = packet.sender.fid;
    setCoverUrl(`/api/cover?fid=${fid}`);
    setCoverLoading(true);
  }, [packet?.sender.fid]);

  const fetchPacket = async () => {
    try {
      const res = await fetch(`/api/status?id=${packetId}`);
      const data = await res.json();
      if (data.packet) {
        setPacket(data.packet);
        // If user already claimed or is sender, skip cover
        const p = data.packet;
        if (p.claims.some((c: any) => c.fid === user?.fid) || p.sender.fid === user?.fid) {
          setOpened(true);
        }
      }
    } catch {
      setError('Failed to load packet');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpened(true);
  };

  const handleClaim = async () => {
    if (!user || !packet) return;

    try {
      const { ethereum } = window as any;
      if (!ethereum) {
        setError('No wallet found');
        return;
      }

      setClaiming(true);
      setError('');

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packetId,
          claimer: {
            fid: user.fid,
            username: user.username,
            pfpUrl: user.pfpUrl,
            address,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Claim failed');
        return;
      }

      setClaimResult({ amount: data.amount, txHash: data.txHash });
      if (data.packet) setPacket(data.packet);
    } catch (err: any) {
      setError(err.message || 'Claim failed');
    } finally {
      setClaiming(false);
    }
  };

  const handleShare = async () => {
    if (!packet) return;
    try {
      const text = `🧧 @${packet.sender.username} sent a red packet! ${packet.mode === 'lucky' ? '🎲 Lucky Draw' : '💰 Fixed'} · ${formatUSDC(packet.totalAmount)} USDC · ${packet.totalCount} packets`;
      await sdk.actions.composeCast({ text });
    } catch {
      // Fallback
    }
  };

  const alreadyClaimed = packet?.claims.some(c => c.fid === user?.fid);
  const isSender = packet?.sender.fid === user?.fid;
  const isExpired = packet ? Date.now() > packet.expiresAt : false;
  const isFullyClaimed = packet ? packet.remainingCount <= 0 : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-white/20 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!packet) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <div className="text-4xl mb-4">🧧</div>
        <p className="text-white/40">Packet not found or expired</p>
        <button onClick={onBack} className="mt-4 text-red-500 text-sm">Go back</button>
      </div>
    );
  }

  // Cover view - shown before opening
  if (!opened) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 bg-black">
        <button onClick={onBack} className="absolute top-4 left-4 flex items-center gap-1 text-white/40 text-sm z-10">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Cover image from Gemini */}
        <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl shadow-red-900/50 mb-6">
          {coverLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-red-600 to-red-800 z-10">
              <div className="w-16 h-16 rounded-full border-2 border-yellow-500 overflow-hidden mb-4">
                <img src={packet.sender.pfpUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="text-white font-semibold mb-1">@{packet.sender.username}</div>
              <div className="text-yellow-300 text-2xl font-bold mb-2">{formatUSDC(packet.totalAmount)} USDC</div>
              <div className="text-white/40 text-xs mb-4">
                {packet.mode === 'lucky' ? '🎲 Lucky Draw' : '💰 Fixed'} · {packet.totalCount} packets
              </div>
              <div className="w-5 h-5 border-2 border-white/20 border-t-yellow-400 rounded-full animate-spin" />
              <div className="text-white/30 text-xs mt-2">Generating cover...</div>
            </div>
          )}
          <img
            src={coverUrl}
            alt="Red packet cover"
            className="w-full h-full object-cover"
            onLoad={() => setCoverLoading(false)}
            onError={() => setCoverLoading(false)}
          />
        </div>

        {/* Open button */}
        <button
          onClick={handleOpen}
          className="w-48 h-48 rounded-full bg-yellow-500 flex items-center justify-center text-red-900 text-5xl font-bold shadow-xl shadow-yellow-500/30 active:scale-90 transition-transform -mt-28 relative z-20 border-4 border-yellow-400"
        >
          開
        </button>

        <div className="text-white/30 text-xs mt-4">Tap to open</div>
      </div>
    );
  }

  // Opened view - claim + details
  return (
    <div className="flex flex-col px-4 pt-4 pb-8">
      <button onClick={onBack} className="flex items-center gap-1 text-white/40 text-sm mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Red packet card */}
      <div className="bg-gradient-to-b from-red-600 to-red-800 rounded-2xl p-6 mb-6 shadow-xl">
        {/* Sender info */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full border-2 border-yellow-500 overflow-hidden">
            <img src={packet.sender.pfpUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-white font-semibold">@{packet.sender.username}</div>
            <div className="text-white/50 text-xs">{packet.mode === 'lucky' ? '🎲 Lucky Draw' : '💰 Fixed'}</div>
          </div>
        </div>

        {/* Amount */}
        <div className="text-center mb-4">
          <div className="text-yellow-300 text-4xl font-bold mb-1">
            {formatUSDC(packet.totalAmount)} USDC
          </div>
          <div className="text-white/50 text-sm">
            {packet.totalCount - packet.remainingCount}/{packet.totalCount} claimed · {timeRemaining(packet.expiresAt)}
          </div>
        </div>

        {/* Claim button */}
        {claimResult ? (
          <div className="bg-black/20 rounded-xl p-4 text-center">
            <div className="text-yellow-300 text-2xl font-bold mb-1">
              +{formatUSDC(claimResult.amount)} USDC
            </div>
            <div className="text-white/40 text-xs">Claimed successfully!</div>
          </div>
        ) : alreadyClaimed ? (
          <div className="bg-black/20 rounded-xl p-3 text-center text-white/40 text-sm">
            You already claimed this packet
          </div>
        ) : isSender ? (
          <div className="bg-black/20 rounded-xl p-3 text-center text-white/40 text-sm">
            You sent this packet
          </div>
        ) : isExpired ? (
          <div className="bg-black/20 rounded-xl p-3 text-center text-white/40 text-sm">
            This packet has expired
          </div>
        ) : isFullyClaimed ? (
          <div className="bg-black/20 rounded-xl p-3 text-center text-white/40 text-sm">
            All packets have been claimed
          </div>
        ) : (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full py-3 rounded-xl bg-yellow-500 text-red-900 font-bold text-lg active:scale-95 transition-all disabled:opacity-50"
          >
            {claiming ? 'Claiming...' : '🧧 Claim Red Packet'}
          </button>
        )}

        {error && <div className="text-yellow-200 text-xs text-center mt-2">{error}</div>}
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 text-white/60 text-sm font-medium mb-6"
      >
        <Share2 size={16} /> Share via Cast
      </button>

      {/* Claims list */}
      {packet.claims.length > 0 && (
        <div>
          <h3 className="text-white/40 text-xs font-medium mb-3">CLAIMS</h3>
          <div className="space-y-2">
            {packet.claims
              .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
              .map((claim, i) => {
                const isBest = i === 0 && packet.mode === 'lucky' && packet.claims.length > 1;
                return (
                  <div key={claim.fid} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <img src={claim.pfpUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">
                        @{claim.username}
                        {isBest && <span className="ml-1 text-yellow-500 text-xs">🏆 Luckiest</span>}
                      </div>
                    </div>
                    <div className="text-yellow-500 text-sm font-semibold">
                      +{formatUSDC(claim.amount)}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
