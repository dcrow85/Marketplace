import { useEffect, useMemo, useState } from 'react'
import { storeKeyFor, loadStore, entryFor } from '../binder/collection.js'
import { useCatalog, useMarket, useByUid } from '../lib/data.js'
import { useBus } from '../lib/store.js'
import { loadHidden, hiddenKeyFor, loadMockSales, mockSalesKeyFor } from './mockAgents.js'
import { fetchProfiles, fetchProfile } from '../live/pilotStore.js'
import { applyAgentFilter } from '../binder/agentFilter.js'
import { retryImg } from '../binder/helpers.jsx'
import { pileKeyFor, loadPiles, addToPile, removeFromPile, toggleMode, clearPile } from './pile.js'
import MarketFinds from './MarketFinds.jsx'
import SettlePage from './SettlePage.jsx'
import BuyNow from './BuyNow.jsx'
import CardZoom from './CardZoom.jsx'
import MiniCard from '../components/MiniCard.jsx'
import AskAnko from '../trade/AskAnko.jsx'
import { handleFor, avatarSVG } from '../identity.js'
import { cleanProfilePhoto } from '../profile/profilePhoto.js'
import { cleanPayPalHandle, sellerAcceptsPayPal } from '../payments/rails.js'
import './market.css'

// The market: other people's tables, run like a card show. You pick cards up (zoom)
// and drop them on YOUR PILE tagged buy or trade. A pile entirely at posted asks can
// go straight to payment; changed prices and trade cards become one offer. Everything
// shown is a CLAIM; the witness counts say what's recorded behind it.
const API_BASE = import.meta.env.VITE_API_BASE || ''
const SCAN_REQUEST_USDC = 10
const SAMPLE_PAYPAL_HANDLE = cleanPayPalHandle(import.meta.env.VITE_SAMPLE_PAYPAL_HANDLE) || 'CairnDemo'

function Avatar({ seed, size = 26, photo = '' }) {
  if (photo) return <span className="av"><img src={photo} width={size} height={size} alt="" /></span>
  return <span className="av" dangerouslySetInnerHTML={{ __html: avatarSVG(seed, size) }} />
}

function witnessCell(w) {
  if (!w) return null
  return <span className="mono mk-wit ok" title={`${w} pile scan${w === 1 ? '' : 's'} recorded — a witness, not proof`}>✓ {w} scan{w === 1 ? '' : 's'}</span>
}

function MissingPhotosButton({ card, ask, onOpen }) {
  if (Number(ask) <= SCAN_REQUEST_USDC) return null
  const label = `Seller photos needed for ${card.name_en} at ${ask} USDC`
  return <button type="button" className="mk-wit catalog mk-photo-warning"
    aria-label={label} title={`${label} — see what to do`}
    onClick={(event) => { event.stopPropagation(); onOpen() }}>!</button>
}

// A published page, read back as a table: the same seller shape the mock market uses,
// so the pile, the deal, and the Settle room work unchanged. Everything on it is the
// collector's own claim, carried from their page — so no green here, and no 'record'.
const profileToSeller = (p) => ({
  id: p.addr,
  handle: typeof p.handle === 'string' ? p.handle.trim().slice(0, 32) : '',
  photo: cleanProfilePhoto(p.photo),
  live: true,
  joined: p.updated ? new Date(p.updated).toISOString().slice(0, 10) : null,
  bio: p.sign || '',
  listings: (p.table || []).filter((t) => t && t.uid).map((t) => ({
    uid: t.uid, ask: Number(t.ask) || 0, cond: t.cond || 'their claim', witness: t.scans || 0, copies: t.copies || 1,
  })),
  wants: p.wants || [],
  showcase: p.showcase || [],
  recordStats: Array.isArray(p.record) ? p.record : [],
  payment: p.payment && typeof p.payment === 'object' ? p.payment : null,
})

const sellerName = (seller) => seller?.handle || handleFor(seller?.id)

// buy · 9 USDC / ⇄ trade — both just drop the card on your pile, tagged. Nothing sends.
function PileButtons({ ask, inPile, mode, onBuy, onTrade }) {
  return (
    <span className="ofr-acts ofr-pileacts">
      <button type="button" className={'ofr-buy' + (inPile && mode === 'buy' ? ' on' : '')}
        onClick={(ev) => { ev.stopPropagation(); onBuy() }}
        title="into your pile at the ask — review and pay when the pile is ready">
        {inPile && mode === 'buy' ? '✓ In pile' : <><span className="ofr-wide-label"><span>Buy</span><small>{ask} USDC</small></span><span className="ofr-phone-label">Buy ${ask}</span></>}</button>
      <button type="button" className={'ofr-tradebtn' + (inPile && mode === 'trade' ? ' on' : '')}
        onClick={(ev) => { ev.stopPropagation(); onTrade() }}
        title="into your pile as a trade-for — you pick your side at checkout">
        {inPile && mode === 'trade' ? '✓ Trade' : '⇄ Trade'}</button>
    </span>
  )
}

function MarketBagBar({ orders, cardCount, cashTotal, onOpen }) {
  if (!orders.length) return null
  return <aside className="mk-bagbar" aria-label="Piles across the market">
    <span className="mk-bagbarcopy">
      <span className="mono mk-bageyebrow">Across the market</span>
      <strong>{cardCount} card{cardCount === 1 ? '' : 's'} at {orders.length} table{orders.length === 1 ? '' : 's'}</strong>
      {cashTotal > 0 && <small><span className="money mono">{cashTotal} USDC</span> in listed-price buys</small>}
    </span>
    <button type="button" className="primary mk-bagopen" onClick={onOpen}>
      {orders.length > 1 ? 'Settle all' : 'Settle pile'} <span aria-hidden="true">→</span>
    </button>
  </aside>
}

