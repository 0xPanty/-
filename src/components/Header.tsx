import React from 'react';
import { Home, PlusCircle, Clock } from 'lucide-react';
import type { Page } from '@/types';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
  const navItems: { page: Page; icon: React.ReactNode; label: string }[] = [
    { page: 'home', icon: <Home size={18} />, label: 'Home' },
    { page: 'create', icon: <PlusCircle size={18} />, label: 'Send' },
    { page: 'history', icon: <Clock size={18} />, label: 'History' },
  ];

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
      <div className="flex items-center gap-2">
        <span className="text-xl">🧧</span>
        <span className="text-base font-bold text-white">HongBao</span>
      </div>
      <nav className="flex gap-1">
        {navItems.map(({ page, icon, label }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              currentPage === page
                ? 'bg-red-600 text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
};
