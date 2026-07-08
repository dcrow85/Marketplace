import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import ScanCards from '../scan/ScanCards.jsx'
import { hashText } from '../chain/escrow.js'
import { useScrollLock } from '../useScrollLock.js'
import { useEscrowWallet } from '../trade/useEscrowWallet.js'
import { putPhoto, getPhoto } from '../scan/photoStore.js'
import { handleFor } from '../identity.js'
import { loadMockSales, mockSalesKeyFor, loadHidden, hiddenKeyFor } from '../market/mockAgents.js'
import '../scan/scan.css'

// Prod: the agent API lives on a separate origin (api.cairn.cards, via VITE_API_BASE);
// the catalog ships with the app build. Both resolve in dev (Vite proxy, BASE_URL='/')
// and under a '/app/' base path on the deployed site.
const API_BASE = import.meta.env.VITE_API_BASE || ''
// Photo-entry is the primary path (collectors add cards by photo), so it's on for
// everyone — not hidden behind a flag. The agent read is live; a confirmed photo is
// session-only until persistent shared storage (R2 + the Catalog-Evidence record)
// lands, and the modal note says so. Flip to false to hide the whole flow.
const IMPORT_ON = true
const DEFAULT_CATALOG = { id: 'azuki-tcg', path: 'catalogs/azuki-tcg.json', title: 'Azuki TCG catalog' }
const catalogUrl = (catalog) => import.meta.env.BASE_URL + (catalog?.path || DEFAULT_CATALOG.path)

const nm = (c) => c.name_ja || c.name_en || c.uid

// Flaky-network resilience: the card images all serve 200, but a bad connection drops
// a fraction of the parallel lazy loads. Retry a failed image a few times with backoff
// and a cache-bust so transient drops recover instead of showing a name-placeholder.
function retryImg(e, src) {
  const t = e.currentTarget
  const n = Number(t.dataset.retry || 0) + 1
  if (n > 4) return
  t.dataset.retry = String(n)
  setTimeout(() => { t.src = src + (src.includes('?') ? '&' : '?') + 'r=' + n }, 500 * n)
}

function effStance(c, store) {
  const u = store[c.uid] || {}
  let st = u.stance != null ? u.stance : c.stance != null ? c.stance : c.owned ? 'have' : 'none'
  let extra = u.extra !== undefined ? !!u.extra : c.stance === 'extra'
  if (st === 'extra') { st = 'have'; extra = true }
  if (st === 'wish') st = 'want'
  if (!st) st = 'none'
  const trade = u.trade !== undefined ? !!u.trade : extra
  const sell = u.sell !== undefined ? !!u.sell : !!c.sell
  const grail = u.grail !== undefined ? !!u.grail : !!c.grail
  return { stance: st, extra, trade, sell, grail }
}
function wantActive(c, store) {
  const u = store[c.uid] || {}
  const cond = u.want_cond !== undefined ? u.want_cond : c.want_cond || 'any'
  const max = u.want_max !== undefined ? u.want_max : c.want_max || ''
  return (max !== '' && max != null) || (cond && cond !== 'any')
}
// Condition: two fixed dropdowns (type + grade) so the record is uniform across
// everyone — no free text. A legacy free-text `cond` is still read for display
// (collections saved before the dropdowns existed).
const COND_TYPES = [['raw', 'Raw'], ['graded', 'Graded']]
const GRADERS = [['PSA', 'PSA'], ['BGS', 'BGS'], ['CGC', 'CGC'], ['SGC', 'SGC'], ['TAG', 'TAG'], ['other', 'Other']]
const NUM_GRADES = ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5.5', '5', '4', '3', '2', '1']
const COND_GRADES = {
  raw: [['M', 'Mint'], ['NM', 'Near Mint'], ['LP', 'Lightly Played'], ['MP', 'Moderately Played'], ['HP', 'Heavily Played'], ['DMG', 'Damaged']],
  graded: NUM_GRADES.map((g) => [g, g]),
}
const gradePrompt = (t) => t === 'raw' ? 'condition…' : 'grade…'
function condText(c, store) {
  const u = store[c.uid] || {}
  const type = u.cond_type !== undefined ? u.cond_type : c.cond_type
  const grader = ((u.cond_grader !== undefined ? u.cond_grader : c.cond_grader) || '').trim()
  const grade = ((u.cond_grade !== undefined ? u.cond_grade : c.cond_grade) || '').trim()
  if (!type && !grade) return ((u.cond !== undefined ? u.cond : c.cond) || '').trim()
  if (type === 'tag') return grade ? 'TAG ' + grade : 'TAG'   // legacy: TAG used to be a top-level type
  if (type === 'graded') {
    const g = grader && grader !== 'other' ? grader : 'graded'
    return grade ? g + ' ' + grade : g
  }
  return grade || 'raw'
}
function capMeta(c, e, store) {
  if (e.grail && (e.stance === 'have' || e.stance === 'want')) return { t: 'grail ★', cls: 'm-grail' }
  if (e.stance === 'pass') return { t: 'pass', cls: 'm-pass' }
  if (e.stance === 'have') {
    if (e.trade && e.sell) return { t: 'trade · sell', cls: 'm-trade' }
    if (e.sell) return { t: 'for sale', cls: 'm-trade' }
    if (e.trade) return { t: 'for trade', cls: 'm-trade' }
    return { t: condText(c, store) || 'keeper', cls: 'm-have' }
  }
  if (e.stance === 'want') return wantActive(c, store) ? { t: 'hunt', cls: 'm-want' } : { t: 'wishlist', cls: 'm-wish' }
  return { t: c.rarity || '', cls: 'm-none' }
}
// Distinct rarities in ladder order — common first, chase last; unknown codes trail in data order.
const RARITY_LADDER = ['C', 'UC', 'R', 'SR', 'SR ★', 'SR ★★', 'L', 'L ★', 'G', 'G ★']
function rarityOrder(cards) {
  const seen = [...new Set(cards.map((c) => c.rarity).filter(Boolean))]
  const first = new Map(seen.map((r, i) => [r, i]))
  return seen.sort((a, b) => {
    const ia = RARITY_LADDER.indexOf(a), ib = RARITY_LADDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || first.get(a) - first.get(b)
  })
}
function provBadge(c) {
  if (!c.image) return null
  if (c.image_status === 'exact_source') return null // the default is unmarked — badge only exceptions
  if (c.image_status === 'provider_path') return <span className="prov pv-ref">ref</span>
  return null
}

// Client-side mirror of cairn_browse.apply_filter, so the grid narrows to EXACTLY the
// agent's survivors and the count matches what it said ("cut to N candidates").
function applyAgentFilter(cards, f, setById) {
  let out = cards
  if (f.release_family) out = out.filter((c) => (c.release_family || '').toLowerCase() === String(f.release_family).toLowerCase())
  if (f.product_channel) {
    const ch = String(f.product_channel).toLowerCase()
    out = out.filter((c) => ch === 'starter'
      ? String(c.product_channel || '').startsWith('starter_deck_')
      : (c.product_channel || '').toLowerCase() === ch)
  }
  if (f.holo != null) out = out.filter((c) => !!c.holo === !!f.holo)
  if (f.owned != null) out = out.filter((c) => !!c.owned === !!f.owned)
  if (f.exclude_grails) out = out.filter((c) => (c.band_rank || 0) < 3)
  if (f.category) out = out.filter((c) => (c.category || '').toLowerCase() === String(f.category).toLowerCase())
  if (f.element) out = out.filter((c) => (c.element || '').toLowerCase() === String(f.element).toLowerCase())
  if (f.star_alt != null) out = out.filter((c) => !!c.star_alt === !!f.star_alt)
  if (f.rarity) {
    const r = String(f.rarity).trim().toLowerCase()
    const known = new Set(cards.map((c) => (c.rarity || '').trim().toLowerCase()))
    out = known.has(r) // exact code — 'C' must not swallow 'UC'
      ? out.filter((c) => (c.rarity || '').trim().toLowerCase() === r)
      : out.filter((c) => (c.rarity || '').toLowerCase().includes(r))
  }
  if (f.set) { const s = String(f.set).toLowerCase(); out = out.filter((c) => (setById[c.set_id]?.label || '').toLowerCase().includes(s)) }
  if (f.character) { const ch = String(f.character).toLowerCase(); out = out.filter((c) => (c.name_en || '').toLowerCase().includes(ch) || (c.name_ja || '').toLowerCase().includes(ch)) }
  return out
}

