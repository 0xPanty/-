import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { parseUSDC } from '@/utils/format';
import { USDC_ADDRESS, HONGBAO_CONTRACT_ADDRESS, USDC_DECIMALS } from '@/utils/constants';
import { ERC20_ABI, HONGBAO_ABI } from '@/utils/abi';
import type { PacketMode } from '@/types';

interface CreatePageProps {
  onSuccess: (packetId: string) => void;
  onBack: () => void;
}

export const CreatePage: React.FC<CreatePageProps> = ({ onSuccess, onBack }) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<PacketMode>('lucky');
  const [amount, setAmount] = useState('');
  const [count, setCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'approve' | 'create' | 'register'>('form');

  const totalAmount = amount ? parseFloat(amount) : 0;
  const totalCount = count ? parseInt(count) : 0;
  const perPerson = totalCount > 0 ? (totalAmount / totalCount).toFixed(2) : '0';

  const handleSubmit = async () => {
    if (!amount || !count || totalAmount <= 0 || totalCount <= 0) {
      setError('Please fill in all fields');
      return;
    }
    if (totalCount > 100) {
      setError('Maximum 100 packets');
      return;
    }
    if (totalAmount < 0.01 * totalCount) {
      setError('Minimum 0.01 USDC per packet');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Generate unique packet ID
      const packetId = ('0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;

      const amountRaw = parseUSDC(amount);

      // Step 1: Approve USDC
      setStep('approve');
      const { ethereum } = window as any;
      if (!ethereum) {
        setError('No wallet found. Please use a Farcaster client with wallet support.');
        setLoading(false);
        return;
      }

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const userAddress = accounts[0];

      // Check we're on Base
      const chainId = await ethereum.request({ method: 'eth_chainId' });
      if (parseInt(chainId, 16) !== 8453) {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }],
        });
      }

      // Encode approve call
      const { encodeFunctionData } = await import('viem');
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [HONGBAO_CONTRACT_ADDRESS, amountRaw],
      });

      await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to: USDC_ADDRESS,
          data: approveData,
        }],
      });

      // Step 2: Create packet on contract
      setStep('create');
      const createData = encodeFunctionData({
        abi: HONGBAO_ABI,
        functionName: 'createPacket',
        args: [packetId, BigInt(totalCount), amountRaw, mode === 'lucky'],
      });

      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to: HONGBAO_CONTRACT_ADDRESS,
          data: createData,
        }],
      });

      // Step 3: Register in Redis
      setStep('register');
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packetId,
          sender: {
            fid: user!.fid,
            username: user!.username,
            displayName: user!.displayName,
            pfpUrl: user!.pfpUrl,
          },
          mode,
          totalAmount: amountRaw.toString(),
          totalCount,
          txHash,
        }),
      });

      if (!res.ok) throw new Error('Failed to register packet');

      onSuccess(packetId);
    } catch (err: any) {
      console.error('Create error:', err);
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
      setStep('form');
    }
  };

  return (
    <div className="flex flex-col px-4 pt-4 pb-8">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1 text-white/40 text-sm mb-6">
        <ArrowLeft size={16} /> Back
      </button>

      <h2 className="text-xl font-bold text-white mb-6">Send Red Packet</h2>

      {/* Mode selector */}
      <div className="flex gap-2 mb-6">
        {(['lucky', 'fixed'] as PacketMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              mode === m
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-white/5 text-white/40'
            }`}
          >
            {m === 'lucky' ? '🎲 Lucky Draw' : '💰 Fixed'}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <label className="text-white/40 text-xs font-medium mb-2">
        {mode === 'lucky' ? 'Total Amount (USDC)' : 'Amount Per Person (USDC)'}
      </label>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        min="0.01"
        step="0.01"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-semibold placeholder:text-white/20 focus:outline-none focus:border-red-500 mb-4"
      />

      {/* Count input */}
      <label className="text-white/40 text-xs font-medium mb-2">Number of Packets</label>
      <input
        type="number"
        value={count}
        onChange={(e) => setCount(e.target.value)}
        placeholder="1"
        min="1"
        max="100"
        step="1"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-semibold placeholder:text-white/20 focus:outline-none focus:border-red-500 mb-6"
      />

      {/* Summary */}
      {totalAmount > 0 && totalCount > 0 && (
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/40">Mode</span>
            <span className="text-white">{mode === 'lucky' ? 'Lucky Draw' : 'Fixed'}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/40">Total</span>
            <span className="text-yellow-500 font-semibold">
              {mode === 'fixed' ? (totalAmount * totalCount).toFixed(2) : totalAmount.toFixed(2)} USDC
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">
              {mode === 'lucky' ? 'Avg per person' : 'Per person'}
            </span>
            <span className="text-white">
              {mode === 'fixed' ? totalAmount.toFixed(2) : perPerson} USDC
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="text-red-400 text-xs mb-4 text-center">{error}</div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className={`w-full py-4 rounded-2xl font-semibold text-base transition-all ${
          loading
            ? 'bg-white/10 text-white/30 cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-700 text-white active:scale-95 shadow-lg shadow-red-600/30'
        }`}
      >
        {loading
          ? step === 'approve'
            ? 'Approving USDC...'
            : step === 'create'
            ? 'Creating on-chain...'
            : step === 'register'
            ? 'Registering...'
            : 'Processing...'
          : `Send ${mode === 'fixed' && totalAmount > 0 && totalCount > 0
              ? (totalAmount * totalCount).toFixed(2)
              : totalAmount > 0 ? totalAmount.toFixed(2) : ''
            } USDC`}
      </button>
    </div>
  );
};
