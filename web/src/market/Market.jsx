import { useEffect, useMemo, useState } from 'react'
import { storeKeyFor, loadStore, catalogUrl, entryFor } from '../binder/collection.js'
import { loadHidden, hiddenKeyFor } from './mockAgents.js'
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
  if (!w) return <span className="mono mk-wit none">— no scan</span>
  return <span className="mono mk-wit ok">✓ witness ·{w}</span>
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

export default function Market({ accountId, catalog, focusUid, onClearFocus }) {
  const [data, setData] = useState(null)
  const [mkt, setMkt] = useState(null)
  const [sel, setSel] = useState(null) // seller id whose table is open
  const [wantsOnly, setWantsOnly] = useState(false)
  const [basket, setBasket] = useState(() => new Set()) // their cards you tapped, per table
  const [composer, setComposer] = useState(null) // {seller, want:[uids]}
  const [swapMsg, setSwapMsg] = useState(null)
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

  const openComposer = (sellerId, uids) => setComposer({ seller: sellerId, want: uids })
  const onSent = (sellerId) => {
    setBasket(new Set())
    setSwapMsg(`offer sent to ${handleFor(sellerId)} — their agent is reading it. Watch Trades.`)
  }

  if (!data || !mkt) return <div className="empty">Opening the market…</div>
  if (!sellers.length) return <div className="empty">No tables in this catalog yet.</div>

  const open = sellers.find((s) => s.id === sel)

  // ---- by-card focus: everyone asking on one card ----
  if (focusUid) {
    const c = byUid.get(focusUid)
    const asks = sellers.flatMap((s) => s.listings.filter((l) => l.uid === focusUid).map((l) => ({ s, l })))
    return (
      <div className="mk">
        <div className="mk-samplenote mono">sample tables — mock sellers, for shaping the browse. nothing here is a real offer.</div>
        {swapMsg && <button className="mk-swapmsg mono" onClick={() => setSwapMsg(null)}>{swapMsg} ✕</button>}
        {composer && <OfferComposer accountId={accountId} catalog={catalog} seller={composer.seller} initialWant={composer.want}
          onClose={() => setComposer(null)} onSent={() => onSent(composer.seller)} />}
        <div className="mk-head">
          <div>
            <div className="ek">On the market</div>
            <div className="mk-title">{c ? `${c.name_en} · ${c.num}` : focusUid}
              <span className="dim"> · {asks.length} ask{asks.length === 1 ? '' : 's'}</span>
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
            <button key={c.uid} className={'ofr-tile' + (basket.has(c.uid) ? ' sel' : '')}
              onClick={() => setBasket((p) => { const n = new Set(p); if (n.has(c.uid)) n.delete(c.uid); else n.add(c.uid); return n })}>
              {c.image ? <img src={c.image} alt="" loading="lazy" /> : <span className="ofr-noimg">{c.name_en}</span>}
              <span className="ofr-name">{c.name_en}{myWants.has(c.uid) ? ' ★' : ''}</span>
              <span className="mono ofr-sub">{l.ask} USDC · {l.witness ? `✓w·${l.witness}` : 'no scan'}</span>
              {basket.has(c.uid) && <span className="ofr-check">✓</span>}
            </button>
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
        {sellers.map((s) => {
          const total = s.listings.reduce((t, { ask, copies }) => t + ask * (copies || 1), 0)
          const witnessed = s.listings.filter((l) => l.witness).length
          const wantsHere = s.listings.filter((l) => myWants.has(l.uid)).length
          return (
            <button key={s.id} className="mk-table" onClick={() => setSel(s.id)}>
              <div className="mk-seller">
                <Avatar seed={s.id} size={34} />
                <div>
                  <div className="mk-handle">{handleFor(s.id)}</div>
                  <div className="mono dim mk-sub">{shortId(s.id)}</div>
                </div>
              </div>
              <div className="mk-tmeter mono">
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
