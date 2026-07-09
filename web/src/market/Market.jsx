import { useEffect, useMemo, useState } from 'react'
import { storeKeyFor, loadStore, catalogUrl, entryFor } from '../binder/collection.js'
import { loadHidden, hiddenKeyFor } from './mockAgents.js'
import { applyAgentFilter } from '../binder/agentFilter.js'
import { offersKeyFor, sendOffer } from '../trade/offers.js'
import MarketFinds from './MarketFinds.jsx'
import OfferComposer from './OfferComposer.jsx'
import { handleFor, shortId, avatarSVG } from '../identity.js'
import './market.css'

// The market: other people's tables. Browsing is by seller (visit a table) or by card
// (everyone asking on one card). Everything shown is a CLAIM — condition is the seller's
// word, the witness column says only whether a scan is recorded behind it. Buying rides
// the same rail as everything else: copy the sheet, paste it into Trades, fund escrow.
const MARKET_URL = (import.meta.env.BASE_URL || '/') + 'market-sample.json'

function Avatar({ seed, size = 26 }) {
  return <span className="av" dangerouslySetInnerHTML={{ __html: avatarSVG(seed, size) }} />
}

function witnessCell(w) {
  if (!w) return <span className="mono mk-wit none" title="nothing recorded — you'd be trading on their word alone">— no scans</span>
  return <span className="mono mk-wit ok" title={`${w} pile scan${w === 1 ? '' : 's'} recorded — a witness, not proof`}>✓ {w} scan{w === 1 ? '' : 's'}</span>
}

