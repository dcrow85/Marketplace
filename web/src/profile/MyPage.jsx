// My page: your binder's public lens, pointed at yourself — exactly what the room
// sees. Binder (grails first), table (deals), the hunt (wants, public by design), and
// the record strip with facts computed from records. Absorbs the old SellPile.
import { useMemo, useState, useEffect } from 'react'
import { storeKeyFor, loadStore, saveStore, entryFor, condStr } from '../binder/collection.js'
import { offersKeyFor, loadOffers } from '../trade/offers.js'
import { publishProfile, unpublishProfile, isLiveAddr } from '../live/pilotStore.js'
import { handleFor } from '../identity.js'
import { useCatalog, useMarket, useByUid } from '../lib/data.js'
import { useBus } from '../lib/store.js'
import { loadMockSales, mockSalesKeyFor } from '../market/mockAgents.js'
import MiniCard from '../components/MiniCard.jsx'
import ProfileHeader from './ProfileHeader.jsx'
import CardModal from '../binder/CardModal.jsx'
import { retryImg } from '../binder/helpers.jsx'
import { loadProfile, resetAccountLocal, saveProfile } from './profileStore.js'
import { deletePhotosWithPrefix } from '../scan/photoStore.js'
import { AgentPanel } from '../binder/agentPanels.jsx'

const TABLE_TILE_SCALES = { s: 0.78, m: 1, l: 1.3 }
const API_BASE = import.meta.env.VITE_API_BASE || ''
const SCAN_REQUEST_USDC = 10

function loadSize(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved in TABLE_TILE_SCALES ? saved : fallback
  } catch { return fallback }
}

function loadOrder(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(saved) ? saved.filter((uid) => typeof uid === 'string') : []
  } catch { return [] }
}

function SectionSizePicker({ label, storageKey, size, onSize }) {
  const choose = (next) => {
    onSize(next)
    try { localStorage.setItem(storageKey, next) } catch { /* ignore */ }
  }
  return (
    <div className="sizepick mono pf-sizepick" title={`${label} card size`} role="radiogroup" aria-label={`${label} card size`}>
      {Object.keys(TABLE_TILE_SCALES).map((key) => (
        <button key={key} type="button" role="radio" aria-checked={size === key}
          className={size === key ? 'on' : ''} onClick={() => choose(key)}>{key.toUpperCase()}</button>
      ))}
    </div>
  )
}

function CatalogueImageMark({ requested }) {
  const label = requested
    ? 'Catalogue image only — fresh seller photos requested'
    : 'Catalogue image only — fresh seller photos optional at this ask'
  return <span className="mono mk-wit catalog" role="img" aria-label={label} title={label}>!</span>
}

