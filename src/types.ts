export type PacketMode = 'normal' | 'lucky' | 'exclusive';

export interface RedPacket {
  id: string;
  sender: UserInfo;
  mode: PacketMode;
  totalAmount: string;
  totalCount: number;
  remainingAmount: string;
  remainingCount: number;
  claims: Claim[];
  createdAt: number;
  expiresAt: number;
  contractTxHash?: string;
  status: 'active' | 'expired' | 'claimed';
  // exclusive mode only
  recipientFid?: number;
  recipientUsername?: string;
}

export interface Claim {
  fid: number;
  username: string;
  pfpUrl: string;
  amount: string;
  claimedAt: number;
  txHash: string;
}

export interface UserInfo {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  custodyAddress: string;
  verifiedAddresses: string[];
}

export type Page = 'home' | 'create' | 'packet' | 'history';
