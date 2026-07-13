import { useCallback, useEffect, useState } from 'react'
import { useEscrowWallet } from './useEscrowWallet.js'
import { OUTCOME, addrUrl } from '../chain/config.js'
import {
  getTrade, fromUsdc, hashText,
  markShipped, confirmReceived, openInspection,
  acceptTrade, settleByTimeout, disputeTrade, resolveTrade, confirmReturnCustody, cancelBeforeShip,
} from '../chain/escrow.js'
import { putRecord, getRecord } from './records.js'
import AskAnko from './AskAnko.jsx'

const short = (a) => (a ? a.slice(0, 6) + '…' + a.slice(-4) : '—')
const errText = (e) => e?.shortMessage || e?.details || e?.message || String(e)
const eq = (a, b) => a && b && a.toLowerCase() === b.toLowerCase()

// A tiny async-action runner: one in-flight label + a surfaced error.
function useAction() {
  const [pending, setPending] = useState(null)
  const [error, setError] = useState(null)
  const run = useCallback(async (label, fn) => {
    setError(null); setPending(label)
    try { return await fn() } catch (e) { setError(errText(e)); throw e } finally { setPending(null) }
  }, [])
  return { pending, error, run, setError }
}

export default function TradePanel({ openTradeId }) {
  const { address, ready, getWalletClient } = useEscrowWallet()
  const [tradeId, setTradeId] = useState(null)
  useEffect(() => { // the ambient line can open a specific trade
    if (openTradeId) setTradeId(openTradeId) // eslint-disable-line react-hooks/set-state-in-effect
  }, [openTradeId])

  if (!tradeId) return (
    <details className="trade-tools">
      <summary><span>Escrow tools</span><span className="mono">load an existing on-chain trade</span></summary>
      <div className="trade-toolsbody">
        <div className="tp-head">
          <div className="tp-tabs"><button className="on" disabled>Escrow</button><LoadTrade onLoad={(id) => setTradeId(id)} /></div>
          <span className="tp-who mono">{ready ? <>signer <a href={addrUrl(address)} target="_blank" rel="noreferrer">{short(address)}</a></> : <span className="dim">no signer — sign in to act (reads work)</span>}</span>
        </div>
        <div className="empty">Load a trade by its number. Active escrow decisions opened from Cairn appear here automatically.</div>
      </div>
    </details>
  )

  return (
    <div className="tp">
      <div className="tp-head">
        <div className="tp-tabs">
          <button className="on" disabled>{tradeId ? `Trade #${tradeId}` : 'Escrow'}</button>
          <LoadTrade onLoad={(id) => setTradeId(id)} />
        </div>
        <span className="tp-who mono">
          {ready ? <>signer <a href={addrUrl(address)} target="_blank" rel="noreferrer">{short(address)}</a></>
            : <span className="dim">no signer — sign in to act (reads work)</span>}
        </span>
      </div>
      <TradeDetail tradeId={tradeId} address={address} ready={ready} getWalletClient={getWalletClient} />
    </div>
  )
}

function LoadTrade({ onLoad }) {
  const [v, setV] = useState('')
  return (
    <span className="tp-load">
      <input className="mono" placeholder="# load" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ''))}
        onKeyDown={(e) => { if (e.key === 'Enter' && v) onLoad(Number(v)) }} />
    </span>
  )
}

