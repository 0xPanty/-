import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PlusCircle } from 'lucide-react';

interface HomePageProps {
  onCreateNew: () => void;
  onOpenPacket: (id: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onCreateNew }) => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center px-4 pt-12 pb-8">
      {/* Avatar */}
      <div className="w-24 h-24 rounded-full border-4 border-yellow-500 overflow-hidden mb-4 shadow-lg shadow-yellow-500/20">
        {user?.pfpUrl ? (
          <img src={user.pfpUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-red-900 flex items-center justify-center text-3xl">🧧</div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-white mb-1">
        Welcome, {user?.displayName || user?.username || 'anon'}
      </h2>
      <p className="text-white/30 text-sm mb-8">Send USDC red packets on Base</p>

      {/* Create button */}
      <button
        onClick={onCreateNew}
        className="w-full max-w-xs flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-base active:scale-95 transition-all shadow-lg shadow-red-600/30"
      >
        <PlusCircle size={20} />
        Send Red Packet
      </button>

      {/* Info cards */}
      <div className="w-full max-w-xs mt-8 space-y-3">
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-yellow-500 text-sm font-medium mb-1">🎲 Lucky Draw</div>
          <p className="text-white/40 text-xs">Random amounts — test your luck!</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-yellow-500 text-sm font-medium mb-1">💰 Fixed Amount</div>
          <p className="text-white/40 text-xs">Everyone gets the same amount, fair and simple.</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <div className="text-yellow-500 text-sm font-medium mb-1">⏰ 24h Expiry</div>
          <p className="text-white/40 text-xs">Unclaimed funds return to sender automatically.</p>
        </div>
      </div>
    </div>
  );
};
