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
import OfferSummary from './OfferSummary.jsx'
import { paymentReference, payPalMeUrl, RAIL_PAYPAL } from '../payments/rails.js'

// The offers ledger: every conversation, both directions, counters chained. An
// accepted offer walks the settlement steps right here; everything else shows its
// state and the actions that state allows. One object, one ledger.
const ESCROW_FLOW = ['accepted', 'escrow_locked', 'in_transit', 'delivered', 'settled']
const PAYPAL_FLOW = ['payment_reported', 'payment_confirmed', 'in_transit', 'delivered', 'settled']
const FLOW_LABEL = {
  accepted: 'terms agreed', escrow_locked: 'escrow funded', payment_reported: 'buyer reported paid',
  payment_confirmed: 'seller confirmed', in_transit: 'in transit', delivered: 'delivered', settled: 'complete',
}
const STATUS_LABEL = {
  payment_reported: 'check PayPal', payment_confirmed: 'payment confirmed', provider_disputed: 'problem recorded',
  escrow_locked: 'funds in escrow', in_transit: 'in transit', delivered: 'delivered',
}

// The live leg: an accepted LIVE deal settles for real — the payer funds ThinPilotEscrow
// (a non-party arbiter named first), the trade # travels to the other side's ledger, and
// each party records the card movement themselves when the mail lands. No rehearsal here.
function LiveLeg({ o, offersKey, catalogId, accountId, decision, recommended }) {
  const { address, ready, getWalletClient } = useEscrowWallet()
  const [arb, setArb] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [paypalOpened, setPaypalOpened] = useState(false)
  const [providerRef, setProviderRef] = useState('')
  const [paymentRef] = useState(() => paymentReference())
  const paypal = o.rail === RAIL_PAYPAL || o.settlement?.rail === RAIL_PAYPAL
  if (!o.live || (paypal ? o.state !== 'accepted' : !['accepted', 'escrow_locked', 'in_transit', 'delivered'].includes(o.state))) return null
  const other = o.dir === 'out' ? o.to : o.from
  const payer = o.cash && (o.dir === 'out' ? o.cash.side === 'from' : o.cash.side === 'to')
  const paypalUrl = payPalMeUrl(o.settlement?.paypal_handle, o.cash?.amount)
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
  const reportPayPal = () => {
    const settlement = { ...(o.settlement || {}), rail: RAIL_PAYPAL, currency: 'USD', cairn_enforced: false,
      payment_ref: paymentRef, provider_ref: providerRef.trim().slice(0, 80) || null }
    setOfferState(offersKey, o.id, 'payment_reported', {
      rail: RAIL_PAYPAL, settlement,
      log: [...(o.log || []), `Buyer reported ${Number(o.cash.amount).toFixed(2)} USD sent through PayPal · ${paymentRef} · not verified by Cairn`],
    })
    if (isLiveAddr(other)) pushInbox(other, { id: o.id, type: 'response', state: 'payment_reported', extra: { rail: RAIL_PAYPAL, settlement } })
  }
  return (
    <div className="ofl-liveleg mono">
      {o.cash && !o.tradeId && payer && paypal && !paypalOpened && (
        <div className="ofl-paypalstart">
          <div className="ofl-decisionlabel mono">Your decision · leave Cairn and pay through PayPal</div>
          <div className="ofl-railboundary"><b>PayPal handles this payment.</b> Cairn records the agreed terms but cannot hold, release, or reverse the money.</div>
          <button className="sheetbtn mk-sm mono" disabled={!paypalUrl} onClick={() => {
            const tab = window.open(paypalUrl, '_blank')
            if (tab) { tab.opener = null; setPaypalOpened(true) } else setErr('Your browser blocked the PayPal tab.')
          }}>Continue to PayPal · <span className="money">{o.cash.amount} USD</span> ↗</button>
          <span>reference · <b>{paymentRef}</b></span>
        </div>
      )}
      {o.cash && !o.tradeId && payer && paypal && paypalOpened && (
        <div className="ofl-paypalreturn">
          <b>Back from PayPal?</b>
          <span>Cairn cannot see whether you paid. Record only what happened; the seller must confirm receipt separately.</span>
          <input placeholder="PayPal transaction ID · optional" value={providerRef} onChange={(event) => setProviderRef(event.target.value)} />
          <span><button className="sheetbtn mk-sm mono" onClick={reportPayPal}>I completed payment in PayPal</button>
            <button className="sheetbtn mk-sm mono" onClick={() => setPaypalOpened(false)}>I didn&rsquo;t pay</button></span>
        </div>
      )}
      {o.cash && !o.tradeId && payer && !paypal && (
        <>
          <div className="ofl-decisionlabel mono">Your decision · choose a neutral arbiter and fund this trade</div>
          <AskAnko decision={{ ...decision, decision_ref: `${o.id}:fund`, kind: 'fund_escrow', question: 'Should I fund this accepted trade through escrow with the arbiter I choose?' }} recommended={recommended} />
          <span className="ofl-fund">
            <input placeholder="arbiter 0x… — a non-party you both name" value={arb} onChange={(e) => setArb(e.target.value.trim())} />
            <button className="sheetbtn mk-sm mono" disabled={!ready || busy} onClick={fund}
              title={ready ? 'approve + fund on-chain — funds held until you accept or an arbiter rules' : 'no signer — sign in with a wallet to fund'}>
              {busy ? 'funding…' : <>fund escrow · <span className="money">{o.cash.amount} USDC</span></>}</button>
          </span>
        </>
      )}
      {o.cash && !o.tradeId && !payer && <span className="dim">{paypal ? 'They act in PayPal next. Do not ship until you confirm the payment in your own PayPal activity.' : 'cash leg: they fund escrow — the trade # lands here when they do'}</span>}
      {o.tradeId && <span>escrow trade <b>#{o.tradeId}</b> — load it in the Escrow tab below to ship / receive / accept</span>}
      {!o.cash && <span className="dim">no cash leg — move the cards, then record it settled</span>}
      {!paypal && <button className="sheetbtn mk-sm mono" onClick={() => recordSettledLive(catalogId, accountId, o.id)}
        title="moves the cards in your binder and tells their app — your copy of the record, theirs stays theirs">✓ record settled</button>
      }
      {err && <span className="ofl-err">{err}</span>}
    </div>
  )
}

function PayPalLeg({ o, offersKey, catalogId, accountId }) {
  const [tracking, setTracking] = useState('')
  const other = o.dir === 'out' ? o.to : o.from
  const payer = o.cash && (o.dir === 'out' ? o.cash.side === 'from' : o.cash.side === 'to')
  const seller = !payer
  const apiConfirmed = o.settlement?.verified_by === 'paypal_capture_api' && o.settlement?.provider_status === 'COMPLETED'
  const sandbox = o.settlement?.environment === 'sandbox'
  if ((o.rail !== RAIL_PAYPAL && o.settlement?.rail !== RAIL_PAYPAL) || !['payment_reported', 'payment_confirmed', 'in_transit', 'delivered', 'provider_disputed'].includes(o.state)) return null
  const advance = (state, line, extra = {}) => {
    const log = [...(o.log || []), line]
    setOfferState(offersKey, o.id, state, { ...extra, log })
    if (o.live && isLiveAddr(other)) pushInbox(other, { id: o.id, type: 'response', state, line, extra })
  }
  return <div className="ofl-paypalleg">
    <div className="ofl-railhead mono"><b>PayPal{sandbox ? ' Sandbox' : ''} · external rail</b><span>{apiConfirmed ? 'PayPal API reported the capture; Cairn does not hold it.' : 'Cairn does not hold or verify these funds.'}</span></div>
    {o.state === 'payment_reported' && seller && <>
      <p>The buyer reports paying <span className="money mono">{o.cash?.amount} USD</span>. Check your own PayPal activity and recipient account before shipping.</p>
      {o.settlement?.payment_ref && <span className="mono">Cairn reference · {o.settlement.payment_ref}</span>}
      {o.settlement?.provider_ref && <span className="mono">Buyer supplied PayPal reference · {o.settlement.provider_ref}</span>}
      <span className="sw-acts">
        <a className="sheetbtn mk-sm mono" href="https://www.paypal.com/myaccount/activities/" target="_blank" rel="noreferrer">Check PayPal ↗</a>
        <button className="sheetbtn mk-sm mono sw-boot" onClick={() => advance('payment_confirmed', 'Seller confirmed the payment appears received in PayPal · provider-controlled, not verified by Cairn')}>I confirmed it in PayPal</button>
      </span>
    </>}
    {o.state === 'payment_reported' && payer && <p>Waiting for the seller to check PayPal and separately confirm receipt. PayPal—not Cairn—controls the payment.</p>}
    {o.state === 'payment_confirmed' && seller && <>
      <p>{apiConfirmed ? `PayPal API reported this ${sandbox ? 'sandbox ' : ''}capture completed.` : 'You confirmed the PayPal payment.'} Ship only to the address and under the conditions shown in the PayPal transaction.</p>
      <span className="ofl-fund"><input placeholder="tracking number · optional" value={tracking} onChange={(event) => setTracking(event.target.value)} />
        <button className="sheetbtn mk-sm mono" onClick={() => advance('in_transit', tracking ? `Seller marked shipped · tracking ${tracking}` : 'Seller marked shipped · no tracking recorded', { tracking: tracking.trim().slice(0, 120) || null })}>Mark shipped</button></span>
    </>}
    {o.state === 'payment_confirmed' && payer && <p>{apiConfirmed
      ? <>PayPal API reported <span className="money mono">{o.cash?.amount} {sandbox ? 'sandbox ' : ''}USD</span> captured. {sandbox ? 'No real money moved; the rehearsal is waiting for mock shipment.' : 'Waiting for shipment.'}</>
      : 'The seller confirmed receipt in PayPal. Waiting for shipment.'}</p>}
    {o.state === 'in_transit' && payer && <>
      <p>{o.tracking ? <>Seller reports shipped · tracking <b>{o.tracking}</b>.</> : 'Seller reports the cards shipped.'} Mark arrival only when the package is in hand.</p>
      <button className="sheetbtn mk-sm mono" onClick={() => advance('delivered', 'Buyer marked the cards arrived · condition and authenticity remain their judgment')}>The cards arrived</button>
    </>}
    {o.state === 'in_transit' && seller && <p>Waiting for the buyer to record arrival.</p>}
    {o.state === 'delivered' && payer && <>
      <p>Inspect the cards against the recorded listing, photos and terms. Completing here records the trade; it does not change PayPal&rsquo;s payment state.</p>
      <span className="sw-acts">
        <button className="sheetbtn mk-sm mono sw-boot" onClick={() => recordSettledLive(catalogId, accountId, o.id)}>Looks right · record complete</button>
        <a className="sheetbtn mk-sm mono" href="https://www.paypal.com/disputes/" target="_blank" rel="noreferrer">PayPal Resolution Center ↗</a>
        <button className="sheetbtn mk-sm mono" onClick={() => advance('provider_disputed', 'Buyer recorded a problem and was directed to PayPal · Cairn cannot decide or reverse the provider payment')}>Record a problem</button>
      </span>
    </>}
    {o.state === 'delivered' && seller && <p>The buyer recorded arrival and is inspecting the cards.</p>}
    {o.state === 'provider_disputed' && <p>A payment or delivery problem is recorded. PayPal controls any provider dispute or refund; Cairn preserves this deal&rsquo;s terms and evidence.</p>}
    {o.state === 'provider_disputed' && <a className="sheetbtn mk-sm mono" href="https://www.paypal.com/disputes/" target="_blank" rel="noreferrer">Open PayPal Resolution Center ↗</a>}
  </div>
}

export default function Offers({ accountId, catalog, onCounter, onScan }) {
  const [reads, setReads] = useState({})
  const [evidenceNotice, setEvidenceNotice] = useState(null)
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
  const evidenceAnswered = (o) => {
    const last = lastEvidence(o)
    return ['sent', 'seen'].includes(o.state) && last?.dir === 'in' && last.kind === 'response'
  }
  const groupFor = (o) => {
    const open = ['sent', 'seen'].includes(o.state)
    const paypal = o.rail === RAIL_PAYPAL || o.settlement?.rail === RAIL_PAYPAL
    if (paypal && o.state === 'payment_reported') return o.dir === 'in' ? 'needs' : 'waiting'
    if (paypal && o.state === 'payment_confirmed') return o.dir === 'in' ? 'needs' : 'waiting'
    if (paypal && o.state === 'delivered') return o.dir === 'out' ? 'needs' : 'waiting'
    if (paypal && o.state === 'provider_disputed') return 'needs'
    if (evidenceNeedsYou(o)) return 'needs'
    if (evidenceAnswered(o)) return 'needs'
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
        const paypal = o.rail === RAIL_PAYPAL || o.settlement?.rail === RAIL_PAYPAL
        const flow = paypal ? PAYPAL_FLOW : ESCROW_FLOW
        const idx = flow.indexOf(o.state)
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
        const answeredEvidence = evidenceAnswered(o)
        const otherName = (o.dir === 'out' ? o.toHandle : o.fromHandle) || handleFor(other)
        const dealStatus = needsEvidence
          ? { label: 'Photos requested', tone: 'your-move' }
          : answeredEvidence
            ? { label: 'New information', tone: 'your-move' }
            : waitingEvidence
              ? { label: 'Waiting for photos', tone: 'waiting' }
              : o.dir === 'in' && open
                ? { label: 'Response needed', tone: 'your-move' }
                : o.dir === 'out' && open
                  ? { label: 'Awaiting response', tone: 'waiting' }
                  : o.state === 'accepted'
                    ? { label: 'Terms accepted', tone: 'agreed' }
                    : { label: STATUS_LABEL[o.state] || o.state.replace('_', ' '), tone: o.state === 'settled' ? 'agreed' : 'closed' }
        return (
          <div key={o.id} className={'ofl-row' + (((o.dir === 'in' && open) && !waitingEvidence) || needsEvidence || answeredEvidence ? ' needs-you' : '') + (o.state === 'settled' ? ' done' : '') + (o.state === 'countered' || o.state === 'withdrawn' || o.state === 'declined' ? ' closed' : '')}>
            <OfferSummary o={o} otherName={otherName} status={dealStatus} receiveItems={receiveItems} giveItems={giveItems}
              cashFromYou={cashFromYou} renderChip={chip} cardNameFor={(uid) => byUid.get(uid)?.name_en || uid} open={open} />
            {settling && (
              <div className="mt-steps mono">
                {flow.map((s, i) => (
                  <span key={s} className={'mt-step' + (i <= idx ? ' on' : '') + (s === 'settled' && o.state === 'settled' ? ' ok' : '')}>
                    {i <= idx ? '✓ ' : ''}{FLOW_LABEL[s]}
                  </span>
                ))}
              </div>
            )}
            {(o.log || []).slice(-1).map((l, i) => <div key={i} className="mt-line"><span className="mono dim">rail</span> {l}</div>)}
            <LiveLeg o={o} offersKey={key} catalogId={catalog.id} accountId={accountId} decision={decision} recommended={recommended} />
            <PayPalLeg o={o} offersKey={key} catalogId={catalog.id} accountId={accountId} />
            {(needsEvidence || answeredEvidence) && <OfferFollowThrough o={o} offersKey={key} read={currentRead} cardNames={getCards.map((c) => c.name_en)}
              cardUids={getCards.map((c) => c.uid)} cardNameFor={(uid) => byUid.get(uid)?.name_en || uid}
              onEvidenceSent={setEvidenceNotice} onScan={onScan} showThread={false}
              onAccept={() => acceptIncoming(key, o.id)} onCounter={() => onCounter?.(o)} onDecline={() => declineIncoming(key, o.id)} />}

            {o.dir === 'in' && open && !needsEvidence && !answeredEvidence && <div className="checkout-actions">
              <button className="checkout-primary" onClick={() => acceptIncoming(key, o.id)}>Accept offer</button>
              <span className="checkout-secondary">
                <button onClick={() => onCounter && onCounter(o)}>Make a counter</button>
                <button onClick={() => declineIncoming(key, o.id)}>Decline</button>
              </span>
              <details className="checkout-help">
                <summary>Questions or help</summary>
                <div className="checkout-helpbody">
                  <AskAnko decision={decision} recommended={recommended}
                    onRead={(read) => setReads((previous) => ({ ...previous, [o.id]: read }))} />
                  <OfferFollowThrough o={o} offersKey={key} read={currentRead} cardNames={getCards.map((c) => c.name_en)}
                    cardUids={getCards.map((c) => c.uid)} cardNameFor={(uid) => byUid.get(uid)?.name_en || uid}
                    onEvidenceSent={setEvidenceNotice} onScan={onScan} showThread={false}
                    onAccept={() => acceptIncoming(key, o.id)} onCounter={() => onCounter?.(o)} onDecline={() => declineIncoming(key, o.id)} />
                </div>
              </details>
            </div>}

            {o.dir === 'out' && open && !answeredEvidence && !waitingEvidence && <details className="checkout-help standalone">
              <summary>Questions or updates</summary>
              <div className="checkout-helpbody">
                <OfferFollowThrough o={o} offersKey={key} cardNames={getCards.map((c) => c.name_en)}
                  cardUids={getCards.map((c) => c.uid)} cardNameFor={(uid) => byUid.get(uid)?.name_en || uid}
                  onEvidenceSent={setEvidenceNotice} onScan={onScan} showThread={false}
                  onCounter={() => onCounter?.(o)} />
              </div>
            </details>}

            {o.dir === 'out' && open && !answeredEvidence && <div className="checkout-quietaction">
              <button onClick={() => withdrawOffer(key, o.id)}>Withdraw offer</button>
            </div>}
            {!open && !OFFER_SETTLING.includes(o.state) && <div className="checkout-quietaction">
              <button onClick={() => clearOffer(key, o.id)}>Clear from history</button>
            </div>}
          </div>
        )
  }

  return (
    <div className="ofl">
      {evidenceNotice && <div className="ofl-evsent mono" role="status">
        <span>✓ {evidenceNotice}</span>
        <button onClick={() => setEvidenceNotice(null)} aria-label="Dismiss confirmation">✕</button>
      </div>}
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
      <details className="trade-help"><summary>How offers and payments work</summary><p className="sc-note dim">An offer is a message, not a lock. A <b>● live</b> offer reached a real person&rsquo;s inbox. Cairn Escrow is enforced by its contract; PayPal payments remain external and are recorded from each party&rsquo;s statements. Anko&rsquo;s read is advisory; accepting, paying, and completing stay separate human actions unless a signed mandate explicitly says otherwise.</p></details>
    </div>
  )
}
