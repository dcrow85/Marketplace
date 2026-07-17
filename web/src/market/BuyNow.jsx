import { useMemo, useState } from 'react'
import { useEscrowWallet } from '../trade/useEscrowWallet.js'
import { offersKeyFor, recordExternalPurchase, recordFundedPurchase } from '../trade/offers.js'
import { putRecord } from '../trade/records.js'
import {
  approveUsdc, createTrade, hashText, toUsdc, usdcAllowance,
} from '../chain/escrow.js'
import { IS_LOCAL_CHAIN, VALUE_CAP_USDC } from '../chain/config.js'
import { LOCAL_ACTORS } from '../chain/localRehearsal.js'
import { handleFor, shortId } from '../identity.js'
import { clearPile } from './pile.js'
import {
  paymentReference, payPalMeUrl, sellerAcceptsPayPal, sellerPayPalHandle,
  RAIL_ESCROW, RAIL_PAYPAL,
} from '../payments/rails.js'

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

function RailChoice({ active, disabled, title, eyebrow, children, onClick }) {
  return <button type="button" role="radio" aria-checked={active} className={'buy-rail' + (active ? ' on' : '')} disabled={disabled} onClick={onClick}>
    <span className="buy-radio" aria-hidden="true">{active ? '✓' : ''}</span>
    <span><b>{title}</b><small>{children}</small></span>
    <i className="mono">{eyebrow}</i>
  </button>
}

