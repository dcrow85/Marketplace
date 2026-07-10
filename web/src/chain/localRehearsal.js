// The local rehearsal rail: when VITE_CHAIN_MODE=local, accepted cash deals stop
// pretending — they fund the REAL ThinPilotEscrow on a local Anvil, the desk actors
// sign their sides with Anvil's well-known dev keys, and every ledger step is a real
// transaction. These keys are public constants baked into every Anvil install; they
// hold nothing anywhere real, and this module refuses to run off chain id 31337.
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { CHAIN, RPC_URL, IS_LOCAL_CHAIN, STATE } from './config.js'
import {
  getTrade, approveUsdc, createTrade, markShipped, confirmReceived,
  acceptTrade, toUsdc, hashText,
} from './escrow.js'
import { loadOffers, saveOffers } from '../trade/offers.js'
import { settleOffer } from '../market/mockAgents.js'

// anvil accounts 0/1/2 — buyer / desk-seller / desk-arbiter
const DEV_KEYS = {
  buyer: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  seller: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  arbiter: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
}
export const LOCAL_ACTORS = {
  buyer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  seller: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  arbiter: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
}

export function localWalletClient(role) {
  if (!IS_LOCAL_CHAIN || CHAIN.id !== 31337) throw new Error('local rehearsal actors only exist on anvil (31337)')
  return createWalletClient({ account: privateKeyToAccount(DEV_KEYS[role]), chain: CHAIN, transport: http(RPC_URL) })
}

const short = (h) => h ? `${h.slice(0, 10)}…` : ''
const inflight = new Set()

// One async loop owns every offer on the chain rail: fund what's newly accepted,
// then read the on-chain state each pass and let the right actor take the next step.
// Reading state fresh each pass makes it resumable across reloads.
export function startChainRail({ catalogId, accountId, byUid }) {
  if (!IS_LOCAL_CHAIN) return () => {}
  const key = accountId ? `cairn-offers:${catalogId}:${accountId}` : `cairn-offers:${catalogId}`

  const step = async (o) => {
    const patch = (fn) => { // mutate fresh storage, not this pass's copy
      const offers = loadOffers(key)
      const cur = offers.find((x) => x.id === o.id)
      if (cur) { fn(cur); saveOffers(key, offers) }
    }
    if (!o.tradeId) {
      const gets = o.dir === 'out' ? o.want : o.give
      const names = gets.map((x) => byUid.get(x.uid)?.name_en || x.uid).join(', ')
      const amountRaw = toUsdc(o.cash.amount)
      const wc = localWalletClient('buyer')
      await approveUsdc(wc, amountRaw)
      const { tradeId, hash } = await createTrade(wc, {
        seller: LOCAL_ACTORS.seller, arbiter: LOCAL_ACTORS.arbiter, amountRaw,
        cardRefHash: hashText(names), termsHash: hashText(JSON.stringify({ want: o.want, give: o.give, cash: o.cash, note: o.note })),
        inspectionWindow: 3 * 86400,
      })
      patch((c) => {
        c.tradeId = tradeId
        c.state = 'escrow_locked'
        c.log = [...(c.log || []), `escrow funded ON-CHAIN — trade #${tradeId} · ${o.cash.amount} USDC locked · tx ${short(hash)}`]
      })
      return
    }
    const t = await getTrade(o.tradeId)
    const sn = STATE[t.state] || String(t.state)
    if (sn === 'Funded') {
      const r = await markShipped(localWalletClient('seller'), o.tradeId, hashText(`rehearsal parcel for trade ${o.tradeId}`))
      patch((c) => { c.state = 'in_transit'; c.log = [...(c.log || []), `desk-seller marked shipped · tx ${short(r.transactionHash)}`] })
    } else if (sn === 'Shipped') {
      // confirmReceived opens inspection itself; openInspection is only the timeout path
      const r = await confirmReceived(localWalletClient('buyer'), o.tradeId)
      patch((c) => { c.state = 'delivered'; c.log = [...(c.log || []), `you confirmed receipt — inspection open · tx ${short(r.transactionHash)}`] })
    } else if (sn === 'InspectionOpen') {
      const r = await acceptTrade(localWalletClient('buyer'), o.tradeId)
      patch((c) => { c.log = [...(c.log || []), `you accepted — funds released to the desk-seller · tx ${short(r.transactionHash)}`] })
    } else if (sn === 'Settled') {
      settleOffer({ catalogId, accountId, o })
      patch((c) => { c.state = 'settled'; c.log = [...(c.log || []), `settled ON-CHAIN — trade #${o.tradeId} closed; recorded to your binder`] })
    }
  }

  const tick = async () => {
    const offers = loadOffers(key)
    for (const o of offers) {
      if (o.rail !== 'chain' || o.state === 'settled' || o.state === 'declined' || inflight.has(o.id)) continue
      inflight.add(o.id)
      try { await step(o) } catch (e) {
        const offers2 = loadOffers(key)
        const cur = offers2.find((x) => x.id === o.id)
        if (cur && !(cur.log || []).slice(-1)[0]?.includes('rail hiccup')) {
          cur.log = [...(cur.log || []), `rail hiccup (${(e?.shortMessage || e?.message || 'tx failed').slice(0, 80)}) — retrying`]
          saveOffers(key, offers2)
        }
      } finally { inflight.delete(o.id) }
    }
  }

  const timer = setInterval(tick, 2500)
  tick()
  return () => clearInterval(timer)
}