export default function MyPage({ accountId, catalog, agentName = 'Anko', onScan }) {
  const data = useCatalog(catalog)
  const mkt = useMarket(catalog)
  const byUid = useByUid(data)
  const storeKey = storeKeyFor(catalog.id, accountId)
  const store = useBus(() => loadStore(storeKey), [storeKey])
  const mockSales = useBus(() => loadMockSales(mockSalesKeyFor(catalog.id)), [catalog])
  const [sel, setSel] = useState(null) // a card held open — the binder's modal, right here
  const [query, setQuery] = useState('')
  const [binderFilter, setBinderFilter] = useState('all')
  const [binderSort, setBinderSort] = useState('number')
  const displaySizeKey = `cairn-table-display-size:${catalog.id}:${accountId || 'anon'}`
  const binderSizeKey = `cairn-table-binder-size:${catalog.id}:${accountId || 'anon'}`
  const displayOrderKey = `cairn-table-display-order:${catalog.id}:${accountId || 'anon'}`
  const [displaySize, setDisplaySize] = useState(() => loadSize(displaySizeKey, 'l'))
  const [binderSize, setBinderSize] = useState(() => loadSize(binderSizeKey, 'm'))
  const [displayOrder, setDisplayOrder] = useState(() => loadOrder(displayOrderKey))
  const [ankoQuery, setAnkoQuery] = useState('')
  const [ankoBusy, setAnkoBusy] = useState(false)
  const [ankoRes, setAnkoRes] = useState(null)

  // the binder's marking semantics, over the event-driven store: every page hears the
  // change. Reads happen at WRITE time (like Binder's functional setStore) so two quick
  // marks never clobber each other through a stale render snapshot.
  const setById = useMemo(() => Object.fromEntries((data?.sets || []).map((s) => [s.id, s])), [data])
  const setStance = (uid, st) => {
    const c = byUid.get(uid)
    if (!c) return
    const prev = loadStore(storeKey)
    const cur = entryFor(c, prev).stance
    const u = { ...(prev[uid] || {}) }
    u.stance = cur === st ? 'none' : st
    if (u.stance !== 'have') { u.extra = false; u.trade = false; u.sell = false; u.display = false }
    if (u.stance === 'none' || u.stance === 'pass') u.grail = false
    saveStore(storeKey, { ...prev, [uid]: u })
  }
  const setField = (uid, key, value) => {
    const prev = loadStore(storeKey)
    saveStore(storeKey, { ...prev, [uid]: { ...(prev[uid] || {}), [key]: value } })
  }
  const saveDisplayOrder = (next) => {
    const clean = [...new Set(next)]
    setDisplayOrder(clean)
    try { localStorage.setItem(displayOrderKey, JSON.stringify(clean)) } catch { /* ignore */ }
  }
  const setDisplay = (uid, value) => {
    setField(uid, 'display', value)
    if (value && !displayOrder.includes(uid)) saveDisplayOrder([...displayOrder, uid])
  }
  const askAnko = async () => {
    const call = ankoQuery.trim()
    if (!call || ankoBusy) return
    setAnkoBusy(true)
    try {
      const response = await fetch(API_BASE + '/api/browse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ call, catalog: catalog.id }) })
      setAnkoRes({ ok: response.ok, data: await response.json() })
    } catch { setAnkoRes({ ok: false, data: { error: 'network' } }) }
    finally { setAnkoBusy(false) }
  }

  const profile = useBus(() => loadProfile(accountId), [accountId])
  const noteKey = `cairn-table-note:${catalog.id}:${accountId || 'anon'}`
  useEffect(() => {
    if (profile.sign) return
    try {
      const oldSign = localStorage.getItem(noteKey) || ''
      if (oldSign) saveProfile(accountId, { ...profile, sign: oldSign })
    } catch { /* ignore old local sign */ }
  }, [accountId, noteKey, profile])
  const setName = (name) => saveProfile(accountId, { ...profile, name })
  const setSign = (sign) => saveProfile(accountId, { ...profile, sign })
  const setPhoto = (photo) => saveProfile(accountId, { ...profile, photo })

  const rows = useMemo(() => {
    if (!data) return { haves: [], listed: [], display: [], wants: [] }
    const all = data.cards.map((c) => ({ c, e: entryFor(c, store) }))
    return {
      haves: all.filter(({ e }) => e.stance === 'have'),
      listed: all.filter(({ e }) => e.stance === 'have' && (e.sell || e.trade)),
      display: all.filter(({ e }) => e.stance === 'have' && e.sell && e.display),
      wants: all.filter(({ e }) => e.stance === 'want'),
    }
  }, [data, store])
  const moveDisplay = (uid, beforeUid) => {
    const current = rows.display.map(({ c }) => c.uid)
    const ordered = [...displayOrder.filter((id) => current.includes(id)), ...current.filter((id) => !displayOrder.includes(id))]
    const from = ordered.indexOf(uid)
    if (from < 0) return
    ordered.splice(from, 1)
    const to = beforeUid ? ordered.indexOf(beforeUid) : ordered.length
    ordered.splice(to < 0 ? ordered.length : to, 0, uid)
    saveDisplayOrder(ordered)
  }
  const nudgeDisplay = (uid, delta) => {
    const current = rows.display.map(({ c }) => c.uid)
    const ordered = [...displayOrder.filter((id) => current.includes(id)), ...current.filter((id) => !displayOrder.includes(id))]
    const from = ordered.indexOf(uid)
    const to = Math.max(0, Math.min(ordered.length - 1, from + delta))
    if (from < 0 || from === to) return
    const [moved] = ordered.splice(from, 1)
    ordered.splice(to, 0, moved)
    saveDisplayOrder(ordered)
  }

  const listingMatches = (c) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const haystack = (c.num + ' ' + (c.name_en || '') + ' ' + (c.romaji || '') + ' ' + (c.name_ja || '') + ' ' +
      (c.element || '') + ' ' + (c.rarity || '') + ' ' + (c.illustrator || '') + ' ' + (c.source_entry_id || '') + ' ' +
      (c.release_family_label || '') + ' ' + (c.product_channel_label || '') + ' ' + (setById[c.set_id]?.label || '')).toLowerCase()
    return haystack.includes(q)
  }
  const orderedDisplayRows = useMemo(() => {
    const rank = new Map(displayOrder.map((uid, index) => [uid, index]))
    return rows.display.slice().sort((a, b) => (rank.get(a.c.uid) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.c.uid) ?? Number.MAX_SAFE_INTEGER))
  }, [rows.display, displayOrder])
  const displayRows = orderedDisplayRows.filter(({ c }) => listingMatches(c))
  const binderBaseRows = rows.listed.filter(({ e }) => !(e.sell && e.display))
  const binderRows = binderBaseRows.filter(({ c }) => listingMatches(c)).filter(({ e }) => {
    const scanned = !!((e.pile || []).length || e.photo_hash)
    if (binderFilter === 'sale') return !!e.sell
    if (binderFilter === 'trade') return !!e.trade
    if (binderFilter === 'scanned') return scanned
    if (binderFilter === 'needs_scan') return Number(e.ask) > SCAN_REQUEST_USDC && !scanned
    return true
  }).sort((a, b) => {
    if (binderSort === 'name') return (a.c.name_en || '').localeCompare(b.c.name_en || '')
    if (binderSort === 'price_asc') return (Number(a.e.ask) || 0) - (Number(b.e.ask) || 0)
    if (binderSort === 'price_desc') return (Number(b.e.ask) || 0) - (Number(a.e.ask) || 0)
    return (a.c.num || '').localeCompare(b.c.num || '', undefined, { numeric: true })
  })
  const ankoPicks = useMemo(() => new Set(ankoRes?.ok && Array.isArray(ankoRes.data?.result?.picks) ? ankoRes.data.result.picks : []), [ankoRes])

  // the record strip: computed, never asserted
  const stats = useBus(() => {
    const offers = loadOffers(offersKeyFor(catalog.id, accountId))
    const settled = offers.filter((o) => o.state === 'settled').length
    const listed = rows.listed
    const scanRequested = listed.filter(({ e }) => Number(e.ask) > SCAN_REQUEST_USDC)
    const scannedRequested = scanRequested.filter(({ e }) => (e.pile || []).length || e.photo_hash).length
    const out = []
    if (rows.haves.length) out.push({ t: `${rows.haves.length} held` })
    if (settled) out.push({ t: `${settled} settled`, rec: true })
    if (scanRequested.length) out.push({
      t: scannedRequested === scanRequested.length
        ? 'every $10+ listing scanned'
        : `${scannedRequested}/${scanRequested.length} $10+ listings scanned`,
      rec: scannedRequested > 0,
    })
    else if (listed.length) out.push({ t: 'scans optional at current asks' })
    if (data) {
      const fam = data.cards.filter((c) => c.release_family === 'gates_awakened')
      const have = fam.filter((c) => entryFor(c, store).stance === 'have').length
      if (have) out.push({ t: `Gates ${have}/${fam.length}` })
    }
    return out
  }, [catalog, accountId, rows, data])

  const setAsk = (uid, v) => setField(uid, 'ask', v)

  // publishing: your page, put on the room's board — a snapshot you own and can pull.
  // Until it's signed (P3), the room carries it as YOUR claim; nothing here turns green
  // on anyone else's screen.
  const canPublish = isLiveAddr(accountId)
  const pubKey = `cairn-published:${catalog.id}:${accountId}`
  const [pubAt, setPubAt] = useState(() => { try { return Number(localStorage.getItem(pubKey)) || 0 } catch { return 0 } })
  const [pubBusy, setPubBusy] = useState(false)
  const [pubErr, setPubErr] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [resetErr, setResetErr] = useState(false)
  const buildSnapshot = () => ({
    v: 2, cat: catalog.id, sign: profile.sign.trim(), handle: profile.name.trim() || handleFor(accountId), photo: profile.photo,
    showcase: orderedDisplayRows.map(({ c }) => c.uid),
    table: rows.listed.map(({ c, e }) => ({
      uid: c.uid, ask: e.ask ? Number(e.ask) : null, trade: !!e.trade, sell: !!e.sell,
      cond: condStr(e), scans: (e.pile || []).length || (e.photo_hash ? 1 : 0), copies: e.copies || 1,
    })),
    wants: rows.wants.map(({ c }) => c.uid).slice(0, 60),
    record: stats,
  })
  const markPublished = () => { const t = Date.now(); setPubAt(t); try { localStorage.setItem(pubKey, String(t)) } catch { /* ignore */ } }
  const publish = async () => {
    setPubBusy(true); setPubErr(false)
    const r = await publishProfile(accountId, buildSnapshot())
    if (r?.ok) markPublished()
    else setPubErr(true)
    setPubBusy(false)
  }
  const unpublish = async () => {
    setPubBusy(true)
    await unpublishProfile(accountId)
    setPubAt(0); try { localStorage.removeItem(pubKey) } catch { /* ignore */ }
    setPubBusy(false)
  }
  const resetAccount = async () => {
    setResetBusy(true); setResetErr(false)
    if (canPublish) {
      const result = await unpublishProfile(accountId)
      if (!result?.ok) { setResetBusy(false); setResetErr(true); return }
    }
    await deletePhotosWithPrefix(`cairn-cards:${catalog.id}:${accountId}:`).catch(() => {})
    resetAccountLocal(accountId)
    window.location.reload()
  }
  // a published page stays fresh: republish quietly whenever you visit your page
  useEffect(() => {
    if (!canPublish || !pubAt) return
    publishProfile(accountId, buildSnapshot()).then((r) => { if (r?.ok) markPublished() })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- on mount only, by design

  if (!data) return <div className="empty">Opening your table…</div>

  return (
    <div className="pf">
      <ProfileHeader accountId={accountId} name={profile.name} onName={setName}
        sign={profile.sign} onSign={setSign} photo={profile.photo} onPhoto={setPhoto} stats={stats} />
      <div className="pf-anko">
        <div className="askbar pf-ankobar">
          <img className={'anko-search' + (ankoBusy ? ' busy' : '')} src={(import.meta.env.BASE_URL || '/') + 'agent/anko-avatar-v1.png'} alt="" />
          <input value={ankoQuery} maxLength={280} placeholder={`Ask ${agentName} about cards, scans, or what to lead with…`}
            onChange={(event) => { setAnkoQuery(event.target.value); if (ankoRes) setAnkoRes(null) }}
            onKeyDown={(event) => { if (event.key === 'Enter') askAnko() }} />
          <button className="askbtn" onClick={askAnko} disabled={ankoBusy || !ankoQuery.trim()}>{ankoBusy ? 'onibi reading…' : `Ask ${agentName}`}</button>
        </div>
        {ankoRes && <><AgentPanel res={ankoRes} agentName={agentName} />
          <button className="ghost sm pf-ankoclear" onClick={() => { setAnkoRes(null); setAnkoQuery('') }}>clear his read</button></>}
      </div>
      <div className="pf-pubrow mono">
        {canPublish
          ? pubAt
            ? <>
                <span className="pf-live">● on the room&rsquo;s board</span>
                <span className="dim">your display case, binder, and hunt are public to the pilot · refreshed each visit</span>
                <button className="ghost sm" onClick={publish} disabled={pubBusy}>{pubBusy ? 'publishing…' : 'republish now'}</button>
                <button className="ghost sm" onClick={unpublish} disabled={pubBusy}>take it down</button>
              </>
            : <>
                <span className="dim">your table is local-only — put it on the board and the room&rsquo;s market shows it</span>
                <button className="primary pf-pubbtn" onClick={publish} disabled={pubBusy}>{pubBusy ? 'publishing…' : 'Put it on the board →'}</button>
              </>
          : <span className="dim">publishing needs a wallet account — sign in with one and your table can go on the board</span>}
        {pubErr && <span className="pf-puberr">couldn&rsquo;t reach the board — try again</span>}
      </div>
      <div className={'pf-reset mono' + (resetOpen ? ' open' : '')}>
        {!resetOpen
          ? <button className="ghost sm" onClick={() => setResetOpen(true)}>Start fresh…</button>
          : <>
              <span><b>Reset this account?</b> Profile, points, Binder changes, scans, and piles will be cleared.
                Trades and offers stay in the record.</span>
              <span className="pf-resetacts">
                <button className="ghost sm" onClick={() => setResetOpen(false)} disabled={resetBusy}>cancel</button>
                <button className="ghost sm pf-resetconfirm" onClick={resetAccount} disabled={resetBusy}>
                  {resetBusy ? 'resetting…' : 'Reset and start at 0/8'}
                </button>
              </span>
            </>}
        {resetErr && <span className="pf-puberr">couldn&rsquo;t take your table off the board — nothing was reset</span>}
      </div>
      <input className="ofr-search pf-listsearch" type="search" value={query}
        aria-label="Search my listed cards" placeholder="Search my listed cards…"
        onChange={(event) => setQuery(event.target.value)} />
      <div className="pf-sechead">
        <span className="pf-sectiontitle"><span className="ek">Display case</span></span>
        <SectionSizePicker label="Display case" storageKey={displaySizeKey} size={displaySize} onSize={setDisplaySize} />
      </div>
      {displayRows.length
        ? <ListingTiles rows={displayRows} size={displaySize} setSel={setSel} setAsk={setAsk} setDisplay={setDisplay}
            onMove={moveDisplay} onNudge={nudgeDisplay} reorderable ankoPicks={ankoPicks} onScan={onScan} />
        : <div className="empty">{query ? 'No display cards match that search.' : 'Your case is empty. Star a for-sale card and it moves here.'}</div>}

      <div className="pf-sechead">
        <span className="pf-sectiontitle"><span className="ek">Binder</span><span className="mono dim">{binderBaseRows.length ? `${query || binderFilter !== 'all' ? `${binderRows.length} of ` : ''}${binderBaseRows.length} listed · asks are per copy` : ''}</span></span>
        <SectionSizePicker label="Binder" storageKey={binderSizeKey} size={binderSize} onSize={setBinderSize} />
      </div>
      <div className="pf-listtools">
        <div className="pf-filterchips mono" aria-label="Filter table binder">
          {[
            ['all', 'All'], ['sale', 'For sale'], ['trade', 'Trade'], ['scanned', 'Scanned'], ['needs_scan', 'Needs scan'],
          ].map(([key, label]) => <button key={key} className={binderFilter === key ? 'on' : ''}
            onClick={() => setBinderFilter(key)}>{label}</button>)}
        </div>
        <label className="pf-listsort mono">Sort
          <select value={binderSort} onChange={(event) => setBinderSort(event.target.value)}>
            <option value="number">Card number</option>
            <option value="name">Name A–Z</option>
            <option value="price_asc">Price low–high</option>
            <option value="price_desc">Price high–low</option>
          </select>
        </label>
      </div>
      {binderRows.length
        ? <ListingTiles rows={binderRows} size={binderSize} setSel={setSel} setAsk={setAsk} setDisplay={setDisplay}
            ankoPicks={ankoPicks} onScan={onScan} />
        : <div className="empty">{query || binderFilter !== 'all' ? 'No binder cards match those controls.' : 'Nothing in your binder. Open a card you Have and mark it “List for sale” or “Open to trade”.'}</div>}

      <div className="pf-sechead">
        <span className="ek">You&rsquo;re hunting</span>
        <span className="mono dim">{rows.wants.length ? 'public — the room can bring you deals' : ''}</span>
      </div>
      {rows.wants.length
        ? <div className="mk-hunt2row pf-huntrow">
            {rows.wants.slice(0, 18).map(({ c }) => (
              <button key={c.uid} className="mk-hunt2 pf-huntopen" onClick={() => setSel(c.uid)} title="open — mark it like in the binder">
                {c.image ? <img src={c.image} alt="" loading="lazy" decoding="async" onError={(ev) => retryImg(ev, c.image)} /> : <span className="minicard-noimg">{c.name_en}</span>}
                <span className="mk-hunt2name">{c.name_en}</span>
              </button>
            ))}
            {rows.wants.length > 18 && <span className="mono dim pf-huntmore">+{rows.wants.length - 18}</span>}
          </div>
        : <div className="empty">No wants yet — mark cards as Want and your hunt goes on the board.</div>}

      <p className="sc-note dim">This is your table exactly as the room reads it once it&rsquo;s on the board: your display case, binder,
        and your hunt show what you choose; the record strip only ever says what&rsquo;s recorded — and on other people&rsquo;s
        screens it stays your claim until signing lands.</p>
      {sel && <CardModal key={sel} uid={sel} data={data} setById={setById} store={store}
        setStance={setStance} setField={setField} agentName="Anko"
        onClose={() => setSel(null)} market={mkt} mockSales={mockSales} />}
    </div>
  )
}

function ListingTiles({ rows, size, setSel, setAsk, setDisplay, reorderable = false, onMove, onNudge, ankoPicks, onScan }) {
  const [dragging, setDragging] = useState(null)
  return (
    <div className="sp-tiles" style={{ '--tilescale': TABLE_TILE_SCALES[size] }}>
      {rows.map(({ c, e }, index) => {
        const scanned = !!((e.pile || []).length || e.photo_hash)
        const scanRequested = Number(e.ask) > SCAN_REQUEST_USDC && !scanned
        return <div key={c.uid} className={'pf-listingwrap' + (dragging === c.uid ? ' dragging' : '')}
          draggable={reorderable} onDragStart={() => setDragging(c.uid)} onDragEnd={() => setDragging(null)}
          onDragOver={(event) => { if (reorderable) event.preventDefault() }}
          onDrop={(event) => { event.preventDefault(); if (dragging && dragging !== c.uid) onMove?.(dragging, c.uid); setDragging(null) }}>
        {reorderable && <div className="pf-orderbar mono">
          <span className="pf-drag" title="Drag to reorder">⠿ drag</span>
          <span><button disabled={index === 0} onClick={() => onNudge?.(c.uid, -1)} aria-label={`Move ${c.name_en} earlier`}>←</button>
            <button disabled={index === rows.length - 1} onClick={() => onNudge?.(c.uid, 1)} aria-label={`Move ${c.name_en} later`}>→</button></span>
        </div>}
        <MiniCard c={c} onTap={() => setSel(c.uid)}
          corner={<>{e.trade && <span className="sp-tradeflag">⇄ trade</span>}{ankoPicks?.has(c.uid) && <span className="pf-ankopick">★ Anko</span>}</>}
          sub={<>{condStr(e)} · {scanned ? <span className="mk-wit ok">✓ scans on file</span> : <CatalogueImageMark requested={scanRequested} />}{(e.copies || 1) > 1 ? ` · ×${e.copies}` : ''}</>}
          actions={<span className="sp-task" onClick={(ev) => ev.stopPropagation()}>
            {e.sell && <button className={'pf-displaybtn' + (e.display ? ' on' : '')}
              aria-label={e.display ? 'Remove from display case' : 'Pin to display case'}
              title={e.display ? 'Remove from display case' : 'Pin to display case'}
              onClick={() => setDisplay(c.uid, !e.display)}>{e.display ? '★' : '☆'}</button>}
            <span className="fpre">$</span>
            <input type="number" min="0" placeholder="ask"
              value={e.ask || ''} onChange={(ev) => setAsk(c.uid, ev.target.value)} />
            {scanRequested && <button className="pf-scanrequest mono" onClick={() => onScan?.(c.uid)}>Scan now</button>}
          </span>} />
        </div>
      })}
    </div>
  )
}
