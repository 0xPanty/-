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

const MODE_LABELS = { normal: 'Regular', lucky: 'Lucky Draw', exclusive: 'Exclusive' };

export const PacketPage: React.FC<PacketPageProps> = ({ packetId, onBack }) => {
  const { user } = useAuth();
  const [packet, setPacket] = useState<RedPacket | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ amount: string; txHash: string } | null>(null);
  const [error, setError] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverLoading, setCoverLoading] = useState(true);
  const [opened, setOpened] = useState(false);

  useEffect(() => { fetchPacket(); }, [packetId]);

  useEffect(() => {
    if (!packet) return;
    setCoverUrl(`/api/cover?fid=${packet.sender.fid}`);
    setCoverLoading(true);
  }, [packet?.sender.fid]);

  const fetchPacket = async () => {
    try {
      const res = await fetch(`/api/status?id=${packetId}`);
      const data = await res.json();
      if (data.packet) {
        setPacket(data.packet);
        const p = data.packet;
        if (p.claims.some((c: any) => c.fid === user?.fid) || p.sender.fid === user?.fid) {
          setOpened(true);
        }
      }
    } catch { setError('Failed to load packet'); }
    finally { setLoading(false); }
  };

  const handleClaim = async () => {
    if (!user || !packet) return;
    try {
      const { ethereum } = window as any;
      if (!ethereum) { setError('No wallet found'); return; }
      setClaiming(true); setError('');
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const res = await fetch('/api/claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packetId, claimer: { fid: user.fid, username: user.username, pfpUrl: user.pfpUrl, address: accounts[0] } }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Claim failed'); return; }
      setClaimResult({ amount: data.amount, txHash: data.txHash });
      if (data.packet) setPacket(data.packet);
    } catch (err: any) { setError(err.message || 'Claim failed'); }
    finally { setClaiming(false); }
  };

  const handleShare = async () => {
    if (!packet) return;
    try {
      const modeLabel = MODE_LABELS[packet.mode] || packet.mode;
      const text = `🧧 @${packet.sender.username} sent a red packet! ${modeLabel} · ${formatUSDC(packet.totalAmount)} USDC`;
      await sdk.actions.composeCast({ text });
    } catch {}
  };

  const alreadyClaimed = packet?.claims.some(c => c.fid === user?.fid);
  const isSender = packet?.sender.fid === user?.fid;
  const isExpired = packet ? Date.now() > packet.expiresAt : false;
  const isFullyClaimed = packet ? packet.remainingCount <= 0 : false;
  const isExclusiveNotMe = packet?.mode === 'exclusive' && packet.recipientFid && user?.fid !== packet.recipientFid;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="w-5 h-5 border-2 border-white/20 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!packet) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 bg-black">
        <div className="text-4xl mb-4">🧧</div>
        <p className="text-white/40">Packet not found or expired</p>
        <button onClick={onBack} className="mt-4 text-red-500 text-sm">Go back</button>
      </div>
    );
  }

  // Cover view
  if (!opened) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 bg-black relative">
        <button onClick={onBack} className="absolute top-4 left-4 flex items-center gap-1 text-white/40 text-sm z-10">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl shadow-red-900/50 mb-6">
          {coverLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-red-600 to-red-800 z-10">
              <div className="w-16 h-16 rounded-full border-2 border-yellow-500 overflow-hidden mb-4">
                <img src={packet.sender.pfpUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="text-white font-semibold mb-1">@{packet.sender.username}</div>
              <div className="text-yellow-300 text-2xl font-bold mb-2">{formatUSDC(packet.totalAmount)} USDC</div>
              <div className="text-white/40 text-xs mb-4">
                {MODE_LABELS[packet.mode]} · {packet.totalCount} {packet.totalCount > 1 ? 'packets' : 'packet'}
              </div>
              <div className="w-5 h-5 border-2 border-white/20 border-t-yellow-400 rounded-full animate-spin" />
              <div className="text-white/30 text-xs mt-2">Generating cover...</div>
            </div>
          )}
          <img src={coverUrl} alt="" className="w-full h-full object-cover" onLoad={() => setCoverLoading(false)} onError={() => setCoverLoading(false)} />
        </div>

        <button
          onClick={() => setOpened(true)}
          className="w-44 h-44 rounded-full bg-yellow-500 flex items-center justify-center text-red-900 text-5xl font-bold shadow-xl shadow-yellow-500/30 active:scale-90 transition-transform -mt-28 relative z-20 border-4 border-yellow-400"
        >
          開
        </button>
        <div className="text-white/30 text-xs mt-4">Tap to open</div>
      </div>
    );
  }

  // Opened view
  return (
    <div className="flex flex-col px-4 pt-4 pb-8 bg-black min-h-full">
      <button onClick={onBack} className="flex items-center gap-1 text-white/40 text-sm mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="bg-gradient-to-b from-red-600 to-red-800 rounded-2xl p-6 mb-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-yellow-500 overflow-hidden">
            <img src={packet.sender.pfpUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-white font-semibold">@{packet.sender.username}</div>
            <div className="text-white/50 text-xs">{MODE_LABELS[packet.mode]}</div>
          </div>
        </div>

        {(packet as any).message && (
          <div className="text-white/70 text-sm text-center mb-4 italic">"{(packet as any).message}"</div>
        )}

        {packet.mode === 'exclusive' && packet.recipientUsername && (
          <div className="text-white/50 text-xs text-center mb-3">
            Exclusive for @{packet.recipientUsername}
          </div>
        )}

        <div className="text-center mb-4">
          <div className="text-yellow-300 text-4xl font-bold mb-1">{formatUSDC(packet.totalAmount)} USDC</div>
          <div className="text-white/50 text-sm">
            {packet.totalCount - packet.remainingCount}/{packet.totalCount} claimed · {timeRemaining(packet.expiresAt)}
          </div>
        </div>

        {claimResult ? (
          <div className="bg-black/20 rounded-xl p-4 text-center">
            <div className="text-yellow-300 text-2xl font-bold mb-1">+{formatUSDC(claimResult.amount)} USDC</div>
            <div className="text-white/40 text-xs">Claimed successfully!</div>
          </div>
        ) : alreadyClaimed ? (
          <div className="bg-black/20 rounded-xl p-3 text-center text-white/40 text-sm">You already claimed this packet</div>
        ) : isSender ? (
          <div className="bg-black/20 rounded-xl p-3 text-center text-white/40 text-sm">You sent this packet</div>
        ) : isExclusiveNotMe ? (
          <div className="bg-black/20 rounded-xl p-3 text-center text-white/40 text-sm">This packet is for @{packet.recipientUsername}</div>
        ) : isExpired ? (
          <div className="bg-black/20 rounded-xl p-3 text-center text-white/40 text-sm">This packet has expired</div>
        ) : isFullyClaimed ? (
          <div className="bg-black/20 rounded-xl p-3 text-center text-white/40 text-sm">All packets have been claimed</div>
        ) : (
          <button onClick={handleClaim} disabled={claiming} className="w-full py-3 rounded-xl bg-yellow-500 text-red-900 font-bold text-lg active:scale-95 transition-all disabled:opacity-50">
            {claiming ? 'Claiming...' : '🧧 Claim'}
          </button>
        )}
        {error && <div className="text-yellow-200 text-xs text-center mt-2">{error}</div>}
      </div>

      <button onClick={handleShare} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 text-white/60 text-sm font-medium mb-4">
        <Share2 size={16} /> Share via Cast
      </button>

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
                    <div className="text-yellow-500 text-sm font-semibold">+{formatUSDC(claim.amount)}</div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