function ListingRow({ seller, c, l, mine, showSeller, onOpenSeller, onOffer }) {
  return (
    <div className={'mk-row' + (mine ? ' mk-mine' : '')}>
      {showSeller
        ? <button className="mk-who" onClick={() => onOpenSeller(seller.id)} title="visit their table">
            <Avatar seed={seller.id} size={20} /><span>{handleFor(seller.id)}</span>
          </button>
        : <span className="mk-name">{c.name_en || c.uid}
            {(l.copies || 1) > 1 && <span className="mono dim"> ×{l.copies}</span>}
            <span className="mono mk-num">{c.num}</span>
            {mine && <span className="mk-wantflag">your want</span>}
          </span>}
      {showSeller && <span className="mk-name">{mine && <span className="mk-wantflag">your want</span>}</span>}
      <span className="mono mk-cond" title="the seller's claim — the protocol records it, it does not verify it">{l.cond}</span>
      {witnessCell(l.witness)}
      <span className="mono mk-ask">{l.ask} USDC</span>
      <span className="mk-acts">
        {onOffer && <button className="sheetbtn mk-sm mk-buy" onClick={() => onOffer(c, seller)} title="cards, cash, or both — one composer">offer</button>}
      </span>
    </div>
  )
}

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function Market({ accountId, agentName = 'Anko', catalog, focusUid, onClearFocus }) {
  const [data, setData] = useState(null)
  const [mkt, setMkt] = useState(null)
  const [sel, setSel] = useState(null) // seller id whose table is open
  const [wantsOnly, setWantsOnly] = useState(false)
  const [basket, setBasket] = useState(() => new Set()) // their cards you tapped, per table
  const [composer, setComposer] = useState(null) // {seller, want:[uids], cash?}
  const [swapMsg, setSwapMsg] = useState(null)
  const [aq, setAq] = useState('')
  const [abusy, setAbusy] = useState(false)
  const [ares, setAres] = useState(null) // Anko's market answer: find tiles or a table-narrowing filter
  const [mockRev, setMockRev] = useState(0)
  useEffect(() => {
    const bump = () => setMockRev((r) => r + 1)
    window.addEventListener('cairn-mock', bump)
    window.addEventListener('cairn-store', bump)
    return () => { window.removeEventListener('cairn-mock', bump); window.removeEventListener('cairn-store', bump) }
  }, [])
  const [storeRev] = useState(0) // engine writes arrive via the cairn-store/cairn-mock listeners
  const storeKey = storeKeyFor(catalog.id, accountId)
  const store = useMemo(() => loadStore(storeKey), [storeKey, storeRev, mockRev]) // eslint-disable-line react-hooks/exhaustive-deps -- storeRev/mockRev are the invalidation signals

  useEffect(() => { setBasket(new Set()) }, [sel]) // eslint-disable-line react-hooks/set-state-in-effect -- new table, empty basket
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

  const openComposer = (sellerId, uids, cash) => setComposer({ seller: sellerId, want: uids, cash: cash || null })
  const quickBuy = (c, sellerId, l) => {
    sendOffer(offersKeyFor(catalog.id, accountId), { to: sellerId, want: [{ uid: c.uid }], give: [], cash: { side: 'from', amount: l.ask }, note: null })
    setSwapMsg(`offer sent at their ask — ${l.ask} USDC for ${c.name_en} to ${handleFor(sellerId)}. Watch Trades.`)
  }
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
  const onSent = (sellerId) => {
    setBasket(new Set())
    setSwapMsg(`offer sent to ${handleFor(sellerId)} — their agent is reading it. Watch Trades.`)
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
            onOpenOffer={({ seller, want, cash }) => { setAres(null); openComposer(seller, want, cash) }} onDismiss={() => setAres(null)} />
        : aisleMatch
          ? <div className="aprop"><span className="atag jud">{agentName} · down the aisle</span>
              <div className="aprop-line">{aisleMatch.size ? <>Tables carrying matches are marked — the rest step back.</> : <>No table carries that right now.</>}</div>
              {ares.data.filter?.reading && <div className="aprop-read dim">{ares.data.filter.reading}</div>}
              {ares.data.result?.commentary && <div className="aprop-read">{ares.data.result.commentary}</div>}
              <div className="aprop-acts"><button className="ghost sm" onClick={() => setAres(null)}>✕ done</button></div>
            </div>
          : null
  )

  // ---- by-card focus: everyone asking on one card ----
  if (focusUid) {
    const c = byUid.get(focusUid)
    const asks = sellers.flatMap((s) => s.listings.filter((l) => l.uid === focusUid).map((l) => ({ s, l })))
    return (
      <div className="mk">
        <div className="mk-samplenote mono">sample tables — mock sellers, for shaping the browse. nothing here is a real offer.</div>
        {ankoBar}
        {ankoPanel}
        {swapMsg && <button className="mk-swapmsg mono" onClick={() => setSwapMsg(null)}>{swapMsg} ✕</button>}
        {composer && <OfferComposer accountId={accountId} catalog={catalog} seller={composer.seller} initialWant={composer.want}
          onClose={() => setComposer(null)} onSent={() => onSent(composer.seller)} />}
        <div className="mk-head">
          <div className="mk-focushead">
            {c?.image && <img className="mk-focusart" src={c.image} alt="" />}
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
                <ListingRow key={i} seller={s} c={c} l={l} mine={myWants.has(focusUid)} showSeller onOpenSeller={(id) => { onClearFocus(); setSel(id) }} onOffer={(cc, ss) => openComposer(ss.id, [cc.uid])} />
              ))}
            </div>
          : <div className="empty">Nobody is asking on this card right now.</div>}
        <p className="sc-note dim">Condition is the seller&rsquo;s claim; the witness column says only whether a scan is recorded
          behind it. Tap <b>offer</b> — cards, cash, or both ride the same rail.</p>
      </div>
    )
  }

  // ---- one seller's table ----
  if (open) {
    const rows = open.listings
      .map((l) => ({ l, c: byUid.get(l.uid) }))
      .filter(({ c }) => c)
      .filter(({ c }) => !wantsOnly || myWants.has(c.uid))
    const total = open.listings.reduce((s, { ask, copies }) => s + ask * (copies || 1), 0)
    const witnessed = open.listings.filter((l) => l.witness).length
    const wantsTheyHave = open.listings.filter((l) => myWants.has(l.uid)).length
    const theirWants = (open.wants || []).map((u) => byUid.get(u)).filter(Boolean)
    const swapBait = theirWants.filter((c) => myHaves.has(c.uid))
    return (
      <div className="mk">
        <div className="mk-samplenote mono">sample tables — mock sellers, for shaping the browse. nothing here is a real offer.</div>
        {ankoBar}
        {ankoPanel}
        {swapMsg && <button className="mk-swapmsg mono" onClick={() => setSwapMsg(null)}>{swapMsg} ✕</button>}
        {composer && <OfferComposer accountId={accountId} catalog={catalog} seller={composer.seller} initialWant={composer.want}
          onClose={() => setComposer(null)} onSent={() => onSent(composer.seller)} />}
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
          {rows.map(({ l, c }) => (
            <div key={c.uid} className={'ofr-tile' + (basket.has(c.uid) ? ' sel' : '') + (aisleMatch && !aisleMatch.has(c.uid) ? ' mk-dim' : '')}
              role="button" tabIndex={0} title="tap the card to add it to a multi-card offer"
              onClick={() => setBasket((p) => { const n = new Set(p); if (n.has(c.uid)) n.delete(c.uid); else n.add(c.uid); return n })}>
              {c.image ? <img src={c.image} alt="" loading="lazy" /> : <span className="ofr-noimg">{c.name_en}</span>}
              <span className="pricetag">{l.ask} USDC</span>
              <span className="ofr-name">{c.name_en}{myWants.has(c.uid) ? ' ★' : ''}</span>
              <span className="mono ofr-sub">{l.witness ? `✓ ${l.witness} scan${l.witness === 1 ? '' : 's'}` : '— no scans'}</span>
              <span className="ofr-acts">
                <button className="ofr-buy" onClick={(ev) => { ev.stopPropagation(); quickBuy(c, open.id, l) }} title="send an offer at their ask — one tap">buy {l.ask}</button>
                <button className="ofr-tradebtn" onClick={(ev) => { ev.stopPropagation(); openComposer(open.id, [c.uid]) }} title="offer your cards for it">⇄ trade</button>
              </span>
              {basket.has(c.uid) && <span className="ofr-check">✓</span>}
            </div>
          ))}
          {!rows.length && <div className="empty">Nothing on this table matches your wants.</div>}
        </div>
        {basket.size > 0 && (
          <div className="mk-basketbar">
            <span>{basket.size} card{basket.size === 1 ? '' : 's'} picked from this table</span>
            <button className="primary" onClick={() => openComposer(open.id, [...basket])}>Make an offer →</button>
          </div>
        )}
        {(open.lots || []).map((lot, i) => {
          const lotTotal = lot.cards.reduce((s, x) => s + x.ask * (x.copies || 1), 0)
          return (
            <div className="mk-lot" key={i}>
              <div className="mk-lothead">
                <span className="mk-name">{lot.name}<span className="mono mk-num">{lot.cards.length} cards · {lotTotal} USDC</span></span>
                <button className="sheetbtn mk-sm mono" onClick={() => setBasket(new Set(lot.cards.map((x) => x.uid)))}>select the lot</button>
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
            {swapBait.length > 0 && <div className="mk-swapnote dim">You hold {swapBait.length} card{swapBait.length === 1 ? '' : 's'} they want — a swap conversation, not a protocol object yet.</div>}
          </div>
        )}
        <p className="sc-note dim">Condition is the seller&rsquo;s claim; the witness column says only whether a scan is recorded
          behind it. Tap cards into a basket and make an offer — cards, cash, or both.</p>
      </div>
    )
  }

  // ---- the directory: all tables ----
  return (
    <div className="mk">
      <div className="mk-samplenote mono">sample tables — mock sellers, for shaping the browse. nothing here is a real offer.</div>
      {ankoBar}
      {ankoPanel}
        {swapMsg && <button className="mk-swapmsg mono" onClick={() => setSwapMsg(null)}>{swapMsg} ✕</button>}
        {composer && <OfferComposer accountId={accountId} catalog={catalog} seller={composer.seller} initialWant={composer.want}
          onClose={() => setComposer(null)} onSent={() => onSent(composer.seller)} />}
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
