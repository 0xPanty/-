import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { parseUSDC } from '@/utils/format';
import { USDC_ADDRESS, HONGBAO_CONTRACT_ADDRESS } from '@/utils/constants';
import { ERC20_ABI, HONGBAO_ABI } from '@/utils/abi';
import type { PacketMode } from '@/types';

interface CreatePageProps {
  onSuccess: (packetId: string) => void;
  onBack: () => void;
}

const MODE_LABELS: Record<PacketMode, string> = {
  normal: 'Regular',
  lucky: 'Lucky Draw',
  exclusive: 'Exclusive',
};

export const CreatePage: React.FC<CreatePageProps> = ({ onSuccess, onBack }) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<PacketMode>('normal');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [count, setCount] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [hidePlaza, setHidePlaza] = useState(false);
  const [minScore, setMinScore] = useState('');
  const [scoreDragging, setScoreDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'approve' | 'create' | 'register'>('form');

  // Exclusive mode: recipient search
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientResults, setRecipientResults] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<{ fid: number; username: string; pfpUrl: string } | null>(null);
  const [searching, setSearching] = useState(false);

  // Cover preview
  const [coverUrl, setCoverUrl] = useState('');
  const [coverLoading, setCoverLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setCoverUrl(`/api/cover?fid=${user.fid}`);
      setCoverLoading(true);
    }
  }, [user?.fid]);

  // Search users for exclusive mode
  const searchUser = async (q: string) => {
    if (q.length < 2) { setRecipientResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/search-user?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setRecipientResults(data.users || []);
    } catch { setRecipientResults([]); }
    finally { setSearching(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => { if (recipientQuery) searchUser(recipientQuery); }, 400);
    return () => clearTimeout(t);
  }, [recipientQuery]);

  // Calculate display amount
  const countNum = parseInt(count) || 0;
  const amountNum = parseFloat(amount) || 0;
  let displayTotal = 0;
  if (mode === 'normal') displayTotal = amountNum * countNum; // per person * count
  else if (mode === 'lucky') displayTotal = amountNum; // total amount
  else displayTotal = amountNum; // exclusive: single amount

  const handleSubmit = async () => {
    if (mode === 'exclusive' && !selectedRecipient) {
      setError('Please select a recipient'); return;
    }
    if (!amount || amountNum <= 0) {
      setError('Please enter amount'); return;
    }
    if (mode !== 'exclusive' && (!count || countNum <= 0)) {
      setError('Please enter packet count'); return;
    }
    if (mode !== 'exclusive' && countNum > 100) {
      setError('Maximum 100 packets'); return;
    }

    const finalCount = mode === 'exclusive' ? 1 : countNum;
    const finalAmountRaw = mode === 'normal'
      ? parseUSDC((amountNum * finalCount).toFixed(6))
      : parseUSDC(amount);

    setError('');
    setLoading(true);

    try {
      const packetId = ('0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;

      setStep('approve');
      const { ethereum } = window as any;
      if (!ethereum) { setError('No wallet found'); setLoading(false); return; }

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const userAddress = accounts[0];

      const chainId = await ethereum.request({ method: 'eth_chainId' });
      if (parseInt(chainId, 16) !== 8453) {
        await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x2105' }] });
      }

      const { encodeFunctionData } = await import('viem');
      const approveData = encodeFunctionData({
        abi: ERC20_ABI, functionName: 'approve',
        args: [HONGBAO_CONTRACT_ADDRESS, finalAmountRaw],
      });
      await ethereum.request({ method: 'eth_sendTransaction', params: [{ from: userAddress, to: USDC_ADDRESS, data: approveData }] });

      setStep('create');
      const createData = encodeFunctionData({
        abi: HONGBAO_ABI, functionName: 'createPacket',
        args: [packetId, BigInt(finalCount), finalAmountRaw, mode === 'lucky'],
      });
      const txHash = await ethereum.request({ method: 'eth_sendTransaction', params: [{ from: userAddress, to: HONGBAO_CONTRACT_ADDRESS, data: createData }] });

      setStep('register');
      const body: any = {
        packetId, mode, totalAmount: finalAmountRaw.toString(), totalCount: finalCount, txHash,
        message: message || undefined, hidePlaza,
        minScore: minScore ? parseFloat(minScore) : undefined,
        sender: { fid: user!.fid, username: user!.username, displayName: user!.displayName, pfpUrl: user!.pfpUrl },
      };
      if (mode === 'exclusive' && selectedRecipient) {
        body.recipientFid = selectedRecipient.fid;
        body.recipientUsername = selectedRecipient.username;
      }
      const res = await fetch('/api/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Failed to register packet');

      onSuccess(packetId);
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally { setLoading(false); setStep('form'); }
  };

  return (
    <div className="flex flex-col h-full bg-[#EDEDED]">
      {/* Header - white bg, centered title */}
      <div className="flex items-center justify-between px-4 h-11 bg-white">
        <button onClick={onBack} className="text-gray-800"><ArrowLeft size={20} /></button>
        <span className="text-[17px] font-medium text-gray-900">Send Red Packet</span>
        <div className="w-5" />
      </div>

      {/* Mode selector */}
      <div className="relative px-4 pt-3 pb-2">
        <button
          onClick={() => setShowModeMenu(!showModeMenu)}
          className="flex items-center gap-1 text-[13px] font-medium text-orange-500"
        >
          {MODE_LABELS[mode]} <ChevronDown size={13} />
        </button>
        {showModeMenu && (
          <div className="absolute top-10 left-4 bg-white rounded-lg shadow-lg border border-gray-100 z-20 overflow-hidden">
            {(['normal', 'lucky', 'exclusive'] as PacketMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setShowModeMenu(false); }}
                className={`block w-full text-left px-4 py-2.5 text-[13px] ${mode === m ? 'text-orange-500 bg-orange-50' : 'text-gray-700'}`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Main card group - joined rows like WeChat */}
        <div className="mx-4 bg-white rounded-lg overflow-hidden">
          {/* Exclusive: recipient selector */}
          {mode === 'exclusive' && (
            <>
              {selectedRecipient ? (
                <div className="flex items-center justify-between px-4 h-[52px] border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <img src={selectedRecipient.pfpUrl} alt="" className="w-8 h-8 rounded-full" />
                    <span className="text-[15px] text-gray-900">@{selectedRecipient.username}</span>
                  </div>
                  <button onClick={() => setSelectedRecipient(null)} className="text-gray-400 text-[13px]">Change</button>
                </div>
              ) : (
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2 bg-[#F7F7F7] rounded-lg px-3 py-2">
                    <Search size={14} className="text-gray-400" />
                    <input
                      type="text"
                      value={recipientQuery}
                      onChange={e => setRecipientQuery(e.target.value)}
                      placeholder="Search username..."
                      className="flex-1 bg-transparent text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none"
                    />
                    {searching && <div className="w-3 h-3 border border-gray-300 border-t-orange-500 rounded-full animate-spin" />}
                  </div>
                  {recipientResults.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      {recipientResults.map((u: any) => (
                        <button
                          key={u.fid}
                          onClick={() => { setSelectedRecipient({ fid: u.fid, username: u.username, pfpUrl: u.pfp_url }); setRecipientResults([]); setRecipientQuery(''); }}
                          className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-gray-50"
                        >
                          <img src={u.pfp_url} alt="" className="w-7 h-7 rounded-full" />
                          <span className="text-[14px] text-gray-700">@{u.username}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Packet count */}
          {mode !== 'exclusive' && (
            <div className="flex items-center justify-between px-4 h-[52px] border-b border-gray-100">
              <span className="text-[15px] text-gray-900">Packets</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={count}
                  onChange={e => setCount(e.target.value)}
                  placeholder="Enter count"
                  min="1" max="100" step="1"
                  className="text-right text-[15px] text-gray-400 placeholder:text-gray-300 focus:outline-none focus:text-gray-900 w-32 bg-transparent"
                />
                <span className="text-gray-400 text-[13px]">pcs</span>
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="flex items-center justify-between px-4 h-[52px]">
            <div className="flex items-center gap-2">
              {mode === 'lucky' && <span className="text-orange-500 text-[11px] font-bold bg-orange-50 px-1.5 py-0.5 rounded">Lucky</span>}
              <span className="text-[15px] text-gray-900">
                {mode === 'normal' ? 'Per Packet' : mode === 'lucky' ? 'Total Amount' : 'Amount'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                min="0.01" step="0.01"
                className="text-right text-[15px] text-gray-400 placeholder:text-gray-300 focus:outline-none focus:text-gray-900 w-32 bg-transparent"
              />
              <span className="text-gray-400 text-[13px]">USDC</span>
            </div>
          </div>
        </div>

        {/* Message - separate card */}
        <div className="mx-4 mt-2 bg-white rounded-lg">
          <div className="flex items-center px-4 h-[52px]">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Best wishes!"
              maxLength={50}
              className="flex-1 text-[15px] text-gray-900 placeholder:text-gray-300 focus:outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Cover + advanced - separate card group */}
        <div className="mx-4 mt-2 bg-white rounded-lg overflow-hidden">
          {/* Cover entry */}
          <button
            onClick={() => {/* TODO: open cover picker */}}
            className="flex items-center justify-between w-full px-4 h-[52px] border-b border-gray-100"
          >
            <span className="text-[15px] text-gray-900">Red Packet Cover</span>
            <div className="flex items-center gap-2">
              {coverUrl && (
                <div className="w-7 h-9 rounded overflow-hidden flex-shrink-0">
                  <img src={coverUrl} alt="" className="w-full h-full object-cover" onLoad={() => setCoverLoading(false)} onError={() => setCoverLoading(false)} />
                </div>
              )}
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </button>

          {/* Hide from plaza */}
          {mode !== 'exclusive' && (
            <div className="flex items-center justify-between px-4 h-[52px] border-b border-gray-100">
              <span className="text-[15px] text-gray-900">Hide from Plaza</span>
              <button
                onClick={() => setHidePlaza(!hidePlaza)}
                className={`w-[42px] h-[25px] rounded-full transition-colors relative ${hidePlaza ? 'bg-orange-500' : 'bg-gray-200'}`}
              >
                <div className={`w-[21px] h-[21px] bg-white rounded-full shadow-sm absolute top-[2px] transition-transform ${hidePlaza ? 'translate-x-[19px]' : 'translate-x-[2px]'}`} />
              </button>
            </div>
          )}

          {/* Neynar score */}
          {mode !== 'exclusive' && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[15px] text-gray-900">Min Neynar Score</span>
                <span className={`text-[13px] font-medium ${minScore ? 'text-orange-500' : 'text-gray-300'}`}>
                  {minScore ? parseFloat(minScore).toFixed(1) : 'Off'}
                </span>
              </div>
              {(() => {
                const pct = minScore ? parseFloat(minScore) * 100 : 0;
                return (
                  <div className="relative pt-8 pb-1">
                    {scoreDragging && minScore && (
                      <div className="absolute -top-1 transition-none pointer-events-none" style={{ left: `calc(${pct}% - 20px)` }}>
                        <div className="bg-orange-500 text-white text-xs font-bold rounded-lg px-2.5 py-1.5 shadow-lg relative" style={{ transform: 'scale(1.15)', transformOrigin: 'bottom center' }}>
                          {parseFloat(minScore).toFixed(2)}
                          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-orange-500 rotate-45" />
                        </div>
                      </div>
                    )}
                    <div className="relative h-1.5 rounded-full bg-gray-100">
                      <div className="absolute h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all" style={{ width: `${pct}%` }} />
                      <div className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-orange-500 shadow-md transition-all" style={{
                        left: `calc(${pct}% - ${scoreDragging ? 12 : 9}px)`,
                        width: scoreDragging ? 24 : 18, height: scoreDragging ? 24 : 18,
                        boxShadow: scoreDragging ? '0 0 12px rgba(249,115,22,0.4)' : '0 1px 4px rgba(0,0,0,0.15)',
                      }} />
                    </div>
                    <input type="range" min="0" max="100" step="5" value={pct}
                      onChange={e => { const v = parseInt(e.target.value); setMinScore(v === 0 ? '' : (v / 100).toFixed(2)); }}
                      onMouseDown={() => setScoreDragging(true)} onMouseUp={() => setScoreDragging(false)}
                      onTouchStart={() => setScoreDragging(true)} onTouchEnd={() => setScoreDragging(false)}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer" style={{ height: 32, top: -4 }}
                    />
                  </div>
                );
              })()}
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-300">Off</span>
                <span className="text-[10px] text-gray-300">0.5</span>
                <span className="text-[10px] text-gray-300">1.0</span>
              </div>
            </div>
          )}
        </div>

        {/* Total amount display */}
        <div className="text-center pt-10 pb-4">
          <span className="text-[42px] font-light text-gray-900">
            {displayTotal > 0 ? displayTotal.toFixed(2) : '0.00'}
          </span>
          <span className="text-[16px] text-gray-400 ml-1.5">USDC</span>
        </div>

        {error && <div className="text-red-500 text-[13px] text-center mb-3 px-4">{error}</div>}

        {/* Submit button */}
        <div className="px-4 pb-4">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full h-[44px] rounded-lg font-medium text-[16px] transition-all ${
              loading
                ? 'bg-orange-300 text-white cursor-not-allowed'
                : 'bg-orange-500 text-white active:bg-orange-600'
            }`}
          >
            {loading
              ? step === 'approve' ? 'Approving USDC...'
              : step === 'create' ? 'Creating on-chain...'
              : step === 'register' ? 'Registering...'
              : 'Processing...'
              : 'Send Red Packet'}
          </button>
        </div>

        {/* Footer hint */}
        <div className="text-center pb-6">
          <span className="text-[12px] text-gray-400">Unclaimed packets will be refunded after 24 hours</span>
        </div>
      </div>
    </div>
  );
};
