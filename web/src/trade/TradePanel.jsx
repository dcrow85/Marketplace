import { useCallback, useEffect, useState } from 'react'
import { useEscrowWallet } from './useEscrowWallet.js'
import { OUTCOME, VALUE_CAP_USDC, addrUrl } from '../chain/config.js'
import {
  getTrade, usdcBalance, usdcAllowance, fromUsdc, toUsdc, hashText,
  approveUsdc, createTrade, markShipped, confirmReceived, openInspection,
  acceptTrade, settleByTimeout, disputeTrade, resolveTrade, confirmReturnCustody, cancelBeforeShip,
} from '../chain/escrow.js'
import { putRecord, getRecord } from './records.js'

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
  const [view, setView] = useState('create') // 'create' | 'detail'
  const [tradeId, setTradeId] = useState(null)
  useEffect(() => { // the ambient line can open a specific trade
    if (openTradeId) { setTradeId(openTradeId); setView('detail') } // eslint-disable-line react-hooks/set-state-in-effect
  }, [openTradeId])

  return (
    <div className="tp">
      <div className="tp-head">
        <div className="tp-tabs">
          <button className={view === 'create' ? 'on' : ''} onClick={() => setView('create')}>New trade</button>
          <button className={view === 'detail' ? 'on' : ''} onClick={() => setView('detail')} disabled={!tradeId}>
            {tradeId ? `Trade #${tradeId}` : 'Trade'}
          </button>
          <LoadTrade onLoad={(id) => { setTradeId(id); setView('detail') }} />
        </div>
        <span className="tp-who mono">
          {ready ? <>signer <a href={addrUrl(address)} target="_blank" rel="noreferrer">{short(address)}</a></>
            : <span className="dim">no signer — sign in to act (reads work)</span>}
        </span>
      </div>
      {view === 'create'
        ? <CreateTrade address={address} ready={ready} getWalletClient={getWalletClient}
            onCreated={(id) => { setTradeId(id); setView('detail') }} />
        : <TradeDetail tradeId={tradeId} address={address} ready={ready} getWalletClient={getWalletClient} />}
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

// Parse a pasted trade sheet (plaintext, seller-authored — see the modal's generator).
// Untrusted input: cap the size, accept only known keys, validate each value, and fill a
// form the buyer still reads, completes (arbiter), and signs. A sheet can never move money.
function parseTradeSheet(text) {
  if (typeof text !== 'string' || text.length > 4000) return null
  const out = {}
  for (const raw of text.split(/\r?\n/).slice(0, 40)) {
    const m = raw.trim().match(/^(card|condition|ask|seller)\s{2,}(.+)$/i) || raw.trim().match(/^(card|condition|ask|seller)\s*[:=]\s*(.+)$/i)
    if (!m) continue
    const key = m[1].toLowerCase()
    const val = m[2].trim().slice(0, 140)
    if (key === 'card' && val) out.card = val
    else if (key === 'condition' && val) out.condition = val.slice(0, 60)
    else if (key === 'ask') { const n = val.replace(/usdc/i, '').trim(); if (/^\d+(\.\d{1,6})?$/.test(n)) out.amount = n }
    else if (key === 'seller' && /^0x[a-fA-F0-9]{40}$/.test(val)) out.seller = val
  }
  return Object.keys(out).length ? out : null
}

// ---- Create / Decide-to-fund ----
function CreateTrade({ address, ready, getWalletClient, onCreated }) {
  const [f, setF] = useState({ card: '', seller: '', arbiter: '', amount: '', condition: 'Near Mint', days: '7' })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const [bal, setBal] = useState(null)
  const [recWarn, setRecWarn] = useState(null)
  const [sheetNote, setSheetNote] = useState(null)
  const { pending, error, run } = useAction()

  const onSheetPaste = (text) => {
    const p = parseTradeSheet(text)
    if (!p) { if (text.trim()) setSheetNote({ warn: true, text: 'That doesn\u2019t read as a trade sheet. Nothing was filled.' }); return }
    setF((prev) => ({ ...prev, ...(p.card ? { card: p.card } : {}), ...(p.condition ? { condition: p.condition } : {}), ...(p.amount ? { amount: p.amount } : {}), ...(p.seller ? { seller: p.seller } : {}) }))
    const filled = ['card', 'condition', 'amount', 'seller'].filter((k) => p[k === 'amount' ? 'amount' : k])
    setSheetNote({ warn: false, text: `Sheet loaded: ${filled.join(', ')}. Read every line, check the seller address against your conversation, add your arbiter.` })
  }

  useEffect(() => {
    let live = true
    if (address) usdcBalance(address).then((b) => live && setBal(b)).catch(() => {})
    return () => { live = false }
  }, [address])

  const amt = Number(f.amount || 0)
  const overCap = amt > VALUE_CAP_USDC
  const lowBal = bal != null && amt > 0 && toUsdc(f.amount) > bal
  const badAddr = (a) => a && !/^0x[a-fA-F0-9]{40}$/.test(a)
  const guide = !f.card ? 'Step 1: paste your seller\u2019s sheet above, or type the card by hand.'
    : (!f.seller || badAddr(f.seller)) ? 'Step 2: the seller\u2019s wallet address, exactly as they gave it to you.'
    : (!f.arbiter || badAddr(f.arbiter)) ? 'Step 3: your arbiter. Someone who is neither of you and answers within a day or two.'
    : !(amt > 0) ? 'Step 4: the amount you agreed, in USDC.'
    : !ready ? 'Sign in to fund. Reads work without it; money needs a signer.'
    : `Ready. Funding locks ${amt} USDC with the escrow until you accept or dispute. Expect two wallet confirmations: approve, then fund.`
  const canSubmit = ready && f.card && f.seller && f.arbiter && amt > 0 && !overCap
    && !badAddr(f.seller) && !badAddr(f.arbiter) && !eq(f.seller, address) && !eq(f.arbiter, address) && !eq(f.seller, f.arbiter)

  const submit = async () => {
    if (!canSubmit) return
    try {
      const wc = await getWalletClient()
      const amountRaw = toUsdc(f.amount)
      const allow = await usdcAllowance(address)
      if (allow < amountRaw) await run('Approving USDC…', () => approveUsdc(wc, amountRaw))
      const termsStr = JSON.stringify({ card: f.card, condition: f.condition, amount: f.amount })
      const termsHash = hashText(termsStr)
      const cardRefHash = hashText(f.card)
      const { tradeId } = await run('Funding escrow…', () => createTrade(wc, {
        seller: f.seller, arbiter: f.arbiter, amountRaw, cardRefHash, termsHash,
        inspectionWindow: Math.max(1, Number(f.days)) * 86400,
      }))
      // Persist the readable record so the seller + arbiter can read AND verify the terms.
      const saved = (await Promise.all([putRecord(termsStr), putRecord(f.card)])).every(Boolean)
      if (!saved) setRecWarn('Terms are on-chain, but the readable copy didn’t save — the arbiter won’t see them. Retry from the trade.')
      if (tradeId) onCreated(tradeId)
    } catch { /* surfaced by run() */ }
  }

  return (
    <div className="decide">
      <div className="decide-card">
        <div className="dc-frame"><div className="dc-art mono">{f.card || 'the card'}</div></div>
      </div>
      <div className="decide-body">
        <div className="ek">Decide</div>
        <h3>{amt > 0 && f.seller ? <>Buy <b>{f.card || 'this card'}</b> for <b>{amt} USDC</b>?</> : 'Start a trade'}</h3>
        <p className="guide">{guide}</p>

        <label>Have a trade sheet from your seller?</label>
        <textarea className="sheetbox mono" rows={2} placeholder="Paste it here as text. It only fills this form — you still read it, add the arbiter, and sign."
          onChange={(ev) => { const t = ev.target.value; if (t.trim()) { onSheetPaste(t); ev.target.value = '' } }} />
        {sheetNote && <p className={sheetNote.warn ? 'warn' : 'sheetok mono'}>{sheetNote.text}</p>}

        <label>Card</label>
        <input value={f.card} onChange={set('card')} placeholder="e.g. Penny · AZK01-001" />
        <div className="row2">
          <div><label>Condition claim <span className="tag judged">judged</span></label>
            <input value={f.condition} onChange={set('condition')} /></div>
          <div><label>Amount (USDC) <span className="dim">cap {VALUE_CAP_USDC}</span></label>
            <input className="mono" value={f.amount} onChange={set('amount')} placeholder="0" inputMode="decimal" /></div>
        </div>
        <label>Seller wallet</label>
        <input className="mono" value={f.seller} onChange={set('seller')} placeholder="0x… (seller wallet)" />
        <div className="row2">
          <div><label>Arbiter wallet</label>
            <input className="mono" value={f.arbiter} onChange={set('arbiter')} placeholder="0x… (neutral)" /></div>
          <div><label>Inspection window</label>
            <input className="mono" value={f.days} onChange={set('days')} /><span className="suffix">days</span></div>
        </div>

        {overCap && <p className="warn">Over the {VALUE_CAP_USDC} USDC pilot cap.</p>}
        {lowBal && <p className="warn">Your USDC balance is below this amount.</p>}
        {eq(f.arbiter, address) && <p className="warn">The arbiter can&rsquo;t be you — you&rsquo;re the buyer (G5.1).</p>}
        {bal != null && <p className="dim mono">your USDC: {fromUsdc(bal)}</p>}
        {bal != null && bal === 0n && <p className="dim">No test USDC yet: faucet.circle.com, pick Arbitrum Sepolia. Gas needs a little Sepolia ETH too.</p>}

        <p className="boundary">Cairn escrows the funds and records the claim <span className="tag enforced">enforced</span>.
          It can&rsquo;t confirm the card is authentic or its grade — a witness, not proof.</p>

        <button className="fund" disabled={!canSubmit || !!pending} onClick={submit}>
          {pending || (ready ? 'Fund escrow' : 'Sign in to fund')}
        </button>
        {error && <p className="err mono">{error}</p>}
        {recWarn && <p className="warn">{recWarn}</p>}
      </div>
    </div>
  )
}

// The state machine narrates: whose move it is, what happens on silence. The chain
// enforces this; the surface says it out loud so nobody has to infer it from buttons.
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

  if (!tradeId) return <div className="empty">Load a trade by its number, or start one under New trade. If a trade needs you, the line above your binder says so.</div>
  if (loadErr) return <div className="empty">Couldn&rsquo;t load trade #{tradeId} ({loadErr})</div>
  if (!t) return <div className="empty">Loading trade #{tradeId}…</div>

  const role = eq(address, t.buyer) ? 'buyer' : eq(address, t.seller) ? 'seller' : eq(address, t.arbiter) ? 'arbiter' : 'observer'
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
        <span>amount</span><span>{fromUsdc(t.usdcAmount)} USDC</span>
        <span>buyer</span><span><a href={addrUrl(t.buyer)} target="_blank" rel="noreferrer">{short(t.buyer)}</a></span>
        <span>seller</span><span><a href={addrUrl(t.seller)} target="_blank" rel="noreferrer">{short(t.seller)}</a></span>
        <span>arbiter</span><span><a href={addrUrl(t.arbiter)} target="_blank" rel="noreferrer">{short(t.arbiter)}</a></span>
        {t.returnCustodyConfirmed && <><span>return custody</span><span>confirmed</span></>}
      </div>

      <TradeRecord t={t} />

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
