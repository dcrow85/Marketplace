import { useEffect, useMemo, useState } from 'react'
import { useEscrowWallet } from '../trade/useEscrowWallet.js'
import { offersKeyFor, recordExternalPurchase, recordFundedPurchase, recordPayPalCapture } from '../trade/offers.js'
import { putRecord } from '../trade/records.js'
import {
  approveUsdc, createTrade, fromNative, fromUsdc, hashText, nativeBalance,
  toUsdc, usdcAllowance, usdcBalance,
} from '../chain/escrow.js'
import {
  addrUrl, CHAIN_LABEL, ESCROW_ADDRESS, IS_LOCAL_CHAIN, IS_TESTNET_CHAIN,
  PILOT_TEST_ARBITER, USDC_ADDRESS, VALUE_CAP_USDC,
} from '../chain/config.js'
import { LOCAL_ACTORS } from '../chain/localRehearsal.js'
import { handleFor, shortId } from '../identity.js'
import { clearPile } from './pile.js'
import {
  paymentReference, payPalMeUrl, sellerAcceptsPayPal, sellerPayPalHandle,
  sellerPayPalMode, RAIL_ESCROW, RAIL_PAYPAL,
} from '../payments/rails.js'
import PayPalSandboxButton from '../payments/PayPalSandboxButton.jsx'

const DEFAULT_ARBITER = import.meta.env.VITE_DEFAULT_ARBITER || ''
const ARBITER_KEY = 'cairn-checkout-arbiter'
const isAddress = (value) => /^0x[0-9a-fA-F]{40}$/.test(value || '')
const sameAddress = (a, b) => Boolean(a && b && a.toLowerCase() === b.toLowerCase())

