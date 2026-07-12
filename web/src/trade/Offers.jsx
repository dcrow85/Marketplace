import { useState } from 'react'
import { offersKeyFor, loadOffers, setOfferState, withdrawOffer, clearOffer, OFFER_SETTLING } from './offers.js'
import { acceptIncoming, declineIncoming } from '../market/mockAgents.js'
import { recordSettledLive } from '../live/inbox.js'
import { pushInbox, isLiveAddr } from '../live/pilotStore.js'
import { useEscrowWallet } from './useEscrowWallet.js'
import { toUsdc, hashText, approveUsdc, usdcAllowance, createTrade } from '../chain/escrow.js'
import { putRecord } from './records.js'
import { useCatalog, useByUid } from '../lib/data.js'
import { useBus } from '../lib/store.js'
import { handleFor } from '../identity.js'

// The offers ledger: every conversation, both directions, counters chained. An
// accepted offer walks the settlement steps right here; everything else shows its
// state and the actions that state allows. One object, one ledger.
const FLOW = ['accepted', 'escrow_locked', 'in_transit', 'delivered', 'settled']
const FLOW_LABEL = { accepted: 'accepted', escrow_locked: 'escrow', in_transit: 'in transit', delivered: 'delivered', settled: 'settled' }

// The live leg: an accepted LIVE deal settles for real — the payer funds ThinPilotEscrow
// (a non-party arbiter named first), the trade # travels to the other side's ledger, and
// each party records the card movement themselves when the mail lands. No rehearsal here.
function LiveLeg({ o, offersKey, catalogId, accountId }) {
  const { address, ready, getWalletClient } = useEscrowWallet()
  const [arb, setArb] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  if (!o.live || !['accepted', 'escrow_locked', 'in_transit', 'delivered'].includes(o.state)) return null
  const other = o.dir === 'out' ? o.to : o.from
  const payer = o.cash && (o.dir === 'out' ? o.cash.side === 'from' : o.cash.side === 'to')
  const fund = async () => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(arb)) { setErr('name a non-party arbiter address first — pilot rule, no exceptions'); return }
    setBusy(true); setErr(null)
    try {
      const wc = await getWalletClient()
      const amountRaw = toUsdc(o.cash.amount)
      if ((await usdcAllowance(address)) < amountRaw) await approveUsdc(wc, amountRaw)
      const terms = JSON.stringify({ offer: o.id, cards: (o.dir === 'out' ? o.want : o.give).map((x) => x.uid), amount: o.cash.amount })
      await putRecord(terms)
      const { tradeId } = await createTrade(wc, {
        seller: other, arbiter: arb, amountRaw,
        cardRefHash: hashText('offer:' + o.id), termsHash: hashText(terms), inspectionWindow: 3 * 86400,
      })
      setOfferState(offersKey, o.id, 'escrow_locked', { tradeId, rail: 'escrow', log: [...(o.log || []), `escrow funded — trade #${tradeId} · ${o.cash.amount} USDC held on-chain`] })
      if (isLiveAddr(other)) pushInbox(other, { id: o.id, type: 'response', state: 'escrow_locked', extra: { tradeId, rail: 'escrow' } })
    } catch (e) { setErr((e?.shortMessage || e?.message || 'tx failed').slice(0, 120)) }
    finally { setBusy(false) }
  }
  return (
    <div className="ofl-liveleg mono">
      {o.cash && !o.tradeId && payer && (
        <span className="ofl-fund">
          <input placeholder="arbiter 0x… — a non-party you both name" value={arb} onChange={(e) => setArb(e.target.value.trim())} />
          <button className="sheetbtn mk-sm mono" disabled={!ready || busy} onClick={fund}
            title={ready ? 'approve + fund on-chain — funds held until you accept or an arbiter rules' : 'no signer — sign in with a wallet to fund'}>
            {busy ? 'funding…' : `fund escrow · ${o.cash.amount} USDC`}</button>
        </span>
      )}
      {o.cash && !o.tradeId && !payer && <span className="dim">cash leg: they fund escrow — the trade # lands here when they do</span>}
      {o.tradeId && <span>escrow trade <b>#{o.tradeId}</b> — load it in the Escrow tab below to ship / receive / accept</span>}
      {!o.cash && <span className="dim">no cash leg — move the cards, then record it settled</span>}
      <button className="sheetbtn mk-sm mono" onClick={() => recordSettledLive(catalogId, accountId, o.id)}
        title="moves the cards in your binder and tells their app — your copy of the record, theirs stays theirs">✓ record settled</button>
      {err && <span className="ofl-err">{err}</span>}
    </div>
  )
}

export default function Offers({ accountId, catalog, onCounter }) {
  const data = useCatalog(catalog)
  const key = offersKeyFor(catalog.id, accountId)
  const offers = useBus(() => loadOffers(key), [key])
  const byUid = useByUid(data)

  if (!offers.length || !data) return null
  const chip = (x, i) => {
    const c = byUid.get(x.uid)
    return (
      <span key={i} className="ofl-chip" title={c?.name_en || x.uid}>
        {c?.image ? <img src={c.image} alt="" loading="lazy" /> : null}
        <span>{c?.name_en || x.uid}</span>
      </span>
    )
  }

  return (
    <div className="ofl">
      <div className="sw-head">
        <span className="ek">Offers</span>
        <span className="mono dim">{offers.length} · counters are just new offers, linked</span>
      </div>
      {offers.map((o) => {
        const other = o.dir === 'out' ? o.to : o.from
        const open = ['sent', 'seen'].includes(o.state)
        const settling = OFFER_SETTLING.includes(o.state) || o.state === 'settled'
        const idx = FLOW.indexOf(o.state)
        return (
          <div key={o.id} className={'ofl-row' + (o.state === 'settled' ? ' done' : '') + (o.state === 'countered' || o.state === 'withdrawn' || o.state === 'declined' ? ' closed' : '')}>
            <div className="ofl-top">
              <span className="mono ofl-dir">{o.dir === 'out' ? '→ to' : '← from'} <b>{handleFor(other)}</b> · {o.at}{o.counterOf ? ' · counter' : ''}{o.live ? <span className="ofl-live"> · ● live</span> : ''}</span>
              <span className={'mono ofl-st st-' + o.state}>{o.state.replace('_', ' ')}</span>
            </div>
            <div className="ofl-baskets">
              <span className="ofl-side"><i className="mono dim">you get</i> {(o.dir === 'out' ? o.want : o.give).map(chip)}{(o.dir === 'out' ? o.want : o.give).length ? null : ' —'}</span>
              <span className="sw-arrow mono">⇄</span>
              <span className="ofl-side"><i className="mono dim">you give</i> {(o.dir === 'out' ? o.give : o.want).map(chip)}{(o.dir === 'out' ? o.give : o.want).length ? null : ' —'}</span>
              {o.cash && <span className="mono ofl-cash">{(o.dir === 'out' ? o.cash.side === 'from' : o.cash.side === 'to') ? 'you' : 'they'} add {o.cash.amount} USDC</span>}
            </div>
            {o.response?.line && <div className="sw-say"><span className="mono dim">their agent</span> {o.response.line}</div>}
            {settling && (
              <div className="mt-steps mono">
                {FLOW.map((s, i) => (
                  <span key={s} className={'mt-step' + (i <= idx ? ' on' : '') + (s === 'settled' && o.state === 'settled' ? ' ok' : '')}>
                    {i <= idx ? '✓ ' : ''}{FLOW_LABEL[s]}
                  </span>
                ))}
              </div>
            )}
            {(o.log || []).slice(-1).map((l, i) => <div key={i} className="mt-line"><span className="mono dim">rail</span> {l}</div>)}
            <LiveLeg o={o} offersKey={key} catalogId={catalog.id} accountId={accountId} />
            <span className="sw-acts">
              {o.dir === 'in' && open && <>
                <button className="sheetbtn mk-sm mono sw-boot" onClick={() => acceptIncoming(key, o.id)}>✓ accept</button>
                <button className="sheetbtn mk-sm mono" onClick={() => onCounter && onCounter(o)}>⇄ counter</button>
                <button className="sheetbtn mk-sm mono" onClick={() => declineIncoming(key, o.id)}>✕ decline</button>
              </>}
              {o.dir === 'out' && open && <button className="sheetbtn mk-sm mono" onClick={() => withdrawOffer(key, o.id)}>✕ withdraw</button>}
              {!open && !OFFER_SETTLING.includes(o.state) && <button className="sheetbtn mk-sm mono" onClick={() => clearOffer(key, o.id)}>✕ clear</button>}
            </span>
          </div>
        )
      })}
      <p className="sc-note dim">An offer is a message, not a lock. Offers to sample sellers settle as rehearsal in your
        browser; a <b>● live</b> offer reached a real person&rsquo;s inbox — its cash moves only through escrow with an
        arbiter named, and each side records the card movement themselves.</p>
    </div>
  )
}
