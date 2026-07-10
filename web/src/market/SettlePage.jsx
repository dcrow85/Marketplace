import { useEffect, useMemo, useState } from 'react'
import { entryFor, condStr } from '../binder/collection.js'
import { applyAgentFilter } from '../binder/agentFilter.js'
import { offersKeyFor, sendOffer } from '../trade/offers.js'
import { removeFromPile, toggleMode, clearPile } from './pile.js'
import { loadMockSales, mockSalesKeyFor } from './mockAgents.js'
import MiniCard from '../components/MiniCard.jsx'
import { handleFor, avatarSVG } from '../identity.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const scanLabel = (w) => w ? `✓ ${w} scan${w === 1 ? '' : 's'}` : '— no scans'

function Avatar({ seed, size = 26 }) {
  return <span className="av" dangerouslySetInnerHTML={{ __html: avatarSVG(seed, size) }} />
}

// The Settle page: its own room, built for the process. You piled cards up at the
// table; here you square the deal — their side with the art in front of you, your
// side from your binder, one cash line, one send. Clean on purpose: no ask bar, no
// aisle, nothing but the deal.
export default function SettlePage({ open, pile, byUid, data, store, mkt, catalog, accountId, pileKey, agentName = 'Anko', onBack, onSent }) {
  const [give, setGive] = useState(() => new Set())
  const [qg, setQg] = useState('')
  const [cashEdit, setCashEdit] = useState(null) // null = follow the buy total
  const [note, setNote] = useState('')
  const [abusy, setAbusy] = useState(false)
  const [ankoScope, setAnkoScope] = useState(null) // his lens on YOUR side
  const [ankoLine, setAnkoLine] = useState(null)
  useEffect(() => { window.scrollTo({ top: 0 }) }, []) // a new room starts at its door
  const askOf = (uid) => open.listings.find((l) => l.uid === uid)?.ask ?? 0
  const buys = pile.filter((p) => p.mode === 'buy')
  const trades = pile.filter((p) => p.mode === 'trade')
  const buysSum = buys.reduce((t, p) => t + askOf(p.uid), 0)
  const cash = cashEdit == null ? buysSum : Math.max(0, Number(cashEdit) || 0)

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
        if (m.none) setAnkoLine('None of your candidates have settlements on record — nothing to match with. Pick by eye; the record can\u2019t help here.')
        else {
          setGive(m.picked)
          setAnkoLine(`Picked ${m.picked.size} of yours — settlements put them at ~${m.sum} against their ~${m.target}. History, not an appraisal; adjust freely.`)
        }
      } else {
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

  const canSend = pile.length > 0 && (trades.length === 0 || give.size > 0 || cash > 0)
  const send = () => {
    sendOffer(offersKeyFor(catalog.id, accountId), {
      to: open.id,
      want: pile.map((p) => ({ uid: p.uid })),
      give: [...give].map((uid) => ({ uid })),
      cash: cash > 0 ? { side: 'from', amount: cash } : null,
      note,
      live: open.live, from: accountId, cat: catalog.id,
    })
    clearPile(pileKey, open.id)
    onSent()
  }

  return (
    <div className="mk stl">
      <div className="mk-head">
        <div className="mk-seller">
          <Avatar seed={open.id} size={40} />
          <div>
            <div className="ek">Settle up</div>
            <div className="mk-handle">one deal with {handleFor(open.id)}</div>
          </div>
        </div>
        <button className="ghost sm" onClick={onBack}>← back to the table</button>
      </div>

      <div className="stl-sec">
        <div className="stl-label mono">their side — your pile{buysSum > 0 ? ` · buys come to ${buysSum} USDC` : ''}</div>
        <div className="ofr-grid">
          {pile.map((p) => {
            const c = byUid.get(p.uid)
            if (!c) return null
            const l = open.listings.find((x) => x.uid === p.uid)
            return (
              <MiniCard key={p.uid} c={c}
                sub={`${p.mode === 'buy' ? `${askOf(p.uid)} USDC · ` : ''}${scanLabel(l?.witness)}`}
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
      </div>

      {trades.length > 0 && (
      <div className="stl-sec">
        <div className="stl-label mono">your side — they want something for the ⇄ cards</div>
        <div className="askbar stl-ask">
          <img className={'anko-search' + (abusy ? ' busy' : '')} src={(import.meta.env.BASE_URL || '/') + 'agent/house.png'}
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
            {ankoScope && <button className="stl-clear" onClick={() => { setAnkoScope(null); setAnkoLine(null) }}>✕ clear his lens</button>}
          </div>
        )}
        <div className="ofr-grid stl-give">
          {myCards.filter(({ c }) => hit(c) || give.has(c.uid)).slice(0, 60).map(({ c, e }) => (
            <MiniCard key={c.uid} c={c} sel={give.has(c.uid)} sub={condStr(e) + (e.trade ? ' · ⇄' : '')}
              onTap={() => setGive((pr) => { const n = new Set(pr); if (n.has(c.uid)) n.delete(c.uid); else n.add(c.uid); return n })} />
          ))}
          {!myCards.length && <div className="empty">Nothing marked Have — cash can carry the whole deal.</div>}
        </div>
      </div>
      )}

      <div className="stl-sec">
        <div className="stl-label mono">the cash line — one number squares the whole deal</div>
        <div className="stl-cashrow">
          <span className="fpre stl-dollar">$</span>
          <input className="ti num stl-cash" type="number" min="0" value={cash} onChange={(e) => setCashEdit(e.target.value)} />
          <span className="mono dim">USDC{cashEdit == null && buysSum > 0 ? ' · following the buy total' : ''}</span>
        </div>
        <input className="ti ofr-note" maxLength={240} placeholder="a note, if words help the numbers…" value={note} onChange={(e) => setNote(e.target.value)} />
        {recordLine && <div className="ofr-anko"><span className="atag jud">Anko · the record</span> {recordLine} — settlements are history, not an appraisal.</div>}
      </div>

      <div className="stl-foot">
        <span className="mono deal-summary">{trades.length || give.size
          ? `${pile.length} of theirs ⇄ ${give.size} of yours${cash > 0 ? ` + ${cash} USDC` : ''}`
          : `${pile.length} card${pile.length === 1 ? '' : 's'} · ${cash} USDC`}</span>
        <button className="primary stl-send" disabled={!canSend} onClick={send}>Send the deal to {handleFor(open.id)} →</button>
      </div>
      <p className="sc-note dim">A deal is a message, not a lock — cards and money only move through escrow.
        {open.live ? ` This is a live table: ${handleFor(open.id)} is a real collector, and the deal lands in their inbox.` : ' Their agent answers the whole basket at once.'}</p>
    </div>
  )
}

