import { useEffect, useMemo, useState } from 'react'
import { storeKeyFor, loadStore, catalogUrl, entryFor, condStr } from '../binder/collection.js'
import { loadHidden, hiddenKeyFor, loadMockSales, mockSalesKeyFor } from './mockAgents.js'
import { applyAgentFilter } from '../binder/agentFilter.js'
import { offersKeyFor, sendOffer } from '../trade/offers.js'
import { pileKeyFor, loadPiles, addToPile, removeFromPile, toggleMode, clearPile } from './pile.js'
import MarketFinds from './MarketFinds.jsx'
import CardZoom from './CardZoom.jsx'
import { handleFor, shortId, avatarSVG } from '../identity.js'
import './market.css'

// The market: other people's tables, run like a card show. You pick cards up (zoom),
// drop them on YOUR PILE tagged buy or trade, and finish each table with ONE deal —
// buys, trade-fors, your side, and a single cash line, sent as one offer. Everything
// shown is a CLAIM; the witness counts say what's recorded behind it.
const MARKET_URL = (import.meta.env.BASE_URL || '/') + 'market-sample.json'
const API_BASE = import.meta.env.VITE_API_BASE || ''

function Avatar({ seed, size = 26 }) {
  return <span className="av" dangerouslySetInnerHTML={{ __html: avatarSVG(seed, size) }} />
}

function witnessCell(w) {
  if (!w) return <span className="mono mk-wit none" title="nothing recorded — you'd be trading on their word alone">— no scans</span>
  return <span className="mono mk-wit ok" title={`${w} pile scan${w === 1 ? '' : 's'} recorded — a witness, not proof`}>✓ {w} scan{w === 1 ? '' : 's'}</span>
}

const scanLabel = (w) => w ? `✓ ${w} scan${w === 1 ? '' : 's'}` : '— no scans'

// buy · 9 / ⇄ trade — both just drop the card on your pile, tagged. Nothing sends.
function PileButtons({ ask, inPile, mode, onBuy, onTrade }) {
  return (
    <span className="ofr-acts">
      <button className={'ofr-buy' + (inPile && mode === 'buy' ? ' on' : '')}
        onClick={(ev) => { ev.stopPropagation(); onBuy() }}
        title="into your pile at the ask — the deal sends when you finish the table">
        {inPile && mode === 'buy' ? '✓ in pile' : `buy · ${ask}`}</button>
      <button className={'ofr-tradebtn' + (inPile && mode === 'trade' ? ' on' : '')}
        onClick={(ev) => { ev.stopPropagation(); onTrade() }}
        title="into your pile as a trade-for — you pick your side at checkout">
        {inPile && mode === 'trade' ? '✓ trade' : '⇄ trade'}</button>
    </span>
  )
}

