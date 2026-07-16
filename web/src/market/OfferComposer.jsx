import { useEffect, useMemo, useState } from 'react'
import { storeKeyFor, loadStore, catalogUrl, entryFor, condStr } from '../binder/collection.js'
import { offersKeyFor, sendOffer } from '../trade/offers.js'
import { loadMockSales, mockSalesKeyFor } from './mockAgents.js'
import { handleFor, avatarSVG } from '../identity.js'
import CardZoom from './CardZoom.jsx'
import { retryImg } from '../binder/helpers.jsx'
import { paymentRailFor, railCurrency, cleanPayPalHandle, RAIL_ESCROW, RAIL_PAYPAL } from '../payments/rails.js'

// The offer composer: everything on ONE screen — their cards, your cards, the cash
// leg, and the send. No wizard. Anko's line quotes the RECORD (latest settlements per
// card), never a value: pricing stays the humans' judgment.
const MARKET_URL = (import.meta.env.BASE_URL || '/') + 'market-sample.json'

function Avatar({ seed, size = 22 }) {
  return <span className="av" dangerouslySetInnerHTML={{ __html: avatarSVG(seed, size) }} />
}

export default function OfferComposer({ accountId, catalog, seller, initialWant, initialGive, initialCash, initialSettlement, counterOf, live, onClose, onSent }) {
  const [data, setData] = useState(null)
  const [mkt, setMkt] = useState(null)
  const [want, setWant] = useState(() => new Set(initialWant || []))
  const [give, setGive] = useState(() => new Set(initialGive || []))
  const [cashAmt, setCashAmt] = useState(initialCash ? String(initialCash.amount) : '')
  const [cashSide, setCashSide] = useState(initialCash?.side || 'from')
  const [note, setNote] = useState('')
  const paypalHandle = cleanPayPalHandle(initialSettlement?.paypal_handle)
  const [settlementRail, setSettlementRail] = useState(() => paymentRailFor(initialSettlement?.rail))
  const settlementCurrency = railCurrency(settlementRail)
  const [zoom, setZoom] = useState(null)
  const [qw, setQw] = useState('') // search their side
  const [qg, setQg] = useState('') // search your binder
  const storeKey = storeKeyFor(catalog.id, accountId)
  const store = useMemo(() => loadStore(storeKey), [storeKey])

  useEffect(() => {
    fetch(catalogUrl(catalog)).then((r) => r.json()).then(setData).catch(() => {})
    fetch(MARKET_URL).then((r) => r.json()).then(setMkt).catch(() => {})
  }, [catalog])

  const byUid = useMemo(() => new Map((data?.cards || []).map((c) => [c.uid, c])), [data])
  const theirCards = useMemo(() => {
    if (!mkt) return []
    const sl = mkt.sellers.find((x) => x.id === seller)
    if (sl) return (sl.listings || []).map((l) => ({ c: byUid.get(l.uid), l })).filter((x) => x.c)
    // a live counterpart isn't in the sample market — their side is the offer being countered
    return [...(initialWant || [])].map((uid) => ({ c: byUid.get(uid), l: { ask: null, witness: null } })).filter((x) => x.c)
  }, [mkt, seller, byUid, initialWant])
  const myCards = useMemo(() => {
    if (!data) return []
    const rows = data.cards.map((c) => ({ c, e: entryFor(c, store) })).filter(({ e }) => e.stance === 'have')
    return rows.sort((a, b) => (b.e.trade === true) - (a.e.trade === true))
  }, [data, store])

  // the record's word on each basket: latest settlement per card, honestly partial
  const recordLine = useMemo(() => {
    if (!mkt || !data) return null
    const sales = { ...(mkt.sales || {}), ...loadMockSales(mockSalesKeyFor(catalog.id)) }
    const sum = (uids) => {
      let t = 0, known = 0
      for (const uid of uids) { const s = sales[uid]?.[0]; if (s) { t += s.p; known++ } }
      return { t, known, n: uids.length }
    }
    const w = sum([...want]), g = sum([...give])
    if (!w.n && !g.n) return null
    const part = (x, label) => x.n
      ? `${label} ${x.known ? `~${x.t} USDC across ${x.known} of ${x.n} card${x.n === 1 ? '' : 's'}` : `no settlements on record (${x.n} card${x.n === 1 ? '' : 's'})`}`
      : null
    return [part(w, 'their side:'), part(g, 'yours:')].filter(Boolean).join(' · ')
  }, [mkt, data, want, give, catalog])

  if (!data || !mkt) return null
  const toggle = (set, setter) => (uid) => setter((p) => { const n = new Set(p); if (n.has(uid)) n.delete(uid); else n.add(uid); return n })
  const amt = Math.max(0, Number(cashAmt) || 0)
  const canSend = want.size > 0 && (give.size > 0 || (amt > 0 && cashSide === 'from'))

  const doSend = () => {
    const offer = {
      to: seller,
      want: [...want].map((uid) => ({ uid })),
      give: [...give].map((uid) => ({ uid })),
      cash: amt > 0 ? { side: cashSide, amount: amt } : null,
      settlement: { rail: settlementRail, paypal_handle: settlementRail === RAIL_PAYPAL ? paypalHandle : null },
      note, counterOf,
      live, from: accountId, cat: catalog.id,
    }
    sendOffer(offersKeyFor(catalog.id, accountId), offer)
    onSent && onSent()
    onClose()
  }

  const tile = (c, sel, onTap, sub, price, witness) => (
    <button key={c.uid} className={'ofr-tile' + (sel ? ' sel' : '')} onClick={() => onTap(c.uid)}>
      {c.image ? <img src={c.image} alt="" loading="lazy" decoding="async" onError={(ev) => retryImg(ev, c.image)} /> : <span className="ofr-noimg">{c.name_en}</span>}
      <span className="zoombtn" role="button" tabIndex={0} title="enlarge"
        onClick={(ev) => { ev.stopPropagation(); setZoom({ c, sub, witness }) }}>⤢</span>
      <span className="ofr-name">{c.name_en}</span>
      {sub && <span className="mono ofr-sub">{sub}</span>}
      {sel && <span className="ofr-check">✓</span>}
    </button>
  )
  const hit = (c, q) => !q.trim() || ((c.name_en || '') + ' ' + (c.num || '')).toLowerCase().includes(q.trim().toLowerCase())

  return (
    <div className="sc-overlay" role="dialog" aria-label="Make an offer" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sc-sheet ofr">
        <div className="ofr-head">
          <div>
            <div className="ek">{counterOf ? 'Counter-offer' : 'Your offer'}</div>
            <div className="ofr-title"><Avatar seed={seller} size={20} /> {handleFor(seller)}</div>
          </div>
          <button className="ghost sm" onClick={onClose}>✕</button>
        </div>
        <div className="ofr-body">
          <div className="ofr-sec mono">you want — tap to change</div>
          {theirCards.length > 8 && <input className="ofr-search" placeholder="search their table…" value={qw} onChange={(e) => setQw(e.target.value)} />}
          <div className="ofr-grid">
            {theirCards.filter(({ c }) => hit(c, qw) || want.has(c.uid)).map(({ c, l }) =>
              tile(c, want.has(c.uid), toggle(want, setWant), l.ask != null ? `${l.ask} USDC · ${l.witness ? `✓ ${l.witness} scan${l.witness === 1 ? '' : 's'}` : 'no scans'}` : 'from the offer', null, l.witness))}
          </div>
          <div className="ofr-sec mono">you give — your binder{myCards.some(({ e }) => e.trade) ? ' (open-to-trade first)' : ''}</div>
          {myCards.length > 8 && <input className="ofr-search" placeholder="search your binder…" value={qg} onChange={(e) => setQg(e.target.value)} />}
          <div className="ofr-grid">
            {myCards.filter(({ c }) => hit(c, qg) || give.has(c.uid)).map(({ c, e }) => tile(c, give.has(c.uid), toggle(give, setGive), condStr(e) + (e.trade ? ' · ⇄' : '')))}
            {!myCards.length && <div className="empty">Nothing marked Have yet — a pure cash offer works too.</div>}
          </div>
          <div className="ofr-sec mono">the balance</div>
          {amt > 0 && <div className="stl-rails ofr-rails" role="radiogroup" aria-label="Proposed payment rail">
            <button type="button" className={settlementRail === RAIL_ESCROW ? 'on' : ''} onClick={() => setSettlementRail(RAIL_ESCROW)}>
              <b>Cairn Escrow</b><small>recommended</small>
            </button>
            {paypalHandle && <button type="button" className={settlementRail === RAIL_PAYPAL ? 'on' : ''} onClick={() => setSettlementRail(RAIL_PAYPAL)}>
              <b>PayPal</b><small>external</small>
            </button>}
          </div>}
          <div className="ofr-cash">
            <div className="switch2">
              <button className={'sw' + (cashSide === 'from' ? ' on' : '')} onClick={() => setCashSide('from')}>I add cash</button>
              <button className={'sw' + (cashSide === 'to' ? ' on' : '')} onClick={() => setCashSide('to')}>they add cash</button>
            </div>
            <span className="fpre">$</span>
            <input className="ti num" type="number" min="0" placeholder="0" value={cashAmt} onChange={(e) => setCashAmt(e.target.value)} />
            <span className="mono dim">{settlementCurrency}</span>
          </div>
          <input className="ti ofr-note" maxLength={240} placeholder="a note, if words help the numbers…" value={note} onChange={(e) => setNote(e.target.value)} />
          {recordLine && <div className="ofr-anko"><span className="atag jud">Anko · the record</span> {recordLine} — settlements are history, not an appraisal.</div>}
        </div>
        <div className="ofr-foot">
          <div className="ofr-sum mono">
            {want.size} for {give.size}{amt > 0 ? ` + ${amt} ${settlementCurrency} (${cashSide === 'from' ? 'you' : 'they'} pay)` : ''}
          </div>
          <button className="primary ofr-send" disabled={!canSend} onClick={doSend}>{counterOf ? 'Send counter' : 'Send offer'}</button>
        </div>
        <p className="sc-note dim ofr-fine">An offer is a message, not a lock. It proposes {settlementRail === RAIL_PAYPAL ? 'PayPal; PayPal handles the money and Cairn records the terms' : 'Cairn Escrow; the contract holds funds after the payer funds it'}.
          {' '}Sample sellers answer right here in your browser.</p>
        {zoom && <CardZoom card={zoom.c} sub={zoom.sub} witness={zoom.witness} onClose={() => setZoom(null)} />}
      </div>
    </div>
  )
}