// ---- Create / Decide-to-fund ----
function nextMove(t, role, tradeId) {
  const s = t.stateName
  const when = (secs) => { try { return new Date(Number(secs) * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return 'the deadline' } }
  if (s === 'Funded') {
    if (role === 'seller') return 'Your move: ship the card, then mark it shipped with the tracking number.'
    if (role === 'buyer') return `Funded. The seller ships next; this trade shows up in their app. If you\u2019re talking, tell them it\u2019s trade #${tradeId}.`
    return 'Waiting on the seller to ship.'
  }
  if (s === 'Shipped') {
    if (role === 'buyer') return 'On its way. When it arrives, confirm received and inspect it against the record above.'
    return 'Shipped. Waiting on the buyer to confirm arrival.'
  }
  if (s === 'InspectionOpen') {
    const d = when(Number(t.inspectionOpenedAt) + Number(t.inspectionWindow))
    if (role === 'buyer') return `Your move: inspect against the terms in the record. Accept releases the funds; dispute holds them for the arbiter. Silence settles to the seller after ${d}.`
    return `The buyer is inspecting. Silence settles to the seller after ${d}.`
  }
  if (s === 'Disputed') {
    if (role === 'arbiter') return 'Your ruling. Read the record above. A buyer refund needs return custody confirmed first.'
    if (role === 'seller') return 'Disputed. Confirm return custody when the card is back; the arbiter rules from the record.'
    return 'Disputed. Waiting on the arbiter.'
  }
  if (s === 'Settled') return 'Settled. Funds released to the seller. The record stays.'
  if (s === 'Resolved') return 'Resolved by the arbiter. The record stays.'
  if (s === 'Cancelled') return 'Cancelled before shipping. The buyer was refunded.'
  return null
}

// ---- Detail / status + role-aware actions ----

function TradeDetail({ tradeId, address, ready, getWalletClient }) {
  const [t, setT] = useState(null)
  const [loadErr, setLoadErr] = useState(null)
  const [tracking, setTracking] = useState('')
  const [reason, setReason] = useState('')
  const { pending, error, run } = useAction()

  const refresh = useCallback(async () => {
    if (!tradeId) return
    try { setT(await getTrade(tradeId)); setLoadErr(null) } catch (e) { setLoadErr(errText(e)) }
  }, [tradeId])
  useEffect(() => {
    refresh() // eslint-disable-line react-hooks/set-state-in-effect -- load trade state on mount / id change
  }, [refresh])

  if (!tradeId) return <div className="empty">Escrow trades live here — load one by its number, or arrive from the ambient
    line when one needs you. Deals start in the market; when real settlements go on-chain, they&rsquo;ll open here on their own.</div>
  if (loadErr) return <div className="empty">Couldn&rsquo;t load trade #{tradeId} ({loadErr})</div>
  if (!t) return <div className="empty">Loading trade #{tradeId}…</div>

  const role = eq(address, t.buyer) ? 'buyer' : eq(address, t.seller) ? 'seller' : eq(address, t.arbiter) ? 'arbiter' : 'observer'
  const amount = fromUsdc(t.usdcAmount)
  const decisionPoint = role === 'buyer' && t.stateName === 'Funded'
    ? { kind: 'cancel_or_wait', question: 'Should I cancel for a refund or wait for the seller to ship?' }
    : role === 'buyer' && t.stateName === 'InspectionOpen'
      ? { kind: 'accept_or_dispute', question: 'Should I accept the delivery and release funds, or open a dispute?' }
      : role === 'arbiter' && t.stateName === 'Disputed'
        ? { kind: 'arbiter_ruling', question: 'What recorded gaps should I examine before ruling for the buyer or seller?' }
        : null
  const ankoDecision = decisionPoint && {
    decision_ref: `trade:${tradeId}:${t.stateName}`,
    ...decisionPoint,
    terms: { trade_id: tradeId, state: t.stateName, role, amount_usdc: amount, buyer: t.buyer, seller: t.seller, arbiter: t.arbiter, return_custody_confirmed: !!t.returnCustodyConfirmed },
    principal_context: { recorded_policy: 'No signed trade policy is available to this interface.' },
    evidence: { terms_hash: t.termsHash, tracking_hash: t.trackingHash, dispute_reason_hash: t.disputeReasonHash },
  }
  const act = (label, fn) => async () => { try { const wc = await getWalletClient(); await run(label, () => fn(wc)); await refresh() } catch { /* surfaced */ } }
  // a function returning JSX (not a render-created component) — called inline below
  const actBtn = (label, on) => <button className="act" disabled={!ready || !!pending} onClick={on}>{label}</button>

  return (
    <div className="detail">
      <div className="d-top">
        <span className={'pill s-' + t.state}>{t.stateName}</span>
        <span className="mono dim">#{tradeId} · you are the <b>{role}</b></span>
      </div>
      {nextMove(t, role, tradeId) && <p className="nextmove">{nextMove(t, role, tradeId)}</p>}
      <div className="d-grid mono">
        <span>amount</span><span>{amount} USDC</span>
        <span>buyer</span><span><a href={addrUrl(t.buyer)} target="_blank" rel="noreferrer">{short(t.buyer)}</a></span>
        <span>seller</span><span><a href={addrUrl(t.seller)} target="_blank" rel="noreferrer">{short(t.seller)}</a></span>
        <span>arbiter</span><span><a href={addrUrl(t.arbiter)} target="_blank" rel="noreferrer">{short(t.arbiter)}</a></span>
        {t.returnCustodyConfirmed && <><span>return custody</span><span>confirmed</span></>}
      </div>

      <TradeRecord t={t} />

      {ankoDecision && <div className="trade-chain-decision">
        <div className="ofl-decisionlabel mono">Your decision · {decisionPoint.question}</div>
        <AskAnko decision={ankoDecision} recommended={Number(amount) >= 500 || decisionPoint.kind === 'arbiter_ruling'} />
      </div>}

      <div className="d-actions">
        {role === 'buyer' && t.stateName === 'Funded' && actBtn('Cancel (refund)', act('Cancelling…', (wc) => cancelBeforeShip(wc, tradeId)))}
        {role === 'seller' && t.stateName === 'Funded' && (
          <div className="act-row">
            <input className="mono" placeholder="tracking #" value={tracking} onChange={(e) => setTracking(e.target.value)} />
            {actBtn('Mark shipped', act('Shipping…', async (wc) => { await putRecord(tracking || 'shipped'); return markShipped(wc, tradeId, hashText(tracking || 'shipped')) }))}
          </div>
        )}
        {role === 'buyer' && t.stateName === 'Shipped' && actBtn('Confirm received', act('Confirming…', (wc) => confirmReceived(wc, tradeId)))}
        {t.stateName === 'Shipped' && actBtn('Open inspection (timeout)', act('Opening…', (wc) => openInspection(wc, tradeId)))}
        {role === 'buyer' && t.stateName === 'InspectionOpen' && (
          <>
            {actBtn('Looks right — accept', act('Releasing…', (wc) => acceptTrade(wc, tradeId)))}
            <div className="act-row">
              <input placeholder="what's wrong?" value={reason} onChange={(e) => setReason(e.target.value)} />
              {actBtn('Dispute', act('Opening dispute…', async (wc) => { await putRecord(reason || 'dispute'); return disputeTrade(wc, tradeId, hashText(reason || 'dispute')) }))}
            </div>
          </>
        )}
        {t.stateName === 'InspectionOpen' && actBtn('Settle (timeout → seller)', act('Settling…', (wc) => settleByTimeout(wc, tradeId)))}
        {(role === 'seller' || role === 'arbiter') && t.stateName === 'Disputed' && !t.returnCustodyConfirmed
          && actBtn('Confirm return custody', act('Confirming…', (wc) => confirmReturnCustody(wc, tradeId)))}
        {role === 'arbiter' && t.stateName === 'Disputed' && (
          <div className="arb">
            <span className="dim">arbiter ruling:</span>
            {actBtn('Release to seller', act('Ruling…', (wc) => resolveTrade(wc, tradeId, OUTCOME.indexOf('SELLER'), 0)))}
            {actBtn('Refund buyer', act('Ruling…', (wc) => resolveTrade(wc, tradeId, OUTCOME.indexOf('BUYER'), 0)))}
          </div>
        )}
        <button className="ghost sm" onClick={refresh} disabled={!!pending}>refresh</button>
      </div>
      {error && <p className="err mono">{error}</p>}
      <p className="boundary">The escrow follows these actions on-chain <span className="tag enforced">enforced</span>;
        condition and authenticity stay the parties&rsquo; and arbiter&rsquo;s judgment.</p>
    </div>
  )
}

// ---- The readable record behind the on-chain hashes (fetched + keccak-verified) ----
// This is how the arbiter reads the terms and the dispute before ruling — Cairn's memory,
// made legible. Each row is verified against the chain, so a wrong/absent record is visible.
function RecBadge({ status }) {
  const m = {
    verified: ['✓ verified', 'rb-ok'], missing: ['not on record', 'rb-miss'],
    mismatch: ['⚠ altered', 'rb-bad'], error: ['couldn’t load', 'rb-miss'],
  }[status]
  return m ? <span className={'rec-badge ' + m[1]}>{m[0]}</span> : null
}

function TradeRecord({ t }) {
  const [rec, setRec] = useState(null)
  useEffect(() => {
    let live = true
    Promise.all([getRecord(t.termsHash), getRecord(t.disputeReasonHash), getRecord(t.trackingHash)])
      .then(([terms, dispute, tracking]) => { if (live) setRec({ terms, dispute, tracking }) })
    return () => { live = false }
  }, [t.termsHash, t.disputeReasonHash, t.trackingHash])
  if (!rec) return null
  if (rec.terms.status === 'unset' && rec.dispute.status === 'unset' && rec.tracking.status === 'unset') return null

  let terms = null
  if (rec.terms.status === 'verified') { try { terms = JSON.parse(rec.terms.value) } catch { /* fall through to raw */ } }

  return (
    <div className="d-record">
      <div className="ek2">the record <span className="dim">— plaintext behind the on-chain hashes</span></div>
      {rec.terms.status !== 'unset' && (
        <div className="rec-row">
          <span className="rec-k">terms</span>
          <span className="rec-v">{terms ? <>{terms.card} · {terms.condition} · <b>{terms.amount} USDC</b></> : (rec.terms.value || <span className="dim">—</span>)}</span>
          <RecBadge status={rec.terms.status} />
        </div>
      )}
      {rec.tracking.status !== 'unset' && (
        <div className="rec-row">
          <span className="rec-k">tracking</span>
          <span className="rec-v mono">{rec.tracking.value || <span className="dim">—</span>}</span>
          <RecBadge status={rec.tracking.status} />
        </div>
      )}
      {rec.dispute.status !== 'unset' && (
        <div className="rec-row rec-dispute">
          <span className="rec-k">dispute</span>
          <span className="rec-v">{rec.dispute.value || <span className="dim">—</span>}</span>
          <RecBadge status={rec.dispute.status} />
        </div>
      )}
    </div>
  )
}
