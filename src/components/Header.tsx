import React from 'react';
import type { Page } from '@/types';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const PlazaIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V10.5Z"
      stroke={active ? '#D4A017' : '#999'} strokeWidth="1.8" fill={active ? 'rgba(212,160,23,0.1)' : 'none'} />
    <rect x="9" y="14" width="6" height="7" rx="0.5"
      stroke={active ? '#D4A017' : '#999'} strokeWidth="1.5" fill={active ? 'rgba(212,160,23,0.15)' : 'none'} />
  </svg>
);

const SendIcon = ({ active }: { active: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    {/* Red packet shape */}
    <rect x="6" y="3" width="16" height="22" rx="2.5"
      fill={active ? '#CC2929' : '#E8E8E8'} />
    <rect x="6" y="3" width="16" height="10" rx="2.5"
      fill={active ? '#E03030' : '#D5D5D5'} />
    {/* Gold circle seal */}
    <circle cx="14" cy="13" r="4"
      fill={active ? '#D4A017' : '#BBB'} />
    <circle cx="14" cy="13" r="2.8"
      fill={active ? '#F0C850' : '#CCC'} stroke={active ? '#D4A017' : '#BBB'} strokeWidth="0.5" />
    {/* Plus sign in circle */}
    <line x1="14" y1="11.2" x2="14" y2="14.8" stroke={active ? '#8B6914' : '#999'} strokeWidth="1.2" strokeLinecap="round" />
    <line x1="12.2" y1="13" x2="15.8" y2="13" stroke={active ? '#8B6914' : '#999'} strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const HistoryIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    {/* Scroll/book shape */}
    <path d="M6 4C6 3.45 6.45 3 7 3H17C17.55 3 18 3.45 18 4V20C18 20.55 17.55 21 17 21H7C6.45 21 6 20.55 6 20V4Z"
      stroke={active ? '#D4A017' : '#999'} strokeWidth="1.5" fill={active ? 'rgba(212,160,23,0.08)' : 'none'} />
    {/* Lines */}
    <line x1="9" y1="8" x2="15" y2="8" stroke={active ? '#D4A017' : '#BBB'} strokeWidth="1.2" strokeLinecap="round" />
    <line x1="9" y1="11.5" x2="15" y2="11.5" stroke={active ? '#D4A017' : '#BBB'} strokeWidth="1.2" strokeLinecap="round" />
    <line x1="9" y1="15" x2="13" y2="15" stroke={active ? '#D4A017' : '#BBB'} strokeWidth="1.2" strokeLinecap="round" />
    {/* Decorative dot */}
    <circle cx="12" cy="18.5" r="1" fill={active ? '#D4A017' : '#CCC'} />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
  const navItems: { page: Page; icon: (active: boolean) => React.ReactNode; label: string }[] = [
    { page: 'home', icon: (a: boolean) => <PlazaIcon active={a} />, label: 'Plaza' },
    { page: 'create', icon: (a) => <SendIcon active={a} />, label: 'Send' },
    { page: 'history', icon: (a) => <HistoryIcon active={a} />, label: 'History' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(255,252,247,0.99) 100%)',
        borderTop: '1px solid rgba(212,160,23,0.15)',
        boxShadow: '0 -2px 12px rgba(180,120,0,0.06)',
      }}
    >
      {/* Top decorative line */}
      <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, transparent 10%, #D4A017 30%, #F0C850 50%, #D4A017 70%, transparent 90%)' }} />

      <div className="flex items-center justify-around py-1.5">
        {navItems.map(({ page, icon, label }) => {
          const active = currentPage === page;
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className="flex flex-col items-center gap-0.5 px-5 py-1 transition-all active:scale-90"
            >
              {/* Send button gets special treatment - larger, elevated */}
              {page === 'create' ? (
                <div className="-mt-5 rounded-full p-1 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #CC2929 0%, #E03030 100%)',
                    boxShadow: '0 4px 14px rgba(204,41,41,0.35)',
                  }}
                >
                  {icon(true)}
                </div>
              ) : (
                icon(active)
              )}
              <span className={`text-[10px] font-medium ${
                active ? 'text-[#B8860B]' : 'text-gray-400'
              }`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
