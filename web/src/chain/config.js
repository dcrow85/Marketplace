// Cairn pilot — on-chain config (Stage 1: Arbitrum Sepolia testnet).
// Stage 2 swaps these to Arbitrum One + real USDC; nothing else changes.
import { arbitrumSepolia } from 'viem/chains'

export const CHAIN = arbitrumSepolia // chain id 421614
export const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc'

// ThinPilotEscrow — deployed + verified 2026-06-29 (cap 200 USDC, shipped-timeout 14d).
export const ESCROW_ADDRESS = '0x830EEa347efEAf8a929B932057ee88ad0a85343a'
// Circle test USDC on Arbitrum Sepolia (faucet.circle.com).
export const USDC_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
export const USDC_DECIMALS = 6
export const VALUE_CAP_USDC = 200 // contract-enforced ceiling, for display

// Mirrors ThinPilotEscrow.State / .Outcome enums (index = on-chain uint8).
export const STATE = [
  'None', 'Funded', 'Shipped', 'InspectionOpen', 'Settled', 'Disputed', 'Resolved', 'Cancelled',
]
export const OUTCOME = ['SELLER', 'BUYER', 'SPLIT']

export const EXPLORER = 'https://sepolia.arbiscan.io'
export const txUrl = (hash) => `${EXPLORER}/tx/${hash}`
export const addrUrl = (addr) => `${EXPLORER}/address/${addr}`
