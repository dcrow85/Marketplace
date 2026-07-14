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
import { retryImg } from '../binder/helpers.jsx'
import AskAnko from './AskAnko.jsx'
import OfferFollowThrough from './OfferFollowThrough.jsx'

// The offers ledger: every conversation, both directions, counters chained. An
// accepted offer walks the settlement steps right here; everything else shows its
// state and the actions that state allows. One object, one ledger.
const FLOW = ['accepted', 'escrow_locked', 'in_transit', 'delivered', 'settled']
const FLOW_LABEL = { accepted: 'accepted', escrow_locked: 'escrow', in_transit: 'in transit', delivered: 'delivered', settled: 'settled' }

// The live leg: an accepted LIVE deal settles for real — the payer funds ThinPilotEscrow
// (a non-party arbiter named first), the trade # travels to the other side's ledger, and
// each party records the card movement themselves when the mail lands. No rehearsal here.
function LiveLeg({ o, offersKey, catalogId, accountId, decision, recommended }) {
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
        <>
          <div className="ofl-decisionlabel mono">Your decision · choose a neutral arbiter and fund this trade</div>
          <AskAnko decision={{ ...decision, decision_ref: `${o.id}:fund`, kind: 'fund_escrow', question: 'Should I fund this accepted trade through escrow with the arbiter I choose?' }} recommended={recommended} />
          <span className="ofl-fund">
            <input placeholder="arbiter 0x… — a non-party you both name" value={arb} onChange={(e) => setArb(e.target.value.trim())} />
            <button className="sheetbtn mk-sm mono" disabled={!ready || busy} onClick={fund}
              title={ready ? 'approve + fund on-chain — funds held until you accept or an arbiter rules' : 'no signer — sign in with a wallet to fund'}>
              {busy ? 'funding…' : `fund escrow · ${o.cash.amount} USDC`}</button>
          </span>
        </>
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
  const [reads, setReads] = useState({})
  const data = useCatalog(catalog)
  const key = offersKeyFor(catalog.id, accountId)
  const offers = useBus(() => loadOffers(key), [key])
  const byUid = useByUid(data)

  if (!offers.length || !data) return null
  const chip = (x, i) => {
    const c = byUid.get(x.uid)
    return (
      <span key={i} className="ofl-chip" title={c?.name_en || x.uid}>
        {c?.image ? <img src={c.image} alt="" loading="lazy" decoding="async" onError={(ev) => retryImg(ev, c.image)} /> : null}
        <span>{c?.name_en || x.uid}</span>
      </span>
    )
  }

  const lastEvidence = (o) => Array.isArray(o.evidenceThread) ? o.evidenceThread[o.evidenceThread.length - 1] : null
  const evidenceNeedsYou = (o) => {
    const last = lastEvidence(o)
    return ['sent', 'seen'].includes(o.state) && last?.dir === 'in' && last.kind === 'request'
  }
  const awaitingEvidence = (o) => {
    const last = lastEvidence(o)
    return ['sent', 'seen'].includes(o.state) && last?.dir === 'out' && last.kind === 'request'
  }
  const groupFor = (o) => {
    const open = ['sent', 'seen'].includes(o.state)
    if (evidenceNeedsYou(o)) return 'needs'
    if (awaitingEvidence(o)) return 'waiting'
    if (o.dir === 'in' && open) return 'needs'
    if (open || OFFER_SETTLING.includes(o.state)) return 'waiting'
    return 'history'
  }
  const grouped = {
    needs: offers.filter((o) => groupFor(o) === 'needs'),
    waiting: offers.filter((o) => groupFor(o) === 'waiting'),
    history: offers.filter((o) => groupFor(o) === 'history'),
  }
  const renderOffer = (o) => {
        const other = o.dir === 'out' ? o.to : o.from
        const open = ['sent', 'seen'].includes(o.state)
        const settling = OFFER_SETTLING.includes(o.state) || o.state === 'settled'
        const idx = FLOW.indexOf(o.state)
        const getCards = (o.dir === 'out' ? o.want : o.give).map((x) => byUid.get(x.uid)).filter(Boolean)
        const giveCards = (o.dir === 'out' ? o.give : o.want).map((x) => byUid.get(x.uid)).filter(Boolean)
        const receiveItems = o.dir === 'out' ? o.want : o.give
        const giveItems = o.dir === 'out' ? o.give : o.want
        const cashFromYou = o.cash && (o.dir === 'out' ? o.cash.side === 'from' : o.cash.side === 'to')
        const recommended = Number(o.cash?.amount || 0) >= 500 || [...getCards, ...giveCards].some((c) => Number(c.band_rank || 0) >= 3)
        const evidenceRef = lastEvidence(o)?.id || 'none'
        const decision = {
          decision_ref: `${o.id}:${o.state}:${evidenceRef}`,
          kind: 'incoming_offer',
          question: 'Should I accept, counter, or decline this offer?',
          terms: {
            direction: o.dir, state: o.state, live: !!o.live,
            you_receive: getCards.map((c) => ({ uid: c.uid, name: c.name_en, number: c.num, attention_band: c.band_rank || null })),
            you_give: giveCards.map((c) => ({ uid: c.uid, name: c.name_en, number: c.num, attention_band: c.band_rank || null })),
            cash: o.cash || null,
          },
          principal_context: { recorded_policy: 'No signed trade policy is available to this interface.' },
          evidence: {
            counterparty_statement: o.response?.line || null,
            scans_or_condition_evidence: 'not included in this offer packet',
            evidence_messages: (o.evidenceThread || []).slice(-6).map(({ kind, dir, line }) => ({ kind, dir, line })),
          },
        }
        const currentRead = reads[o.id]?.decision_ref === decision.decision_ref ? reads[o.id] : null
        const needsEvidence = evidenceNeedsYou(o)
        const waitingEvidence = awaitingEvidence(o)
        return (
          <div key={o.id} className={'ofl-row' + (((o.dir === 'in' && open) && !waitingEvidence) || needsEvidence ? ' needs-you' : '') + (o.state === 'settled' ? ' done' : '') + (o.state === 'countered' || o.state === 'withdrawn' || o.state === 'declined' ? ' closed' : '')}>
            <div className="ofl-top">
              <span className="mono ofl-dir">{o.dir === 'out' ? '→ to' : '← from'} <b>{handleFor(other)}</b> · {o.at}{o.counterOf ? ' · counter' : ''}{o.live ? <span className="ofl-live"> · ● live</span> : ''}</span>
              <span className={'mono ofl-st st-' + o.state}>{needsEvidence ? 'evidence requested' : waitingEvidence ? 'awaiting evidence' : o.dir === 'in' && open ? 'needs your answer' : o.state.replace('_', ' ')}</span>
            </div>
            <div className="ofl-terms">
              <div className="ofl-term receive">
                <span className="mono ofl-termlabel">You receive</span>
                <div className="ofl-termitems">
                  {receiveItems.map(chip)}
                  {o.cash && !cashFromYou && <span className="mono ofl-cash">+ {o.cash.amount} USDC</span>}
                  {!receiveItems.length && !(o.cash && !cashFromYou) && <span className="ofl-emptyterm">Nothing recorded</span>}
                </div>
              </div>
              <span className="ofl-termjoin mono" aria-hidden="true">⇄</span>
              <div className="ofl-term give">
                <span className="mono ofl-termlabel">You give</span>
                <div className="ofl-termitems">
                  {giveItems.map(chip)}
                  {o.cash && cashFromYou && <span className="mono ofl-cash">+ {o.cash.amount} USDC</span>}
                  {!giveItems.length && !(o.cash && cashFromYou) && <span className="ofl-emptyterm">Nothing recorded</span>}
                </div>
              </div>
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
            <LiveLeg o={o} offersKey={key} catalogId={catalog.id} accountId={accountId} decision={decision} recommended={recommended} />
            {o.dir === 'in' && open && <>
              <div className="ofl-decisionlabel mono">Your decision · accept, counter, or decline</div>
              <AskAnko decision={decision} recommended={recommended}
                onRead={(read) => setReads((previous) => ({ ...previous, [o.id]: read }))} />
            </>}
            <OfferFollowThrough o={o} offersKey={key} read={currentRead} cardNames={getCards.map((c) => c.name_en)}
              onAccept={() => acceptIncoming(key, o.id)} onCounter={() => onCounter?.(o)} onDecline={() => declineIncoming(key, o.id)} />
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
  }

  return (
    <div className="ofl">
      <section className="trade-group needs">
        <div className="trade-grouphead"><span className="ek">Needs you</span><span className="mono dim">{grouped.needs.length ? `${grouped.needs.length} decision${grouped.needs.length === 1 ? '' : 's'}` : 'nothing waiting on you'}</span></div>
        {grouped.needs.map(renderOffer)}
      </section>
      {!!grouped.waiting.length && <details className="trade-fold">
        <summary><span>Waiting</span><span className="mono">{grouped.waiting.length} · someone else has the next move</span></summary>
        <div className="trade-foldbody">{grouped.waiting.map(renderOffer)}</div>
      </details>}
      {!!grouped.history.length && <details className="trade-fold">
        <summary><span>History</span><span className="mono">{grouped.history.length} closed or completed</span></summary>
        <div className="trade-foldbody">{grouped.history.map(renderOffer)}</div>
      </details>}
      <details className="trade-help"><summary>How offers work</summary><p className="sc-note dim">An offer is a message, not a lock. A <b>● live</b> offer reached a real person&rsquo;s inbox. Anko&rsquo;s read is advisory; accepting, funding, and recording the trade stay separate human actions.</p></details>
    </div>
  )
}
