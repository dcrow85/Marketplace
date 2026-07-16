import { useEffect, useMemo, useState } from 'react'
import { entryFor, condStr } from '../binder/collection.js'
import { applyAgentFilter } from '../binder/agentFilter.js'
import { offersKeyFor, sendOffer } from '../trade/offers.js'
import { removeFromPile, toggleMode, clearPile } from './pile.js'
import { loadMockSales, mockSalesKeyFor } from './mockAgents.js'
import MiniCard from '../components/MiniCard.jsx'
import AskAnko from '../trade/AskAnko.jsx'
import { handleFor, avatarSVG } from '../identity.js'
import { railCurrency, sellerPayPalHandle, RAIL_ESCROW, RAIL_PAYPAL } from '../payments/rails.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const SCAN_REQUEST_USDC = 10
const scanLabel = (w, ask) => w ? `✓ ${w} scan${w === 1 ? '' : 's'}` : Number(ask) > SCAN_REQUEST_USDC ? 'scan requested' : 'stock photo · scan optional'
const EVIDENCE_VIEWS = [
  ['front', 'Front'], ['back', 'Back'], ['corners', 'Corners'], ['holo_tilt', 'Holo tilt'],
]

function Avatar({ seed, size = 26, photo = '' }) {
  if (photo) return <span className="av"><img src={photo} width={size} height={size} alt="" /></span>
  return <span className="av" dangerouslySetInnerHTML={{ __html: avatarSVG(seed, size) }} />
}
// The Settle page: its own room, built for the process. You piled cards up at the
// table; here you square the deal — their side with the art in front of you, your
// side from your binder, one cash line, one send. Clean on purpose: no ask bar, no
// aisle, nothing but the deal.
export default function SettlePage({ open, pile, byUid, data, store, mkt, catalog, accountId, pileKey, agentName = 'Anko', initialCash = null, initialNote = '', onBack, onSent }) {
  const initialEvidenceSeed = /scan|photo|evidence/i.test(initialNote)
  const [give, setGive] = useState(() => new Set())
  const [qg, setQg] = useState('')
  const [cashEdit, setCashEdit] = useState(initialCash == null ? null : String(initialCash)) // null = follow the buy total
  const [note, setNote] = useState(initialEvidenceSeed ? '' : initialNote)
  const [evidenceRequest, setEvidenceRequest] = useState(() => {
    if (!initialEvidenceSeed) return null
    const cardUids = pile.filter((item) => {
      const listing = open.listings.find((candidate) => candidate.uid === item.uid)
      return Number(listing?.ask) > SCAN_REQUEST_USDC && !listing?.witness
    }).map((item) => item.uid)
    return cardUids.length ? { cardUids, views: EVIDENCE_VIEWS.map(([key]) => key) } : null
  })
  const [evidenceDraft, setEvidenceDraft] = useState(null)
  const [abusy, setAbusy] = useState(false)
  const [ankoScope, setAnkoScope] = useState(null) // his lens on YOUR side
  const [ankoLine, setAnkoLine] = useState(null)
  const [ankoPicks, setAnkoPicks] = useState(() => new Set()) // advice, distinct from the collector's final terms
  const paypalHandle = sellerPayPalHandle(open)
  const [settlementRail, setSettlementRail] = useState(RAIL_ESCROW)
  const settlementCurrency = railCurrency(settlementRail)
  useEffect(() => { window.scrollTo({ top: 0 }) }, []) // a new room starts at its door
  const askOf = (uid) => open.listings.find((l) => l.uid === uid)?.ask ?? 0
  const buys = pile.filter((p) => p.mode === 'buy')
  const trades = pile.filter((p) => p.mode === 'trade')
  const buysSum = buys.reduce((t, p) => t + askOf(p.uid), 0)
  const cash = cashEdit == null ? buysSum : Math.max(0, Number(cashEdit) || 0)
  const scanCandidates = pile.filter((item) => {
    const listing = open.listings.find((candidate) => candidate.uid === item.uid)
    return Number(listing?.ask) > SCAN_REQUEST_USDC && !listing?.witness
  })
  const defaultEvidenceRequest = () => ({ cardUids: scanCandidates.map((item) => item.uid), views: EVIDENCE_VIEWS.map(([key]) => key) })
  const evidenceLine = (request = evidenceRequest) => {
    if (!request?.cardUids?.length || !request?.views?.length) return ''
    const cards = request.cardUids.map((uid) => byUid.get(uid)?.name_en || uid)
    const views = request.views.map((view) => EVIDENCE_VIEWS.find(([key]) => key === view)?.[1].toLowerCase()).filter(Boolean)
    return `Before we settle, please add clear ${views.join(', ')} photos for ${cards.join(', ')}.`
  }

  const salesMap = useMemo(() => ({ ...(mkt?.sales || {}), ...loadMockSales(mockSalesKeyFor(catalog.id)) }), [mkt, catalog])
  const lastPrice = (uid) => salesMap[uid]?.[0]?.p ?? null

  const myCards = useMemo(() => {
    if (!data) return []
    let rows = data.cards.map((c) => ({ c, e: entryFor(c, store) })).filter(({ e }) => e.stance === 'have')
    if (ankoScope) {
      const sc = { ...ankoScope }
      const dups = sc.duplicates
      delete sc.duplicates; delete sc.owned
      const keep = new Set(applyAgentFilter(rows.map(({ c }) => c), sc, {}).map((c) => c.uid))
      rows = rows.filter(({ c }) => keep.has(c.uid))
      if (dups) rows = rows.filter(({ c }) => ((store[c.uid] || {}).copies || 1) > 1)
    }
    return rows.sort((a, b) => (b.e.trade === true) - (a.e.trade === true))
  }, [data, store, ankoScope])
  const hit = (c) => !qg.trim() || ((c.name_en || '') + ' ' + (c.num || '')).toLowerCase().includes(qg.trim().toLowerCase())

  // "match the value of that Mizuki": their side priced by asks (buys) and recorded
  // settlements (trades), your side by settlements only — then a greedy closest-sum
  // pick from your candidates. History does the matching; you still decide.
  const theirValue = () => pile.reduce((t, p) => t + (p.mode === 'buy' ? askOf(p.uid) : (lastPrice(p.uid) ?? askOf(p.uid))), 0)
  const runMatch = (rows) => {
    const target = theirValue()
    const cands = rows.map(({ c }) => ({ uid: c.uid, p: lastPrice(c.uid) })).filter((x) => x.p != null).sort((a, b) => b.p - a.p)
    if (!cands.length) return { picked: new Set(), sum: 0, target, none: true }
    let sum = 0
    const picked = new Set()
    for (const x of cands) {
      if (sum >= target) break
      if (sum + x.p <= target * 1.15 || picked.size === 0) { picked.add(x.uid); sum += x.p }
    }
    return { picked, sum, target, none: false }
  }

  const askAnko = async () => {
    const call = qg.trim()
    if (!call || abusy) return
    setAbusy(true)
    try {
      const r = await fetch(API_BASE + '/api/browse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ call, catalog: catalog.id }) })
      const d = await r.json()
      const steps = Array.isArray(d.action) ? d.action : d.action ? [d.action] : []
      const scoped = steps.find((st) => st.scope && Object.keys(st.scope).length) || null
      const scope = scoped ? scoped.scope : Object.fromEntries(Object.entries(d.filter || {}).filter(([k, v]) => v != null && !['reading', 'action', 'owned', 'sort'].includes(k)))
      const wantsMatch = steps.some((st) => st.op === 'match_value')
      const nextScope = Object.keys(scope).length ? scope : null
      setAnkoScope(nextScope)
      if (wantsMatch) {
        // resolve against the freshly-scoped candidates, not stale state
        let rows = data.cards.map((c) => ({ c, e: entryFor(c, store) })).filter(({ e }) => e.stance === 'have')
        if (nextScope) {
          const sc = { ...nextScope }; const dups = sc.duplicates; delete sc.duplicates
          const keep = new Set(applyAgentFilter(rows.map(({ c }) => c), sc, {}).map((c) => c.uid))
          rows = rows.filter(({ c }) => keep.has(c.uid))
          if (dups) rows = rows.filter(({ c }) => ((store[c.uid] || {}).copies || 1) > 1)
        }
        const m = runMatch(rows)
        if (m.none) {
          setAnkoPicks(new Set())
          setAnkoLine('None of your candidates have settlements on record — nothing to match with. Pick by eye; the record can\u2019t help here.')
        }
        else {
          setGive(m.picked)
          setAnkoPicks(new Set(m.picked))
          setAnkoLine(`I marked ${m.picked.size} card${m.picked.size === 1 ? '' : 's'} in blue — settlements put ${m.picked.size === 1 ? 'it' : 'them'} at ~${m.sum} against their ~${m.target}. History, not an appraisal; adjust freely.`)
        }
      } else {
        setAnkoPicks(new Set())
        setAnkoLine(d.filter?.reading || 'Narrowed your side to what matches.')
      }
      setQg('')
    } catch { setAnkoLine('The lamp flickered \u2014 couldn\u2019t reach him. Try again.') }
    finally { setAbusy(false) }
  }

  const recordLine = useMemo(() => {
    const sum = (uids) => {
      let t = 0, known = 0
      for (const uid of uids) { const x = salesMap[uid]?.[0]; if (x) { t += x.p; known++ } }
      return { t, known, n: uids.length }
    }
    const w = sum(pile.map((p) => p.uid)), g = sum([...give])
    if (!w.n && !g.n) return null
    const part = (x, label) => x.n
      ? `${label} ${x.known ? `~${x.t} USDC across ${x.known} of ${x.n}` : `no settlements on record (${x.n})`}`
      : null
    return [part(w, 'their side:'), part(g, 'yours:')].filter(Boolean).join(' · ')
  }, [salesMap, pile, give])

  const decisionPile = pile.slice(0, 24)
  const decisionGive = [...give].slice(0, 24)
  const sendDecision = {
    decision_ref: `settle:${catalog.id}:${open.id}:${pile.length}:${give.size}:${cash}:${settlementRail}:${pile.slice(0, 6).map((p) => p.uid).join(',')}`,
    kind: 'pre_purchase',
    question: trades.length
      ? 'Should I send this buy/trade offer, revise it, or request more evidence first?'
      : 'Should I send an offer at this seller’s asks, revise it, or request more evidence first?',
    terms: {
      seller: open.id,
      live_table: !!open.live,
      cash_amount: cash,
      cash_currency: settlementCurrency,
      settlement_rail: settlementRail,
      you_receive_count: pile.length,
      you_receive_unitemized_count: Math.max(0, pile.length - decisionPile.length),
      you_receive: decisionPile.map((p) => {
        const c = byUid.get(p.uid)
        const l = open.listings.find((x) => x.uid === p.uid)
        return { uid: p.uid, name: c?.name_en || p.uid, number: c?.num || null, mode: p.mode, ask_usdc: l?.ask ?? null, seller_condition_claim: l?.cond || null }
      }),
      you_give_count: give.size,
      you_give_unitemized_count: Math.max(0, give.size - decisionGive.length),
      you_give: decisionGive.map((uid) => {
        const c = byUid.get(uid)
        return { uid, name: c?.name_en || uid, number: c?.num || null }
      }),
    },
    principal_context: { recorded_policy: 'No signed buying or trade policy is available to this interface.' },
    evidence: {
      cards_without_recorded_scans: pile.filter((p) => !open.listings.find((l) => l.uid === p.uid)?.witness).length,
      cards_with_recorded_settlements: pile.filter((p) => salesMap[p.uid]?.[0]?.p != null).length,
      card_records: decisionPile.map((p) => {
        const l = open.listings.find((x) => x.uid === p.uid)
        return { uid: p.uid, recorded_scan_count: l?.witness || 0, latest_recorded_settlement_usdc: salesMap[p.uid]?.[0]?.p ?? null }
      }),
      seller_record_claims: open.live ? (open.recordStats || []).map((x) => x.t) : (open.record || null),
      deal_record_summary: recordLine,
    },
  }
  const sendReadRecommended = cash >= 500 || pile.some((p) => {
    const listing = open.listings.find((l) => l.uid === p.uid)
    return Number(listing?.ask) > SCAN_REQUEST_USDC && !listing?.witness
  })
  const counterStart = useMemo(() => {
    const recordBased = pile.reduce((total, item) => total + (lastPrice(item.uid) ?? askOf(item.uid)), 0)
    const belowCurrent = recordBased > 0 && recordBased < cash ? recordBased : cash * .9
    return Math.round(Math.max(0, belowCurrent) * 100) / 100
  }, [pile, cash, salesMap]) // eslint-disable-line react-hooks/exhaustive-deps -- lastPrice/askOf read these stable inputs
  const actionsForSendRead = (read) => {
    if (read.lean === 'counter') return [{
      id: 'counter-cash', kind: 'amount', label: 'Try a counter at', amount: counterStart,
      confirmLabel: 'Use in offer', hint: 'Prefilled from recorded settlements where available; otherwise 10% below the current cash line. Edit freely.',
      onConfirm: (amount) => setCashEdit(String(amount)),
    }]
    if (read.lean === 'request_evidence') return [{
      id: 'request-scan', label: 'Add scan request to offer', primary: true,
      onSelect: () => {
        setEvidenceRequest(defaultEvidenceRequest())
      },
    }]
    if (read.lean === 'accept') return [{ id: 'keep-terms', label: 'Keep these terms', onSelect: () => setCashEdit(String(cash)) }]
    return []
  }

  const canSend = pile.length > 0 && (trades.length === 0 || give.size > 0 || cash > 0)
  const send = () => {
    const pileUids = new Set(pile.map((item) => item.uid))
    const request = evidenceRequest ? { ...evidenceRequest, cardUids: evidenceRequest.cardUids.filter((uid) => pileUids.has(uid)) } : null
    const sendRequest = request?.cardUids.length && request.views.length ? { ...request, line: evidenceLine(request) } : null
    sendOffer(offersKeyFor(catalog.id, accountId), {
      to: open.id,
      toHandle: open.handle || handleFor(open.id),
      want: pile.map((p) => ({ uid: p.uid })),
      give: [...give].map((uid) => ({ uid })),
      cash: cash > 0 ? { side: 'from', amount: cash } : null,
      note,
      evidenceRequest: sendRequest,
      settlement: { rail: settlementRail, paypal_handle: settlementRail === RAIL_PAYPAL ? paypalHandle : null },
      live: open.live, from: accountId, cat: catalog.id,
    })
    clearPile(pileKey, open.id)
    onSent({ evidenceRequestIncluded: !!sendRequest })
  }

  return (
    <div className="mk stl">
      <div className="mk-head">
        <div className="mk-seller">
          <Avatar seed={open.id} size={40} photo={open.photo} />
          <div>
            <div className="ek">Review offer</div>
            <div className="mk-handle">one offer to {open.handle || handleFor(open.id)}</div>
          </div>
        </div>
        <button className="ghost sm" onClick={onBack}>← back to the table</button>
      </div>

      <div className="stl-sec">
        <div className="stl-label mono">their side — your pile{buysSum > 0 ? ` · listed asks total ${buysSum}` : ''}</div>
        <div className="ofr-grid">
          {pile.map((p) => {
            const c = byUid.get(p.uid)
            if (!c) return null
            const l = open.listings.find((x) => x.uid === p.uid)
            return (
              <MiniCard key={p.uid} c={c}
                sub={`${p.mode === 'buy' ? `${askOf(p.uid)} ask · ` : ''}${scanLabel(l?.witness, l?.ask)}`}
                actions={<span className="ofr-acts">
                  <button className={'ofr-tradebtn stl-mode' + (p.mode === 'trade' ? ' on' : '')}
                    onClick={() => toggleMode(pileKey, open.id, p.uid)}
                    title="flip between buying at the ask and trading for it">
                    {p.mode === 'buy' ? '$ buy' : '⇄ trade'}</button>
                  <button className="ofr-tradebtn stl-x" onClick={() => removeFromPile(pileKey, open.id, p.uid)} title="put it back on their table">✕</button>
                </span>} />
            )
          })}
        </div>
        {scanCandidates.length > 0 && <div className={'stl-evidencemove' + (evidenceRequest ? ' added' : '')}>
          <div>
            <span className="mono">{evidenceRequest ? 'Photo request on the mat' : 'Need a closer look?'}</span>
            <p>{evidenceRequest
              ? `${evidenceRequest.cardUids.map((uid) => byUid.get(uid)?.name_en || uid).join(', ')} · ${evidenceRequest.views.map((view) => EVIDENCE_VIEWS.find(([key]) => key === view)?.[1]).filter(Boolean).join(' · ')}`
              : `Ask for specific views of the ${scanCandidates.length} $10+ card${scanCandidates.length === 1 ? '' : 's'} without seller scans.`}</p>
          </div>
          <span className="stl-evidencemoveacts">
            <button className="sheetbtn mk-sm mono" onClick={() => setEvidenceDraft(evidenceRequest || defaultEvidenceRequest())}>{evidenceRequest ? 'Edit request' : 'Ask for photos'}</button>
            {evidenceRequest && <button className="ghost sm mono" onClick={() => setEvidenceRequest(null)}>remove</button>}
          </span>
        </div>}
        {evidenceDraft && <div className="stl-evidenceeditor">
          <div className="stl-evidenceeditorhead"><span className="ek">Ask for photos</span><span className="mono">a message, not an acceptance</span></div>
          <div className="stl-evidencecards mono">
            {scanCandidates.map((item) => {
              const card = byUid.get(item.uid)
              const selected = evidenceDraft.cardUids.includes(item.uid)
              return <button key={item.uid} className={selected ? 'on' : ''} onClick={() => setEvidenceDraft((draft) => ({ ...draft,
                cardUids: selected ? draft.cardUids.filter((uid) => uid !== item.uid) : [...draft.cardUids, item.uid],
              }))}>{selected ? '✓ ' : ''}{card?.name_en || item.uid}</button>
            })}
          </div>
          <div className="stl-evidenceviews mono">
            {EVIDENCE_VIEWS.map(([key, label]) => {
              const selected = evidenceDraft.views.includes(key)
              return <button key={key} className={selected ? 'on' : ''} onClick={() => setEvidenceDraft((draft) => ({ ...draft,
                views: selected ? draft.views.filter((view) => view !== key) : [...draft.views, key],
              }))}>{selected ? '✓ ' : ''}{label}</button>
            })}
          </div>
          <p>{evidenceLine(evidenceDraft)}</p>
          <div className="stl-evidenceeditoracts">
            <button className="sheetbtn mk-sm mono" disabled={!evidenceDraft.cardUids.length || !evidenceDraft.views.length}
              onClick={() => { setEvidenceRequest(evidenceDraft); setEvidenceDraft(null) }}>Add to offer</button>
            <button className="ghost sm" onClick={() => setEvidenceDraft(null)}>cancel</button>
          </div>
        </div>}
      </div>

      {trades.length > 0 && (
      <div className="stl-sec">
        <div className="stl-label mono">your side — they want something for the ⇄ cards</div>
        <div className="askbar stl-ask">
          <img className={'anko-search' + (abusy ? ' busy' : '')} src={(import.meta.env.BASE_URL || '/') + 'agent/anko-avatar-v1.png'}
            alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <input value={qg} maxLength={280}
            placeholder={`search — or ask ${agentName}: \u201cmy alt-art dupes\u201d, \u201cmatch the value of their side\u201d`}
            onChange={(e) => setQg(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') askAnko() }} />
          <button className="askbtn" onClick={askAnko} disabled={abusy || !qg.trim()}>{abusy ? 'onibi reading…' : `Ask ${agentName}`}</button>
        </div>
        {(ankoLine || ankoScope) && (
          <div className="stl-ankoline mono">
            {ankoLine && <span>{ankoLine}</span>}
            {(ankoScope || ankoPicks.size > 0) && <button className="stl-clear" onClick={() => { setAnkoScope(null); setAnkoLine(null); setAnkoPicks(new Set()) }}>✕ clear his lens</button>}
          </div>
        )}
        <div className="ofr-grid stl-give">
          {myCards.filter(({ c }) => hit(c) || give.has(c.uid)).slice(0, 60).map(({ c, e }) => {
            const isAnkoPick = ankoPicks.has(c.uid)
            return <MiniCard key={c.uid} c={c} sel={give.has(c.uid)}
              className={isAnkoPick ? 'stl-anko-pick' : ''}
              corner={isAnkoPick ? <span className="stl-anko-badge mono">Anko pick</span> : null}
              sub={condStr(e) + (e.trade ? ' · ⇄' : '')}
              onTap={() => {
                setGive((pr) => { const n = new Set(pr); if (n.has(c.uid)) n.delete(c.uid); else n.add(c.uid); return n })
                if (isAnkoPick) {
                  const remaining = new Set(ankoPicks)
                  remaining.delete(c.uid)
                  setAnkoPicks(remaining)
                  setAnkoLine(remaining.size
                    ? `You adjusted the match. ${remaining.size} blue card${remaining.size === 1 ? '' : 's'} ${remaining.size === 1 ? 'is' : 'are'} still from my suggestion; the offer itself is yours.`
                    : 'You adjusted the match. No blue Anko picks remain; the offer below is yours.')
                }
              }} />
          })}
          {!myCards.length && <div className="empty">Nothing marked Have — cash can carry the whole deal.</div>}
        </div>
      </div>
      )}

      <div className="stl-sec">
        <div className="stl-label mono">the cash line — one number squares the whole deal</div>
        {cash > 0 && <div className="stl-rails" role="radiogroup" aria-label="Proposed payment rail">
          <button type="button" className={settlementRail === RAIL_ESCROW ? 'on' : ''} onClick={() => setSettlementRail(RAIL_ESCROW)}>
            <b>Cairn Escrow</b><small>recommended · funds held by contract</small>
          </button>
          {paypalHandle && <button type="button" className={settlementRail === RAIL_PAYPAL ? 'on' : ''} onClick={() => setSettlementRail(RAIL_PAYPAL)}>
            <b>PayPal</b><small>external · paypal.me/{paypalHandle}</small>
          </button>}
        </div>}
        <div className="stl-cashrow">
          <span className="fpre stl-dollar">$</span>
          <input className="ti num stl-cash" type="number" min="0" value={cash} onChange={(e) => setCashEdit(e.target.value)} />
          <span className="mono dim">{settlementCurrency}{cashEdit == null && buysSum > 0 ? ' · following the listed asks' : ''}</span>
        </div>
        <input className="ti ofr-note" maxLength={240} placeholder="a note, if words help the numbers…" value={note}
          onChange={(e) => setNote(e.target.value)} />
        {evidenceRequest && <div className="stl-requestincluded mono" role="status">
          <span>✓ Evidence request added to this offer.</span>
          <span>It sends when you press <b>Send offer</b> below — nothing has been sent yet.</span>
        </div>}
        {recordLine && <div className="ofr-anko"><span className="atag jud">Anko · the record</span> {recordLine} — settlements are history, not an appraisal.</div>}
      </div>

      <div className="stl-senddecision">
        <span className="ofl-decisionlabel mono">Before you send · this is your call</span>
        <AskAnko decision={sendDecision} recommended={sendReadRecommended}
          label={trades.length ? 'Ask Anko about this offer' : 'Ask Anko before sending'} actionsForRead={actionsForSendRead} />
      </div>

      <div className="stl-foot">
        <span className="mono deal-summary">{trades.length || give.size
          ? `${pile.length} of theirs ⇄ ${give.size} of yours${cash > 0 ? ` + ${cash} ${settlementCurrency}` : ''}`
          : `${pile.length} card${pile.length === 1 ? '' : 's'} · ${cash} ${settlementCurrency}`}</span>
        <button className="primary stl-send" disabled={!canSend} onClick={send}>Send offer to {open.handle || handleFor(open.id)} →</button>
      </div>
      <p className="sc-note dim">An offer is a message, not a payment or lock. It proposes {settlementRail === RAIL_PAYPAL ? 'PayPal, where PayPal handles the money and Cairn records the terms' : 'Cairn Escrow, where the contract can hold and release funds'}.
        {open.live ? ` This is a live table: ${open.handle || handleFor(open.id)} is a real collector, and the offer lands in their inbox.` : ' Their agent answers the whole basket at once.'}</p>
    </div>
  )
}