// The checkout: your pile, itemized — buys at their asks, trade-fors with your side
// picked inline, ONE editable cash line (prefilled to the buy total; haggle if you
// dare, the seller's agent answers). One button sends the whole deal as one offer.
function DealCheckout({ open, pile, byUid, data, store, mkt, catalog, accountId, onClose, onSent }) {
  const [give, setGive] = useState(() => new Set())
  const [qg, setQg] = useState('')
  const [cashEdit, setCashEdit] = useState(null) // null = follow the buy total
  const [note, setNote] = useState('')
  const askOf = (uid) => open.listings.find((l) => l.uid === uid)?.ask ?? 0
  const buys = pile.filter((p) => p.mode === 'buy')
  const trades = pile.filter((p) => p.mode === 'trade')
  const buysSum = buys.reduce((t, p) => t + askOf(p.uid), 0)
  const cash = cashEdit == null ? buysSum : Math.max(0, Number(cashEdit) || 0)

  const myCards = useMemo(() => {
    if (!data) return []
    return data.cards.map((c) => ({ c, e: entryFor(c, store) }))
      .filter(({ e }) => e.stance === 'have')
      .sort((a, b) => (b.e.trade === true) - (a.e.trade === true))
  }, [data, store])
  const hit = (c) => !qg.trim() || ((c.name_en || '') + ' ' + (c.num || '')).toLowerCase().includes(qg.trim().toLowerCase())

  const recordLine = useMemo(() => {
    const sales = { ...(mkt?.sales || {}), ...loadMockSales(mockSalesKeyFor(catalog.id)) }
    const sum = (uids) => {
      let t = 0, known = 0
      for (const uid of uids) { const s = sales[uid]?.[0]; if (s) { t += s.p; known++ } }
      return { t, known, n: uids.length }
    }
    const w = sum(pile.map((p) => p.uid)), g = sum([...give])
    if (!w.n && !g.n) return null
    const part = (x, label) => x.n
      ? `${label} ${x.known ? `~${x.t} USDC across ${x.known} of ${x.n}` : `no settlements on record (${x.n})`}`
      : null
    return [part(w, 'their side:'), part(g, 'yours:')].filter(Boolean).join(' · ')
  }, [mkt, pile, give, catalog])

  const canSend = pile.length > 0 && (trades.length === 0 || give.size > 0 || cash > buysSum || cash > 0)
  const send = () => {
    sendOffer(offersKeyFor(catalog.id, accountId), {
      to: open.id,
      want: pile.map((p) => ({ uid: p.uid })),
      give: [...give].map((uid) => ({ uid })),
      cash: cash > 0 ? { side: 'from', amount: cash } : null,
      note,
    })
    clearPile(pileKeyFor(catalog.id, accountId), open.id)
    onSent()
  }

  const nm = (uid) => byUid.get(uid)?.name_en || uid
  return (
    <div className="deal">
      <div className="deal-head">
        <span className="ek">The deal — one offer to {handleFor(open.id)}</span>
        <button className="ghost sm" onClick={onClose}>collapse</button>
      </div>
      {buys.length > 0 && (
        <div className="deal-sec">
          <span className="mono deal-label">buying at their asks</span>
          {buys.map((p) => (
            <div key={p.uid} className="deal-row mono">{nm(p.uid)} <span className="deal-ask">{askOf(p.uid)} USDC</span></div>
          ))}
          <div className="deal-row mono deal-sum">asks total <b>{buysSum} USDC</b></div>
        </div>
      )}
      {trades.length > 0 && (
        <div className="deal-sec">
          <span className="mono deal-label">trading for</span>
          {trades.map((p) => (
            <div key={p.uid} className="deal-row mono">{nm(p.uid)} <span className="dim">{scanLabel(open.listings.find((l) => l.uid === p.uid)?.witness)}</span></div>
          ))}
          <span className="mono deal-label">your side{myCards.some(({ e }) => e.trade) ? ' — open-to-trade first' : ''}</span>
          {myCards.length > 8 && <input className="ofr-search" placeholder="search your binder…" value={qg} onChange={(e) => setQg(e.target.value)} />}
          <div className="ofr-grid deal-grid">
            {myCards.filter(({ c }) => hit(c) || give.has(c.uid)).slice(0, 60).map(({ c, e }) => (
              <button key={c.uid} className={'ofr-tile' + (give.has(c.uid) ? ' sel' : '')}
                onClick={() => setGive((p) => { const n = new Set(p); if (n.has(c.uid)) n.delete(c.uid); else n.add(c.uid); return n })}>
                {c.image ? <img src={c.image} alt="" loading="lazy" /> : <span className="ofr-noimg">{c.name_en}</span>}
                <span className="ofr-name">{c.name_en}</span>
                <span className="mono ofr-sub">{condStr(e)}{e.trade ? ' · ⇄' : ''}</span>
                {give.has(c.uid) && <span className="ofr-check">✓</span>}
              </button>
            ))}
            {!myCards.length && <div className="empty">Nothing marked Have — cash can carry the whole deal.</div>}
          </div>
        </div>
      )}
      <div className="deal-sec">
        <span className="mono deal-label">the cash line — one number squares the whole deal</span>
        <div className="ofr-cash">
          <span className="fpre">$</span>
          <input className="ti num deal-cash" type="number" min="0" value={cash}
            onChange={(e) => setCashEdit(e.target.value)} />
          <span className="mono dim">USDC{cashEdit == null && buysSum > 0 ? ' · following the buy total' : ''}</span>
        </div>
        <input className="ti ofr-note" maxLength={240} placeholder="a note, if words help the numbers…" value={note} onChange={(e) => setNote(e.target.value)} />
        {recordLine && <div className="ofr-anko"><span className="atag jud">Anko · the record</span> {recordLine} — settlements are history, not an appraisal.</div>}
      </div>
      <div className="deal-foot">
        <span className="mono deal-summary">{pile.length} of theirs ⇄ {give.size} of yours{cash > 0 ? ` + ${cash} USDC` : ''}</span>
        <button className="primary" disabled={!canSend} onClick={send}>Send the deal →</button>
      </div>
      <p className="sc-note dim deal-fine">A deal is a message, not a lock — cards and money only move through escrow. Their agent answers the whole basket at once.</p>
    </div>
  )
}

