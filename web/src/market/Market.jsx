import { useEffect, useMemo, useState } from 'react'
import { storeKeyFor, loadStore, entryFor } from '../binder/collection.js'
import { useCatalog, useMarket, useByUid } from '../lib/data.js'
import { useBus } from '../lib/store.js'
import { loadHidden, hiddenKeyFor, loadMockSales, mockSalesKeyFor } from './mockAgents.js'
import { fetchProfiles, fetchProfile } from '../live/pilotStore.js'
import { applyAgentFilter } from '../binder/agentFilter.js'
import { offersKeyFor, sendOffer } from '../trade/offers.js'
import { pileKeyFor, loadPiles, addToPile, removeFromPile, toggleMode, clearPile } from './pile.js'
import MarketFinds from './MarketFinds.jsx'
import SettlePage from './SettlePage.jsx'
import CardZoom from './CardZoom.jsx'
import { handleFor, shortId, avatarSVG } from '../identity.js'
import './market.css'

// The market: other people's tables, run like a card show. You pick cards up (zoom),
// drop them on YOUR PILE tagged buy or trade, and finish each table with ONE deal —
// buys, trade-fors, your side, and a single cash line, sent as one offer. Everything
// shown is a CLAIM; the witness counts say what's recorded behind it.
const API_BASE = import.meta.env.VITE_API_BASE || ''

function Avatar({ seed, size = 26 }) {
  return <span className="av" dangerouslySetInnerHTML={{ __html: avatarSVG(seed, size) }} />
}

function witnessCell(w) {
  if (!w) return <span className="mono mk-wit none" title="nothing recorded — you'd be trading on their word alone">— no scans</span>
  return <span className="mono mk-wit ok" title={`${w} pile scan${w === 1 ? '' : 's'} recorded — a witness, not proof`}>✓ {w} scan{w === 1 ? '' : 's'}</span>
}

const scanLabel = (w) => w ? `✓ ${w} scan${w === 1 ? '' : 's'}` : '— no scans'

// A published page, read back as a table: the same seller shape the mock market uses,
// so the pile, the deal, and the Settle room work unchanged. Everything on it is the
// collector's own claim, carried from their page — so no green here, and no 'record'.
const profileToSeller = (p) => ({
  id: p.addr,
  live: true,
  joined: p.updated ? new Date(p.updated).toISOString().slice(0, 10) : null,
  bio: p.sign || '',
  listings: (p.table || []).filter((t) => t && t.uid).map((t) => ({
    uid: t.uid, ask: Number(t.ask) || 0, cond: t.cond || 'their claim', witness: t.scans || 0, copies: t.copies || 1,
  })),
  wants: p.wants || [],
  showcase: p.showcase || [],
  recordStats: Array.isArray(p.record) ? p.record : [],
})

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

