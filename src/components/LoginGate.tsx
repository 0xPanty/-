import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, sdkReady } = useAuth();

  if (!sdkReady) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="w-5 h-5 border-2 border-white/20 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black px-8 text-center">
        <div className="text-5xl mb-4">🧧</div>
        <h1 className="text-2xl font-bold text-white mb-1">HongBao</h1>
        <p className="text-white/30 text-sm mb-8">Red Packets on Farcaster</p>
        <a
          href="https://farcaster.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full max-w-xs py-3 rounded-lg bg-red-600 text-white font-medium text-sm text-center active:scale-95 transition-transform"
        >
          Open in Farcaster
        </a>
      </div>
    );
  }

  return <>{children}</>;
};