function MarketBag({ orders, cardCount, cashTotal, byUid, onBack, onOpenOrder }) {
  return <div className="mk mk-bagroom">
    <div className="mk-head mk-baghead">
      <div>
        <div className="ek">Settle all</div>
        <div className="mk-title">Your market piles</div>
      </div>
      <button type="button" className="ghost sm" onClick={onBack}>← keep browsing</button>
    </div>
    {orders.length ? <>
      <div className="mk-bagsummary">
        <span><b>{orders.length}</b><small>seller order{orders.length === 1 ? '' : 's'}</small></span>
        <span><b>{cardCount}</b><small>card{cardCount === 1 ? '' : 's'}</small></span>
        <span className="cash"><b className="money mono">{cashTotal} USDC</b><small>listed-price buys</small></span>
      </div>
      <p className="mk-bagtruth">One clear stop, separate checkouts. Review and finish each seller order on its own—Cairn never combines payments or silently sends the next one.</p>
      <div className="mk-bagorders">
        {orders.map((order) => <section className="mk-bagorder" key={order.seller.id}>
          <div className="mk-bagidentity">
            <Avatar seed={order.seller.id} size={34} photo={order.seller.photo} />
            <span><strong>{sellerName(order.seller)}</strong><small>{order.seller.live ? '● live table' : 'sample table'}</small></span>
          </div>
          <div className="mk-bagthumbs" aria-label={`${order.pile.length} selected cards`}>
            {order.pile.slice(0, 5).map((item) => {
              const card = byUid.get(item.uid)
              return card?.image ? <img key={item.uid} src={card.image} alt={card.name_en || ''} /> : null
            })}
            {order.pile.length > 5 && <span className="mono">+{order.pile.length - 5}</span>}
          </div>
          <div className="mk-bagterms">
            <span><b>{order.pile.length} card{order.pile.length === 1 ? '' : 's'}</b><small>{order.buyCount} buy · {order.tradeCount} trade</small></span>
            {order.buyTotal > 0 && <strong className="money mono">{order.buyTotal} USDC</strong>}
          </div>
          <div className={'mk-bagpath ' + (order.canCheckout ? 'direct' : 'offer')}>
            <b>{order.canCheckout ? 'Checkout' : 'Offer'}</b>
            <small>{order.canCheckout ? 'listed price · no seller reply' : 'review terms · seller reply required'}</small>
          </div>
          <button type="button" className={order.canCheckout ? 'primary mk-baggo money-action' : 'ghost mk-baggo'}
            onClick={() => onOpenOrder(order)}>{order.canCheckout ? `Pay ${order.buyTotal} USDC` : 'Review offer'} →</button>
        </section>)}
      </div>
    </> : <div className="mk-bagempty">
      <strong>Every pile is clear.</strong>
      <p>There is nothing else waiting to settle.</p>
      <button type="button" className="primary" onClick={onBack}>Back to the market</button>
    </div>}
  </div>
}

