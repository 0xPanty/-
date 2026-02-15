import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, Globe } from 'lucide-react';
import { formatUSDC } from '@/utils/format';

interface HomePageProps {
  onCreateNew: () => void;
  onOpenPacket: (id: string) => void;
}

interface PlazaPacket {
  id: string;
  sender: { username: string; pfpUrl: string };
  mode: string;
  totalAmount: string;
  totalCount: number;
  remainingCount: number;
  message?: string;
}

interface Activity {
  type: 'send' | 'claim';
  username: string;
  pfpUrl: string;
  amount: string;
  senderUsername?: string;
  mode: string;
  count?: number;
  time: number;
}

const MODE_LABELS: Record<string, string> = { normal: 'Regular', lucky: 'Lucky Draw', exclusive: 'Exclusive' };
const MODE_ICONS: Record<string, string> = { normal: '💰', lucky: '🎲', exclusive: '🎁' };

function timeAgoShort(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export const HomePage: React.FC<HomePageProps> = ({ onCreateNew, onOpenPacket }) => {
  const { user } = useAuth();
  const [packets, setPackets] = useState<PlazaPacket[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: remove mock data before production
    const MOCK = true;
    if (MOCK) {
      const pfp = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
      setPackets([
        { id: '1', sender: { username: 'vitalik', pfpUrl: pfp('vitalik') }, mode: 'lucky', totalAmount: '50000000', totalCount: 10, remainingCount: 7, message: 'Happy New Year!' },
        { id: '2', sender: { username: 'dwr', pfpUrl: pfp('dwr') }, mode: 'normal', totalAmount: '20000000', totalCount: 5, remainingCount: 3, message: 'gm farcaster' },
        { id: '3', sender: { username: 'jessepollak', pfpUrl: pfp('jesse') }, mode: 'lucky', totalAmount: '100000000', totalCount: 20, remainingCount: 12 },
        { id: '4', sender: { username: 'linda', pfpUrl: pfp('linda') }, mode: 'normal', totalAmount: '10000000', totalCount: 3, remainingCount: 1, message: 'Base is for everyone' },
      ]);
      setActivity([
        { type: 'send', username: 'vitalik', pfpUrl: pfp('vitalik'), amount: '50000000', mode: 'lucky', count: 10, time: Date.now() - 120000 },
        { type: 'claim', username: 'alice', pfpUrl: pfp('alice'), amount: '8500000', senderUsername: 'vitalik', mode: 'lucky', time: Date.now() - 90000 },
        { type: 'claim', username: 'bob', pfpUrl: pfp('bob'), amount: '3200000', senderUsername: 'vitalik', mode: 'lucky', time: Date.now() - 60000 },
        { type: 'send', username: 'dwr', pfpUrl: pfp('dwr'), amount: '20000000', mode: 'normal', count: 5, time: Date.now() - 45000 },
        { type: 'claim', username: 'charlie', pfpUrl: pfp('charlie'), amount: '4000000', senderUsername: 'dwr', mode: 'normal', time: Date.now() - 30000 },
        { type: 'send', username: 'jessepollak', pfpUrl: pfp('jesse'), amount: '100000000', mode: 'lucky', count: 20, time: Date.now() - 20000 },
        { type: 'claim', username: 'dave', pfpUrl: pfp('dave'), amount: '12000000', senderUsername: 'jessepollak', mode: 'lucky', time: Date.now() - 10000 },
        { type: 'claim', username: 'eve', pfpUrl: pfp('eve'), amount: '5000000', senderUsername: 'jessepollak', mode: 'lucky', time: Date.now() - 5000 },
      ]);
      setLoading(false);
      return;
    }

    fetch('/api/plaza')
      .then(r => r.json())
      .then(data => {
        setPackets(data.packets || []);
        setActivity(data.activity || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const [lang, setLang] = useState(() => localStorage.getItem('hb_lang') || 'en');
  const toggleLang = () => {
    const next = lang === 'en' ? 'zh' : 'en';
    setLang(next);
    localStorage.setItem('hb_lang', next);
  };

  return (
    <div className="flex flex-col px-4 pt-0 pb-8">
      {/* Top bar: Logo + Language */}
      <div className="flex items-center justify-between py-3 sticky top-0 z-10 bg-white border-b border-gray-100 -mx-4 px-4">
        <div className="flex items-center gap-1.5">
          {/* Logo placeholder - replace src with your logo */}
          <img src="/icon.png" alt="" className="w-6 h-6 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className="text-sm font-semibold text-gray-700 tracking-tight">HongBao</span>
        </div>
        <button
          onClick={toggleLang}
          className="flex items-center gap-1 px-2 py-1 rounded-full text-gray-400 text-xs active:scale-95 transition-transform"
        >
          <Globe size={12} />
          {lang === 'en' ? 'EN' : '中文'}
        </button>
      </div>

      {/* Cover Templates - horizontal scroll */}
      <div className="mb-5 mt-4 -mx-4">
        <div className="flex items-center gap-2 mb-3 px-4">
          <span className="text-base">🎨</span>
          <h3 className="text-sm font-semibold text-gray-900">Choose a Cover</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
          {[
            { id: 'anime', name: 'Anime', desc: 'Cute anime style', color: 'from-red-500 to-pink-500', emoji: '🌸' },
            { id: 'classic', name: 'Classic', desc: 'Traditional red & gold', color: 'from-red-700 to-yellow-600', emoji: '🏮' },
            { id: 'cyber', name: 'Cyberpunk', desc: 'Neon futuristic', color: 'from-purple-600 to-cyan-500', emoji: '⚡' },
            { id: 'minimal', name: 'Minimal', desc: 'Clean & simple', color: 'from-gray-700 to-gray-900', emoji: '✨' },
            { id: 'lucky', name: 'Fortune', desc: 'Lucky charms', color: 'from-yellow-500 to-orange-500', emoji: '🍀' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => onCreateNew()}
              className="flex-shrink-0 w-36 rounded-2xl overflow-hidden shadow-sm active:scale-95 transition-transform"
            >
              {/* Template preview - replace with actual images at public/templates/{id}.png */}
              <div className={`h-48 bg-gradient-to-br ${t.color} flex flex-col items-center justify-center relative`}>
                <img
                  src={`/templates/${t.id}.png`}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="text-4xl mb-2 relative z-10">{t.emoji}</span>
                <span className="text-white text-xs font-semibold relative z-10">{t.name}</span>
              </div>
              <div className="bg-white px-3 py-2">
                <div className="text-xs font-medium text-gray-700">{t.name}</div>
                <div className="text-[10px] text-gray-400">{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Active packets */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🧧</span>
              <h3 className="text-sm font-semibold text-gray-900">Available Packets</h3>
            </div>

            {packets.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                <div className="text-2xl mb-2">🧧</div>
                <p className="text-gray-400 text-xs">No active packets right now</p>
                <p className="text-gray-300 text-xs mt-1">Be the first to send one!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {packets.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onOpenPacket(p.id)}
                    className="w-full bg-white rounded-xl p-4 shadow-sm text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border-2 border-orange-300 overflow-hidden flex-shrink-0">
                        <img src={p.sender.pfpUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-900 text-sm font-medium truncate">@{p.sender.username}</span>
                          <span className="text-xs">{MODE_ICONS[p.mode]}</span>
                        </div>
                        {p.message && (
                          <div className="text-gray-400 text-xs truncate mt-0.5">"{p.message}"</div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-orange-500 text-sm font-semibold">{formatUSDC(p.totalAmount)}</div>
                        <div className="text-gray-300 text-xs">{p.remainingCount}/{p.totalCount} left</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-orange-500" />
              <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
            </div>

            {activity.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center shadow-sm">
                <p className="text-gray-400 text-xs">No activity yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-50">
                {activity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <img src={a.pfpUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 text-xs text-gray-600">
                      {a.type === 'send' ? (
                        <span>
                          <span className="font-medium text-gray-900">@{a.username}</span>
                          {' sent a '}
                          <span className="text-orange-500 font-medium">{formatUSDC(a.amount)} USDC</span>
                          {' '}{MODE_LABELS[a.mode] || ''} packet
                        </span>
                      ) : (
                        <span>
                          <span className="font-medium text-gray-900">@{a.username}</span>
                          {' claimed '}
                          <span className="text-orange-500 font-medium">{formatUSDC(a.amount)} USDC</span>
                          {a.senderUsername && <> from <span className="font-medium">@{a.senderUsername}</span></>}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-300 text-xs flex-shrink-0">{timeAgoShort(a.time)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