export default function Market({ accountId, agentName = 'Anko', catalog, focusUid, onClearFocus }) {
  const data = useCatalog(catalog)
  const mkt = useMarket(catalog)
  const [sel, setSel] = useState(null) // seller id whose table is open
  const [wantsOnly, setWantsOnly] = useState(false)
  const [settling, setSettling] = useState(false) // the Settle page, its own room
  const [swapMsg, setSwapMsg] = useState(null)
  const [zoom, setZoom] = useState(null) // {c, l, sellerId} — the card held up to the light
  const [aq, setAq] = useState('')
  const [abusy, setAbusy] = useState(false)
  const [ares, setAres] = useState(null) // Anko's market answer: find tiles or a table-narrowing filter
  const [tableSort, setTableSort] = useState(null) // 'price_desc' | 'price_asc' | null
  const [huntOpen, setHuntOpen] = useState(false)
  const storeKey = storeKeyFor(catalog.id, accountId)
  const pileKey = pileKeyFor(catalog.id, accountId)
  const store = useBus(() => loadStore(storeKey), [storeKey])
  const piles = useBus(() => loadPiles(pileKey), [pileKey])

  useEffect(() => { setSettling(false); setHuntOpen(false) }, [sel]) // eslint-disable-line react-hooks/set-state-in-effect -- new table, settle + hunting fold
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- Anko's sort is a view instruction, not a panel */
    const srt = ares?.ok ? ares.data?.filter?.sort : null
    if (srt === 'price_desc' || srt === 'price_asc') {
      setTableSort(srt)
      setSwapMsg(`${agentName} sorted the table — ${srt === 'price_desc' ? 'highest asks first' : 'lowest asks first'}.`)
      const f = ares.data.filter || {}
      const scopeKeys = Object.entries(f).filter(([k, v]) => v != null && !['reading', 'action', 'owned', 'sort'].includes(k))
      const hasAction = Array.isArray(ares.data.action) ? ares.data.action.length : !!ares.data.action
      if (!scopeKeys.length && !hasAction) setAres(null) // pure sort: no aisle panel needed
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [ares, agentName])
  useEffect(() => { setSel(null) }, [catalog]) // eslint-disable-line react-hooks/set-state-in-effect -- new catalog, no table open

  const byUid = useByUid(data)
  const sellers = useBus(() => {
    if (!mkt) return []
    const hidden = loadHidden(hiddenKeyFor(catalog.id, accountId))
    const gone = new Set(hidden.map((h) => h.seller + '|' + h.uid))
    return mkt.sellers.map((sl) => ({ ...sl, listings: sl.listings.filter((l) => !gone.has(sl.id + '|' + l.uid)) }))
  }, [mkt, catalog, accountId])
  // the live room: pages real collectors published — refreshed on a slow clock
  const [liveSellers, setLiveSellers] = useState([])
  useEffect(() => {
    let stop = false
    const load = async () => {
      const idx = await fetchProfiles()
      if (!Array.isArray(idx) || stop) return
      const mine = (accountId || '').toLowerCase()
      const full = await Promise.all(idx.filter((e) => e.addr && e.addr !== mine).slice(0, 40).map((e) => fetchProfile(e.addr)))
      if (stop) return
      setLiveSellers(full.filter(Boolean).map(profileToSeller).filter((s) => s.listings.length || s.wants.length || s.showcase.length))
    }
    load()
    const iv = setInterval(load, 90000)
    return () => { stop = true; clearInterval(iv) }
  }, [accountId, catalog])
  const allSellers = useMemo(() => {
    const hidden = loadHidden(hiddenKeyFor(catalog.id, accountId))
    const gone = new Set(hidden.map((h) => h.seller + '|' + h.uid))
    const lv = liveSellers.map((sl) => ({ ...sl, listings: sl.listings.filter((l) => !gone.has(sl.id + '|' + l.uid)) }))
    return [...lv, ...sellers]
  }, [liveSellers, sellers, catalog, accountId])
  const myWants = useMemo(() => {
    if (!data) return new Set()
    return new Set(data.cards.filter((c) => entryFor(c, store).stance === 'want').map((c) => c.uid))
  }, [data, store])
  const myHaves = useMemo(() => {
    if (!data) return new Set()
    return new Set(data.cards.filter((c) => entryFor(c, store).stance === 'have').map((c) => c.uid))
  }, [data, store])
  const salesAll = useBus(() => ({ ...(mkt?.sales || {}), ...loadMockSales(mockSalesKeyFor(catalog.id)) }), [mkt, catalog])
  const myTradeSum = useMemo(() => {
    if (!data) return 0
    return data.cards.reduce((t, c) => {
      const e = entryFor(c, store)
      if (e.stance !== 'have' || !e.trade) return t
      return t + (salesAll[c.uid]?.[0]?.p ?? 0)
    }, 0)
  }, [data, store, salesAll])

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
    for (const sl of allSellers) for (const l of sl.listings) {
      if (!uids.has(l.uid)) continue
      if (findStep.ask != null && l.ask > findStep.ask) continue
      const c = byUid.get(l.uid)
      if (c) out.push({ c, sellerId: sl.id, l })
    }
    return out.sort((a, b) => a.l.ask - b.l.ask).slice(0, 24)
  }, [findStep, data, allSellers, byUid])
  // a plain browse call narrows the AISLE: which tables carry matches
  const aisleMatch = useMemo(() => {
    if (!ares?.ok || findStep || !data) return null
    const f = ares.data?.filter
    if (!f) return null
    const scope = { ...f }
    delete scope.owned
    delete scope.sort
    if (!Object.values(scope).some((v) => v != null && v !== false)) return null
    return new Set(applyAgentFilter(data.cards, scope, {}).map((c) => c.uid))
  }, [ares, findStep, data])

  if (!data || !mkt) return <div className="empty">Opening the market…</div>
  if (!allSellers.length) return <div className="empty">No tables in this catalog yet.</div>

  const open = allSellers.find((s) => s.id === sel)
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
  const roomNote = (
    <div className="mk-samplenote mono">{open?.live
      ? <><span className="mk-livetag">● live</span> {handleFor(open.id)} is a real collector in the pilot — a deal here goes to their inbox.</>
      : liveSellers.length
        ? <>tables marked <span className="mk-livetag">● live</span> are real collectors — deals there reach a real inbox. the rest are sample sellers for shaping the browse.</>
        : 'sample tables — mock sellers, for shaping the browse. nothing here is a real offer.'}</div>
  )

  // ---- by-card focus: everyone asking on one card ----
  if (focusUid) {
    const c = byUid.get(focusUid)
    const asks = allSellers.flatMap((s) => s.listings.filter((l) => l.uid === focusUid).map((l) => ({ s, l })))
    return (
      <div className="mk">
        {roomNote}
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

  // ---- the Settle page: its own room ----
  if (open && settling) {
    const pile = pileOf(open.id)
    if (!pile.length) { setSettling(false); return null }
    return (
      <SettlePage open={open} pile={pile} byUid={byUid} data={data} store={store} mkt={mkt}
        catalog={catalog} accountId={accountId} pileKey={pileKey} agentName={agentName}
        onBack={() => setSettling(false)}
        onSent={() => { setSettling(false); setSwapMsg(`the deal went to ${handleFor(open.id)} — their agent is reading it. Watch Trades.`) }} />
    )
  }

  // ---- one seller's table ----
  if (open) {
    const pile = pileOf(open.id)
    const rows = open.listings
      .map((l) => ({ l, c: byUid.get(l.uid) }))
      .filter(({ c }) => c)
      .filter(({ c }) => !wantsOnly || myWants.has(c.uid))
      .sort((a, b) => tableSort === 'price_desc' ? b.l.ask - a.l.ask : tableSort === 'price_asc' ? a.l.ask - b.l.ask : 0)
    const total = open.listings.reduce((s, { ask, copies }) => s + ask * (copies || 1), 0)
    const witnessed = open.listings.filter((l) => l.witness).length
    const wantsTheyHave = open.listings.filter((l) => myWants.has(l.uid)).length
    const theirWants = (open.wants || []).map((u) => byUid.get(u)).filter(Boolean)
    const swapBait = theirWants.filter((c) => myHaves.has(c.uid))
    const buysSum = pile.filter((p) => p.mode === 'buy').reduce((t, p) => t + (open.listings.find((l) => l.uid === p.uid)?.ask ?? 0), 0)
    const displayUids = new Set(open.showcase || [])
    const displayRows = rows.filter(({ c }) => displayUids.has(c.uid))
    const binderRows = rows.filter(({ c }) => !displayUids.has(c.uid))
    const cardGrid = (sectionRows, emptyText) => (
      <div className="grid">
        {sectionRows.map(({ l, c }) => {
          const p = inPile(open.id, c.uid)
          return (
            <div key={c.uid} className={'cell' + (aisleMatch && !aisleMatch.has(c.uid) ? ' mk-dim' : '')}>
              <div className="stancebar">
                <button className={'seg sg-have' + (p?.mode === 'buy' ? ' on' : '')}
                  title="into your pile at the ask — the deal sends when you finish the table"
                  onClick={() => pickUp(open.id, c.uid, 'buy')}>{p?.mode === 'buy' ? '✓ buy' : `buy · ${l.ask}`}</button>
                <button className={'seg sg-want' + (p?.mode === 'trade' ? ' on' : '')}
                  title="into your pile as a trade-for — you pick your side at settle"
                  onClick={() => pickUp(open.id, c.uid, 'trade')}>{p?.mode === 'trade' ? '✓ trade' : '⇄ trade'}</button>
              </div>
              <div className={'card' + (p ? ' s-have' : '')} role="button" tabIndex={0} title="hold it up to the light"
                onClick={() => setZoom({ c, l, sellerId: open.id })}>
                <div className="face"><div className="ja">{c.name_en}</div></div>
                {c.image && <img src={c.image} alt={c.name_en} loading="lazy" decoding="async" />}
              </div>
              <div className="caption" onClick={() => setZoom({ c, l, sellerId: open.id })}>
                <div className="cap-top"><span className="cnum">{c.num}</span><span className="cja">{c.name_en}{myWants.has(c.uid) ? ' ★' : ''}</span></div>
                <div className="cap-sub">
                  <span className="crom">{scanLabel(l.witness)}</span>
                  <span className={'cmeta ' + (p ? 'm-have' : 'm-want')}>{l.ask} USDC</span>
                </div>
              </div>
            </div>
          )
        })}
        {!sectionRows.length && <div className="empty">{emptyText}</div>}
      </div>
    )
    return (
      <div className="mk">
        {roomNote}
        {ankoBar}
        {ankoPanel}
        {msgEl}
        {zoomEl}
        <div className="mk-head">
          <div className="mk-seller">
            <Avatar seed={open.id} size={40} />
            <div>
              <div className="mk-handle">{handleFor(open.id)}{open.live && <span className="mk-livetag mono"> ● live</span>}</div>
              <div className="mono dim mk-sub">{shortId(open.id)} · {open.live ? `page updated ${open.joined}` : `at the market since ${open.joined}`}</div>
            </div>
          </div>
          <button className="ghost sm" onClick={() => { setSel(null); setWantsOnly(false) }}>← all tables</button>
        </div>
        {open.bio && <p className="mk-bio">{open.bio}</p>}
        {open.live
          ? open.recordStats?.length > 0 && (
            <div className="pf-record mono">
              {open.recordStats.map((st, i) => <span key={i} className="pf-stat">{st.t}</span>)}
              <span className="pf-stat dim">their page&rsquo;s tally — carried, not checked</span>
            </div>
          )
          : (open.record || open.joined) && (
          <div className="pf-record mono">
            {open.record?.since && <span className="pf-stat">at the market since {open.record.since}</span>}
            {open.record?.settled > 0 && <span className="pf-stat rec">{open.record.settled} settled</span>}
            {witnessed > 0 && <span className={'pf-stat' + (witnessed === open.listings.length ? ' rec' : '')}>{witnessed === open.listings.length ? 'every listing scanned' : `${witnessed}/${open.listings.length} listings scanned`}</span>}
          </div>
        )}
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
          <button className={'chip' + (tableSort ? ' on' : '')}
            onClick={() => setTableSort(tableSort === 'price_desc' ? 'price_asc' : tableSort === 'price_asc' ? null : 'price_desc')}
            title="sort by ask">price {tableSort === 'price_desc' ? '↓' : tableSort === 'price_asc' ? '↑' : '⇅'}</button>
        </div>
        {displayRows.length > 0 && <>
          <div className="mk-sectionhead"><span className="ek">Display case</span><span className="mono dim">the cards they lead with</span></div>
          {cardGrid(displayRows, '')}
        </>}
        <div className="mk-sectionhead"><span className="ek">Binder</span><span className="mono dim">everything else on their table</span></div>
        {cardGrid(binderRows, displayRows.length ? 'Every matching card is in the display case.' : 'Nothing on this table matches your wants.')}
        {theirWants.length > 0 && (
          !huntOpen
            ? <button className="mk-huntbar mono" onClick={() => setHuntOpen(true)}>
                ⌕ they&rsquo;re hunting {theirWants.length} card{theirWants.length === 1 ? '' : 's'}{swapBait.length ? ` — you hold ${swapBait.length} ✓` : ''} · view
              </button>
            : <div className="mk-hunting2">
                <div className="mk-hunt2head">
                  <span className="ek">They&rsquo;re hunting</span>
                  <span>
                    {swapBait.length > 0 && <span className="mono mk-hunt2bait">you hold {swapBait.length} of these — lead with it · </span>}
                    <button className="stl-clear mono" onClick={() => setHuntOpen(false)}>fold</button>
                  </span>
                </div>
                <div className="mk-hunt2row">
                  {theirWants.map((c) => (
                    <div key={c.uid} className={'mk-hunt2' + (myHaves.has(c.uid) ? ' mine' : '')}>
                      {c.image ? <img src={c.image} alt="" loading="lazy" /> : <span className="ofr-noimg">{c.name_en}</span>}
                      <span className="mk-hunt2name">{c.name_en}</span>
                      {myHaves.has(c.uid) && <span className="mono mk-hunt2have">✓ you have it</span>}
                    </div>
                  ))}
                </div>
              </div>
        )}
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
            {(() => {
              const pileVal = pile.reduce((t, p) => {
                const l = open.listings.find((x) => x.uid === p.uid)
                return t + (p.mode === 'buy' ? (l?.ask ?? 0) : (salesAll[p.uid]?.[0]?.p ?? l?.ask ?? 0))
              }, 0)
              if (!pileVal || !myTradeSum) return null
              const pct = Math.round((myTradeSum / pileVal) * 100)
              return <span className="mono mk-ckwhisper" title="their side by asks and settlements, yours by settlements only — history, not an appraisal">
                {pct >= 100
                  ? `⇄ your tradeables (~${myTradeSum} USDC on record) more than cover this pile (~${pileVal})`
                  : `⇄ your tradeables ~${myTradeSum} USDC on record · covers ~${pct}% of this pile`}</span>
            })()}
            <span className="mk-ckacts">
              {pile.every((p) => p.mode === 'buy') && buysSum > 0 && (
                <button className="primary mk-settle" onClick={() => {
                  sendOffer(offersKeyFor(catalog.id, accountId), { to: open.id, want: pile.map((p) => ({ uid: p.uid })), give: [], cash: { side: 'from', amount: buysSum }, note: null, live: open.live, from: accountId, cat: catalog.id })
                  clearPile(pileKey, open.id)
                  setSwapMsg(open.live
                    ? `paid their asks — the deal went to ${handleFor(open.id)}'s inbox. A real person answers this one; watch Trades.`
                    : `paid their asks — ${buysSum} USDC for ${pile.length} card${pile.length === 1 ? '' : 's'} to ${handleFor(open.id)}. Watch Trades.`)
                }}>Pay their asks · {buysSum} →</button>
              )}
              <button className={pile.every((p) => p.mode === 'buy') && buysSum > 0 ? 'ghost sm' : 'primary mk-settle'} onClick={() => setSettling(true)}>Settle up{pile.every((p) => p.mode === 'buy') && buysSum > 0 ? '' : ` · ${pile.length}`} →</button>
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
      {roomNote}
      {ankoBar}
      {ankoPanel}
      {msgEl}
      {zoomEl}
      <div className="mk-head">
        <div>
          <div className="ek">The market</div>
          <div className="mk-title">{allSellers.length} tables open{liveSellers.length ? ` · ${liveSellers.length} live` : ''}</div>
        </div>
      </div>
      <div className="mk-grid">
        {[...allSellers].sort((a, b) => ((b.live ? 1 : 0) - (a.live ? 1 : 0)) || (aisleMatch
          ? b.listings.filter((l) => aisleMatch.has(l.uid)).length - a.listings.filter((l) => aisleMatch.has(l.uid)).length
          : 0)).map((s) => {
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
                  <div className="mk-handle">{handleFor(s.id)}{s.live && <span className="mk-livetag mono"> ● live</span>}</div>
                  <div className="mono dim mk-sub">{shortId(s.id)}{s.live ? '' : ' · sample'}</div>
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
