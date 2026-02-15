export const HONGBAO_ABI = [
  {
    type: 'function',
    name: 'createPacket',
    inputs: [
      { name: 'packetId', type: 'bytes32' },
      { name: 'totalCount', type: 'uint256' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'isLucky', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimPacket',
    inputs: [
      { name: 'packetId', type: 'bytes32' },
      { name: 'claimant', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'refundPacket',
    inputs: [
      { name: 'packetId', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getPacket',
    inputs: [
      { name: 'packetId', type: 'bytes32' },
    ],
    outputs: [
      { name: 'sender', type: 'address' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'remainingAmount', type: 'uint256' },
      { name: 'totalCount', type: 'uint256' },
      { name: 'remainingCount', type: 'uint256' },
      { name: 'isLucky', type: 'bool' },
      { name: 'createdAt', type: 'uint256' },
      { name: 'expired', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'PacketCreated',
    inputs: [
      { name: 'packetId', type: 'bytes32', indexed: true },
      { name: 'sender', type: 'address', indexed: true },
      { name: 'totalAmount', type: 'uint256', indexed: false },
      { name: 'totalCount', type: 'uint256', indexed: false },
      { name: 'isLucky', type: 'bool', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PacketClaimed',
    inputs: [
      { name: 'packetId', type: 'bytes32', indexed: true },
      { name: 'claimant', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