function Card({ c, store, setStance, setField, showSet, setLabel, pick, onOpen, userPhoto, fromAsk, onQuickSell }) {
  const e = effStance(c, store)
  const have = e.stance === 'have'
  const ring = e.stance === 'pass' ? 's-pass' : e.grail ? 's-grail' : have ? 's-have' : e.stance === 'want' ? (wantActive(c, store) ? 's-want' : 's-wish') : ''
  const meta = capMeta(c, e, store)
  return (
    <div className={'cell ' + (have ? 'own' : 'ghost') + (pick ? ' is-pick' : '') + (e.stance === 'pass' ? ' passed' : '')}>
      <div className="stancebar">
        <button className={'seg sg-have' + (have ? ' on' : '')} onClick={() => setStance(c.uid, have ? 'none' : 'have')}>Have</button>
        {have
          ? <>
              <button className={'seg sg-sell' + (e.sell ? ' on' : '')} title={e.sell ? 'listed for sale — tap to unlist' : 'list for sale'} onClick={() => { const on = !e.sell; setField(c.uid, 'sell', on); if (on && onQuickSell) onQuickSell(c.uid) }}>$</button>
              <button className={'seg sg-tradeq' + (e.trade ? ' on' : '')} title={e.trade ? 'open to trade — tap to close' : 'open to trade'} onClick={() => setField(c.uid, 'trade', !e.trade)}>⇄</button>
            </>
          : <button className={'seg sg-want' + (e.stance === 'want' ? ' on' : '')} onClick={() => setStance(c.uid, e.stance === 'want' ? 'none' : 'want')}>Want</button>}
      </div>
      <div className={'card ' + (have ? 'own' : 'ghost') + (ring ? ' ' + ring : '')} onClick={() => onOpen && onOpen(c.uid)} role="button" tabIndex={0} title="open card">
        {pick && <span className="pickflag" title="your agent surfaced this">★</span>}
        <div className="face"><div className="ja">{nm(c)}</div><div className="nn">{c.romaji || (c.name_is_en ? 'EN' : '')}</div></div>
        {(userPhoto || c.image) && <img src={userPhoto || c.image} alt={nm(c)} loading="lazy" decoding="async" onError={userPhoto ? undefined : (e) => retryImg(e, c.image)} />}
        {userPhoto && <span className="yoursflag" title="your photo">yours</span>}
        {c.holo ? <span className="holodot" title={c.star_alt ? 'star / alternate-art signal' : 'holo'} /> : null}
        {provBadge(c)}
      </div>
      <div className="caption" onClick={() => onOpen && onOpen(c.uid)}>
        {showSet && <div className="cset">{setLabel}</div>}
        <div className="cap-top"><span className="cnum">{c.num}</span><span className="cja">{nm(c)}</span></div>
        <div className="cap-sub">
          <span className="crom">{c.romaji || c.name_en || ''}{c.name_is_en && <span className="enmark">EN</span>}</span>
          <span className={'cmeta ' + meta.cls}>{meta.t}</span>
        </div>
        {fromAsk != null && <div className="cap-avail mono">available · from {fromAsk} USDC</div>}
      </div>
    </div>
  )
}

const COND_OPTS = [
  ['any', 'Any condition'],
  ['nm', 'Near Mint or better'],
  ['lp', 'Light Play or better'],
  ['played', 'Played is fine'],
]
const PROV_LABEL = {
  exact_source: 'Exact source image',
  provider_path: 'Provider-path reference image',
  no_rarity_reference: 'No Rarity reference image',
  no_reference_photo: 'No reference photo',
  user_observation_no_public_image: 'User observation, no public image',
}
const mpill = (t, i) => t ? <span className="mpill" key={i}>{t}</span> : null

function Frow({ label, children }) {
  return <label className="frow"><span className="flabel">{label}</span><span className="fbody">{children}</span></label>
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
// Render a chosen photo to a JPEG data URI bounded to a long-edge size.
function renderJpeg(img, max, quality) {
  const s = Math.min(1, max / Math.max(img.width, img.height))
  const cv = document.createElement('canvas')
  cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s)
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
  return cv.toDataURL('image/jpeg', quality)
}
// Sizes from one photo: a small READ copy (cheap vision call, never stored) and a high-res
// INSPECTION copy (what a buyer zooms to judge condition — ~685 DPI on a card). A grid
// THUMB joins here when storage is wired (so card lists stay fast).
async function renderSizes(file) {
  const img = await loadImage(file)
  try {
    return {
      read: renderJpeg(img, 1000, 0.85),
      full: renderJpeg(img, 2400, 0.9),
    }
  } finally {
    URL.revokeObjectURL(img.src)
  }
}



