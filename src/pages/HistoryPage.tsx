import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatUSDC } from '@/utils/format';
import type { RedPacket } from '@/types';

const MODE_LABELS: Record<string, string> = { normal: 'Regular', lucky: 'Lucky', exclusive: 'Exclusive' };

interface HistoryPageProps {
  onOpenPacket: (id: string) => void;
}

const formatDate = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};

// Mock data for preview
const MOCK_RECORDS = [
  { id: '1', sender: { username: 'vitalik', pfpUrl: '', displayName: 'Vitalik', fid: 1 }, mode: 'lucky' as const, totalAmount: '630000', createdAt: Date.now() - 86400000, totalCount: 10, remainingCount: 3, status: 'active' as const, claims: [], expiresAt: 0, message: '' },
  { id: '2', sender: { username: 'dwr', pfpUrl: '', displayName: 'Dan', fid: 2 }, mode: 'lucky' as const, totalAmount: '2130000', createdAt: Date.now() - 86400000, totalCount: 5, remainingCount: 0, status: 'claimed' as const, claims: [], expiresAt: 0, message: '' },
  { id: '3', sender: { username: 'jessepollak', pfpUrl: '', displayName: 'Jesse', fid: 3 }, mode: 'normal' as const, totalAmount: '50000', createdAt: Date.now() - 86400000, totalCount: 3, remainingCount: 1, status: 'active' as const, claims: [], expiresAt: 0, message: '' },
  { id: '4', sender: { username: 'alice', pfpUrl: '', displayName: 'Alice', fid: 4 }, mode: 'lucky' as const, totalAmount: '1060000', createdAt: Date.now() - 172800000, totalCount: 8, remainingCount: 0, status: 'claimed' as const, claims: [], expiresAt: 0, message: '' },
  { id: '5', sender: { username: 'bob', pfpUrl: '', displayName: 'Bob', fid: 5 }, mode: 'normal' as const, totalAmount: '1090000', createdAt: Date.now() - 172800000, totalCount: 5, remainingCount: 2, status: 'active' as const, claims: [], expiresAt: 0, message: '' },
  { id: '6', sender: { username: 'charlie', pfpUrl: '', displayName: 'Charlie', fid: 6 }, mode: 'lucky' as const, totalAmount: '280000', createdAt: Date.now() - 172800000, totalCount: 4, remainingCount: 0, status: 'claimed' as const, claims: [], expiresAt: 0, message: '' },
  { id: '7', sender: { username: 'dave', pfpUrl: '', displayName: 'Dave', fid: 7 }, mode: 'exclusive' as const, totalAmount: '740000', createdAt: Date.now() - 259200000, totalCount: 1, remainingCount: 0, status: 'claimed' as const, claims: [], expiresAt: 0, message: '' },
];

export const HistoryPage: React.FC<HistoryPageProps> = ({ onOpenPacket }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'sent' | 'claimed'>('claimed');
  const [packets, setPackets] = useState<RedPacket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPackets(MOCK_RECORDS as any);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/my-packets?fid=${user.fid}&type=${tab}`)
      .then(r => r.json())
      .then(data => setPackets(data.packets?.length ? data.packets : MOCK_RECORDS as any))
      .catch(() => setPackets(MOCK_RECORDS as any))
      .finally(() => setLoading(false));
  }, [user, tab]);

  const totalAmount = useMemo(() => {
    return packets.reduce((sum, p) => sum + parseFloat(formatUSDC(p.totalAmount)), 0);
  }, [packets]);

  const luckyCount = useMemo(() => {
    return packets.filter(p => p.mode === 'lucky').length;
  }, [packets]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top bar - thin orange */}
      <div className="bg-[#E8833A] flex items-center justify-center h-11">
        <div className="flex items-center gap-6">
          {(['claimed', 'sent'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-[14px] pb-0.5 transition-colors ${
                tab === t ? 'text-white font-medium border-b-2 border-white' : 'text-white/50'
              }`}
            >
              {t === 'sent' ? 'Sent' : 'Received'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats section - white, generous spacing like WeChat */}
      <div className="flex flex-col items-center bg-white pt-10 pb-8 flex-shrink-0">
        {/* Avatar - large with rounded corners */}
        <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden mb-4 shadow-sm">
          <img src={user?.pfpUrl || 'https://i.imgur.com/HYpFhNa.png'} alt="" className="w-full h-full object-cover" />
        </div>
        {/* Name line */}
        <div className="text-gray-700 text-[14px] mb-6">
          {user?.displayName || 'You'} {tab === 'sent' ? 'sent' : 'received'}
        </div>
        {/* Total amount - big bold */}
        <div className={`text-[46px] font-bold leading-none mb-8 ${tab === 'sent' ? 'text-[#E8833A]' : 'text-gray-900'}`}>
          {totalAmount.toFixed(2)}
        </div>
        {/* Stats */}
        {tab === 'sent' ? (
          <div className="text-gray-400 text-[13px]">
            Sent <span className="text-[#E8833A]">{packets.length}</span> red packets
          </div>
        ) : (
          <div className="flex gap-20">
            <div className="text-center">
              <div className="text-gray-900 text-[24px] font-light leading-tight">{packets.length}</div>
              <div className="text-gray-400 text-[12px] mt-1">Received</div>
            </div>
            <div className="text-center">
              <div className="text-gray-900 text-[24px] font-light leading-tight">{luckyCount}</div>
              <div className="text-gray-400 text-[12px] mt-1">Best Luck</div>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-100" />

      {/* Record list - scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div>
            {packets.map((p, i) => {
              const claimed = p.totalCount - p.remainingCount;
              return (
                <button
                  key={p.id}
                  onClick={() => onOpenPacket(p.id)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-gray-50 ${
                    i < packets.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    {tab === 'sent' ? (
                      <>
                        <div className="text-[15px] text-gray-900 font-medium">
                          {MODE_LABELS[p.mode] || 'Regular'} Red Packet
                        </div>
                        <div className="text-[12px] text-gray-400 mt-0.5">
                          {formatDate(p.createdAt)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[15px] text-gray-900 truncate">
                            @{p.sender.username}
                          </span>
                          <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded flex-shrink-0">
                            {MODE_LABELS[p.mode] || 'Regular'}
                          </span>
                        </div>
                        <div className="text-[12px] text-gray-400 mt-0.5">
                          {formatDate(p.createdAt)}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="text-[15px] text-gray-900">
                      {formatUSDC(p.totalAmount)} USDC
                    </div>
                    {tab === 'sent' && (
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {claimed === p.totalCount ? 'Claimed' : 'Pending'} {claimed}/{p.totalCount}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
