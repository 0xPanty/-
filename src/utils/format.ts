import { USDC_DECIMALS } from './constants';

export function formatUSDC(raw: string | bigint): string {
  const val = typeof raw === 'string' ? BigInt(raw) : raw;
  const whole = val / BigInt(10 ** USDC_DECIMALS);
  const frac = val % BigInt(10 ** USDC_DECIMALS);
  const fracStr = frac.toString().padStart(USDC_DECIMALS, '0').replace(/0+$/, '');
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

export function parseUSDC(amount: string): bigint {
  const parts = amount.split('.');
  const whole = BigInt(parts[0] || '0') * BigInt(10 ** USDC_DECIMALS);
  if (parts[1]) {
    const frac = parts[1].padEnd(USDC_DECIMALS, '0').slice(0, USDC_DECIMALS);
    return whole + BigInt(frac);
  }
  return whole;
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function timeRemaining(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'expired';
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}
