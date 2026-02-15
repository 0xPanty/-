import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatUSDC, timeAgo } from '@/utils/format';
import type { RedPacket } from '@/types';

interface HistoryPageProps {
  onOpenPacket: (id: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onOpenPacket }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'sent' | 'claimed'>('sent');
  const [packets, setPackets] = useState<RedPacket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/my-packets?fid=${user.fid}&type=${tab}`)
      .then(r => r.json())
      .then(data => setPackets(data.packets || []))
      .catch(() => setPackets([]))
      .finally(() => setLoading(false));
  }, [user, tab]);

  return (
    <div className="flex flex-col px-4 pt-4 pb-8">
      <h2 className="text-xl font-bold text-white mb-4">History</h2>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6">
        {(['sent', 'claimed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === t ? 'bg-red-600 text-white' : 'bg-white/5 text-white/40'
            }`}
          >
            {t === 'sent' ? '📤 Sent' : '📥 Received'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-white/20 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : packets.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-3">🧧</div>
          <p className="text-white/30 text-sm">
            {tab === 'sent' ? 'No packets sent yet' : 'No packets claimed yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {packets.map(p => (
            <button
              key={p.id}
              onClick={() => onOpenPacket(p.id)}
              className="w-full flex items-center gap-3 bg-white/5 rounded-xl p-4 text-left active:scale-[0.98] transition-transform"
            >
              <div className="w-10 h-10 rounded-full border-2 border-yellow-500/50 overflow-hidden flex-shrink-0">
                <img src={p.sender.pfpUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium truncate">
                    @{p.sender.username}
                  </span>
                  <span className="text-white/20 text-xs">
                    {p.mode === 'lucky' ? '🎲' : '💰'}
                  </span>
                </div>
                <div className="text-white/30 text-xs">
                  {p.totalCount - p.remainingCount}/{p.totalCount} claimed · {timeAgo(p.createdAt)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-yellow-500 text-sm font-semibold">
                  {formatUSDC(p.totalAmount)} USDC
                </div>
                <div className={`text-xs ${
                  p.status === 'active' ? 'text-green-500' :
                  p.status === 'claimed' ? 'text-white/30' :
                  'text-red-400'
                }`}>
                  {p.status}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
