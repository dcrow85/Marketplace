// Cairn pilot — ThinPilotEscrow client (viem over a Privy wallet).
// Reads go through a public client; writes take a viem wallet client built from the
// user's Privy EIP-1193 provider. This module is the only place that touches the chain.
import {
  createPublicClient, createWalletClient, custom, http,
  parseUnits, formatUnits, formatEther, keccak256, toHex, parseEventLogs,
} from 'viem'
import {
  CHAIN, RPC_URL, ESCROW_ADDRESS, USDC_ADDRESS, USDC_DECIMALS, STATE,
} from './config.js'
import escrowAbi from './escrow.abi.json'

// Minimal ERC-20 surface we need (approve / allowance / balance).
const erc20Abi = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
]

export const publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) })

// Build a viem wallet client from a Privy EIP-1193 provider + the user's address.
export function walletClientFrom(provider, account) {
  return createWalletClient({ account, chain: CHAIN, transport: custom(provider) })
}

// Make sure the wallet is on Arbitrum Sepolia before a write (adds it if unknown).
async function ensureChain(wc) {
  // chain-switching is wallet-provider ceremony (Privy/injected); a raw key client
  // over http (the local rehearsal rail) is born on its chain and can't answer it
  if (wc.transport?.type !== 'custom') return
  try {
    await wc.switchChain({ id: CHAIN.id })
  } catch {
    await wc.addChain({ chain: CHAIN })
    await wc.switchChain({ id: CHAIN.id })
  }
}

// ---- value + hash helpers ----
export const toUsdc = (human) => parseUnits(String(human), USDC_DECIMALS) // "12.50" -> 12500000n
export const fromUsdc = (raw) => formatUnits(raw, USDC_DECIMALS)
export const fromNative = (raw) => formatEther(raw)
export const hashText = (s) => keccak256(toHex(s)) // cardRef / terms / tracking / dispute-reason commitments

// ---- reads ----
function normalizeTrade(r) {
  const f = Array.isArray(r)
    ? { buyer: r[0], seller: r[1], arbiter: r[2], usdcAmount: r[3], cardRefHash: r[4], termsHash: r[5], trackingHash: r[6], disputeReasonHash: r[7], inspectionWindow: r[8], shippedAt: r[9], inspectionOpenedAt: r[10], state: r[11], returnCustodyConfirmed: r[12], resolvedOutcome: r[13], buyerRefundBps: r[14] }
    : r
  return {
    buyer: f.buyer, seller: f.seller, arbiter: f.arbiter,
    usdcAmount: f.usdcAmount, cardRefHash: f.cardRefHash, termsHash: f.termsHash,
    trackingHash: f.trackingHash, disputeReasonHash: f.disputeReasonHash,
    inspectionWindow: f.inspectionWindow, shippedAt: f.shippedAt, inspectionOpenedAt: f.inspectionOpenedAt,
    state: Number(f.state), stateName: STATE[Number(f.state)] || 'Unknown',
    returnCustodyConfirmed: f.returnCustodyConfirmed,
    resolvedOutcome: Number(f.resolvedOutcome), buyerRefundBps: Number(f.buyerRefundBps),
  }
}

export async function getTrade(id) {
  const r = await publicClient.readContract({ address: ESCROW_ADDRESS, abi: escrowAbi, functionName: 'trades', args: [BigInt(id)] })
  return normalizeTrade(r)
}
export async function getNextTradeId() {
  return Number(await publicClient.readContract({ address: ESCROW_ADDRESS, abi: escrowAbi, functionName: 'nextTradeId' }))
}
export async function usdcBalance(account) {
  return publicClient.readContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [account] })
}
export async function nativeBalance(account) {
  return publicClient.getBalance({ address: account })
}
export async function usdcAllowance(account) {
  return publicClient.readContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'allowance', args: [account, ESCROW_ADDRESS] })
}

// ---- writes (each takes a viem wallet client from walletClientFrom) ----
async function send(wc, functionName, args, opts = {}) {
  await ensureChain(wc)
  const hash = await wc.writeContract({
    address: opts.address || ESCROW_ADDRESS,
    abi: opts.abi || escrowAbi,
    functionName, args, account: wc.account, chain: CHAIN,
  })
  return publicClient.waitForTransactionReceipt({ hash })
}

export const approveUsdc = (wc, amountRaw) =>
  send(wc, 'approve', [ESCROW_ADDRESS, amountRaw], { address: USDC_ADDRESS, abi: erc20Abi })

export async function createTrade(wc, { seller, arbiter, amountRaw, cardRefHash, termsHash, inspectionWindow }) {
  await ensureChain(wc)
  const hash = await wc.writeContract({
    address: ESCROW_ADDRESS, abi: escrowAbi, functionName: 'createTrade',
    args: [seller, arbiter, amountRaw, cardRefHash, termsHash, BigInt(inspectionWindow)],
    account: wc.account, chain: CHAIN,
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  const ev = parseEventLogs({ abi: escrowAbi, logs: receipt.logs, eventName: 'TradeCreated' })[0]
  return { hash, receipt, tradeId: ev ? Number(ev.args.tradeId) : null }
}

export const markShipped = (wc, id, trackingHash) => send(wc, 'markShipped', [BigInt(id), trackingHash])
export const confirmReceived = (wc, id) => send(wc, 'confirmReceived', [BigInt(id)])
export const openInspection = (wc, id) => send(wc, 'openInspection', [BigInt(id)])
export const acceptTrade = (wc, id) => send(wc, 'accept', [BigInt(id)])
export const settleByTimeout = (wc, id) => send(wc, 'settleByTimeout', [BigInt(id)])
export const disputeTrade = (wc, id, reasonHash) => send(wc, 'dispute', [BigInt(id), reasonHash])
export const resolveTrade = (wc, id, outcome, splitBps = 0) => send(wc, 'resolve', [BigInt(id), outcome, splitBps])
export const confirmReturnCustody = (wc, id) => send(wc, 'confirmReturnCustody', [BigInt(id)])
export const cancelBeforeShip = (wc, id) => send(wc, 'cancelBeforeShip', [BigInt(id)])