export default function Market({ accountId, agentName = 'Anko', catalog, focusUid, onClearFocus }) {
  const [data, setData] = useState(null)
  const [mkt, setMkt] = useState(null)
  const [sel, setSel] = useState(null) // seller id whose table is open
  const [wantsOnly, setWantsOnly] = useState(false)
  const [ckOpen, setCkOpen] = useState(false) // the deal checkout, expanded
  const [swapMsg, setSwapMsg] = useState(null)
  const [zoom, setZoom] = useState(null) // {c, l, sellerId} — the card held up to the light
  const [aq, setAq] = useState('')
  const [abusy, setAbusy] = useState(false)
  const [ares, setAres] = useState(null) // Anko's market answer: find tiles or a table-narrowing filter
  const [mockRev, setMockRev] = useState(0)
  const [pileRev, setPileRev] = useState(0)
  useEffect(() => {
    const bump = () => setMockRev((r) => r + 1)
    const pbump = () => setPileRev((r) => r + 1)
    window.addEventListener('cairn-mock', bump)
    window.addEventListener('cairn-store', bump)
    window.addEventListener('cairn-pile', pbump)
    return () => { window.removeEventListener('cairn-mock', bump); window.removeEventListener('cairn-store', bump); window.removeEventListener('cairn-pile', pbump) }
  }, [])
  const storeKey = storeKeyFor(catalog.id, accountId)
  const pileKey = pileKeyFor(catalog.id, accountId)
  const store = useMemo(() => loadStore(storeKey), [storeKey, mockRev]) // eslint-disable-line react-hooks/exhaustive-deps -- mockRev is the invalidation signal
  const piles = useMemo(() => loadPiles(pileKey), [pileKey, pileRev]) // eslint-disable-line react-hooks/exhaustive-deps -- pileRev is the invalidation signal

  useEffect(() => { setCkOpen(false) }, [sel]) // eslint-disable-line react-hooks/set-state-in-effect -- new table, checkout folds
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset + hydrate on catalog switch */
    setData(null); setMkt(null); setSel(null)
    fetch(catalogUrl(catalog)).then((r) => r.json()).then(setData).catch(() => {})
    fetch(MARKET_URL).then((r) => r.json()).then(setMkt).catch(() => {})
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [catalog, storeKey])

  const byUid = useMemo(() => new Map((data?.cards || []).map((c) => [c.uid, c])), [data])
  const sellers = useMemo(() => {
    if (!(mkt && mkt.catalog_id === catalog.id)) return []
    const hidden = loadHidden(hiddenKeyFor(catalog.id, accountId))
    const gone = new Set(hidden.map((h) => h.seller + '|' + h.uid))
    return mkt.sellers.map((sl) => ({ ...sl, listings: sl.listings.filter((l) => !gone.has(sl.id + '|' + l.uid)) }))
  }, [mkt, catalog, accountId, mockRev]) // eslint-disable-line react-hooks/exhaustive-deps -- mockRev is the invalidation signal
  const myWants = useMemo(() => {
    if (!data) return new Set()
    return new Set(data.cards.filter((c) => entryFor(c, store).stance === 'want').map((c) => c.uid))
  }, [data, store])
  const myHaves = useMemo(() => {
    if (!data) return new Set()
    return new Set(data.cards.filter((c) => entryFor(c, store).stance === 'have').map((c) => c.uid))
  }, [data, store])

  const pickUp = (sellerId, uid, mode) => addToPile(pileKey, sellerId, uid, mode)
  const askAnko = async () => {
    const call = aq.trim()
    if (!call || abusy) return
    setAbusy(true)
    try {
      const r = await fetch(API_BASE + '/api/browse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ call, catalog: catalog.id }) })
      setAres({ ok: r.ok, data: await r.json() })
    } catch { setAres({ ok: false, data: { error: 'network' } }) }
    finally { setAbusy(false); setAq('') }
  }

  const findStep = useMemo(() => {
    if (!ares?.ok) return null
    const a = ares.data?.action
    const steps = Array.isArray(a) ? a : a ? [a] : []
    return steps.find((st) => st.op === 'find_market') || null
  }, [ares])
  const finds = useMemo(() => {
    if (!findStep || !data) return []
    const scope = { ...(findStep.scope || {}) }
    delete scope.owned
    const uids = new Set(applyAgentFilter(data.cards, scope, {}).map((c) => c.uid))
    const out = []
    for (const sl of sellers) for (const l of sl.listings) {
      if (!uids.has(l.uid)) continue
      if (findStep.ask != null && l.ask > findStep.ask) continue
      const c = byUid.get(l.uid)
      if (c) out.push({ c, sellerId: sl.id, l })
    }
    return out.sort((a, b) => a.l.ask - b.l.ask).slice(0, 24)
  }, [findStep, data, sellers, byUid])
  // a plain browse call narrows the AISLE: which tables carry matches
  const aisleMatch = useMemo(() => {
    if (!ares?.ok || findStep || !data) return null
    const f = ares.data?.filter
    if (!f) return null
    const scope = { ...f }
    delete scope.owned
    return new Set(applyAgentFilter(data.cards, scope, {}).map((c) => c.uid))
  }, [ares, findStep, data])

  if (!data || !mkt) return <div className="empty">Opening the market…</div>
  if (!sellers.length) return <div className="empty">No tables in this catalog yet.</div>

  const open = sellers.find((s) => s.id === sel)
  const pileOf = (sellerId) => piles[sellerId] || []
  const inPile = (sellerId, uid) => pileOf(sellerId).find((x) => x.uid === uid)

  const ankoBar = (
    <div className="askbar mk-askbar">
      <img className={'anko-search' + (abusy ? ' busy' : '')} src={(import.meta.env.BASE_URL || '/') + 'agent/house.png'}
        alt="" title={`${agentName} — your agent at the show`} onError={(e) => { e.currentTarget.style.display = 'none' }} />
      <input value={aq} maxLength={280} placeholder={`Ask ${agentName} — who's selling…?`}
        onChange={(e) => { setAq(e.target.value); if (ares) setAres(null) }}
        onKeyDown={(e) => { if (e.key === 'Enter') askAnko() }} />
      <button className="askbtn" onClick={askAnko} disabled={abusy || !aq.trim()}>{abusy ? 'onibi reading…' : `Ask ${agentName}`}</button>
    </div>
  )
  const ankoPanel = ares && (
    !ares.ok
      ? <div className="apanel"><div className="aoff">{agentName}&rsquo;s lamp is dark — couldn&rsquo;t reach him. Try again.</div></div>
      : findStep
        ? <MarketFinds agentName={agentName} reading={ares.data.filter?.reading} finds={finds} mode={findStep.mode || 'buy'}
            onAddPile={({ seller, uid, mode }) => { pickUp(seller, uid, mode); setSel(seller) }} onDismiss={() => setAres(null)} />
        : aisleMatch
          ? <div className="aprop"><span className="atag jud">{agentName} · down the aisle</span>
              <div className="aprop-line">{aisleMatch.size ? <>Tables carrying matches are marked — the rest step back.</> : <>No table carries that right now.</>}</div>
              {ares.data.filter?.reading && <div className="aprop-read dim">{ares.data.filter.reading}</div>}
              {ares.data.result?.commentary && <div className="aprop-read">{ares.data.result.commentary}</div>}
              <div className="aprop-acts"><button className="ghost sm" onClick={() => setAres(null)}>✕ done</button></div>
            </div>
          : null
  )
  const zoomEl = zoom && (
    <CardZoom card={zoom.c} sub={zoom.l ? `${zoom.l.ask} USDC · ${zoom.l.cond}` : null} witness={zoom.l ? zoom.l.witness : null} onClose={() => setZoom(null)}>
      {zoom.l && zoom.sellerId && (
        <PileButtons ask={zoom.l.ask}
          inPile={!!inPile(zoom.sellerId, zoom.c.uid)} mode={inPile(zoom.sellerId, zoom.c.uid)?.mode}
          onBuy={() => pickUp(zoom.sellerId, zoom.c.uid, 'buy')}
          onTrade={() => pickUp(zoom.sellerId, zoom.c.uid, 'trade')} />
      )}
    </CardZoom>
  )
  const msgEl = swapMsg && <button className="mk-swapmsg mono" onClick={() => setSwapMsg(null)}>{swapMsg} ✕</button>

  // ---- by-card focus: everyone asking on one card ----
  if (focusUid) {
    const c = byUid.get(focusUid)
    const asks = sellers.flatMap((s) => s.listings.filter((l) => l.uid === focusUid).map((l) => ({ s, l })))
    return (
      <div className="mk">
        <div className="mk-samplenote mono">sample tables — mock sellers, for shaping the browse. nothing here is a real offer.</div>
        {ankoBar}
        {ankoPanel}
        {msgEl}
        {zoomEl}
        <div className="mk-head">
          <div className="mk-focushead">
            {c?.image && <img className="mk-focusart" src={c.image} alt="" onClick={() => setZoom({ c, l: asks[0]?.l, sellerId: asks[0]?.s.id })} />}
            <div>
              <div className="ek">On the market</div>
              <div className="mk-title">{c ? `${c.name_en} · ${c.num}` : focusUid}
                <span className="dim"> · {asks.length} ask{asks.length === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>
          <button className="ghost sm" onClick={onClearFocus}>← all tables</button>
        </div>
        {asks.length
          ? <div className="mk-rows">
              {asks.sort((a, b) => a.l.ask - b.l.ask).map(({ s, l }, i) => (
                <div key={i} className={'mk-row' + (myWants.has(focusUid) ? ' mk-mine' : '')}>
                  <button className="mk-who" onClick={() => { onClearFocus(); setSel(s.id) }} title="visit their table">
                    <Avatar seed={s.id} size={20} /><span>{handleFor(s.id)}</span>
                  </button>
                  <span className="mk-name">{myWants.has(focusUid) && <span className="mk-wantflag">your want</span>}</span>
                  <span className="mono mk-cond" title="the seller's claim — the protocol records it, it does not verify it">{l.cond}</span>
                  {witnessCell(l.witness)}
                  <span className="mono mk-ask">{l.ask} USDC</span>
                  <PileButtons ask={l.ask}
                    inPile={!!inPile(s.id, focusUid)} mode={inPile(s.id, focusUid)?.mode}
                    onBuy={() => { pickUp(s.id, focusUid, 'buy'); setSwapMsg(`in your pile at ${handleFor(s.id)}'s table — finish the deal there.`) }}
                    onTrade={() => { pickUp(s.id, focusUid, 'trade'); setSwapMsg(`in your pile at ${handleFor(s.id)}'s table — finish the deal there.`) }} />
                </div>
              ))}
            </div>
          : <div className="empty">Nobody is asking on this card right now.</div>}
        <p className="sc-note dim">Condition is the seller&rsquo;s claim; the witness column says what&rsquo;s recorded behind it.
          Buy and trade both drop the card on your pile at that seller&rsquo;s table — one deal per table.</p>
      </div>
    )
  }

  // ---- one seller's table ----
  if (open) {
    const pile = pileOf(open.id)
    const rows = open.listings
      .map((l) => ({ l, c: byUid.get(l.uid) }))
      .filter(({ c }) => c)
      .filter(({ c }) => !wantsOnly || myWants.has(c.uid))
    const total = open.listings.reduce((s, { ask, copies }) => s + ask * (copies || 1), 0)
    const witnessed = open.listings.filter((l) => l.witness).length
    const wantsTheyHave = open.listings.filter((l) => myWants.has(l.uid)).length
    const theirWants = (open.wants || []).map((u) => byUid.get(u)).filter(Boolean)
    const swapBait = theirWants.filter((c) => myHaves.has(c.uid))
    const buysSum = pile.filter((p) => p.mode === 'buy').reduce((t, p) => t + (open.listings.find((l) => l.uid === p.uid)?.ask ?? 0), 0)
    return (
      <div className="mk">
        <div className="mk-samplenote mono">sample tables — mock sellers, for shaping the browse. nothing here is a real offer.</div>
        {ankoBar}
        {ankoPanel}
        {msgEl}
        {zoomEl}
        <div className="mk-head">
          <div className="mk-seller">
            <Avatar seed={open.id} size={40} />
            <div>
              <div className="mk-handle">{handleFor(open.id)}</div>
              <div className="mono dim mk-sub">{shortId(open.id)} · at the market since {open.joined}</div>
            </div>
          </div>
          <button className="ghost sm" onClick={() => { setSel(null); setWantsOnly(false) }}>← all tables</button>
        </div>
        {open.bio && <p className="mk-bio">{open.bio}</p>}
        <div className="mk-meter mono">
          <span>{open.listings.length} listed · {total} USDC asked</span>
          <span className={witnessed === open.listings.length ? 'mk-wit ok' : witnessed ? '' : 'mk-wit none'}>
            {witnessed} of {open.listings.length} witnessed
          </span>
          {wantsTheyHave > 0 && (
            <button className={'mk-wantsbtn' + (wantsOnly ? ' on' : '')} onClick={() => setWantsOnly(!wantsOnly)}>
              {wantsTheyHave} of your wants{wantsOnly ? ' ✕' : ' →'}
            </button>
          )}
        </div>
        <div className="mk-tiles">
          {rows.map(({ l, c }) => {
            const p = inPile(open.id, c.uid)
            return (
              <div key={c.uid} className={'ofr-tile' + (p ? ' sel' : '') + (aisleMatch && !aisleMatch.has(c.uid) ? ' mk-dim' : '')}
                role="button" tabIndex={0} title="tap the card to hold it up to the light"
                onClick={() => setZoom({ c, l, sellerId: open.id })}>
                {c.image ? <img src={c.image} alt="" loading="lazy" /> : <span className="ofr-noimg">{c.name_en}</span>}
                <span className="pricetag">{l.ask} USDC</span>
                <span className="ofr-name">{c.name_en}{myWants.has(c.uid) ? ' ★' : ''}</span>
                <span className="mono ofr-sub">{scanLabel(l.witness)}</span>
                <PileButtons ask={l.ask} inPile={!!p} mode={p?.mode}
                  onBuy={() => pickUp(open.id, c.uid, 'buy')}
                  onTrade={() => pickUp(open.id, c.uid, 'trade')} />
              </div>
            )
          })}
          {!rows.length && <div className="empty">Nothing on this table matches your wants.</div>}
        </div>
        {(open.lots || []).map((lot, i) => {
          const lotTotal = lot.cards.reduce((s, x) => s + x.ask * (x.copies || 1), 0)
          return (
            <div className="mk-lot" key={i}>
              <div className="mk-lothead">
                <span className="mk-name">{lot.name}<span className="mono mk-num">{lot.cards.length} cards · {lotTotal} USDC</span></span>
                <button className="sheetbtn mk-sm mono" onClick={() => lot.cards.forEach((x) => pickUp(open.id, x.uid, 'buy'))}>lot → pile</button>
              </div>
              <div className="mk-lotcards dim">{lot.cards.map((x) => byUid.get(x.uid)?.name_en || x.uid).join(' · ')}</div>
              {lot.note && <div className="mk-lotnote dim">{lot.note}</div>}
            </div>
          )
        })}
        {theirWants.length > 0 && (
          <div className="mk-hunting">
            <span className="ek">They&rsquo;re hunting</span>
            <div className="mk-huntrow">
              {theirWants.map((c) => (
                <span key={c.uid} className={'mk-hunt mono' + (myHaves.has(c.uid) ? ' mk-swap' : '')}>
                  {c.image && <img src={c.image} alt="" loading="lazy" />}
                  {c.name_en}{myHaves.has(c.uid) ? ' · you have it' : ''}
                </span>
              ))}
            </div>
            {swapBait.length > 0 && <div className="mk-swapnote dim">You hold {swapBait.length} card{swapBait.length === 1 ? '' : 's'} they want — offer them in a deal.</div>}
          </div>
        )}
        {ckOpen && pile.length > 0 && (
          <DealCheckout key={open.id} open={open} pile={pile} byUid={byUid} data={data} store={store} mkt={mkt}
            catalog={catalog} accountId={accountId}
            onClose={() => setCkOpen(false)}
            onSent={() => { setCkOpen(false); setSwapMsg(`the deal went to ${handleFor(open.id)} — their agent is reading it. Watch Trades.`) }} />
        )}
        {pile.length > 0 && (
          <div className="mk-checkout">
            <div className="mk-ckthumbs">
              {pile.map((p) => {
                const c = byUid.get(p.uid)
                return (
                  <span key={p.uid} className="mk-ckthumb" title={`${c?.name_en || p.uid} — tap the tag to flip buy/trade`}>
                    {c?.image ? <img src={c.image} alt="" /> : null}
                    <button className={'mk-cktag mono' + (p.mode === 'trade' ? ' tr' : '')} onClick={() => toggleMode(pileKey, open.id, p.uid)}>{p.mode === 'buy' ? '$' : '⇄'}</button>
                    <button className="mk-ckx mono" onClick={() => removeFromPile(pileKey, open.id, p.uid)} title="put it back">✕</button>
                  </span>
                )
              })}
            </div>
            <span className="mono mk-cksum">your pile · {pile.length} card{pile.length === 1 ? '' : 's'}{buysSum > 0 ? ` · buys ${buysSum} USDC` : ''}</span>
            <span className="mk-ckacts">
              {!ckOpen && <button className="primary" onClick={() => setCkOpen(true)}>Review the deal →</button>}
              <button className="ghost sm" onClick={() => clearPile(pileKey, open.id)}>clear</button>
            </span>
          </div>
        )}
        <p className="sc-note dim">Condition is the seller&rsquo;s claim; scans say what&rsquo;s recorded behind it. Pick cards up,
          tag them buy or trade, and finish the table with one deal.</p>
      </div>
    )
  }

  // ---- the directory: all tables ----
  return (
    <div className="mk">
      <div className="mk-samplenote mono">sample tables — mock sellers, for shaping the browse. nothing here is a real offer.</div>
      {ankoBar}
      {ankoPanel}
      {msgEl}
      {zoomEl}
      <div className="mk-head">
        <div>
          <div className="ek">The market</div>
          <div className="mk-title">{sellers.length} tables open</div>
        </div>
      </div>
      <div className="mk-grid">
        {[...sellers].sort((a, b) => aisleMatch
          ? b.listings.filter((l) => aisleMatch.has(l.uid)).length - a.listings.filter((l) => aisleMatch.has(l.uid)).length
          : 0).map((s) => {
          const total = s.listings.reduce((t, { ask, copies }) => t + ask * (copies || 1), 0)
          const witnessed = s.listings.filter((l) => l.witness).length
          const wantsHere = s.listings.filter((l) => myWants.has(l.uid)).length
          const aisleN = aisleMatch ? s.listings.filter((l) => aisleMatch.has(l.uid)).length : null
          const pileN = pileOf(s.id).length
          return (
            <button key={s.id} className={'mk-table' + (aisleN === 0 ? ' mk-dim' : '')} onClick={() => setSel(s.id)}>
              <div className="mk-seller">
                <Avatar seed={s.id} size={34} />
                <div>
                  <div className="mk-handle">{handleFor(s.id)}</div>
                  <div className="mono dim mk-sub">{shortId(s.id)}</div>
                </div>
              </div>
              <div className="mk-spread">
                {s.listings.slice(0, 5).map((l) => { const c = byUid.get(l.uid); return c?.image ? <img key={l.uid} src={c.image} alt="" loading="lazy" /> : null })}
                {s.listings.length > 5 && <span className="mono mk-more">+{s.listings.length - 5}</span>}
              </div>
              <div className="mk-tmeter mono">
                {pileN > 0 && <span className="mk-pilebadge">your pile · {pileN}</span>}
                {aisleN > 0 && <span className="mk-aisle">{aisleN} match{aisleN === 1 ? '' : 'es'}</span>}
                <span>{s.listings.length} listed{(s.lots || []).length ? ` + ${s.lots.length} lot` : ''} · {total} USDC</span>
                <span className={witnessed === s.listings.length ? 'mk-wit ok' : witnessed ? '' : 'mk-wit none'}>
                  {witnessed ? `${witnessed}/${s.listings.length} witnessed` : 'nothing witnessed'}
                </span>
                {wantsHere > 0 && <span className="mk-wantflag">{wantsHere} of your wants</span>}
              </div>
              {s.bio && <div className="mk-tbio dim">{s.bio}</div>}
            </button>
          )
        })}
      </div>
      <p className="sc-note dim">A table is just what someone chose to list — their binder stays theirs. Witness counts
        say a scan is recorded, not that a card is real. You judge; escrow holds.</p>
    </div>
  )
}
