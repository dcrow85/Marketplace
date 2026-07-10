// Cairn pilot — on-chain config (Stage 1: Arbitrum Sepolia testnet).
// Stage 2 swaps these to Arbitrum One + real USDC; nothing else changes.
// LOCAL MODE (VITE_CHAIN_MODE=local, written by scripts/dev-chain.sh): the same
// ThinPilotEscrow + a MockUSDC on a local Anvil — the ENTIRE checkout on real rails,
// with well-known dev actors playing seller and arbiter. Dev-only by construction.
import { arbitrumSepolia, foundry } from 'viem/chains'

export const CHAIN_MODE = import.meta.env.VITE_CHAIN_MODE || 'testnet'
export const IS_LOCAL_CHAIN = CHAIN_MODE === 'local'

export const CHAIN = IS_LOCAL_CHAIN ? foundry : arbitrumSepolia
export const RPC_URL = IS_LOCAL_CHAIN ? 'http://127.0.0.1:8545' : 'https://sepolia-rollup.arbitrum.io/rpc'

// ThinPilotEscrow — deployed + verified 2026-06-29 (cap 200 USDC, shipped-timeout 14d).
export const ESCROW_ADDRESS = IS_LOCAL_CHAIN
  ? (import.meta.env.VITE_LOCAL_ESCROW || '0x0000000000000000000000000000000000000000')
  : '0x830EEa347efEAf8a929B932057ee88ad0a85343a'
// Circle test USDC on Arbitrum Sepolia (faucet.circle.com); MockUSDC locally.
export const USDC_ADDRESS = IS_LOCAL_CHAIN
  ? (import.meta.env.VITE_LOCAL_USDC || '0x0000000000000000000000000000000000000000')
  : '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
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