export default function BuyNow({ open, pile, total, catalog, accountId, pileKey, byUid, onBack, onComplete }) {
  const { address, ready, getWalletClient } = useEscrowWallet()
  const [arbiter, setArbiter] = useState(savedArbiter)
  const paypalHandle = sellerPayPalHandle(open)
  const paypalAvailable = sellerAcceptsPayPal(open)
  const escrowSeller = IS_LOCAL_CHAIN ? LOCAL_ACTORS.seller : open.id
  const escrowAvailable = isAddress(escrowSeller)
  const [rail, setRail] = useState(() => escrowAvailable ? RAIL_ESCROW : paypalAvailable ? RAIL_PAYPAL : RAIL_ESCROW)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [error, setError] = useState(null)
  const [paypalOpened, setPaypalOpened] = useState(false)
  const [providerRef, setProviderRef] = useState('')
  const [copied, setCopied] = useState(false)
  const [payRef] = useState(() => paymentReference())
  const usesPresetArbiter = IS_LOCAL_CHAIN || isAddress(DEFAULT_ARBITER)
  const overCap = total > VALUE_CAP_USDC
  const sellerLabel = open.handle || handleFor(open.id)
  const paypalUrl = useMemo(() => payPalMeUrl(paypalHandle, total), [paypalHandle, total])
  const amountLabel = rail === RAIL_PAYPAL ? `$${Number(total).toFixed(2)} USD` : `${total} USDC`

  const cards = () => pile.map((item) => {
    const card = byUid.get(item.uid)
    const listing = open.listings.find((entry) => entry.uid === item.uid)
    return {
      uid: item.uid,
      name: card?.name_en || item.uid,
      number: card?.num || null,
      ask: listing?.ask ?? null,
      seller_condition_claim: listing?.cond || null,
      recorded_scan_count: listing?.witness || 0,
    }
  })

  const fundEscrow = async () => {
    const chosenArbiter = arbiter.trim()
    if (!ready) { setError('No checkout wallet is available for this account. Choose PayPal or connect a settlement wallet.'); return }
    if (!isAddress(escrowSeller)) { setError('This table does not have a payable escrow address.'); return }
    if (!isAddress(chosenArbiter)) { setError('Choose a neutral arbiter address first.'); return }
    if ([escrowSeller, address].filter(Boolean).some((value) => value.toLowerCase() === chosenArbiter.toLowerCase())) {
      setError('The arbiter must be different from both buyer and seller.'); return
    }
    if (overCap) { setError(`This pilot escrow is capped at ${VALUE_CAP_USDC} USDC.`); return }

    setBusy(true); setError(null)
    try {
      const cardTerms = cards()
      const terms = JSON.stringify({
        kind: 'posted_ask_purchase', catalog: catalog.id,
        buyer: accountId, table: open.id, chain_seller: escrowSeller,
        cards: cardTerms, total_usdc: total, arbiter: chosenArbiter, rail: RAIL_ESCROW,
        boundary: 'posted table terms accepted by buyer; listing and condition remain seller claims',
      })
      if (!IS_LOCAL_CHAIN) {
        setPhase('Recording terms…')
        if (!await putRecord(terms)) throw new Error('Could not record the escrow terms. Funding was not started.')
      }
      const walletClient = await getWalletClient()
      const amountRaw = toUsdc(total)
      if (await usdcAllowance(address) < amountRaw) {
        setPhase('Approve USDC in your wallet…')
        await approveUsdc(walletClient, amountRaw)
      }
      setPhase('Fund escrow in your wallet…')
      const { tradeId, hash } = await createTrade(walletClient, {
        seller: escrowSeller,
        arbiter: chosenArbiter,
        amountRaw,
        cardRefHash: hashText(cardTerms.map((card) => card.uid).join('|')),
        termsHash: hashText(terms),
        inspectionWindow: 3 * 86400,
      })
      if (tradeId == null) throw new Error(`Escrow funded in transaction ${hash}, but the trade number was not found. Keep that hash for support.`)
      if (!usesPresetArbiter) {
        try { localStorage.setItem(ARBITER_KEY, chosenArbiter) } catch { /* ignore */ }
      }
      recordFundedPurchase(offersKeyFor(catalog.id, accountId), {
        to: open.id, want: pile.map((item) => ({ uid: item.uid })),
        toHandle: sellerLabel,
        amount: total, live: open.live, from: accountId, cat: catalog.id,
        tradeId, txHash: hash, rail: RAIL_ESCROW,
      })
      clearPile(pileKey, open.id)
      onComplete?.({ rail: RAIL_ESCROW, tradeId })
    } catch (err) {
      setError((err?.shortMessage || err?.message || 'Checkout failed.').slice(0, 180))
    } finally {
      setBusy(false); setPhase('')
    }
  }

  const openPayPal = () => {
    setError(null)
    const tab = window.open(paypalUrl, '_blank')
    if (!tab) { setError('Your browser blocked the PayPal tab. Allow pop-ups and try again.'); return }
    tab.opener = null
    setPaypalOpened(true)
  }

  const reportPayPalPayment = () => {
    const id = recordExternalPurchase(offersKeyFor(catalog.id, accountId), {
      to: open.id, want: pile.map((item) => ({ uid: item.uid })), amount: total,
      toHandle: sellerLabel,
      live: open.live, from: accountId, cat: catalog.id, paypalHandle,
      paymentRef: payRef, providerRef,
    })
    if (!id) { setError('The PayPal payment could not be recorded. Your PayPal payment, if any, was not changed.'); return }
    clearPile(pileKey, open.id)
    onComplete?.({ rail: RAIL_PAYPAL, id, paymentRef: payRef })
  }

  const copyRef = async () => {
    try { await navigator.clipboard.writeText(payRef); setCopied(true) } catch { setCopied(false) }
  }

  return (
    <div className="buy-now">
      <div className="buy-nowhead">
        <div>
          <span className="ek">Posted-ask checkout</span>
          <h2 className="buy-nowtitle">Pay the listed price</h2>
          <p>You&rsquo;re accepting this table&rsquo;s posted asks. No offer or seller reply is needed.</p>
        </div>
        <div className="buy-headtotal">
          <span>Total due</span>
          <strong className="mono">{amountLabel}</strong>
          <small>one table · {pile.length} card{pile.length === 1 ? '' : 's'}</small>
        </div>
      </div>

      <div className="buy-checkoutgrid">
        <div className="buy-checkoutmain">
          <fieldset className="buy-methods">
            <legend><span className="buy-stepno">1</span> Payment</legend>
            <p>Your preferred method is already selected. Change it only if you want to.</p>
            <div className="buy-rails" role="radiogroup" aria-label="Choose how to pay">
              <RailChoice active={rail === RAIL_ESCROW} disabled={!escrowAvailable || overCap} title="Cairn Escrow" eyebrow="recommended"
                onClick={() => { setRail(RAIL_ESCROW); setPaypalOpened(false); setError(null) }}>
                Cairn holds the money until the settlement path releases it.
              </RailChoice>
              {paypalAvailable && <RailChoice active={rail === RAIL_PAYPAL} title="PayPal" eyebrow="external"
                onClick={() => { setRail(RAIL_PAYPAL); setError(null) }}>
                Pay on PayPal. Cairn records the handoff but cannot control the payment.
              </RailChoice>}
            </div>
          </fieldset>

          <section className="buy-railpanel" aria-live="polite">
            <div className="buy-sectiontitle">
              <h3><span className="buy-stepno">2</span>{rail === RAIL_PAYPAL && paypalOpened ? 'Confirm what happened' : 'Review what happens'}</h3>
              <b>{rail === RAIL_ESCROW ? 'Cairn Escrow' : 'PayPal'}</b>
            </div>
            {rail === RAIL_ESCROW ? <>
              <div className="buy-outcomes">
                <span><b>Today</b><small>Cairn&rsquo;s contract holds <strong className="money">{total} USDC</strong>.</small></span>
                <span><b>Seller receives</b><small><strong className="money">0 USDC</strong> now; release follows the settlement path.</small></span>
                <span><b>If something goes wrong</b><small>The named Cairn arbiter can resolve the escrow.</small></span>
              </div>
              {!usesPresetArbiter && (
                <label className="buy-arbiter">
                  <span>Neutral arbiter</span>
                  <input className="ti mono" value={arbiter} disabled={busy} placeholder="0x… · remembered for next time"
                    onChange={(event) => setArbiter(event.target.value.trim())} />
                </label>
              )}
              {usesPresetArbiter && <div className="mono buy-arbiterpreset">neutral arbiter · {shortId(arbiter)}</div>}
              {!ready && paypalAvailable && <div className="buy-note">No escrow wallet is ready. Choose PayPal above or connect a settlement wallet.</div>}
              {overCap && <div className="buy-error">Pilot escrow cap: {VALUE_CAP_USDC} USDC. PayPal remains available when the seller accepts it.</div>}
              {error && <div className="buy-error" role="alert">{error}</div>}
              <div className="buy-commit">
                <p className="buy-actionnote">Your next click funds escrow. It does not pay the seller directly.</p>
                <div className="buy-nowactions">
                  <button className="primary buy-pay" disabled={busy || !ready || overCap || !escrowAvailable} onClick={fundEscrow}>
                    {busy ? (phase || 'Working…') : `Fund ${total} USDC in Cairn Escrow`}
                  </button>
                </div>
              </div>
            </> : !paypalOpened ? <>
              <div className="buy-outcomes paypal">
                <span><b>Today</b><small>You leave Cairn and pay on PayPal.</small></span>
                <span><b>Seller receives</b><small>Payment in PayPal; they must confirm it there before shipping.</small></span>
                <span><b>If something goes wrong</b><small>Use PayPal&rsquo;s Resolution Center. Cairn cannot reverse the payment.</small></span>
              </div>
              <div className="buy-paypal-callout">
                <strong>Check the recipient before you continue.</strong>
                <p>You are paying <b>paypal.me/{paypalHandle}</b>. Choose Goods &amp; Services if PayPal presents the choice. Eligibility and PayPal&rsquo;s terms apply.</p>
                <span className="mono">Cairn reference · <b>{payRef}</b> <button type="button" onClick={copyRef}>{copied ? 'copied ✓' : 'copy'}</button></span>
              </div>
              {error && <div className="buy-error" role="alert">{error}</div>}
              <div className="buy-commit paypal">
                <p className="buy-actionnote">Your next click opens PayPal. No payment happens on Cairn.</p>
                <div className="buy-nowactions">
                  <button className="primary buy-pay paypal" onClick={openPayPal}>Continue to PayPal · ${Number(total).toFixed(2)} USD ↗</button>
                </div>
              </div>
            </> : <div className="buy-paypal-return">
              <span className="ek">Back from PayPal?</span>
              <h3>Tell Cairn only what happened</h3>
              <p>Cairn cannot see the PayPal payment. Confirming below tells {sellerLabel} that <em>you report it sent</em>; they must verify receipt in PayPal.</p>
              <label><span className="mono">PayPal transaction ID <i>optional</i></span>
                <input className="ti mono" maxLength={80} value={providerRef} onChange={(event) => setProviderRef(event.target.value)} placeholder="Add the PayPal reference for the record" /></label>
              {error && <div className="buy-error" role="alert">{error}</div>}
              <div className="buy-nowactions">
                <button className="primary buy-pay paypal" onClick={reportPayPalPayment}>I completed payment in PayPal</button>
                <button className="ghost sm" onClick={() => setPaypalOpened(false)}>I didn&rsquo;t pay</button>
              </div>
              <p className="buy-fine">This records your statement; it does not verify payment or create Cairn escrow.</p>
            </div>}
          </section>
        </div>

        <aside className="buy-summary" aria-label="Order summary">
          <div className="buy-summaryhead">
            <div><span className="ek">Order summary</span><h3>Your pile · {pile.length} card{pile.length === 1 ? '' : 's'}</h3></div>
            <button type="button" onClick={onBack}>Change</button>
          </div>
          <div className="buy-seller">Buying from <b>{sellerLabel}</b></div>
          <div className="buy-order" aria-label="Cards in this checkout">
            {pile.map((item) => {
              const card = byUid.get(item.uid)
              const listing = open.listings.find((entry) => entry.uid === item.uid)
              return <div className="buy-orderitem" key={item.uid}>
                {card?.image ? <img src={card.image} alt="" /> : <span className="buy-orderblank" aria-hidden="true" />}
                <span><b>{card?.name_en || item.uid}</b><small className="mono">{card?.num || 'card'} · {listing?.cond || 'condition unlisted'}</small></span>
                <strong className="mono">{listing?.ask ?? 0} USDC</strong>
              </div>
            })}
          </div>
          <div className="buy-total"><span>Total due</span><strong>{amountLabel}</strong></div>
          <p>{rail === RAIL_PAYPAL
            ? `The table asks total ${total} USDC; this seller's PayPal fallback requests $${Number(total).toFixed(2)} USD.`
            : 'At the table’s posted asks. Delivery and inspection continue in Trades.'}</p>
        </aside>
      </div>
    </div>
  )
}