function nativeLabel(raw) {
  if (raw == null) return '—'
  const value = Number(fromNative(raw))
  if (!value) return '0'
  if (value < 0.00001) return '<0.00001'
  return value.toFixed(5).replace(/0+$/, '').replace(/\.$/, '')
}

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
  const {
    address, ready, walletsReady, creating, createError,
    createSettlementWallet, getWalletClient,
  } = useEscrowWallet()
  const [arbiter, setArbiter] = useState(savedArbiter)
  const paypalHandle = sellerPayPalHandle(open)
  const paypalMode = sellerPayPalMode(open)
  const paypalSandbox = paypalMode === 'sandbox_api'
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
  const [walletCopied, setWalletCopied] = useState(false)
  const [balanceRefresh, setBalanceRefresh] = useState(0)
  const [balances, setBalances] = useState({ address: null, usdc: null, native: null, loading: false, error: '' })
  const [payRef] = useState(() => paymentReference())
  const usesPresetArbiter = IS_LOCAL_CHAIN || isAddress(DEFAULT_ARBITER)
  const overCap = total > VALUE_CAP_USDC
  const sellerLabel = open.handle || handleFor(open.id)
  const paypalUrl = useMemo(() => payPalMeUrl(paypalHandle, total), [paypalHandle, total])
  const escrowCurrency = IS_TESTNET_CHAIN ? 'test USDC' : 'USDC'
  const amountLabel = rail === RAIL_PAYPAL
    ? `$${Number(total).toFixed(2)} ${paypalSandbox ? 'sandbox USD' : 'USD'}`
    : `${total} ${escrowCurrency}`
  const checkoutCards = useMemo(() => pile.map((item) => {
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
  }), [pile, byUid, open.listings])
  const requiredUsdc = toUsdc(total)
  const balancesCurrent = IS_LOCAL_CHAIN || (
    ready && sameAddress(balances.address, address) && !balances.loading
    && balances.usdc != null && balances.native != null
  )
  const hasEnoughUsdc = IS_LOCAL_CHAIN || (balancesCurrent && balances.usdc >= requiredUsdc)
  const hasGas = IS_LOCAL_CHAIN || (balancesCurrent && balances.native > 0n)
  const arbiterReady = isAddress(arbiter.trim())
    && !sameAddress(arbiter.trim(), escrowSeller)
    && !sameAddress(arbiter.trim(), address)
  const canFund = ready && escrowAvailable && arbiterReady && !overCap && hasEnoughUsdc && hasGas

  useEffect(() => {
    if (IS_LOCAL_CHAIN || !address) return undefined
    let cancelled = false
    Promise.all([usdcBalance(address), nativeBalance(address)])
      .then(([usdc, native]) => {
        if (!cancelled) setBalances({ address, usdc, native, loading: false, error: '' })
      })
      .catch((err) => {
        if (!cancelled) setBalances({
          address, usdc: null, native: null, loading: false,
          error: (err?.shortMessage || err?.message || 'Balances could not be checked.').slice(0, 160),
        })
      })
    return () => { cancelled = true }
  }, [address, balanceRefresh])

  const provisionWallet = async () => {
    setError(null)
    try { await createSettlementWallet() } catch { /* the bounded error is shown beside the action */ }
  }

  const refreshWalletBalances = () => {
    setBalances((current) => ({ ...current, loading: true, error: '' }))
    setBalanceRefresh((value) => value + 1)
  }

  const copyWalletAddress = async () => {
    try { await navigator.clipboard.writeText(address); setWalletCopied(true) } catch { setWalletCopied(false) }
  }

  const fundEscrow = async () => {
    const chosenArbiter = arbiter.trim()
    if (!ready) { setError(`No ${CHAIN_LABEL} wallet is available for this account. Choose PayPal or connect a settlement wallet.`); return }
    if (!isAddress(escrowSeller)) { setError('This table does not have a payable escrow address.'); return }
    if (!isAddress(chosenArbiter)) { setError('Choose a neutral arbiter address first.'); return }
    if ([escrowSeller, address].filter(Boolean).some((value) => value.toLowerCase() === chosenArbiter.toLowerCase())) {
      setError('The arbiter must be different from both buyer and seller.'); return
    }
    if (overCap) { setError(`This pilot escrow is capped at ${VALUE_CAP_USDC} ${escrowCurrency}.`); return }

    setBusy(true); setError(null)
    try {
      const cardTerms = checkoutCards
      const terms = JSON.stringify({
        kind: 'posted_ask_purchase', catalog: catalog.id,
        buyer: accountId, table: open.id, chain_seller: escrowSeller,
        cards: cardTerms, total_usdc: total, arbiter: chosenArbiter, rail: RAIL_ESCROW,
        boundary: 'posted table terms accepted by buyer; listing and condition remain seller claims',
      })
      const walletClient = await getWalletClient()
      const amountRaw = toUsdc(total)
      if (!IS_LOCAL_CHAIN) {
        setPhase('Checking testnet funds…')
        const [availableUsdc, availableNative] = await Promise.all([
          usdcBalance(address), nativeBalance(address),
        ])
        if (availableUsdc < amountRaw) {
          throw new Error(`This wallet needs at least ${total} test USDC before Cairn can fund escrow.`)
        }
        if (availableNative <= 0n) {
          throw new Error(`This wallet needs Arbitrum Sepolia ETH for network fees before Cairn can fund escrow.`)
        }
        setPhase('Recording terms…')
        if (!await putRecord(terms)) throw new Error('Could not record the escrow terms. Funding was not started.')
      }
      if (await usdcAllowance(address) < amountRaw) {
        setPhase(`Approve ${escrowCurrency} in your wallet…`)
        await approveUsdc(walletClient, amountRaw)
      }
      setPhase(`Fund escrow on ${CHAIN_LABEL}…`)
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

  const completePayPalSandbox = (capture) => {
    const id = recordPayPalCapture(offersKeyFor(catalog.id, accountId), {
      to: open.id, want: pile.map((item) => ({ uid: item.uid })), amount: total,
      toHandle: sellerLabel, paymentRef: payRef, capture,
    })
    if (!id) { setError('PayPal confirmed the sandbox capture, but Cairn could not record it. Keep the PayPal order ID.'); return }
    clearPile(pileKey, open.id)
    onComplete?.({
      rail: RAIL_PAYPAL, id, paymentRef: payRef, verified: true, sandbox: true,
      orderId: capture.orderId, captureId: capture.captureId,
    })
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

      {IS_TESTNET_CHAIN && <div className="buy-environment" role="note">
        <span className="mono buy-envtag">TESTNET</span>
        <span><b>{CHAIN_LABEL} rehearsal</b><small>Cairn Escrow uses test USDC with no cash value. {paypalSandbox ? 'This sample table uses PayPal Sandbox, so neither rail moves real money.' : 'Manual PayPal is a separate, real external USD payment.'}</small></span>
        <span className="mono buy-envlinks">
          <a href={addrUrl(ESCROW_ADDRESS)} target="_blank" rel="noreferrer">escrow ↗</a>
          <a href={addrUrl(USDC_ADDRESS)} target="_blank" rel="noreferrer">test USDC ↗</a>
        </span>
      </div>}

      <div className="buy-checkoutgrid">
        <div className="buy-checkoutmain">
          <fieldset className="buy-methods">
            <legend><span className="buy-stepno">1</span> Payment</legend>
            <p>Your preferred method is already selected. Change it only if you want to.</p>
            <div className="buy-rails" role="radiogroup" aria-label="Choose how to pay">
              <RailChoice active={rail === RAIL_ESCROW} disabled={!escrowAvailable || overCap} title="Cairn Escrow" eyebrow={IS_TESTNET_CHAIN ? 'testnet · recommended' : 'recommended'}
                onClick={() => { setRail(RAIL_ESCROW); setPaypalOpened(false); setError(null) }}>
                {IS_TESTNET_CHAIN
                  ? `${CHAIN_LABEL} holds test USDC until the settlement path releases it.`
                  : 'Cairn holds the money until the settlement path releases it.'}
              </RailChoice>
              {paypalAvailable && <RailChoice active={rail === RAIL_PAYPAL} title="PayPal" eyebrow={paypalSandbox ? 'sandbox · no real money' : 'external · real USD'}
                onClick={() => { setRail(RAIL_PAYPAL); setError(null) }}>
                {paypalSandbox
                  ? 'Approve inside Cairn with a PayPal sandbox buyer. PayPal confirms the result.'
                  : 'Pay on PayPal. Cairn records the handoff but cannot control the payment.'}
              </RailChoice>}
            </div>
          </fieldset>

          <section className="buy-railpanel" aria-live="polite">
            <div className="buy-sectiontitle">
              <h3><span className="buy-stepno">2</span>{rail === RAIL_PAYPAL && paypalOpened ? 'Confirm what happened' : 'Review what happens'}</h3>
              <b>{rail === RAIL_ESCROW ? `${CHAIN_LABEL} · ${escrowCurrency}` : paypalSandbox ? 'PayPal Sandbox · test USD' : 'PayPal · external USD'}</b>
            </div>
            {rail === RAIL_ESCROW ? <>
              <div className="buy-outcomes">
                <span><b>Today</b><small>Cairn&rsquo;s {CHAIN_LABEL} contract holds <strong className="money">{total} {escrowCurrency}</strong>.</small></span>
                <span><b>Seller receives</b><small><strong className="money">0 {escrowCurrency}</strong> now; release follows the settlement path.</small></span>
                <span><b>If something goes wrong</b><small>The named Cairn arbiter can resolve the escrow.</small></span>
              </div>
              {!IS_LOCAL_CHAIN && <div className="buy-walletsetup">
                <div className="buy-wallethead">
                  <span className={'buy-setupstate ' + (ready ? 'ok' : '')} aria-hidden="true">{ready ? '✓' : '1'}</span>
                  <span><b>{ready ? 'Testnet wallet ready' : 'Prepare your testnet wallet'}</b><small>Created only when you ask. It is not funded automatically.</small></span>
                </div>
                {!walletsReady ? <p className="buy-walletwait">Checking this account for a settlement wallet…</p>
                  : !ready ? <>
                    <button type="button" className="buy-walletcreate" disabled={creating} onClick={provisionWallet}>
                      {creating ? 'Creating testnet wallet…' : 'Create testnet wallet'}
                    </button>
                    <p>This creates an embedded Ethereum wallet for this Cairn account on your explicit click. It does not add money, approve a token, or fund a trade.</p>
                  </> : <>
                    <div className="buy-walletaddress">
                      <span><small>Your address</small><code>{address}</code></span>
                      <button type="button" onClick={copyWalletAddress}>{walletCopied ? 'Copied ✓' : 'Copy'}</button>
                    </div>
                    <div className="buy-balances" aria-label="Testnet wallet balances">
                      <span className={balancesCurrent && hasEnoughUsdc ? 'ok' : 'missing'}>
                        <small>Test USDC</small><b className="mono money">{balancesCurrent ? fromUsdc(balances.usdc) : 'Checking…'}</b>
                        <i>{hasEnoughUsdc ? 'enough for this order' : `need ${total}`}</i>
                      </span>
                      <span className={balancesCurrent && hasGas ? 'ok' : 'missing'}>
                        <small>Network fee</small><b className="mono">{balancesCurrent ? `${nativeLabel(balances.native)} ETH` : 'Checking…'}</b>
                        <i>{hasGas ? 'gas available' : 'need Sepolia ETH'}</i>
                      </span>
                    </div>
                    <div className="buy-wallettools">
                      <button type="button" disabled={balances.loading} onClick={refreshWalletBalances}>{balances.loading ? 'Checking…' : 'Refresh balances'}</button>
                      {IS_TESTNET_CHAIN && <span>
                        <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer">Get test USDC ↗</a>
                        <a href="https://portal.arbitrum.io/bridge?destinationChain=arbitrum-sepolia&settingsOpen=1&sourceChain=sepolia&tab=bridge" target="_blank" rel="noreferrer">Bridge Sepolia ETH for gas ↗</a>
                      </span>}
                    </div>
                  </>}
                {createError && <div className="buy-error" role="alert">{createError}</div>}
                {balances.error && <div className="buy-error" role="alert">{balances.error}</div>}
              </div>}
              {!usesPresetArbiter && (
                <div className="buy-arbiterblock">
                  <label className="buy-arbiter">
                    <span>Neutral arbiter <small>required</small></span>
                    <input className="ti mono" value={arbiter} disabled={busy} placeholder="0x… · remembered for next time"
                      onChange={(event) => setArbiter(event.target.value.trim())} />
                  </label>
                  <p>Use a reachable {CHAIN_LABEL} wallet controlled by someone other than the buyer or seller. That address decides a dispute, so Cairn never chooses it silently.</p>
                  {IS_TESTNET_CHAIN && <div className="buy-arbiterchoice">
                    <button type="button" disabled={busy} onClick={() => { setArbiter(PILOT_TEST_ARBITER); setError(null) }}>Use rehearsal address</button>
                    <span><b>Contract deployer test address</b> · disposable rehearsal only · no response commitment. Use your own reachable neutral address for meaningful testing.</span>
                  </div>}
                </div>
              )}
              {usesPresetArbiter && <div className="mono buy-arbiterpreset">neutral arbiter · {shortId(arbiter)}</div>}
              {overCap && <div className="buy-error">Testnet escrow cap: {VALUE_CAP_USDC} {escrowCurrency}. PayPal remains a separate {paypalSandbox ? 'sandbox' : 'external'} option.</div>}
              {error && <div className="buy-error" role="alert">{error}</div>}
              <div className="buy-commit">
                {!IS_LOCAL_CHAIN && <ul className="buy-prereqs" aria-label="Before Cairn can fund escrow">
                  <li className={ready ? 'ok' : walletsReady ? 'missing' : 'pending'}><span>{ready ? '✓' : '○'}</span> Testnet wallet</li>
                  <li className={arbiterReady ? 'ok' : 'missing'}><span>{arbiterReady ? '✓' : '○'}</span> Neutral arbiter</li>
                  <li className={hasEnoughUsdc ? 'ok' : 'missing'}><span>{hasEnoughUsdc ? '✓' : '○'}</span> At least {total} test USDC</li>
                  <li className={hasGas ? 'ok' : 'missing'}><span>{hasGas ? '✓' : '○'}</span> Arbitrum Sepolia ETH for gas</li>
                </ul>}
                <p className="buy-actionnote">Your next click may request two wallet confirmations: approve {escrowCurrency}, then fund escrow. It does not pay the seller directly.</p>
                <div className="buy-nowactions">
                  <button className="primary buy-pay" disabled={busy || !canFund} onClick={fundEscrow}>
                    {busy ? (phase || 'Working…') : `Fund ${total} ${escrowCurrency} on ${CHAIN_LABEL}`}
                  </button>
                </div>
              </div>
            </> : paypalSandbox ? <>
              <div className="buy-outcomes paypal">
                <span><b>Today</b><small>PayPal opens a secure sandbox approval window without losing this checkout.</small></span>
                <span><b>Seller receives</b><small><strong className="money">${Number(total).toFixed(2)} sandbox USD</strong> only; it has no cash value.</small></span>
                <span><b>If something goes wrong</b><small>Nothing real moves. Cairn records only PayPal&rsquo;s API-confirmed sandbox result.</small></span>
              </div>
              <div className="buy-paypal-callout sandbox">
                <strong>PayPal Sandbox rehearsal — no real money.</strong>
                <p>Approve <b>${Number(total).toFixed(2)} sandbox USD</b> in PayPal&rsquo;s test window. Cairn creates the order server-side and will mark it paid only after PayPal reports a completed capture.</p>
                <span className="mono">Cairn reference · <b>{payRef}</b> <button type="button" onClick={copyRef}>{copied ? 'copied ✓' : 'copy'}</button></span>
              </div>
              {error && <div className="buy-error" role="alert">{error}</div>}
              <div className="buy-commit paypal sandbox">
                <p className="buy-actionnote">The PayPal button opens a sandbox approval window. No real PayPal balance, card, or bank account is charged.</p>
                <PayPalSandboxButton accountId={accountId} seller={open} catalog={catalog}
                  cards={checkoutCards} cairnReference={payRef} onComplete={completePayPalSandbox} />
              </div>
            </> : !paypalOpened ? <>
              <div className="buy-outcomes paypal">
                <span><b>Today</b><small>You leave Cairn and pay on PayPal.</small></span>
                <span><b>Seller receives</b><small>Payment in PayPal; they must confirm it there before shipping.</small></span>
                <span><b>If something goes wrong</b><small>Use PayPal&rsquo;s Resolution Center. Cairn cannot reverse the payment.</small></span>
              </div>
              <div className="buy-paypal-callout">
                <strong>Manual PayPal handoff — check the recipient.</strong>
                <p>You are opening <b>paypal.me/{paypalHandle}</b> for a real <b>${Number(total).toFixed(2)} USD</b> request. Choose Goods &amp; Services if PayPal presents the choice. Eligibility and PayPal&rsquo;s terms apply.</p>
                <span className="mono">Cairn reference · <b>{payRef}</b> <button type="button" onClick={copyRef}>{copied ? 'copied ✓' : 'copy'}</button></span>
              </div>
              {error && <div className="buy-error" role="alert">{error}</div>}
              <div className="buy-commit paypal">
                <p className="buy-actionnote">Your next click opens PayPal. No payment happens on Cairn.</p>
                <div className="buy-nowactions">
                  <button className="primary buy-pay paypal" onClick={openPayPal}>Continue to manual PayPal · <span className="money-on-action">${Number(total).toFixed(2)} USD</span> ↗</button>
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
                <strong className="mono money">{listing?.ask ?? 0} USDC</strong>
              </div>
            })}
          </div>
          <div className="buy-total"><span>Total due</span><strong>{amountLabel}</strong></div>
          <p>{rail === RAIL_PAYPAL
            ? paypalSandbox
              ? <>The table asks total <span className="money mono">{total} USDC</span>; this rehearsal creates a <span className="money mono">${Number(total).toFixed(2)} sandbox USD</span> order with no cash value.</>
              : <>The table asks total <span className="money mono">{total} USDC</span>; this seller&rsquo;s manual PayPal link requests <span className="money mono">${Number(total).toFixed(2)} USD</span>.</>
            : <>At the table&rsquo;s posted asks. {IS_TESTNET_CHAIN ? `${escrowCurrency} has no cash value; ` : ''}delivery and inspection continue in Trades.</>}</p>
        </aside>
      </div>
    </div>
  )
}
