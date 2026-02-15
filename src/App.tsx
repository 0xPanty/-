import { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { LoginGate } from '@/components/LoginGate';
import { Header } from '@/components/Header';
import { HomePage } from '@/pages/HomePage';
import { CreatePage } from '@/pages/CreatePage';
import { PacketPage } from '@/pages/PacketPage';
import { HistoryPage } from '@/pages/HistoryPage';
import type { Page } from '@/types';

function AppContent() {
  const [page, setPage] = useState<Page>('home');
  const [activePacketId, setActivePacketId] = useState<string>('');

  const openPacket = (id: string) => {
    setActivePacketId(id);
    setPage('packet');
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-black text-white">
      <Header currentPage={page} onNavigate={setPage} />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {page === 'home' && <HomePage onCreateNew={() => setPage('create')} onOpenPacket={openPacket} />}
        {page === 'create' && <CreatePage onSuccess={openPacket} onBack={() => setPage('home')} />}
        {page === 'packet' && <PacketPage packetId={activePacketId} onBack={() => setPage('home')} />}
        {page === 'history' && <HistoryPage onOpenPacket={openPacket} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LoginGate>
        <AppContent />
      </LoginGate>
    </AuthProvider>
  );
}