// The $ pop-up: list a card without leaving the page. Just the listing facts — ask,
// condition, copies — with the market's own numbers right above the ask so pricing
// isn't a guess. The full modal stays one tap away for everything else.
function QuickSell({ c, store, setField, fromAsk, lastSale, onOpenFull, onClose }) {
  const u = store[c.uid] || {}
  const ct = u.cond_type === 'tag' ? 'graded' : (u.cond_type || 'raw')
  return (
    <div className="sc-overlay" role="dialog" aria-label="List for sale" onClick={(ev) => { if (ev.target === ev.currentTarget) onClose() }}>
      <div className="sc-sheet qs">
        <div className="qs-head">
          <div>
            <div className="ek">For sale</div>
            <div className="qs-title">{nm(c)} <span className="mono dim">{c.num}</span></div>
          </div>
          <button className="primary qs-done" onClick={onClose}>done</button>
        </div>
        <div className="qs-mkt mono">
          {fromAsk != null ? `market: from ${fromAsk} USDC` : 'market: nobody else is asking'}
          {lastSale ? ` · last settled ${lastSale.p} USDC (${lastSale.d})` : ' · no settlements on record'}
        </div>
        <div className="qs-body">
          <Frow label="Ask"><span className="fpre">$</span><input className="ti num" type="number" min="0" placeholder="USDC" autoFocus value={u.ask || ''} onChange={(ev) => setField(c.uid, 'ask', ev.target.value)} /></Frow>
          <Frow label="Condition">
            <select className="ti condtype" value={ct} onChange={(ev) => { setField(c.uid, 'cond_type', ev.target.value); setField(c.uid, 'cond_grade', ''); setField(c.uid, 'cond_grader', '') }}>
              {COND_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {ct === 'graded' && (
              <select className="ti condgrader" value={u.cond_grader || ''} onChange={(ev) => { setField(c.uid, 'cond_grader', ev.target.value); setField(c.uid, 'cond_type', 'graded') }}>
                <option value="">grader…</option>
                {GRADERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            )}
            <select className="ti condgrade" value={u.cond_grade || ''} onChange={(ev) => setField(c.uid, 'cond_grade', ev.target.value)}>
              <option value="">{gradePrompt(ct)}</option>
              {(COND_GRADES[ct] || COND_GRADES.raw).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Frow>
          <Frow label="Copies"><input className="ti num" type="number" min="1" value={u.copies || 1} onChange={(ev) => setField(c.uid, 'copies', Math.max(1, parseInt(ev.target.value || '1', 10)))} /></Frow>
        </div>
        <div className="qs-foot">
          <button className="ghost sm" onClick={() => { setField(c.uid, 'sell', false); onClose() }}>✕ unlist</button>
          <button className="ghost sm" onClick={() => { onClose(); onOpenFull(c.uid) }}>open the full card →</button>
        </div>
      </div>
    </div>
  )
}

// Market context for one card: current asks (availability) + recorded settlements.
// Asks are sellers' claims; a settlement is a trade that closed through escrow — the
// one price fact the protocol can state in its own voice. All of it sample data for now.
function MarketBlock({ c, market, mockSales, onBrowseCard }) {
  const asks = useMemo(() => (market?.sellers || [])
    .flatMap((s) => s.listings.filter((l) => l.uid === c.uid).map((l) => ({ s, l })))
    .sort((a, b) => a.l.ask - b.l.ask), [market, c])
  const sales = [...((mockSales || {})[c.uid] || []), ...((market?.sales || {})[c.uid] || [])]
  if (!market) return null
  const copies = asks.reduce((n, { l }) => n + (l.copies || 1), 0)
  return (
    <div className="mkb">
      <div className="mkb-head">
        <span className="mkb-title mono">market</span>
        <span className="mkb-sample mono">sample data</span>
        {asks.length > 0 && onBrowseCard && (
          <button className="mkb-browse mono" onClick={() => onBrowseCard(c.uid)}>browse →</button>
        )}
      </div>
      <div className="mkb-sec mono">{asks.length
        ? `available now — ${asks.length} ask${asks.length === 1 ? '' : 's'} · ${copies} cop${copies === 1 ? 'y' : 'ies'} · from ${asks[0].l.ask} USDC`
        : 'available now — nobody is asking'}</div>
      {asks.slice(0, 3).map(({ s, l }, i) => (
        <div className="mkb-row" key={i}>
          <button className="mkb-who" onClick={() => onBrowseCard && onBrowseCard(c.uid)} title="see it on the market">{handleFor(s.id)}</button>
          <span className="mono mkb-cond" title="the seller&rsquo;s claim">{l.cond}</span>
          <span className={'mono mkb-wit' + (l.witness ? ' ok' : '')}>{l.witness ? `✓ witness ·${l.witness}` : '— no scan'}</span>
          <span className="mono mkb-p">{l.ask} USDC</span>
        </div>
      ))}
      {asks.length > 3 && <button className="mkb-more mono" onClick={() => onBrowseCard && onBrowseCard(c.uid)}>+ {asks.length - 3} more →</button>}
      <div className="mkb-sec mono" title="trades that closed through escrow — recorded, not appraised">{sales.length
        ? `recorded settlements — last ${sales[0].p} USDC · ${sales[0].d}`
        : 'recorded settlements — none on record'}</div>
      {sales.slice(0, 4).map((x, i) => (
        <div className="mkb-row sale" key={i}>
          <span className="mono mkb-d">{x.d}{x.mock ? ' · mock' : ''}</span>
          <span className="mono mkb-cond">{x.cond}</span>
          <span className={'mono mkb-wit' + (x.wit ? ' ok' : '')}>{x.wit ? '✓ witnessed' : '—'}</span>
          <span className="mono mkb-p">{x.p} USDC</span>
        </div>
      ))}
      <div className="mkb-note">A settlement is a closed escrow trade — a recorded fact, not an appraisal. Asks are sellers&rsquo; claims.</div>
    </div>
  )
}

function CardModal({ uid, data, setById, store, setStance, setField, agentName, userPhoto, accountId, onClose, market, mockSales, onBrowseCard }) {
  const [zoom, setZoom] = useState(false)  // fullscreen image view
  useScrollLock() // modal is mounted only while open
  const [recOpen, setRecOpen] = useState(false) // the dark-bench record (machine forms live there, not at glance)
  const [pileView, setPileView] = useState(null) // { frame, quad, verified } — the witness photo with this card outlined
  const openPile = async (entry) => {
    const p = (entry.pile || [])[0]
    if (!p) return
    try {
      const frame = await getPhoto(`frame:${p.f}`)
      if (!frame) return
      setPileView({ frame, quad: p.q, verified: hashText(frame) === p.f })
    } catch { /* witness unavailable — button simply does nothing */ }
  }
  const { address: walletAddr } = useEscrowWallet()
  const [sheetCopied, setSheetCopied] = useState(false)
  // The trade sheet: a PLAINTEXT handoff the seller pastes into chat as text. Deliberately
  // not a link (links are the drainer pattern this circle is trained to distrust) — the
  // buyer navigates to cairn.cards themselves and pastes it into Trades. Legible by
  // design: every line the buyer pastes is a line they can read.
  const tradeSheet = () => {
    const u2 = store[c.uid] || {}
    const condStr = [
      (u2.cond_type === 'graded' || u2.cond_type === 'tag') ? ['graded', u2.cond_grader].filter(Boolean).join(' · ') : (u2.cond_type || 'raw'),
      u2.cond_grade,
    ].filter(Boolean).join(' · ')
    const seller = walletAddr || accountId || ''
    return [
      'CAIRN TRADE SHEET',
      `card       ${nm(c)} · ${c.num}`,
      `condition  ${condStr}`,
      u2.ask ? `ask        ${u2.ask} USDC` : null,
      seller ? `seller     ${seller}` : null,
    ].filter(Boolean).join('\n')
  }
  const copySheet = async () => {
    try { await navigator.clipboard.writeText(tradeSheet()) } catch { return }
    setSheetCopied(true)
    setTimeout(() => setSheetCopied(false), 2400)
  }
  const [imp, setImp] = useState('idle')   // photo-import: idle -> reading -> review -> added / error
  const [photo, setPhoto] = useState(null) // the high-res inspection copy shown in the modal
  const [read, setRead] = useState(null)   // the vision agent's read of it
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { if (zoom) setZoom(false); else onClose() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, zoom])
  const c = byUid(data, uid)
  if (!c || !c.set_id) return null
  const e = effStance(c, store)
  const s = setById[c.set_id] || {}
  const u = store[c.uid] || {}
  const types = (c.types || []).join(' / ')
  const active = wantActive(c, store)
  const condVal = u.want_cond !== undefined ? u.want_cond : (c.want_cond || 'any')
  const maxVal = u.want_max !== undefined ? u.want_max : (c.want_max || '')
  const dot = c.image_status === 'exact_source' ? 'lg-exact' : c.image_status === 'no_rarity_reference' ? 'lg-nr' : 'lg-ref'
  const issues = c.issues || []
  const norm = (t) => (t || '').replace(/\s+/g, ' ').trim()
  const visibleEffects = (c.effects || []).filter((x) => x && (x.label || x.text))
    .filter((x) => !(c.card_text && x.label && norm(c.card_text).toLowerCase().includes(`[${x.label}]`.toLowerCase()))) // rules text already carries this labeled effect
    .filter((x) => !(x.text && c.card_text && norm(c.card_text).includes(norm(x.text).slice(0, 80)))) // or the verbatim text
  const shownImg = (imp !== 'idle' && photo) ? photo : (userPhoto || c.image)
  const onPhoto = async (file) => {
    if (!file) return
    let imgs
    try { imgs = await renderSizes(file) } catch { setRead({ error: 'bad_image' }); setImp('error'); return }
    setPhoto(imgs.full); setRead(null); setImp('reading')
    try {
      const expect = { name: c.name_en || nm(c), num: c.num, release: c.release_family }
      const r = await fetch(API_BASE + '/api/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: imgs.read, expect }) })
      const d = await r.json()
      if (!r.ok || d.error) { setRead(d); setImp('error'); return }
      setRead(d); setImp('review')
    } catch (err) { setRead({ error: String(err) }); setImp('error') }
  }
  return (
    <>
    <div className="modal" onClick={(ev) => { if (ev.target === ev.currentTarget) onClose() }}>
      <div className="sheet" role="dialog" aria-modal="true">
        <button className="mx" onClick={onClose} aria-label="close">✕</button>
        <div className="mcols">
          <div className="mleft">
            <div className={'mcard ' + (e.stance === 'have' ? 'own' : 'ghost')}>
              {shownImg
                ? <img src={shownImg} className={'zoomable' + (imp === 'reading' || imp === 'review' ? ' pending' : '')} alt={nm(c)} onClick={() => setZoom(true)} onError={(ev) => retryImg(ev, shownImg)} />
                : <div className="noimg"><div className="ja">{nm(c)}</div><div className="nn">no reference image on file</div></div>}
              {c.holo ? <span className="holodot" title={c.star_alt ? 'star / alternate-art signal' : 'holo'} /> : null}
              {shownImg && <button className="zoombtn" onClick={() => setZoom(true)} title="View full screen" aria-label="View full screen">⛶</button>}
              {imp === 'added' && <span className="contribbadge">collector photo · witness, not proof</span>}
            </div>
            {IMPORT_ON && imp === 'idle' && (
              <label className="addphoto">
                <span className="apt">＋ Add your photo</span>
                <span className="aps">{c.image ? 'add a photo of your copy' : 'no official pic yet — yours becomes the catalog’s first'}</span>
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(ev) => onPhoto(ev.target.files && ev.target.files[0])} />
              </label>
            )}
            {imp === 'reading' && (
              <div className="imprev">
                <div className="imhd"><span className="ek2 agent">{agentName} is reading your photo…</span></div>
                <div className="imrow imdim">checking the card, the number, the α stamp…</div>
              </div>
            )}
            {imp === 'review' && read && (
              <div className="imprev">
                <div className="imhd"><span className="ek2 agent">{agentName}&rsquo;s read</span><span className="imtag">judged</span></div>
                {read.matches_expected
                  ? <div className="imrow"><span className="ick">✓</span> Matches <b>{nm(c)}</b> · {c.num}</div>
                  : <div className="imrow"><span className="iwarn">⚠</span> Doesn&rsquo;t look like <b>{nm(c)}</b>{read.name_read ? <> — reads as <b>{read.name_read}</b></> : null}</div>}
                {read.alpha_stamp === 'present'
                  ? <div className="imrow"><span className="ick">✓</span> Alpha <span className="agly">α</span> stamp detected{read.alpha_where ? <span className="imdim"> · {read.alpha_where}</span> : null}</div>
                  : <div className="imrow"><span className="iwarn">⚠</span> No <span className="agly">α</span> stamp seen{c.release_family === 'alpha' ? <span className="imdim"> — expected on an Alpha print</span> : null}</div>}
                {(read.red_flags || []).map((f, i) => <div className="imrow imflag" key={i}>⚑ {f}</div>)}
                <div className="imcav">A collector&rsquo;s photo of one physical card — a witness, not proof of authenticity or condition.</div>
                <div className="imact">
                  <button className="btn-add" onClick={() => setImp('added')}>{read.matches_expected ? 'Looks right — add it' : 'Add it anyway'}</button>
                  <label className="btn-no">Try another<input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(ev) => onPhoto(ev.target.files && ev.target.files[0])} /></label>
                </div>
              </div>
            )}
            {imp === 'error' && (
              <div className="imprev">
                <div className="imrow imflag">⚑ Couldn&rsquo;t read that photo{read && read.error ? <span className="imdim"> ({read.error})</span> : null}.</div>
                <div className="imact"><label className="btn-no">Try another<input type="file" accept="image/*" style={{ display: 'none' }} onChange={(ev) => onPhoto(ev.target.files && ev.target.files[0])} /></label></div>
              </div>
            )}
            {imp === 'added' && (
              <div className="contribnote">Added as <b>your</b> collector photo. <span className="imdim">(Saved to your view for now — shared, recorded storage is the next step.)</span></div>
            )}
          </div>
          <div className="mright">
            <div className="m-set mono">{[s.label, s.code, s.date].filter(Boolean).join('  ·  ')}</div>
            <h2 className="m-name">{nm(c)}</h2>
            <div className="m-sub">
              <span className="cnum mono">#{c.num}</span>
              {(c.romaji || c.name_en) && nm(c) !== (c.romaji || c.name_en) ? <span> · {c.romaji || c.name_en}</span> : null}
              {c.name_is_en && <span className="enmark">EN</span>}
            </div>
            <div className="m-attrs">
              {[c.release_family_label, c.product_channel_label, c.category, types, c.star_alt ? '★ alt art' : c.holo ? 'holo' : '', c.rarity, c.band_rank ? 'attention-tier ' + c.band_rank : '']
                .map((t, i) => mpill(t, i))}
            </div>
            <div className="m-stance">
              <button className={'mseg sg-have' + (e.stance === 'have' ? ' on' : '')} onClick={() => setStance(c.uid, e.stance === 'have' ? 'none' : 'have')}>Have</button>
              <button className={'mseg sg-want' + (e.stance === 'want' ? ' on' : '')} onClick={() => setStance(c.uid, e.stance === 'want' ? 'none' : 'want')}>Want</button>
            </div>
            {(e.stance === 'have' || e.stance === 'want') && (
              <button className={'grailtog' + (e.grail ? ' on' : '')} onClick={() => setField(c.uid, 'grail', !e.grail)}>
                <span className="gstar">★</span>{e.grail ? 'Grail — top of your list' : 'Mark as grail'}
              </button>
            )}
            <div className="m-fields">
              {e.stance === 'have' && <>
                <div className="listrow">
                  <button className={'listtog' + (e.sell ? ' on' : '')} onClick={() => setField(c.uid, 'sell', !e.sell)}>
                    {e.sell ? '● For sale' : '○ List for sale'}
                  </button>
                  <button className={'listtog' + (e.trade ? ' on' : '')} onClick={() => setField(c.uid, 'trade', !e.trade)}>
                    {e.trade ? '⇄ Open to trade' : '○ Open to trade'}
                  </button>
                </div>
                {(e.sell || e.trade) && <div className="listhint dim">{e.sell && e.trade ? 'On your table for sale or swap.'
                  : e.sell ? 'On your table — buyers copy your sheet and fund escrow.'
                  : 'On your table — a trader can offer one of their cards for it.'}</div>}
                <Frow label="Condition">
                  <select className="ti condtype" value={u.cond_type === 'tag' ? 'graded' : (u.cond_type || 'raw')} onChange={(ev) => { setField(c.uid, 'cond_type', ev.target.value); setField(c.uid, 'cond_grade', ''); setField(c.uid, 'cond_grader', '') }}>
                    {COND_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  {(u.cond_type === 'graded' || u.cond_type === 'tag') && (
                    <select className="ti condgrader" value={u.cond_grader || (u.cond_type === 'tag' ? 'TAG' : '')} onChange={(ev) => { setField(c.uid, 'cond_grader', ev.target.value); setField(c.uid, 'cond_type', 'graded') }}>
                      <option value="">grader…</option>
                      {GRADERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  )}
                  <select className="ti condgrade" value={u.cond_grade || ''} onChange={(ev) => setField(c.uid, 'cond_grade', ev.target.value)}>
                    <option value="">{gradePrompt(u.cond_type === 'tag' ? 'graded' : (u.cond_type || 'raw'))}</option>
                    {(COND_GRADES[u.cond_type === 'tag' ? 'graded' : (u.cond_type || 'raw')] || COND_GRADES.raw).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Frow>
                {(e.trade || e.sell) && <>
                  <Frow label="Ask"><span className="fpre">$</span><input className="ti num" type="number" min="0" placeholder="USDC" value={u.ask || ''} onChange={(ev) => setField(c.uid, 'ask', ev.target.value)} /></Frow>
                  <button className="sheetbtn mono" onClick={copySheet}>{sheetCopied ? '✓ copied. paste it to your buyer as text' : '⎘ Copy trade sheet'}</button>
                  <div className="sheethint">Plain text, not a link. Your buyer opens cairn.cards themselves and pastes it into Trades. They can read every line.</div>
                </>}
                <Frow label="Copies"><input className="ti num" type="number" min="1" value={u.copies || 1} onChange={(ev) => setField(c.uid, 'copies', Math.max(1, parseInt(ev.target.value || '1', 10)))} /></Frow>
                <Frow label="Notes"><textarea className="ti" rows={2} placeholder="surface, provenance, anything to remember…" value={u.note || ''} onChange={(ev) => setField(c.uid, 'note', ev.target.value)} /></Frow>
              </>}
              {e.stance === 'want' && <>
                <Frow label="Condition"><select className="ti" value={condVal} onChange={(ev) => setField(c.uid, 'want_cond', ev.target.value)}>{COND_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Frow>
                <Frow label="Max price"><span className="fpre">$</span><input className="ti num" type="number" min="0" placeholder="—" value={maxVal} onChange={(ev) => setField(c.uid, 'want_max', ev.target.value)} /></Frow>
                <Frow label="Notes"><textarea className="ti" rows={2} placeholder="why you want it, deal terms…" value={u.note || ''} onChange={(ev) => setField(c.uid, 'note', ev.target.value)} /></Frow>
                <div className="fnote">{active
                  ? <><b>Active hunt.</b> {agentName} flags matches that meet your condition and budget.</>
                  : <><b>On your wishlist.</b> Set a condition or budget to make it an active hunt.</>}</div>
              </>}
              {e.stance === 'none' && <div className="fnote">Pick <b>Have</b> or <b>Want</b> — or neither. Have records condition and copies; Want sets the terms your agent hunts to. Tap again to clear.</div>}
            </div>
            <MarketBlock c={c} market={market} mockSales={mockSales} onBrowseCard={onBrowseCard} />
            {(c.illustrator || c.stamp || c.card_text || visibleEffects.length || c.flavor_text) && (
              <div className="dossier">
                {c.illustrator && <div><b>Illustrator</b><span>{c.illustrator}</span></div>}
                {c.stamp && <div><b>Stamp</b><span>{c.stamp}</span></div>}
                {c.card_text && <div><b>Rules text</b><span>{c.card_text}</span></div>}
                {visibleEffects.map((fx, i) => (
                  <div key={i}><b>{fx.label || 'Effect'}</b><span>{fx.text || 'Effect label only.'}</span></div>
                ))}
                {c.flavor_text && <div><b>Flavor</b><span>{c.flavor_text}</span></div>}
              </div>
            )}
            <div className="provbox">
              <div className="pt"><span className={'lgdot ' + dot} /> Image provenance</div>
              <div className="pb">
                <b>{c.image ? (PROV_LABEL[c.image_status] || 'Reference image') : 'No image on file'}.</b>{' '}
                {c.image_status === 'no_rarity_reference'
                  ? 'Source-labeled No Rarity reference.'
                  : c.image_status === 'no_reference_photo'
                    ? 'The candidate image was suppressed by the catalogue audit. This row currently has no honest reference photo.'
                  : c.image_status === 'user_observation_no_public_image'
                    ? 'Observation row from a user-provided image. The image hash is recorded in the catalog layer, but the image itself is not published here.'
                  : c.image
                    ? 'Reference witness — not seller evidence, authentication, or proof of a specific physical card.'
                    : 'No reference image has been sourced for this print yet.'}
                {c.name_is_en && <><br />Japanese print name not yet sourced; the provider’s English label is shown (marked EN).</>}
              </div>
            </div>
            {(u.pile || []).length > 0 && (
              <button className="recopen mono" onClick={() => openPile(u)}>▦ view in pile · the witness photo</button>
            )}
            <button className="recopen mono" onClick={() => setRecOpen(!recOpen)}>{recOpen ? '▾ the record' : `▸ open the record${issues.length ? ` · ${issues.length} catalog note${issues.length > 1 ? 's' : ''}` : ''}`}</button>
            {recOpen && (
              <div className="benchrec mono">
                <div className="br-t">the record — this row&rsquo;s machine forms</div>
                <div>catalog {c.catalog_hash || '—'}</div>
                <div>row {c.row_id ?? '—'}</div>
                {c.source_entry_id && <div>source {c.source_entry_id}</div>}
                <div>image_status {c.image_status || '—'}</div>
                {issues.map((i, idx) => <div key={idx}>note [{i.severity || 'info'}] {(i.codes || []).join(' ')}{i.notes ? ` · ${i.notes}` : (i.recommended_action ? ` · ${i.recommended_action}` : '')}</div>)}
                <div className="br-b">identifiers as the catalog holds them — a record, not proof.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    {pileView && (
      <div className="lightbox" onClick={() => setPileView(null)}>
        <button className="lbx" onClick={() => setPileView(null)} aria-label="close pile view">✕</button>
        <div className="pilewrap" onClick={(ev) => ev.stopPropagation()}>
          <img src={pileView.frame} alt="the pile photo this card was scanned from" />
          <svg className="pileoutline" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
            <polygon points={pileView.quad.map(([x, y]) => `${x * 1000},${y * 1000}`).join(' ')} />
          </svg>
          <div className={'pilebadge mono' + (pileView.verified ? '' : ' bad')}>
            {pileView.verified ? '✓ witness verified · keccak matches the record' : '⚑ witness altered — hash does not match'}
          </div>
        </div>
      </div>
    )}
    {zoom && shownImg && (
      <div className="lightbox" onClick={() => setZoom(false)}>
        <button className="lbx" onClick={() => setZoom(false)} aria-label="close full screen">✕</button>
        <img src={shownImg} alt={nm(c)} onClick={(ev) => ev.stopPropagation()} onError={(ev) => retryImg(ev, shownImg)} />
      </div>
    )}
    </>
  )
}

// The agent PROPOSED a bulk change to your own cards; this bar is the enforced half:
// code resolved the exact set from your store, and nothing writes until you tap apply.
const ACTION_VERB = {
  mark_have: 'mark as have', mark_want: 'mark as want',
  list_for_sale: 'list for sale', open_to_trade: 'open to trade',
  unlist: 'unlist', close_trade: 'close to trade',
}
function ActionBar({ agentName, plan, reading, done, onApply, onUndo, onDismiss }) {
  const touched = Object.keys(plan.draft).length
  const total = Math.round(plan.steps.reduce((t, st) => t + (st.op === 'list_for_sale' && st.ask != null ? st.ask * st.affected.length : 0), 0) * 100) / 100
  return (
    <div className="aprop">
      <span className="atag jud">{agentName} · proposes{plan.steps.length > 1 ? ` · ${plan.steps.length} steps, in order` : ''}</span>
      {plan.steps.map((st, i) => {
        const n = st.affected.length
        const names = st.affected.slice(0, 3).map((c) => c.name_en || c.uid).join(', ')
        return (
          <div className="aprop-line" key={i}>
            {plan.steps.length > 1 && <span className="mono dim">{i + 1}. </span>}
            {ACTION_VERB[st.op]} <b>{n}</b> card{n === 1 ? '' : 's'}
            {st.ask != null && n > 0 && <> at <b>{st.ask} USDC</b> each</>}
            {n > 0 ? <span className="dim"> — {names}{n > 3 ? ` +${n - 3} more` : ''}</span>
              : <span className="dim"> — nothing to change</span>}
          </div>
        )
      })}
      {total > 0 && <div className="aprop-read">asks total <b>{total} USDC</b> across the plan</div>}
      {reading && <div className="aprop-read dim">{reading}</div>}
      {done
        ? <div className="aprop-acts">
            <span className="aprop-done mono">✓ done — {done.n} card{done.n === 1 ? '' : 's'} changed{done.steps > 1 ? ` across ${done.steps} steps` : ''}</span>
            <button className="ghost sm" onClick={onUndo}>undo</button>
            <button className="ghost sm" onClick={onDismiss}>✕</button>
          </div>
        : <div className="aprop-acts">
            <button className="aprop-apply" onClick={onApply} disabled={!touched}>{touched ? 'apply' : 'nothing matches'}</button>
            <button className="ghost sm" onClick={onDismiss}>cancel</button>
            {plan.steps.some((st) => st.op === 'list_for_sale' && st.ask == null && st.affected.length > 0) && <span className="dim aprop-note">no price named on a listing step — those cards list without an ask</span>}
          </div>}
    </div>
  )
}

function AgentPanel({ res, agentName }) {
  if (!res.ok) {
    const off = res.data?.error === 'agent_offline'
    return <div className="apanel"><div className="aoff">{off ? 'Your agent is offline right now (the model isn’t running).' : 'Could not reach your agent.'}</div></div>
  }
  const o = res.data, f = o.filter || {}, r = o.result || {}
  const dims = ['release_family', 'product_channel', 'holo', 'star_alt', 'owned', 'exclude_grails', 'set', 'character', 'category', 'element', 'rarity']
  const chips = dims.filter((k) => f[k] != null && f[k] !== false)
  const flags = o.overclaim_flags || []
  return (
    <div className="apanel">
      <span className="atag enf">enforced · code</span>
      <div className="achips">
        {chips.length ? chips.map((k) => <span key={k} className="fc"><i>{k}</i>{String(f[k])}</span>) : <span className="fc faint">no filter — whole catalog</span>}
      </div>
      <div className="acut">cut to <b>{o.n_survivors}</b> candidates{f.reading ? <span className="aread"> · {f.reading}</span> : null}</div>
      <span className="atag jud">{agentName} · judged</span>
      <div className="acomm">{r.commentary}</div>
      {r.caveat && <div className="acav">⚠ {r.caveat}</div>}
      {flags.length > 0 && <div className="aflag">no-overclaim check flagged: <b>{flags.join(', ')}</b> — surfaced, not hidden.</div>}
    </div>
  )
}

// The binder's pocket-page layout: the SAME filtered rows as the grid, shown as 3×3
// pocket pages. Every pocket — filled or ghost — opens the full card modal, so search,
// the agent, filters, and the scanner all operate on the binder itself.
function PocketPages({ rows, store, userPhotos, onOpen, setField, askIndex, onQuickSell }) {
  const [page, setPage] = useState(0)
  useEffect(() => { setPage(0) }, [rows.length]) // eslint-disable-line react-hooks/set-state-in-effect -- filters changed; back to page 1
  const pages = []
  for (let i = 0; i < rows.length; i += 9) pages.push(rows.slice(i, i + 9))
  const pg = pages[Math.min(page, pages.length - 1)] || []
  const filled = pg.filter((c) => effStance(c, store).stance === 'have').length
  return (
    <div className="bv">
      <div className="bv-head">
        <div className="bv-title">Page {Math.min(page, pages.length - 1) + 1} of {pages.length}
          <span className="dim"> · {filled} of {pg.length} pockets filled</span></div>
        <div className="bv-comp mono">{rows.filter((c) => effStance(c, store).stance === 'have').length} / {rows.length}</div>
      </div>
      <div className="bv-page">
        {pg.map((c) => {
          const e = effStance(c, store)
          const img = userPhotos[c.uid] || c.image
          const fromAsk = askIndex ? askIndex.get(c.uid) : null
          if (e.stance === 'have') {
            return (
              <div key={c.uid} className="bv-pocket filled" role="button" tabIndex={0} onClick={() => onOpen(c.uid)}
                onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') onOpen(c.uid) }}>
                {img ? <img src={img} alt={nm(c)} loading="lazy" /> : <span className="bv-noimg">{nm(c)}</span>}
                {(e.copies || (store[c.uid] || {}).copies || 1) > 1 && <span className="bv-count mono">×{(store[c.uid] || {}).copies}</span>}
                {e.grail && <span className="bv-grail">★</span>}
                {fromAsk != null && <span className="bv-from onart mono">from {fromAsk} USDC</span>}
                <span className="bv-q">
                  <button className={'bv-qb' + (e.sell ? ' on' : '')} title={e.sell ? 'listed for sale — tap to unlist' : 'list for sale'}
                    onClick={(ev) => { ev.stopPropagation(); const on = !e.sell; setField(c.uid, 'sell', on); if (on && onQuickSell) onQuickSell(c.uid) }}>$</button>
                  <button className={'bv-qb' + (e.trade ? ' on' : '')} title={e.trade ? 'open to trade — tap to close' : 'open to trade'}
                    onClick={(ev) => { ev.stopPropagation(); setField(c.uid, 'trade', !e.trade) }}>⇄</button>
                </span>
              </div>
            )
          }
          return (
            <button key={c.uid} className={'bv-pocket ghost' + (e.stance === 'want' ? ' wanted' : '')} onClick={() => onOpen(c.uid)}>
              <span className="mono bv-gnum">{c.num}</span>
              <span className="bv-gtxt">{e.stance === 'want' ? 'wanted ✓' : nm(c)}</span>
              {fromAsk != null && <span className="bv-from mono">from {fromAsk} USDC</span>}
            </button>
          )
        })}
      </div>
      <div className="bv-nav">
        <button className="ghost sm" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>← page {page}</button>
        <span className="dim bv-hint">every pocket opens the card — gaps included</span>
        <button className="ghost sm" disabled={page >= pages.length - 1} onClick={() => setPage((p) => p + 1)}>page {page + 2} →</button>
      </div>
    </div>
  )
}

// Stance lives in chips; Product / Type / Element are collapsed into the filters sheet (see render).
function chipsFor() {
  return [
    { l: 'All', g: 'all' },
    { l: 'Have', g: 'stance', v: 'have' },
    { l: 'Want', g: 'stance', v: 'want', acc: 1 },
    { l: 'Selling', g: 'stance', v: 'selling' },
  ]
}

export default function Binder({ accountId, agentName, catalog = DEFAULT_CATALOG, onBrowseCard }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [store, setStore] = useState({})
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('') // the unified search/ask input text
  const [stanceF, setStanceF] = useState(() => new Set())
  const [familyF, setFamilyF] = useState(() => new Set())
  const [channelF, setChannelF] = useState(() => new Set())
  const [catF, setCatF] = useState(() => new Set())
  const [elementF, setElementF] = useState(() => new Set())
  const [rarityF, setRarityF] = useState(() => new Set())
  const [holoOnly, setHoloOnly] = useState(false)
  const [agentRes, setAgentRes] = useState(null)
  const [agentBusy, setAgentBusy] = useState(false)
  const [selected, setSelected] = useState(null)
  const [sellPop, setSellPop] = useState(null) // uid being quick-listed via the $ mark
  const [actionDone, setActionDone] = useState(null) // last applied agent proposal
  const undoStore = useRef(null) // store snapshot from before the proposal applied
  const [userPhotos, setUserPhotos] = useState({}) // uid -> your scanned photo (from IndexedDB)
  const [filtersOpen, setFiltersOpen] = useState(false)
  useScrollLock(filtersOpen)
  const [view, setView] = useState(() => { try { return localStorage.getItem('cairn-view') || 'pages' } catch { return 'pages' } })
  const chooseView = (v) => { setView(v); try { localStorage.setItem('cairn-view', v) } catch { /* ignore */ } }
  const storeKey = accountId ? `cairn-cards:${catalog.id}:${accountId}` : `cairn-cards:${catalog.id}`
  const [mkt, setMkt] = useState(null) // the market payload: sellers' asks + recorded settlements
  const [mockRev, setMockRev] = useState(0)
  useEffect(() => {
    const onStore = () => {
      try { setStore(JSON.parse(localStorage.getItem(storeKey) || 'null') || {}) } catch { /* keep current */ }
      setMockRev((r) => r + 1)
    }
    const onMock = () => setMockRev((r) => r + 1)
    window.addEventListener('cairn-store', onStore)
    window.addEventListener('cairn-mock', onMock)
    return () => { window.removeEventListener('cairn-store', onStore); window.removeEventListener('cairn-mock', onMock) }
  }, [storeKey])
  const mockSales = useMemo(() => loadMockSales(mockSalesKeyFor(catalog.id)), [catalog, mockRev]) // eslint-disable-line react-hooks/exhaustive-deps -- mockRev is the invalidation signal
  // one filtered view of the market — listings you already bought (mock) are gone
  // everywhere: the ask index, the card modal's ledger, the from-ask strips.
  const mktEff = useMemo(() => {
    if (!mkt) return null
    const gone = new Set(loadHidden(hiddenKeyFor(catalog.id, accountId)).map((h) => h.seller + '|' + h.uid))
    if (!gone.size) return mkt
    return { ...mkt, sellers: mkt.sellers.map((sl) => ({ ...sl, listings: sl.listings.filter((l) => !gone.has(sl.id + '|' + l.uid)) })) }
  }, [mkt, catalog, accountId, mockRev]) // eslint-disable-line react-hooks/exhaustive-deps -- mockRev is the invalidation signal
  const askIndex = useMemo(() => {
    if (!mktEff) return null
    const m = new Map()
    for (const sl of mktEff.sellers) for (const l of sl.listings) {
      const cur = m.get(l.uid)
      if (cur == null || l.ask < cur) m.set(l.uid, l.ask)
    }
    return m
  }, [mktEff])

  useEffect(() => {
    let live = true
    fetch((import.meta.env.BASE_URL || '/') + 'market-sample.json')
      .then((r) => r.json())
      .then((m) => { if (live) setMkt(m && m.catalog_id === catalog.id ? m : null) })
      .catch(() => {})
    return () => { live = false }
  }, [catalog])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- catalog switches intentionally reset local UI filters before fetching. */
    setData(null); setErr(''); setAgentRes(null); setQ(''); setStanceF(new Set()); setFamilyF(new Set()); setChannelF(new Set()); setCatF(new Set()); setElementF(new Set()); setRarityF(new Set()); setHoloOnly(false)
    fetch(catalogUrl(catalog)).then((r) => r.json()).then(setData).catch((e) => setErr(String(e)))
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [catalog])
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate stance state from localStorage for the selected catalog. */
    try { setStore(JSON.parse(localStorage.getItem(storeKey) || 'null') || {}) } catch { setStore({}) }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [storeKey])

  // Flaky-network recovery: a dropping connection leaves Chrome's reused image loads
  // hung (so onError never fires). Every few seconds, re-trigger any near-viewport card
  // image that still hasn't loaded — a fresh request recovers it. Capped per image.
  useEffect(() => {
    const id = setInterval(() => {
      for (const img of document.querySelectorAll('.cell img')) {
        if (img.naturalWidth > 0) continue
        const r = img.getBoundingClientRect()
        if (r.bottom < -400 || r.top > window.innerHeight + 400) continue
        const n = Number(img.dataset.sweep || 0)
        if (n >= 5) continue
        img.dataset.sweep = String(n + 1)
        img.src = img.src.split('?')[0] + '?s=' + n
      }
    }, 4000)
    return () => clearInterval(id)
  }, [])

  // Show your scanned photos as the card image. Load lazily for scanned uids; reset on
  // catalog/account switch. (commitScans seeds fresh ones directly so they appear at once.)
  useEffect(() => { setUserPhotos({}) /* eslint-disable-line react-hooks/set-state-in-effect -- reset photos on catalog/account switch */ }, [storeKey])
  useEffect(() => {
    let live = true
    const want = Object.keys(store).filter((uid) => store[uid]?.scanned && !(uid in userPhotos))
    if (!want.length) return undefined
    Promise.all(want.map((uid) => getPhoto(`${storeKey}:${uid}`).then((p) => [uid, p || null]).catch(() => [uid, null])))
      .then((entries) => { if (live) setUserPhotos((prev) => ({ ...prev, ...Object.fromEntries(entries) })) })
    return () => { live = false }
  }, [store, storeKey, userPhotos])

  const setById = useMemo(() => Object.fromEntries((data?.sets || []).map((s) => [s.id, s])), [data])
  const SETS = useMemo(() => (data?.sets || []).slice().sort((a, b) => a.order - b.order), [data])

  const setStance = useCallback((uid, st) => {
    setStore((prev) => {
      const cur = effStance(byUid(data, uid), prev).stance
      const u = { ...(prev[uid] || {}) }
      u.stance = cur === st ? 'none' : st
      if (u.stance !== 'have') { u.extra = false; u.trade = false; u.sell = false }
      if (u.stance === 'none' || u.stance === 'pass') u.grail = false
      const next = { ...prev, [uid]: u }
      try { localStorage.setItem(storeKey, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [data, storeKey])

  const setField = useCallback((uid, key, value) => {
    setStore((prev) => {
      const next = { ...prev, [uid]: { ...(prev[uid] || {}), [key]: value } }
      try { localStorage.setItem(storeKey, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [storeKey])

  const [scanning, setScanning] = useState(false)
  // Scan-to-collection: tag each recognized card `have`, keep its photo locally as evidence.
  const commitScans = useCallback((scans) => {
    setStore((prev) => {
      const next = { ...prev }
      for (const s of scans) {
        const copies = Math.max(next[s.uid]?.copies || 0, s.copies || 1)
        // frame anchor: the pile photo is the witness; each copy records where it sits.
        // Frames are content-addressed (keccak) and stored once in IndexedDB.
        const pile = (s.pile || []).slice(0, 8).map((p) => {
          const f = hashText(p.frame)
          putPhoto(`frame:${f}`, p.frame).catch(() => {})
          return { f, q: p.quad }
        })
        next[s.uid] = {
          ...(next[s.uid] || {}), stance: 'have', scanned: true, copies,
          ...(copies > 1 ? { extra: true } : {}),
          ...(s.photo ? { photo_hash: hashText(s.photo) } : {}), // anchors the local photo; verifiable when sync lands
          ...(pile.length ? { pile } : {}),
        }
      }
      try { localStorage.setItem(storeKey, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
    setUserPhotos((prev) => ({ ...prev, ...Object.fromEntries(scans.filter((s) => s.photo).map((s) => [s.uid, s.photo])) }))
    for (const s of scans) if (s.photo) putPhoto(`${storeKey}:${s.uid}`, s.photo).catch(() => {})
  }, [storeKey])

  const askAgent = useCallback(async (call) => {
    setAgentBusy(true)
    setActionDone(null)
    undoStore.current = null
    try {
      const r = await fetch(API_BASE + '/api/browse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ call, catalog: catalog.id }) })
      setAgentRes({ ok: r.ok, data: await r.json() })
    } catch { setAgentRes({ ok: false, data: { error: 'network' } }) }
    finally { setAgentBusy(false) }
  }, [catalog.id])
  const clearAgent = () => { setAgentRes(null); setActionDone(null); undoStore.current = null }

  const agentAction = agentRes?.ok && agentRes.data?.action ? agentRes.data : null
  const agentActive = !agentAction && !!(agentRes?.ok && agentRes.data?.filter)
  const pickSet = useMemo(() => new Set(agentActive ? agentRes.data.result?.picks || [] : []), [agentRes, agentActive])
  // A plan resolves step by step against a DRAFT of your store, so step 2 sees what
  // step 1 changed ("mark commons have; list alpha commons at $2" works in one call).
  const plan = useMemo(() => {
    if (!agentAction || !data) return null
    const steps = Array.isArray(agentAction.action) ? agentAction.action : [agentAction.action]
    const draft = {}
    const eff = (c) => effStance(c, draft[c.uid] ? { [c.uid]: { ...(store[c.uid] || {}), ...draft[c.uid] } } : store)
    const resolved = steps.map((st) => {
      const scope = { ...(st.scope || {}) }
      delete scope.owned // 'my cards' means YOUR store, not the demo catalog flag
      let base = applyAgentFilter(data.cards, scope, setById)
      const op = st.op
      if (op === 'mark_have') base = base.filter((c) => eff(c).stance !== 'have')
      else if (op === 'mark_want') base = base.filter((c) => { const e = eff(c); return e.stance !== 'want' && e.stance !== 'have' })
      else {
        base = base.filter((c) => eff(c).stance === 'have')
        if (op === 'unlist') base = base.filter((c) => eff(c).sell)
        if (op === 'close_trade') base = base.filter((c) => eff(c).trade)
      }
      for (const c of base) {
        const d = draft[c.uid] = draft[c.uid] || {}
        if (op === 'mark_have') d.stance = 'have'
        else if (op === 'mark_want') d.stance = 'want'
        else if (op === 'list_for_sale') { d.sell = true; if (st.ask != null) d.ask = String(st.ask) }
        else if (op === 'open_to_trade') d.trade = true
        else if (op === 'unlist') d.sell = false
        else if (op === 'close_trade') d.trade = false
      }
      return { op, ask: st.ask, affected: base }
    })
    return { steps: resolved, draft }
  }, [agentAction, data, setById, store])
  const applyProposal = () => {
    if (!plan || !Object.keys(plan.draft).length) return
    setStore((prev) => {
      undoStore.current = prev
      const next = { ...prev }
      for (const [uid, d] of Object.entries(plan.draft)) next[uid] = { ...(next[uid] || {}), ...d }
      try { localStorage.setItem(storeKey, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
    setActionDone({ n: Object.keys(plan.draft).length, steps: plan.steps.length })
  }
  const undoProposal = () => {
    if (!undoStore.current) return
    const prev = undoStore.current
    undoStore.current = null
    setStore(prev)
    try { localStorage.setItem(storeKey, JSON.stringify(prev)) } catch { /* ignore */ }
    setActionDone(null)
  }

  const countStance = useCallback((v) => {
    if (!data) return 0
    if (v === 'selling') return data.cards.filter((c) => { const e = effStance(c, store); return e.stance === 'have' && (e.sell || e.trade) }).length
    return data.cards.filter((c) => effStance(c, store).stance === v).length
  }, [data, store])

  const rows = useMemo(() => {
    if (!data) return []
    const passed = (c) => effStance(c, store).stance === 'pass' ? 1 : 0
    const cmp = (a, b) => (setById[a.set_id].order - setById[b.set_id].order) || (passed(a) - passed(b)) || ('' + a.num).localeCompare('' + b.num, undefined, { numeric: true })
    let base = data.cards
    if (agentActive) base = applyAgentFilter(base, agentRes.data.filter || {}, setById)
    if (agentAction && plan) { const ids = new Set(plan.steps.flatMap((st) => st.affected.map((c) => c.uid))); base = base.filter((c) => ids.has(c.uid)) }
    const qq = q.trim().toLowerCase()
    base = base.filter((c) => {
      if (stanceF.size) {
        const e = effStance(c, store)
        if (!((stanceF.has('have') && e.stance === 'have') || (stanceF.has('want') && e.stance === 'want') || (stanceF.has('selling') && e.stance === 'have' && (e.sell || e.trade)))) return false
      }
      if (familyF.size && !familyF.has(c.release_family)) return false
      if (channelF.size) {
        const isStarter = String(c.product_channel || '').startsWith('starter_deck_')
        if (!((channelF.has('starter') && isStarter) || channelF.has(c.product_channel))) return false
      }
      if (catF.size && !catF.has(c.category)) return false
      if (elementF.size && !elementF.has(c.element)) return false
      if (rarityF.size && !rarityF.has(c.rarity)) return false
      if (holoOnly && !c.holo) return false
      if (qq) {
        const hay = (c.num + ' ' + (c.name_en || '') + ' ' + (c.romaji || '') + ' ' + (c.name_ja || '') + ' ' + (c.element || '') + ' ' + (c.rarity || '') + ' ' + (c.illustrator || '') + ' ' + (c.source_entry_id || '') + ' ' + (c.release_family_label || '') + ' ' + (c.product_channel_label || '') + ' ' + (setById[c.set_id]?.label || '')).toLowerCase()
        if (hay.indexOf(qq) < 0) return false
      }
      return true
    })
    if (agentActive) return base.slice().sort((a, b) => (pickSet.has(b.uid) - pickSet.has(a.uid)) || cmp(a, b))
    return base.slice().sort(cmp)
  }, [data, q, stanceF, familyF, channelF, catF, elementF, rarityF, holoOnly, store, setById, agentRes, agentActive, pickSet, agentAction, plan])

  const grouped = !q.trim() && !agentActive
  const CHIPS = useMemo(() => chipsFor(), [])
  const CHANNELS = useMemo(() => data?.ui?.product_channel_chips || [], [data])
  const CATS = useMemo(() => data?.ui?.category_chips || [], [data])
  const ELEMENTS = useMemo(() => data?.ui?.element_chips || [], [data])
  const FAMILIES = useMemo(() => data?.ui?.family_chips || [], [data])
  // Open on the release family with the most card art, so AZUKI lands on Gates Awakened rather than
  // Alpha's master-sheet-only rows (which have no individual photo). User can switch to All / Alpha freely.
  useEffect(() => {
    if (!data) return
    const fams = data.ui?.family_chips || []
    if (fams.length < 2) return
    const best = fams.map((f) => ({ v: f.value, n: data.cards.filter((c) => c.release_family === f.value && c.image).length }))
      .sort((a, b) => b.n - a.n)[0]
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- default the release view once per catalog load. */
    if (best && best.n > 0) setFamilyF(new Set([best.v]))
  }, [data])
  const toggleChip = (ch) => {
    if (ch.g === 'all') { setStanceF(new Set()); setFamilyF(new Set()); setChannelF(new Set()); setCatF(new Set()); setElementF(new Set()); setRarityF(new Set()); setHoloOnly(false) }
    else if (ch.g === 'stance') setStanceF((p) => toggle(p, ch.v))
    else if (ch.g === 'family') setFamilyF((p) => toggle(p, ch.v))
    else if (ch.g === 'channel') setChannelF((p) => toggle(p, ch.v))
    else if (ch.g === 'cat') setCatF((p) => toggle(p, ch.v))
    else if (ch.g === 'element') setElementF((p) => toggle(p, ch.v))
    else if (ch.g === 'holo') setHoloOnly((v) => !v)
  }
  const chipOn = (ch) => ch.g === 'all'
    ? (!stanceF.size && !familyF.size && !channelF.size && !catF.size && !elementF.size && !holoOnly)
    : ch.g === 'stance' ? stanceF.has(ch.v)
      : ch.g === 'family' ? familyF.has(ch.v)
        : ch.g === 'channel' ? channelF.has(ch.v)
          : ch.g === 'cat' ? catF.has(ch.v)
            : ch.g === 'element' ? elementF.has(ch.v)
              : holoOnly

  if (err) return <div className="empty">could not load catalog ({err})</div>
  if (!data) return <div className="empty">loading catalog…</div>

  const refineCount = channelF.size + catF.size + elementF.size + rarityF.size + (holoOnly ? 1 : 0)
  // typing filters live (q); "Ask" sends the text to the agent and drops the substring filter
  const ask = () => { const c = query.trim(); if (c && !agentBusy) { askAgent(c); setQ('') } }
  const cardEl = (c, showSet) => <Card key={c.uid} c={c} store={store} setStance={setStance} setField={setField} showSet={showSet} setLabel={setById[c.set_id]?.label} pick={pickSet.has(c.uid)} onOpen={setSelected} userPhoto={userPhotos[c.uid]} fromAsk={askIndex ? askIndex.get(c.uid) : null} onQuickSell={setSellPop} />
  const groups = {}
  if (grouped) rows.forEach((c) => (groups[c.set_id] = groups[c.set_id] || []).push(c))

  return (
    <>
      <div className="tallies mono">
        <span><b className="t-have">{countStance('have')}</b> have</span>
        <span><b className="t-want">{countStance('want')}</b> want</span>
        <span><b>{data.summary.cards}</b> in catalog</span>
        <button className="scanbtn" onClick={() => setScanning(true)} aria-label="Scan cards to add">
          <svg className="scanico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8.5V6.5A2.5 2.5 0 0 1 6.5 4H8.5" /><path d="M15.5 4H17.5A2.5 2.5 0 0 1 20 6.5V8.5" />
            <path d="M20 15.5V17.5A2.5 2.5 0 0 1 17.5 20H15.5" /><path d="M8.5 20H6.5A2.5 2.5 0 0 1 4 17.5V15.5" />
            <circle cx="12" cy="12" r="2.3" />
          </svg>
          <span className="scanbtn-label">Scan cards</span>
        </button>
      </div>
      <div className="controls">
        <div className="askbar">
          <input value={query} maxLength={280} placeholder={`Search or ask ${agentName}…`}
            onChange={(e) => { const v = e.target.value; setQuery(v); if (agentRes) clearAgent(); setQ(v) }}
            onKeyDown={(e) => { if (e.key === 'Enter') ask() }} />
          <button className="askbtn" onClick={ask} disabled={agentBusy || !query.trim()}>{agentBusy ? '…' : `Ask ${agentName}`}</button>
        </div>
        <div className="chips">
          {CHIPS.map((ch, i) => (
            <button key={i} className={'chip' + (chipOn(ch) ? ' on' : '') + (chipOn(ch) && ch.acc ? ' acc' : '')} onClick={() => toggleChip(ch)}>
              {ch.l}{ch.g === 'stance' ? <span className="ct"> {countStance(ch.v)}</span> : null}
            </button>
          ))}
          {(FAMILIES.length || CHANNELS.length || CATS.length || ELEMENTS.length) > 0 && (
            <button className={'chip filterbtn' + (refineCount ? ' on' : '')} onClick={() => setFiltersOpen(true)} aria-label="Filters">
              ⚑ Filters{refineCount ? ` · ${refineCount}` : ''}
            </button>
          )}
        </div>
      </div>
      {agentAction && plan && <ActionBar agentName={agentName} plan={plan} reading={agentAction.filter?.reading}
        done={actionDone} onApply={applyProposal} onUndo={undoProposal} onDismiss={clearAgent} />}
      {agentRes && !agentAction && <AgentPanel res={agentRes} agentName={agentName} />}
      {filtersOpen && (
        <div className="fsheet-ov" onClick={() => setFiltersOpen(false)}>
          <div className="fsheet" onClick={(e) => e.stopPropagation()}>
            <div className="fsheet-head"><div className="ek">Filters</div><button className="sc-x" onClick={() => setFiltersOpen(false)} aria-label="Close">✕</button></div>
            <div className="fsheet-body">
              {FAMILIES.length > 0 && (
                <div className="fs-group"><label>Release</label><div className="fs-opts">
                  <button className={'fo' + (!familyF.size ? ' on' : '')} onClick={() => setFamilyF(new Set())}>All</button>
                  {FAMILIES.map((f) => <button key={f.value} className={'fo' + (familyF.has(f.value) ? ' on' : '')} onClick={() => setFamilyF(new Set([f.value]))}>{f.label}</button>)}
                </div></div>
              )}
              {CHANNELS.length > 0 && (
                <div className="fs-group"><label>Product</label><div className="fs-opts">
                  <button className={'fo' + (!channelF.size ? ' on' : '')} onClick={() => setChannelF(new Set())}>Any</button>
                  {CHANNELS.map((ch) => <button key={ch.value} className={'fo' + (channelF.has(ch.value) ? ' on' : '')} onClick={() => setChannelF(channelF.has(ch.value) ? new Set() : new Set([ch.value]))}>{ch.label}</button>)}
                </div></div>
              )}
              {CATS.length > 0 && (
                <div className="fs-group"><label>Type</label><div className="fs-opts">
                  <button className={'fo' + (!catF.size ? ' on' : '')} onClick={() => setCatF(new Set())}>Any</button>
                  {CATS.map((c) => <button key={c} className={'fo' + (catF.has(c) ? ' on' : '')} onClick={() => setCatF(catF.has(c) ? new Set() : new Set([c]))}>{c}</button>)}
                </div></div>
              )}
              {ELEMENTS.length > 0 && (
                <div className="fs-group"><label>Element</label><div className="fs-opts">
                  <button className={'fo' + (!elementF.size ? ' on' : '')} onClick={() => setElementF(new Set())}>Any</button>
                  {ELEMENTS.map((el) => <button key={el} className={'fo' + (elementF.has(el) ? ' on' : '')} onClick={() => setElementF(elementF.has(el) ? new Set() : new Set([el]))}>{el}</button>)}
                </div></div>
              )}
              <div className="fs-group"><label>Rarity</label><div className="fs-opts">
                <button className={'fo' + (!rarityF.size ? ' on' : '')} onClick={() => setRarityF(new Set())}>Any</button>
                {rarityOrder(data.cards).map((r) => (
                  <button key={r} className={'fo' + (rarityF.has(r) ? ' on' : '')} onClick={() => setRarityF((p) => { const n = new Set(p); if (n.has(r)) n.delete(r); else n.add(r); return n })}>{r}</button>
                ))}
              </div></div>
              <div className="fs-group"><label>Alt art</label><div className="fs-opts">
                <button className={'fo' + (holoOnly ? ' on' : '')} onClick={() => setHoloOnly((v) => !v)}>{data.ui?.holo_label || '★ Alt art'}</button>
              </div></div>
              <div className="fs-group"><label>Card size</label><div className="fs-opts">
                <button className={'fo' + (view === 'pages' ? ' on' : '')} onClick={() => chooseView('pages')}>Pages</button>
                <button className={'fo' + (view === 'standard' ? ' on' : '')} onClick={() => chooseView('standard')}>Standard</button>
                <button className={'fo' + (view === 'gallery' ? ' on' : '')} onClick={() => chooseView('gallery')}>Gallery</button>
              </div></div>
            </div>
            <div className="fsheet-actions">
              <button className="ghost sm" onClick={() => { setFamilyF(new Set()); setChannelF(new Set()); setCatF(new Set()); setElementF(new Set()); setRarityF(new Set()); setHoloOnly(false) }}>Clear all</button>
              <button className="fs-done" onClick={() => setFiltersOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
      {agentActive && (
        <div className="agentband">
          <span><b>{agentName}</b> narrowed {data.summary.cards} → <b>{agentRes.data.n_survivors}</b>{pickSet.size ? ` · ${pickSet.size} surfaced first ★` : ''}{rows.length !== agentRes.data.n_survivors ? ` · ${rows.length} after your filters` : ''}</span>
          <button className="ghost sm" onClick={clearAgent}>clear</button>
        </div>
      )}
      <section>
        {!rows.length ? <div className="empty">no cards match.</div> : view === 'pages' ? (
          <PocketPages rows={rows} store={store} userPhotos={userPhotos} onOpen={setSelected} setField={setField} askIndex={askIndex} onQuickSell={setSellPop} />
        ) : grouped ? (
          SETS.filter((s) => groups[s.id]).map((s) => (
            <div className="setblock" key={s.id}>
              <div className="sethead"><h2>{s.label}</h2><span className="scode">{s.code} · {s.date}</span><span className="smeta">{groups[s.id].length} / {s.count}</span></div>
              <div className={'grid' + (view === 'gallery' ? ' gallery' : '')}>{groups[s.id].map((c) => cardEl(c, false))}</div>
            </div>
          ))
        ) : (
          <div className={'grid' + (view === 'gallery' ? ' gallery' : '')}>{rows.map((c) => cardEl(c, true))}</div>
        )}
      </section>
      {sellPop && data && (() => {
        const c = data.cards.find((x) => x.uid === sellPop)
        return c ? <QuickSell c={c} store={store} setField={setField}
          fromAsk={askIndex ? askIndex.get(sellPop) : null}
          lastSale={(mkt?.sales || {})[sellPop]?.[0] || null}
          onOpenFull={(uid) => setSelected(uid)} onClose={() => setSellPop(null)} /> : null
      })()}
      {selected && <CardModal key={selected} uid={selected} data={data} setById={setById} store={store} setStance={setStance} setField={setField} agentName={agentName} userPhoto={userPhotos[selected]} accountId={accountId} onClose={() => setSelected(null)} market={mktEff} mockSales={mockSales} onBrowseCard={onBrowseCard} />}
      {scanning && <ScanCards cards={data.cards} onCommit={commitScans} onClose={() => setScanning(false)} />}
    </>
  )
}

function toggle(set, v) { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); return n }
function byUid(data, uid) { return (data?.cards || []).find((c) => c.uid === uid) || { uid } }
