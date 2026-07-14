import { useState } from 'react'
import { useEscrowWallet } from '../trade/useEscrowWallet.js'
import { offersKeyFor, recordFundedPurchase } from '../trade/offers.js'
import { putRecord } from '../trade/records.js'
import {
  approveUsdc, createTrade, hashText, toUsdc, usdcAllowance,
} from '../chain/escrow.js'
import { IS_LOCAL_CHAIN, VALUE_CAP_USDC } from '../chain/config.js'
import { LOCAL_ACTORS } from '../chain/localRehearsal.js'
import { handleFor, shortId } from '../identity.js'
import { clearPile } from './pile.js'

const DEFAULT_ARBITER = import.meta.env.VITE_DEFAULT_ARBITER || ''
const ARBITER_KEY = 'cairn-checkout-arbiter'
const isAddress = (value) => /^0x[0-9a-fA-F]{40}$/.test(value || '')

function savedArbiter() {
  if (IS_LOCAL_CHAIN) return LOCAL_ACTORS.arbiter
  if (isAddress(DEFAULT_ARBITER)) return DEFAULT_ARBITER
  try {
    const saved = localStorage.getItem(ARBITER_KEY) || ''
    return isAddress(saved) ? saved : ''
  } catch { return '' }
}

export default function BuyNow({ open, pile, total, catalog, accountId, pileKey, byUid, onBack, onFunded }) {
  const { address, ready, getWalletClient } = useEscrowWallet()
  const [arbiter, setArbiter] = useState(savedArbiter)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [error, setError] = useState(null)
  const chainSeller = IS_LOCAL_CHAIN ? LOCAL_ACTORS.seller : open.id
  const usesPresetArbiter = IS_LOCAL_CHAIN || isAddress(DEFAULT_ARBITER)
  const overCap = total > VALUE_CAP_USDC

  const pay = async () => {
    const chosenArbiter = arbiter.trim()
    if (!ready) { setError('No checkout wallet is available for this account.'); return }
    if (!isAddress(chainSeller)) { setError('This table does not have a payable seller address.'); return }
    if (!isAddress(chosenArbiter)) { setError('Choose a neutral arbiter address first.'); return }
    if ([chainSeller, address].filter(Boolean).some((value) => value.toLowerCase() === chosenArbiter.toLowerCase())) {
      setError('The arbiter must be different from both buyer and seller.'); return
    }
    if (overCap) { setError(`This pilot escrow is capped at ${VALUE_CAP_USDC} USDC.`); return }

    setBusy(true); setError(null)
    try {
      const cards = pile.map((item) => {
        const card = byUid.get(item.uid)
        const listing = open.listings.find((entry) => entry.uid === item.uid)
        return {
          uid: item.uid,
          name: card?.name_en || item.uid,
          number: card?.num || null,
          ask_usdc: listing?.ask ?? null,
          seller_condition_claim: listing?.cond || null,
          recorded_scan_count: listing?.witness || 0,
        }
      })
      const terms = JSON.stringify({
        kind: 'posted_ask_purchase', catalog: catalog.id,
        buyer: accountId, table: open.id, chain_seller: chainSeller,
        cards, total_usdc: total, arbiter: chosenArbiter,
        boundary: 'posted table terms accepted by buyer; listing and condition remain seller claims',
      })
      if (!IS_LOCAL_CHAIN) {
        setPhase('Recording terms…')
        if (!await putRecord(terms)) throw new Error('Could not record the escrow terms. Payment was not started.')
      }
      const walletClient = await getWalletClient()
      const amountRaw = toUsdc(total)
      if (await usdcAllowance(address) < amountRaw) {
        setPhase('Approve USDC in your wallet…')
        await approveUsdc(walletClient, amountRaw)
      }
      setPhase('Fund escrow in your wallet…')
      const { tradeId, hash } = await createTrade(walletClient, {
        seller: chainSeller,
        arbiter: chosenArbiter,
        amountRaw,
        cardRefHash: hashText(cards.map((card) => card.uid).join('|')),
        termsHash: hashText(terms),
        inspectionWindow: 3 * 86400,
      })
      if (tradeId == null) throw new Error(`Escrow funded in transaction ${hash}, but the trade number was not found. Keep that hash for support.`)
      if (!usesPresetArbiter) {
        try { localStorage.setItem(ARBITER_KEY, chosenArbiter) } catch { /* ignore */ }
      }
      recordFundedPurchase(offersKeyFor(catalog.id, accountId), {
        to: open.id, want: pile.map((item) => ({ uid: item.uid })),
        amount: total, live: open.live, from: accountId, cat: catalog.id,
        tradeId, txHash: hash, rail: IS_LOCAL_CHAIN ? 'chain' : 'escrow',
      })
      clearPile(pileKey, open.id)
      onFunded(tradeId)
    } catch (err) {
      setError((err?.shortMessage || err?.message || 'Checkout failed.').slice(0, 180))
    } finally {
      setBusy(false); setPhase('')
    }
  }

  return (
    <div className="buy-now">
      <div className="buy-nowhead">
        <div>
          <span className="ek">Buy now</span>
          <div className="buy-nowtitle">{pile.length} card{pile.length === 1 ? '' : 's'} from {handleFor(open.id)}</div>
        </div>
        <strong className="mono">{total} USDC</strong>
      </div>
      <div className="buy-nowterms mono">
        <span>you accept posted asks</span><span>funds held in escrow</span><span>release after delivery acceptance</span>
      </div>
      {!usesPresetArbiter && (
        <label className="buy-arbiter">
          <span className="mono">Neutral arbiter</span>
          <input className="ti mono" value={arbiter} disabled={busy} placeholder="0x… · remembered for next time"
            onChange={(event) => setArbiter(event.target.value.trim())} />
        </label>
      )}
      {usesPresetArbiter && <div className="mono buy-arbiterpreset">arbiter · {shortId(arbiter)}</div>}
      <div className="buy-nowactions">
        <button className="primary buy-pay" disabled={busy || !ready || overCap} onClick={pay}>
          {busy ? (phase || 'Working…') : `Pay ${total} USDC into escrow`}
        </button>
        <button className="ghost sm" disabled={busy} onClick={onBack}>cancel</button>
      </div>
      {!ready && <div className="buy-error">No checkout wallet is available for this account.</div>}
      {overCap && <div className="buy-error">Pilot escrow cap: {VALUE_CAP_USDC} USDC. Make an offer instead.</div>}
      {error && <div className="buy-error">{error}</div>}
      <p className="buy-fine">This funds escrow against the table&rsquo;s currently posted terms. It does not pay the seller directly; the seller is notified and funds remain held until the delivery path completes.</p>
    </div>
  )
}