export default function Market({ accountId, agentName = 'Anko', catalog, focusUid, onClearFocus }) {
  const data = useCatalog(catalog)
  const mkt = useMarket(catalog)
  const [sel, setSel] = useState(null) // seller id whose table is open
  const [wantsOnly, setWantsOnly] = useState(false)
  const [settling, setSettling] = useState(false) // the Settle page, its own room
  const [buyingNow, setBuyingNow] = useState(false) // posted-ask checkout, in its own room
  const [swapMsg, setSwapMsg] = useState(null)
  const [zoom, setZoom] = useState(null) // {c, l, sellerId} — the card held up to the light
  const [evidenceTip, setEvidenceTip] = useState(null) // high-value catalogue-only listing needing a next step
  const [aq, setAq] = useState('')
  const [abusy, setAbusy] = useState(false)
  const [ares, setAres] = useState(null) // Anko's market answer: find tiles or a table-narrowing filter
  const [tableSort, setTableSort] = useState(null) // 'price_desc' | 'price_asc' | null
  const [focusSort, setFocusSort] = useState('price_asc') // every public copy of one card
  const [witnessedOnly, setWitnessedOnly] = useState(false)
  const [huntOpen, setHuntOpen] = useState(false)
  const [offerCashSeed, setOfferCashSeed] = useState(null)
  const [offerNoteSeed, setOfferNoteSeed] = useState('')
  const [pendingSellerFlow, setPendingSellerFlow] = useState(null)
  const [bagOpen, setBagOpen] = useState(false)
  const [returnToBag, setReturnToBag] = useState(false)
  const storeKey = storeKeyFor(catalog.id, accountId)
  const pileKey = pileKeyFor(catalog.id, accountId)
  const store = useBus(() => loadStore(storeKey), [storeKey])
  const piles = useBus(() => loadPiles(pileKey), [pileKey])

  useEffect(() => { setSettling(false); setBuyingNow(false); setHuntOpen(false); setWitnessedOnly(false); setOfferCashSeed(null); setOfferNoteSeed('') }, [sel]) // eslint-disable-line react-hooks/set-state-in-effect -- new table, checkout + hunting fold
  useEffect(() => {
    if (settling || buyingNow) window.scrollTo({ top: 0, behavior: 'auto' })
  }, [settling, buyingNow]) // checkout is a new room; always begin at its heading
  useEffect(() => {
    if (!pendingSellerFlow || pendingSellerFlow.sellerId !== sel) return
    /* eslint-disable react-hooks/set-state-in-effect -- a focused-card action lands only after its seller table becomes current */
    setOfferCashSeed(pendingSellerFlow.cash ?? null)
    setOfferNoteSeed(pendingSellerFlow.note || '')
    setSettling(pendingSellerFlow.flow === 'offer')
    setBuyingNow(pendingSellerFlow.flow === 'buy')
    setPendingSellerFlow(null)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pendingSellerFlow, sel])
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
  useEffect(() => { setSel(null); setBagOpen(false); setReturnToBag(false) }, [catalog]) // eslint-disable-line react-hooks/set-state-in-effect -- new catalog, no table or market bag open

  const byUid = useByUid(data)
  const marketNeedle = aq.trim().toLowerCase()
  const cardMatchesSearch = (c) => !marketNeedle || [c?.name_en, c?.name_ja, c?.romaji, c?.num, c?.element, c?.rarity]
    .filter(Boolean).join(' ').toLowerCase().includes(marketNeedle)
  const sellers = useBus(() => {
    if (!mkt) return []
    const hidden = loadHidden(hiddenKeyFor(catalog.id, accountId))
    const gone = new Set(hidden.map((h) => h.seller + '|' + h.uid))
    return mkt.sellers.map((sl) => ({
      ...sl,
      payment: sellerAcceptsPayPal(sl) ? sl.payment : {
        ...(sl.payment || {}),
        paypal: { enabled: true, handle: SAMPLE_PAYPAL_HANDLE, currency: 'USD', mode: 'sandbox_api', demo: true },
      },
      listings: sl.listings.filter((l) => !gone.has(sl.id + '|' + l.uid)),
    }))
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
  const visibleTables = allSellers.filter((seller) => !marketNeedle || [sellerName(seller), seller.id, seller.bio]
    .filter(Boolean).join(' ').toLowerCase().includes(marketNeedle)
    || seller.listings.some((listing) => cardMatchesSearch(byUid.get(listing.uid))))
  const directFinds = marketNeedle
    ? allSellers.flatMap((seller) => seller.listings
      .map((l) => ({ c: byUid.get(l.uid), l, seller }))
      .filter(({ c }) => c && cardMatchesSearch(c)))
      .sort((a, b) => a.l.ask - b.l.ask || sellerName(a.seller).localeCompare(sellerName(b.seller)))
    : []
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
  const returnToPile = () => {
    setSettling(false)
    setBuyingNow(false)
    if (returnToBag) {
      setReturnToBag(false)
      setSel(null)
      setBagOpen(true)
      return
    }
    window.requestAnimationFrame(() => document.getElementById('market-pile')?.scrollIntoView({ block: 'center' }))
  }
  const visitSellerPile = (sellerId, flow = 'table', cash = null, note = '') => {
    setZoom(null)
    setEvidenceTip(null)
    setPendingSellerFlow({ sellerId, flow, cash, note })
    onClearFocus?.()
    setSel(sellerId)
  }
  const askAnko = async () => {
    const call = aq.trim()
    if (!call || abusy) return
    setAbusy(true)
    try {
      const r = await fetch(API_BASE + '/api/browse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ call, catalog: catalog.id }) })
      setAres({ ok: r.ok, data: await r.json() })
    } catch { setAres({ ok: false, data: { error: 'network' } }) }
    finally { setAbusy(false) }
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
    return out.sort((a, b) => a.l.ask - b.l.ask).map((item) => ({ ...item, tableName: sellerName(allSellers.find((seller) => seller.id === item.sellerId)) }))
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
  const aisleFinds = useMemo(() => {
    if (!aisleMatch) return []
    return allSellers.flatMap((seller) => seller.listings
      .filter((l) => aisleMatch.has(l.uid))
      .map((l) => ({ c: byUid.get(l.uid), sellerId: seller.id, tableName: sellerName(seller), l })))
      .filter(({ c }) => c)
      .sort((a, b) => a.l.ask - b.l.ask || a.tableName.localeCompare(b.tableName))
  }, [aisleMatch, allSellers, byUid])

  if (!data || !mkt) return <div className="empty">Opening the market…</div>
  if (!allSellers.length) return <div className="empty">No tables in this catalog yet.</div>

  const open = allSellers.find((s) => s.id === sel)
  const pileOf = (sellerId) => piles[sellerId] || []
  const inPile = (sellerId, uid) => pileOf(sellerId).find((x) => x.uid === uid)
  const marketOrders = allSellers.map((seller) => {
    const pile = pileOf(seller.id)
    const buyCount = pile.filter((item) => item.mode === 'buy').length
    const tradeCount = pile.length - buyCount
    const buyTotal = pile.reduce((total, item) => item.mode === 'buy'
      ? total + (Number(seller.listings.find((listing) => listing.uid === item.uid)?.ask) || 0)
      : total, 0)
    return {
      seller, pile, buyCount, tradeCount, buyTotal,
      // Accepting unchanged posted asks is checkout even when the seller still
      // needs to expose a usable payment rail. Missing payment setup must not
      // silently turn a purchase into a negotiable offer.
      canCheckout: pile.length > 0 && tradeCount === 0 && buyTotal > 0,
    }
  }).filter((order) => order.pile.length > 0)
  const marketBagCards = marketOrders.reduce((total, order) => total + order.pile.length, 0)
  const marketBagCash = marketOrders.reduce((total, order) => total + order.buyTotal, 0)
  const openBagOrder = (order) => {
    setBagOpen(false)
    setReturnToBag(true)
    visitSellerPile(order.seller.id, order.canCheckout ? 'buy' : 'offer')
  }
  const bagBar = <MarketBagBar orders={marketOrders} cardCount={marketBagCards} cashTotal={marketBagCash} onOpen={() => setBagOpen(true)} />

  if (bagOpen) return <MarketBag orders={marketOrders} cardCount={marketBagCards} cashTotal={marketBagCash}
    byUid={byUid} onBack={() => setBagOpen(false)} onOpenOrder={openBagOrder} />

  const ankoBar = (
    <div className="askbar mk-askbar">
      <img className={'anko-search' + (abusy ? ' busy' : '')} src={(import.meta.env.BASE_URL || '/') + 'agent/anko-avatar-v1.png'}
        alt="" title={`${agentName} — your agent at the show`} onError={(e) => { e.currentTarget.style.display = 'none' }} />
      <input value={aq} maxLength={280} placeholder={`Search cards or tables — or ask ${agentName}…`}
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
            onAddPile={({ seller, uid, mode }) => { pickUp(seller, uid, mode); setSwapMsg(`added to your pile at ${sellerName(allSellers.find((table) => table.id === seller))}'s table.`) }} onDismiss={() => setAres(null)} />
        : aisleMatch
          ? <MarketFinds agentName={agentName} reading={ares.data.filter?.reading || ares.data.result?.commentary}
              finds={aisleFinds} mode="buy"
              onAddPile={({ seller, uid, mode }) => { pickUp(seller, uid, mode); setSwapMsg(`added to your pile at ${sellerName(allSellers.find((table) => table.id === seller))}'s table.`) }}
              onDismiss={() => setAres(null)} />
          : null
  )
  const zoomDecision = zoom?.l ? {
    decision_ref: `listing:${catalog.id}:${zoom.sellerId}:${zoom.c.uid}:${zoom.l.ask}:${zoom.l.witness || 0}`,
    kind: 'listing_evidence',
    question: 'What can I reasonably conclude from the evidence behind this listing before I buy or make an offer?',
    terms: { seller: zoom.sellerId, uid: zoom.c.uid, card: zoom.c.name_en, ask_usdc: zoom.l.ask, seller_condition_claim: zoom.l.cond },
    principal_context: { recorded_policy: Number(zoom.l.ask) > SCAN_REQUEST_USDC ? 'A fresh scan is requested for listings over 10 USDC.' : 'A fresh scan is optional for listings at 10 USDC or less.' },
    evidence: { recorded_scan_count: zoom.l.witness || 0, latest_recorded_settlement_usdc: salesAll[zoom.c.uid]?.[0]?.p ?? null, stock_catalog_image_only: !zoom.l.witness },
  } : null
  const chooseZoomPile = (mode, continueToPile = false) => {
    if (!zoom?.l || !zoom.sellerId) return
    const seller = allSellers.find((candidate) => candidate.id === zoom.sellerId)
    pickUp(zoom.sellerId, zoom.c.uid, mode)
    setSwapMsg(`${zoom.c.name_en} is in your pile at ${sellerName(seller)}'s table.`)
    if (continueToPile) visitSellerPile(zoom.sellerId, mode === 'buy' ? 'buy' : 'table')
    else setZoom(null)
  }
  const actionsForZoomRead = (read) => {
    if (!zoom?.l || !zoom.sellerId) return []
    const sellerId = zoom.sellerId
    const uid = zoom.c.uid
    const seller = allSellers.find((candidate) => candidate.id === sellerId)
    const stagedPile = pileOf(sellerId).some((item) => item.uid === uid)
      ? pileOf(sellerId).map((item) => item.uid === uid ? { ...item, mode: 'buy' } : item)
      : [...pileOf(sellerId), { uid, mode: 'buy' }]
    const suggestedCounter = Math.round(stagedPile.reduce((total, item) => {
      const listing = seller?.listings.find((candidate) => candidate.uid === item.uid)
      return total + (salesAll[item.uid]?.[0]?.p ?? (Number(listing?.ask) || 0) * .9)
    }, 0) * 100) / 100
    const stageAndVisit = (flow, cash = null, note = '') => {
      pickUp(sellerId, uid, 'buy')
      visitSellerPile(sellerId, flow, cash, note)
    }
    const keepBrowsing = { id: 'keep-browsing', label: 'Keep browsing', onSelect: () => setZoom(null) }
    if (read.lean === 'accept') return [{
      id: 'continue-buy', label: `Continue with buy · ${zoom.l.ask} USDC`, primary: true,
      onSelect: () => stageAndVisit('buy'),
    }, keepBrowsing]
    if (read.lean === 'counter') return [{
      id: 'counter-listing', kind: 'amount', label: stagedPile.length > 1 ? `Offer for all ${stagedPile.length} cards` : 'Make an offer at',
      amount: suggestedCounter, confirmLabel: 'Open offer',
      hint: 'A record-based starting point where one exists; otherwise 10% below the ask. You can edit it first.',
      onConfirm: (amount) => stageAndVisit('offer', String(amount)),
    }, keepBrowsing]
    if (read.lean === 'request_evidence') return [{
      id: 'request-listing-evidence', label: 'Ask the seller for fresh scans', primary: true,
      onSelect: () => stageAndVisit('offer', null, `Before we settle, please add fresh front, back, corners, and holo-tilt photos for ${zoom.c.name_en}.`),
    }, keepBrowsing]
    return [keepBrowsing]
  }
  const zoomEl = zoom && (
    <CardZoom card={zoom.c} sub={zoom.l ? <><span className="money mono">{zoom.l.ask} USDC</span> · {zoom.l.cond}</> : null} witness={zoom.l ? zoom.l.witness : null}
      ask={zoom.l?.ask} decision={zoomDecision} actionsForRead={actionsForZoomRead} onClose={() => setZoom(null)}>
      {zoom.l && zoom.sellerId && (
        <PileButtons ask={zoom.l.ask}
          inPile={!!inPile(zoom.sellerId, zoom.c.uid)} mode={inPile(zoom.sellerId, zoom.c.uid)?.mode}
          onBuy={() => chooseZoomPile('buy')}
          onTrade={() => chooseZoomPile('trade')} />
      )}
    </CardZoom>
  )
  const evidenceTipEl = evidenceTip && (() => {
    const seller = allSellers.find((candidate) => candidate.id === evidenceTip.sellerId)
    const askForPhotos = () => {
      pickUp(evidenceTip.sellerId, evidenceTip.c.uid, 'buy')
      visitSellerPile(evidenceTip.sellerId, 'offer', null,
        `Before we settle, please add fresh front, back, corners, and holo-tilt photos for ${evidenceTip.c.name_en}.`)
    }
    return <section className="mk-photo-tip" role="dialog" aria-label={`Seller photos needed for ${evidenceTip.c.name_en}`}>
      <button className="mk-photo-tipclose" type="button" onClick={() => setEvidenceTip(null)} aria-label="Close">✕</button>
      <div className="mk-photo-tipflag mono"><span aria-hidden="true">!</span> Seller photos needed</div>
      <strong>{evidenceTip.c.name_en} · <span className="money mono">{evidenceTip.l.ask} USDC</span></strong>
      <p>This listing shows catalogue art, not photos of the seller&rsquo;s copy. Ask for fresh views before deciding.</p>
      <div className="mk-photo-tipactions">
        <button className="primary" type="button" onClick={askForPhotos}>Ask for photos in offer →</button>
        <button className="ghost" type="button" onClick={() => { setZoom(evidenceTip); setEvidenceTip(null) }}>View card</button>
      </div>
      <small className="mono">Nothing is sent until you review and send the offer.</small>
      {seller && <small className="mono">Seller: {sellerName(seller)}</small>}
    </section>
  })()
  const msgEl = swapMsg && <button className="mk-swapmsg mono" onClick={() => setSwapMsg(null)}>{swapMsg} ✕</button>
  const roomNote = (
    <div className="mk-samplenote mono">{open?.live
      ? <><span className="mk-livetag">● live</span> {sellerName(open)} is a real collector in the pilot — a deal here goes to their inbox.</>
      : liveSellers.length
        ? <>tables marked <span className="mk-livetag">● live</span> are real collectors — deals there reach a real inbox. the rest are sample sellers for shaping the browse.</>
        : 'sample tables — mock sellers, for shaping the browse. nothing here is a real offer.'}</div>
  )

  // ---- by-card focus: everyone asking on one card ----
  if (focusUid) {
    const c = byUid.get(focusUid)
    const asks = allSellers.flatMap((s) => s.listings.filter((l) => l.uid === focusUid).map((l) => ({ s, l })))
    const totalCopies = asks.reduce((total, { l }) => total + Math.max(1, Number(l.copies) || 1), 0)
    const sortedAsks = [...asks].sort((a, b) => {
      if (focusSort === 'price_desc') return b.l.ask - a.l.ask || sellerName(a.s).localeCompare(sellerName(b.s))
      if (focusSort === 'evidence') return (b.l.witness || 0) - (a.l.witness || 0) || a.l.ask - b.l.ask
      if (focusSort === 'copies') return (b.l.copies || 1) - (a.l.copies || 1) || a.l.ask - b.l.ask
      return a.l.ask - b.l.ask || sellerName(a.s).localeCompare(sellerName(b.s))
    })
    return (
      <div className="mk">
        {roomNote}
        {ankoBar}
        {ankoPanel}
        {msgEl}
        {evidenceTipEl}
        {zoomEl}
        {bagBar}
        <div className="mk-head mk-cardhead">
          <div className="mk-focushead">
            {c?.image && <img className="mk-focusart" src={c.image} alt="" onError={(ev) => retryImg(ev, c.image)} onClick={() => setZoom({ c, l: asks[0]?.l, sellerId: asks[0]?.s.id })} />}
            <div>
              <div className="ek">On the market</div>
              <div className="mk-title">{c ? `${c.name_en} · ${c.num}` : focusUid}
                <span className="dim"> · {totalCopies} public cop{totalCopies === 1 ? 'y' : 'ies'} · {asks.length} seller{asks.length === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>
          <button className="ghost sm" onClick={onClearFocus}>← all tables</button>
        </div>
        {asks.length > 1 && <div className="mk-focus-tools" aria-label="Sort available copies">
          <span className="mono dim">sort copies</span>
          <button className={focusSort === 'price_asc' ? 'on' : ''} onClick={() => setFocusSort('price_asc')}>price low</button>
          <button className={focusSort === 'price_desc' ? 'on' : ''} onClick={() => setFocusSort('price_desc')}>price high</button>
          <button className={focusSort === 'evidence' ? 'on' : ''} onClick={() => setFocusSort('evidence')}>scans first</button>
          <button className={focusSort === 'copies' ? 'on' : ''} onClick={() => setFocusSort('copies')}>most copies</button>
        </div>}
        {asks.length
          ? <div className="mk-rows">
              {sortedAsks.map(({ s, l }, i) => (
                <div key={`${s.id}:${focusUid}:${i}`} className={'mk-row mk-focus-row' + (myWants.has(focusUid) ? ' mk-mine' : '')}>
                  <button className="mk-who" onClick={() => { onClearFocus(); setSel(s.id) }} title="visit their table">
                    <Avatar seed={s.id} size={20} photo={s.photo} /><span>{sellerName(s)}</span>
                  </button>
                  <span className="mk-name">{myWants.has(focusUid) && <span className="mk-wantflag">your want</span>}
                    <span className="mono mk-copycount">{Math.max(1, Number(l.copies) || 1)} cop{Math.max(1, Number(l.copies) || 1) === 1 ? 'y' : 'ies'}</span>
                  </span>
                  <span className="mono mk-cond" title="the seller's claim — the protocol records it, it does not verify it">{l.cond}</span>
                  {l.witness
                    ? <button className="mk-evidence" onClick={() => setZoom({ c, l, sellerId: s.id })}
                        title="open this listing's card and evidence read">{witnessCell(l.witness)}</button>
                    : <span className="mk-evidence-slot"><MissingPhotosButton card={c} ask={l.ask}
                        onOpen={() => setEvidenceTip({ c, l, sellerId: s.id })} /></span>}
                  <span className="mono mk-ask">{l.ask} USDC</span>
                  <PileButtons ask={l.ask}
                    inPile={!!inPile(s.id, focusUid)} mode={inPile(s.id, focusUid)?.mode}
                    onBuy={() => { pickUp(s.id, focusUid, 'buy'); setSwapMsg(`in your pile at ${sellerName(s)}'s table — finish the deal there.`) }}
                    onTrade={() => { pickUp(s.id, focusUid, 'trade'); setSwapMsg(`in your pile at ${sellerName(s)}'s table — finish the deal there.`) }} />
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
        initialCash={offerCashSeed} initialNote={offerNoteSeed}
        onBack={returnToPile}
        onSent={({ evidenceRequestIncluded } = {}) => {
          setSettling(false)
          setSwapMsg(evidenceRequestIncluded
            ? `offer + evidence request sent to ${sellerName(open)} — watch Trades for their response.`
            : `offer sent to ${sellerName(open)} — watch Trades for their response.`)
          if (returnToBag) {
            setReturnToBag(false)
            setSel(null)
            setBagOpen(true)
          }
        }} />
    )
  }

  // ---- one seller's table ----
  if (open) {
    const pile = pileOf(open.id)
    const rows = open.listings
      .map((l) => ({ l, c: byUid.get(l.uid) }))
      .filter(({ c }) => c)
      .filter(({ c }) => cardMatchesSearch(c))
      .filter(({ c }) => !wantsOnly || myWants.has(c.uid))
      .filter(({ l }) => !witnessedOnly || l.witness)
      .sort((a, b) => tableSort === 'price_desc' ? b.l.ask - a.l.ask : tableSort === 'price_asc' ? a.l.ask - b.l.ask : 0)
    const total = open.listings.reduce((s, { ask, copies }) => s + ask * (copies || 1), 0)
    const scanRequested = open.listings.filter((l) => Number(l.ask) > SCAN_REQUEST_USDC)
    const requestedScanned = scanRequested.filter((l) => l.witness).length
    const wantsTheyHave = open.listings.filter((l) => myWants.has(l.uid)).length
    const theirWants = (open.wants || []).map((u) => byUid.get(u)).filter(Boolean)
    const swapBait = theirWants.filter((c) => myHaves.has(c.uid))
    const buysSum = pile.filter((p) => p.mode === 'buy').reduce((t, p) => t + (open.listings.find((l) => l.uid === p.uid)?.ask ?? 0), 0)
    const decisionPile = pile.slice(0, 24)
    const purchaseDecision = pile.length > 0 ? {
      decision_ref: `market:${catalog.id}:${open.id}:${pile.length}:${buysSum}:${pile.slice(0, 6).map((p) => p.uid).join(',')}`,
      kind: 'pre_purchase',
      question: pile.every((p) => p.mode === 'buy')
        ? 'Should I pay the posted asks now, change the terms, or request more evidence first?'
        : 'Should I send this buy/trade offer, revise it, or request more evidence first?',
      terms: {
        seller: open.id,
        live_table: !!open.live,
        cash_at_current_asks_usdc: buysSum,
        selected_card_count: pile.length,
        unitemized_card_count: Math.max(0, pile.length - decisionPile.length),
        selected_cards: decisionPile.map((p) => {
          const c = byUid.get(p.uid)
          const l = open.listings.find((x) => x.uid === p.uid)
          return {
            uid: p.uid, name: c?.name_en || p.uid, number: c?.num || null,
            mode: p.mode, ask_usdc: l?.ask ?? null, seller_condition_claim: l?.cond || null,
          }
        }),
      },
      principal_context: { recorded_policy: 'No signed buying or trade policy is available to this interface.' },
      evidence: {
        cards_without_recorded_scans: pile.filter((p) => !open.listings.find((l) => l.uid === p.uid)?.witness).length,
        cards_with_recorded_settlements: pile.filter((p) => salesAll[p.uid]?.[0]?.p != null).length,
        card_records: decisionPile.map((p) => {
          const l = open.listings.find((x) => x.uid === p.uid)
          return {
            uid: p.uid,
            recorded_scan_count: l?.witness || 0,
            latest_recorded_settlement_usdc: salesAll[p.uid]?.[0]?.p ?? null,
          }
        }),
        seller_record_claims: open.live ? (open.recordStats || []).map((x) => x.t) : (open.record || null),
      },
    } : null
    const purchaseReadRecommended = buysSum >= 500 || pile.some((p) => {
      const listing = open.listings.find((l) => l.uid === p.uid)
      return Number(listing?.ask) > SCAN_REQUEST_USDC && !listing?.witness
    })
    const canBuyNow = pile.length > 0 && pile.every((p) => p.mode === 'buy') && buysSum > 0
    const finishBuyNow = (result) => {
      setBuyingNow(false)
      setSwapMsg(result.rail === 'paypal'
        ? result.verified && result.sandbox
          ? `PayPal Sandbox confirmed the test capture · ${result.paymentRef}. No real money moved; the rehearsal is recorded in Trades.`
          : `Manual PayPal payment reported · ${result.paymentRef}. ${sellerName(open)} must confirm it in PayPal; follow the handoff in Trades.`
        : `funded in escrow · trade #${result.tradeId}. ${sellerName(open)} has been notified; follow delivery in Trades.`)
      if (returnToBag) {
        setReturnToBag(false)
        setSel(null)
        setBagOpen(true)
      }
    }
    if (buyingNow && canBuyNow) {
      return (
        <div className="mk buy-room">
          <button type="button" className="ghost sm buy-room-back" onClick={returnToPile}>← back to pile</button>
          <BuyNow open={open} pile={pile} total={buysSum} catalog={catalog} accountId={accountId}
            pileKey={pileKey} byUid={byUid} onBack={returnToPile} onComplete={finishBuyNow} />
        </div>
      )
    }
    const suggestedPileCounter = Math.round(Math.max(0, pile.reduce((total, item) => {
      const listing = open.listings.find((candidate) => candidate.uid === item.uid)
      return total + (salesAll[item.uid]?.[0]?.p ?? (Number(listing?.ask) || 0) * .9)
    }, 0)) * 100) / 100
    const actionsForPurchaseRead = (read) => {
      if (read.lean === 'counter') return [{
        id: 'open-counter', kind: 'amount', label: 'Make an offer at', amount: suggestedPileCounter,
        confirmLabel: 'Open offer', hint: 'A record-based starting point where settlements exist; otherwise 10% below the asks. Edit it first if you like.',
        onConfirm: (amount) => { setOfferCashSeed(String(amount)); setOfferNoteSeed(''); setSettling(true) },
      }]
      if (read.lean === 'request_evidence') return [{
        id: 'open-evidence-offer', label: 'Open offer with a scan request', primary: true,
        onSelect: () => { setOfferCashSeed(null); setOfferNoteSeed('Before we settle, please add fresh front, back, corners, and holo-tilt photos for the $10+ cards without scans.'); setSettling(true) },
      }]
      if (read.lean === 'accept' && canBuyNow) return [{ id: 'review-checkout', label: `Checkout · ${buysSum} USDC`, primary: true, onSelect: () => setBuyingNow(true) }]
      return []
    }
    const displayUids = new Set(open.showcase || [])
    const displayRank = new Map((open.showcase || []).map((uid, index) => [uid, index]))
    const displayRows = rows.filter(({ c }) => displayUids.has(c.uid))
      .sort((a, b) => (displayRank.get(a.c.uid) ?? Number.MAX_SAFE_INTEGER) - (displayRank.get(b.c.uid) ?? Number.MAX_SAFE_INTEGER))
    const binderRows = rows.filter(({ c }) => !displayUids.has(c.uid))
    const cardGrid = (sectionRows, emptyText, section = 'binder') => (
      <div className={`sp-tiles mk-public-tiles ${section}`} style={{ '--tilescale': section === 'display' ? 1.3 : 1 }}>
        {sectionRows.map(({ l, c }) => {
          const p = inPile(open.id, c.uid)
          return (
            <MiniCard key={c.uid} c={c} dim={aisleMatch && !aisleMatch.has(c.uid)}
              title="hold it up to the light" onTap={() => setZoom({ c, l, sellerId: open.id })}
              corner={<>{myWants.has(c.uid) ? <span className="mk-public-want mono">★ your want</span> : null}
                {!l.witness && <MissingPhotosButton card={c} ask={l.ask} onOpen={() => setEvidenceTip({ c, l, sellerId: open.id })} />}</>}
              sub={<>{c.num} · {l.cond || 'condition unlisted'}{l.witness ? <> · {witnessCell(l.witness)}</> : null}</>}
              actions={<PileButtons ask={l.ask} inPile={!!p} mode={p?.mode}
                onBuy={() => pickUp(open.id, c.uid, 'buy')}
                onTrade={() => pickUp(open.id, c.uid, 'trade')} />} />
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
        {evidenceTipEl}
        {zoomEl}
        <div className="mk-head">
          <div className="mk-seller">
            <Avatar seed={open.id} size={40} photo={open.photo} />
            <div>
              <div className="mk-handle">{sellerName(open)}{open.live && <span className="mk-livetag mono"> ● live</span>}</div>
              <div className="mono dim mk-sub">{open.live ? `page updated ${open.joined}` : `at the market since ${open.joined}`}
                {sellerAcceptsPayPal(open) && <span className="mk-paypal-tag"> · PayPal</span>}</div>
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
            {scanRequested.length > 0
              ? <span className={'pf-stat' + (requestedScanned === scanRequested.length ? ' rec' : '')}>{requestedScanned === scanRequested.length ? 'every $10+ listing scanned' : `${requestedScanned}/${scanRequested.length} $10+ listings scanned`}</span>
              : <span className="pf-stat dim">scans optional at current asks</span>}
          </div>
        )}
        <div className="mk-meter mono">
          <span>{rows.length === open.listings.length ? `${open.listings.length} listed` : `${rows.length} of ${open.listings.length} shown`} · <b className="money">{total} USDC asked</b></span>
          <span className={scanRequested.length && requestedScanned === scanRequested.length ? 'mk-wit ok' : requestedScanned ? '' : 'mk-wit none'}>
            {scanRequested.length ? `${requestedScanned} of ${scanRequested.length} requested scans` : 'scans optional at these asks'}
          </span>
          {wantsTheyHave > 0 && (
            <button className={'mk-wantsbtn' + (wantsOnly ? ' on' : '')} onClick={() => setWantsOnly(!wantsOnly)}>
              {wantsTheyHave} of your wants{wantsOnly ? ' ✕' : ' →'}
            </button>
          )}
          {scanRequested.length > requestedScanned && (
            <button className={'mk-wantsbtn' + (witnessedOnly ? ' on' : '')} onClick={() => setWitnessedOnly(!witnessedOnly)}>
              scanned only{witnessedOnly ? ' ✕' : ''}
            </button>
          )}
          <button className={'chip' + (tableSort ? ' on' : '')}
            onClick={() => setTableSort(tableSort === 'price_desc' ? 'price_asc' : tableSort === 'price_asc' ? null : 'price_desc')}
            title="sort by ask">price {tableSort === 'price_desc' ? '↓' : tableSort === 'price_asc' ? '↑' : '⇅'}</button>
        </div>
        {displayRows.length > 0 && <>
          <div className="pf-sechead mk-public-sechead"><span className="pf-sectiontitle"><span className="ek">Display case</span></span></div>
          {cardGrid(displayRows, '', 'display')}
        </>}
        <div className="pf-sechead mk-public-sechead"><span className="pf-sectiontitle"><span className="ek">Binder</span>
          <span className="mono dim">{binderRows.length} listed · asks are per copy</span></span></div>
        {cardGrid(binderRows, displayRows.length ? 'Every matching card is in the display case.' : 'Nothing on this table matches your wants.', 'binder')}
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
                      {c.image ? <img src={c.image} alt="" loading="lazy" decoding="async" onError={(ev) => retryImg(ev, c.image)} /> : <span className="ofr-noimg">{c.name_en}</span>}
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
                <span className="mk-name">{lot.name}<span className="mono mk-num">{lot.cards.length} cards · <b className="money">{lotTotal} USDC</b></span></span>
                <button className="sheetbtn mk-sm mono" onClick={() => lot.cards.forEach((x) => pickUp(open.id, x.uid, 'buy'))}>lot → pile</button>
              </div>
              <div className="mk-lotcards dim">{lot.cards.map((x) => byUid.get(x.uid)?.name_en || x.uid).join(' · ')}</div>
              {lot.note && <div className="mk-lotnote dim">{lot.note}</div>}
            </div>
          )
        })}
        {pile.length > 0 && (
          <div className="mk-checkout mk-pilebar" id="market-pile">
            <div className="mk-ckpile">
              <div className="mk-ckthumbs">
                {pile.map((p) => {
                  const c = byUid.get(p.uid)
                  return (
                    <span key={p.uid} className="mk-ckthumb" title={`${c?.name_en || p.uid} — tap the tag to flip buy/trade`}>
                      {c?.image ? <img src={c.image} alt="" loading="lazy" decoding="async" onError={(ev) => retryImg(ev, c.image)} /> : null}
                      <button className={'mk-cktag mono' + (p.mode === 'trade' ? ' tr' : '')} onClick={() => toggleMode(pileKey, open.id, p.uid)}>{p.mode === 'buy' ? '$' : '⇄'}</button>
                      <button className="mk-ckx mono" onClick={() => removeFromPile(pileKey, open.id, p.uid)} title="put it back">✕</button>
                    </span>
                  )
                })}
              </div>
              <div className="mk-cksummary">
                <span className="mono mk-ckeyebrow">Your pile</span>
                <span className="mk-cksum"><strong>{pile.length} card{pile.length === 1 ? '' : 's'}</strong>
                  {buysSum > 0 && <b className="mono mk-ckmoney">{buysSum} USDC</b>}</span>
                <small>{pile.filter((p) => p.mode === 'buy').length} buy · {pile.filter((p) => p.mode === 'trade').length} trade</small>
                <span className={'mono mk-ckpath' + (canBuyNow ? ' direct' : '')}>
                  {canBuyNow ? 'Listed price · no seller reply' : 'Offer · seller reply required'}
                </span>
                {(() => {
                  const pileVal = pile.reduce((t, p) => {
                    const l = open.listings.find((x) => x.uid === p.uid)
                    return t + (p.mode === 'buy' ? (l?.ask ?? 0) : (salesAll[p.uid]?.[0]?.p ?? l?.ask ?? 0))
                  }, 0)
                  if (!pileVal || !myTradeSum) return null
                  const pct = Math.round((myTradeSum / pileVal) * 100)
                  return <span className="mono mk-ckwhisper" title="their side by asks and settlements, yours by settlements only — history, not an appraisal">
                    {pct >= 100 ? 'Your tradeable cards cover this pile on recorded history.' : `Recorded tradeables cover about ${pct}% of this pile.`}</span>
                })()}
              </div>
            </div>
            <span className="mk-ckacts">
              <button className="primary mk-settle" onClick={() => {
                if (canBuyNow) setBuyingNow(true)
                else { setOfferCashSeed(null); setOfferNoteSeed(''); setSettling(true) }
              }}><span>{canBuyNow ? 'Checkout' : 'Review offer'}</span><strong className={canBuyNow ? 'mono' : ''}>{canBuyNow ? `Pay ${buysSum} USDC` : `${pile.length} card${pile.length === 1 ? '' : 's'}`}</strong></button>
              <span className="mk-cksecondary">
                {canBuyNow && <button className="ghost sm" onClick={() => { setOfferCashSeed(null); setOfferNoteSeed(''); setSettling(true) }}>Change terms</button>}
                <button className="ghost sm" onClick={() => { setBuyingNow(false); clearPile(pileKey, open.id) }}>Clear</button>
              </span>
            </span>
            <div className="mk-buy-decision">
              <AskAnko decision={purchaseDecision} recommended={purchaseReadRecommended}
                label={pile.every((p) => p.mode === 'buy') ? 'Ask Anko' : 'Ask Anko about this trade'} actionsForRead={actionsForPurchaseRead} />
            </div>
          </div>
        )}
        <p className="sc-note dim">Condition is the seller&rsquo;s claim; scans say what&rsquo;s recorded behind it. Pick cards up,
          tag them buy or trade, then settle up once the pile looks right. Escrow is recommended; PayPal appears when that seller accepts it. An offer moves no cards or funds.</p>
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
      {evidenceTipEl}
      {zoomEl}
      {bagBar}
      {directFinds.length > 0 && (
        <section className="mk-searchresults" aria-label={`Card listings matching ${aq.trim()}`}>
          <div className="mk-searchhead">
            <div>
              <div className="ek">Across all tables</div>
              <div className="mk-title">{directFinds.length} available card{directFinds.length === 1 ? '' : 's'} · {new Set(directFinds.map(({ seller }) => seller.id)).size} table{new Set(directFinds.map(({ seller }) => seller.id)).size === 1 ? '' : 's'}</div>
            </div>
            <span className="mono dim">&ldquo;{aq.trim()}&rdquo;</span>
          </div>
          <div className="mkf-grid mk-searchgrid">
            {directFinds.map(({ c, l, seller }) => (
              <MiniCard key={`${seller.id}|${l.uid}`} c={c}
                corner={!l.witness ? <MissingPhotosButton card={c} ask={l.ask} onOpen={() => setEvidenceTip({ c, l, sellerId: seller.id })} /> : null}
                sub={<>{c.num} · <span className="money mono">{l.ask} USDC</span>{l.witness ? <> · {witnessCell(l.witness)}</> : null}</>}
                onTap={() => setZoom({ c, l, sellerId: seller.id })}
                actions={<>
                  <button className="mk-resulttable" onClick={(ev) => { ev.stopPropagation(); setSel(seller.id) }} title={`visit ${sellerName(seller)}'s table`}>
                    <Avatar seed={seller.id} size={18} photo={seller.photo} />
                    <span>on <b>{sellerName(seller)}</b>{seller.live && <i className="mk-livetag mono"> ● live</i>}</span>
                  </button>
                  <PileButtons ask={l.ask}
                    inPile={!!inPile(seller.id, c.uid)} mode={inPile(seller.id, c.uid)?.mode}
                    onBuy={() => { pickUp(seller.id, c.uid, 'buy'); setSwapMsg(`in your pile at ${sellerName(seller)}'s table.`) }}
                    onTrade={() => { pickUp(seller.id, c.uid, 'trade'); setSwapMsg(`in your pile at ${sellerName(seller)}'s table.`) }} />
                </>} />
            ))}
          </div>
        </section>
      )}
      <div className="mk-head">
        <div>
          <div className="ek">{directFinds.length ? 'Tables carrying these cards' : 'The market'}</div>
          <div className="mk-title">{marketNeedle ? `${visibleTables.length} of ${allSellers.length} tables` : `${allSellers.length} tables open`}{liveSellers.length ? ` · ${liveSellers.length} live` : ''}</div>
        </div>
      </div>
      <div className="mk-grid">
        {[...visibleTables].sort((a, b) => ((b.live ? 1 : 0) - (a.live ? 1 : 0)) || (aisleMatch
        ? b.listings.filter((l) => aisleMatch.has(l.uid)).length - a.listings.filter((l) => aisleMatch.has(l.uid)).length
          : 0)).map((s) => {
          const matchingListings = marketNeedle ? s.listings.filter((l) => cardMatchesSearch(byUid.get(l.uid))) : []
          const showcaseRank = new Map((s.showcase || []).map((uid, index) => [uid, index]))
          const previewListings = matchingListings.length ? matchingListings : s.listings.slice().sort((a, b) => {
            const aRank = showcaseRank.get(a.uid)
            const bRank = showcaseRank.get(b.uid)
            if (aRank != null || bRank != null) return (aRank ?? Number.MAX_SAFE_INTEGER) - (bRank ?? Number.MAX_SAFE_INTEGER)
            return 0
          })
          const total = s.listings.reduce((t, { ask, copies }) => t + ask * (copies || 1), 0)
          const scanRequested = s.listings.filter((l) => Number(l.ask) > SCAN_REQUEST_USDC)
          const requestedScanned = scanRequested.filter((l) => l.witness).length
          const wantsHere = s.listings.filter((l) => myWants.has(l.uid)).length
          const aisleN = aisleMatch ? s.listings.filter((l) => aisleMatch.has(l.uid)).length : null
          const pileN = pileOf(s.id).length
          return (
            <button key={s.id} className={'mk-table' + ((s.showcase || []).length ? ' has-display' : '') + (aisleN === 0 ? ' mk-dim' : '')} onClick={() => setSel(s.id)}>
              <div className="mk-seller">
                <Avatar seed={s.id} size={34} photo={s.photo} />
                <div>
                  <div className="mk-handle">{sellerName(s)}{s.live && <span className="mk-livetag mono"> ● live</span>}</div>
                  <div className="mono dim mk-sub">{s.live ? `page updated ${s.joined}` : 'sample table'}
                    {sellerAcceptsPayPal(s) && <span className="mk-paypal-tag"> · PayPal</span>}</div>
                </div>
              </div>
              <div className="mk-spread">
                {(s.showcase || []).length > 0 && !matchingListings.length && <span className="mk-caseflag mono">Display case</span>}
                {previewListings.slice(0, 5).map((l, index) => { const c = byUid.get(l.uid); return c?.image ? <img className={index === 0 ? 'lead' : ''} key={l.uid} src={c.image} alt="" loading="lazy" decoding="async" onError={(ev) => retryImg(ev, c.image)} /> : null })}
                {previewListings.length > 5 && <span className="mono mk-more">+{previewListings.length - 5}</span>}
              </div>
              <div className="mk-tmeter mono">
                {pileN > 0 && <span className="mk-pilebadge">your pile · {pileN}</span>}
                {aisleN > 0 && <span className="mk-aisle">{aisleN} match{aisleN === 1 ? '' : 'es'}</span>}
                <span>{s.listings.length} listed{(s.lots || []).length ? ` + ${s.lots.length} lot` : ''} · <b className="money">{total} USDC</b></span>
                <span className={scanRequested.length && requestedScanned === scanRequested.length ? 'mk-wit ok' : requestedScanned ? '' : 'mk-wit none'}>
                  {scanRequested.length ? `${requestedScanned}/${scanRequested.length} requested scans` : 'scans optional'}
                </span>
                {wantsHere > 0 && <span className="mk-wantflag">{wantsHere} of your wants</span>}
              </div>
              {s.bio && <div className="mk-tbio dim">{s.bio}</div>}
            </button>
          )
        })}
        {!visibleTables.length && <div className="empty">No table matches that search.</div>}
      </div>
      <p className="sc-note dim">A table is just what someone chose to list — their binder stays theirs. Witness counts
        say a scan is recorded, not that a card is real. Each checkout names who holds the money and what Cairn can enforce.</p>
    </div>
  )
}
