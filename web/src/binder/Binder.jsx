import { useState, useEffect, useMemo, useCallback } from 'react'

// Prod: the agent API lives on a separate origin (api.cairn.cards, via VITE_API_BASE);
// the catalog ships with the app build. Both resolve in dev (Vite proxy, BASE_URL='/')
// and under a '/app/' base path on the deployed site.
const API_BASE = import.meta.env.VITE_API_BASE || ''
const DEFAULT_CATALOG = { id: 'japanese-pre-english', path: 'catalog-sample.json', title: 'Japanese pre-English catalog' }
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
  const grail = u.grail !== undefined ? !!u.grail : !!c.grail
  return { stance: st, extra, trade, grail }
}
function wantActive(c, store) {
  const u = store[c.uid] || {}
  const cond = u.want_cond !== undefined ? u.want_cond : c.want_cond || 'any'
  const max = u.want_max !== undefined ? u.want_max : c.want_max || ''
  return (max !== '' && max != null) || (cond && cond !== 'any')
}
function capMeta(c, e, store) {
  if (e.grail && (e.stance === 'have' || e.stance === 'want')) return { t: 'grail ★', cls: 'm-grail' }
  if (e.stance === 'pass') return { t: 'pass', cls: 'm-pass' }
  if (e.stance === 'have') return e.trade ? { t: 'for trade', cls: 'm-trade' } : { t: c.cond || 'keeper', cls: 'm-have' }
  if (e.stance === 'want') return wantActive(c, store) ? { t: 'hunt', cls: 'm-want' } : { t: 'wishlist', cls: 'm-wish' }
  return { t: c.rarity || '', cls: 'm-none' }
}
function issueSeverity(c) {
  const rank = { high: 3, medium: 2, low: 1, info: 0 }
  const issues = c.issues || []
  let best = null
  for (const i of issues) if (!best || (rank[i.severity] ?? 0) > (rank[best] ?? 0)) best = i.severity
  return best
}
function provBadge(c) {
  if (!c.image) return null
  if (c.image_status === 'exact_source') return <span className="prov pv-exact">exact</span>
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
  if (f.rarity) out = out.filter((c) => (c.rarity || '').toLowerCase().includes(String(f.rarity).toLowerCase()))
  if (f.set) { const s = String(f.set).toLowerCase(); out = out.filter((c) => (setById[c.set_id]?.label || '').toLowerCase().includes(s)) }
  if (f.character) { const ch = String(f.character).toLowerCase(); out = out.filter((c) => (c.name_en || '').toLowerCase().includes(ch) || (c.name_ja || '').toLowerCase().includes(ch)) }
  return out
}

function Card({ c, store, setStance, showSet, setLabel, pick, onOpen }) {
  const e = effStance(c, store)
  const have = e.stance === 'have'
  const ring = e.stance === 'pass' ? 's-pass' : e.grail ? 's-grail' : have ? 's-have' : e.stance === 'want' ? (wantActive(c, store) ? 's-want' : 's-wish') : ''
  const meta = capMeta(c, e, store)
  const sev = issueSeverity(c)
  return (
    <div className={'cell ' + (have ? 'own' : 'ghost') + (pick ? ' is-pick' : '') + (e.stance === 'pass' ? ' passed' : '')}>
      <div className="stancebar">
        <button className={'seg sg-have' + (e.stance === 'have' ? ' on' : '')} onClick={() => setStance(c.uid, 'have')}>Have</button>
        <button className={'seg sg-want' + (e.stance === 'want' ? ' on' : '')} onClick={() => setStance(c.uid, 'want')}>Want</button>
        <button className={'seg sg-pass' + (e.stance === 'pass' ? ' on' : '')} onClick={() => setStance(c.uid, 'pass')}>Pass</button>
      </div>
      <div className={'card ' + (have ? 'own' : 'ghost') + (ring ? ' ' + ring : '')} onClick={() => onOpen && onOpen(c.uid)} role="button" tabIndex={0} title="open card">
        {pick && <span className="pickflag" title="your agent surfaced this">★</span>}
        <div className="face"><div className="ja">{nm(c)}</div><div className="nn">{c.romaji || (c.name_is_en ? 'EN' : '')}</div></div>
        {c.image && <img src={c.image} alt={nm(c)} loading="lazy" decoding="async" onError={(e) => retryImg(e, c.image)} />}
        {c.holo ? <span className="holodot" title={c.star_alt ? 'star / alternate-art signal' : 'holo'} /> : null}
        {sev && <span className={'issueflag ' + sev} title="catalog issue carried forward">{sev === 'high' ? '!' : '?'}</span>}
        {provBadge(c)}
      </div>
      <div className="caption" onClick={() => onOpen && onOpen(c.uid)}>
        {showSet && <div className="cset">{setLabel}</div>}
        <div className="cap-top"><span className="cnum">{c.num}</span><span className="cja">{nm(c)}</span></div>
        <div className="cap-sub">
          <span className="crom">{c.romaji || c.name_en || ''}{c.name_is_en && <span className="enmark">EN</span>}</span>
          <span className={'cmeta ' + meta.cls}>{meta.t}</span>
        </div>
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

function CardModal({ uid, data, setById, store, setStance, setField, agentName, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
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
  const visibleEffects = (c.effects || []).filter((x) => x && (x.label || x.text))
  return (
    <div className="modal" onClick={(ev) => { if (ev.target === ev.currentTarget) onClose() }}>
      <div className="sheet" role="dialog" aria-modal="true">
        <button className="mx" onClick={onClose} aria-label="close">✕</button>
        <div className="mcols">
          <div className="mleft">
            <div className={'mcard ' + (e.stance === 'have' ? 'own' : 'ghost')}>
              {c.image
                ? <img src={c.image} className={e.stance !== 'have' ? 'grey' : ''} alt={nm(c)} onError={(ev) => retryImg(ev, c.image)} />
                : <div className="noimg"><div className="ja">{nm(c)}</div><div className="nn">no reference image on file</div></div>}
              {c.holo ? <span className="holodot" title={c.star_alt ? 'star / alternate-art signal' : 'holo'} /> : null}
              {provBadge(c)}
            </div>
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
            {issues.length > 0 && (
              <div className="issuebox">
                <div className="ititle">Catalog warnings</div>
                {issues.map((i, idx) => (
                  <div className={'irow ' + (i.severity || 'info')} key={idx}>
                    <b>{i.severity || 'info'}</b>
                    <span>{[...(i.codes || []), i.notes || i.recommended_action].filter(Boolean).join(' · ')}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="m-stance">
              <button className={'mseg sg-have' + (e.stance === 'have' ? ' on' : '')} onClick={() => setStance(c.uid, 'have')}>Have</button>
              <button className={'mseg sg-want' + (e.stance === 'want' ? ' on' : '')} onClick={() => setStance(c.uid, 'want')}>Want</button>
              <button className={'mseg sg-pass' + (e.stance === 'pass' ? ' on' : '')} onClick={() => setStance(c.uid, 'pass')}>Pass</button>
            </div>
            {(e.stance === 'have' || e.stance === 'want') && (
              <button className={'grailtog' + (e.grail ? ' on' : '')} onClick={() => setField(c.uid, 'grail', !e.grail)}>
                <span className="gstar">★</span>{e.grail ? 'Grail — top of your list' : 'Mark as grail'}
              </button>
            )}
            <div className="m-fields">
              {e.stance === 'have' && <>
                <Frow label="Holding">
                  <div className="switch2">
                    <button className={'sw' + (!e.trade ? ' on' : '')} onClick={() => setField(c.uid, 'trade', false)}>Keeper</button>
                    <button className={'sw' + (e.trade ? ' on' : '')} onClick={() => setField(c.uid, 'trade', true)}>For trade</button>
                  </div>
                </Frow>
                <Frow label="Condition"><input className="ti" placeholder="raw NM · PSA 9 · …" value={u.cond || ''} onChange={(ev) => setField(c.uid, 'cond', ev.target.value)} /></Frow>
                <Frow label="Held"><input className="ti" placeholder="self · shop · vault" value={u.custody || ''} onChange={(ev) => setField(c.uid, 'custody', ev.target.value)} /></Frow>
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
              {e.stance === 'pass' && <div className="fnote">Marked <b>pass</b> — this card dims and sinks to the bottom of its set. Switch to Have or Want anytime.</div>}
              {e.stance === 'none' && <div className="fnote">Pick <b>Have</b>, <b>Want</b>, or <b>Pass</b>. Have records condition + custody; Want sets the terms your agent hunts to; Pass clears it out of the way.</div>}
            </div>
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
            <div className="m-cite mono">catalog {(c.catalog_hash || '—').slice(0, 12)}{c.catalog_hash ? '…' : ''} · row {c.row_id ?? '—'}{c.source_entry_id ? ` · source ${c.source_entry_id}` : ''}</div>
          </div>
        </div>
      </div>
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

function AgentBar({ agentName, busy, res, onAsk, placeholder }) {
  const [call, setCall] = useState('')
  const ask = () => { const c = call.trim(); if (c && !busy) onAsk(c) }
  return (
    <div className="agentbar">
      <div className="acall">
        <span className="ek2 agent">Ask {agentName}</span>
        <div className="ainput">
          <input value={call} maxLength={280} placeholder={placeholder || 'holos I’m missing that won’t break the bank…'}
            onChange={(e) => setCall(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ask() }} />
          <button onClick={ask} disabled={busy}>{busy ? '…' : 'browse'}</button>
        </div>
      </div>
      {res && <AgentPanel res={res} agentName={agentName} />}
    </div>
  )
}

function chipsFor(data) {
  const cats = data?.ui?.category_chips || ['Pokemon', 'Trainer', 'Energy']
  const elements = data?.ui?.element_chips || []
  const families = data?.ui?.family_chips || []
  const channels = data?.ui?.product_channel_chips || []
  const holoLabel = data?.ui?.holo_label || 'Holo'
  return [
    { l: 'All', g: 'all' },
    { l: 'Have', g: 'stance', v: 'have' }, { l: 'Want', g: 'stance', v: 'want', acc: 1 },
    ...(families.length ? [{ sep: 1 }, ...families.map((f) => ({ l: f.label, g: 'family', v: f.value }))] : []),
    ...(channels.length ? [{ sep: 1 }, ...channels.map((ch) => ({ l: ch.label, g: 'channel', v: ch.value }))] : []),
    { sep: 1 },
    ...cats.map((c) => ({ l: c, g: 'cat', v: c })),
    ...(elements.length ? [{ sep: 1 }, ...elements.map((e) => ({ l: e, g: 'element', v: e }))] : []),
    { sep: 1 }, { l: holoLabel, g: 'holo' },
  ]
}

export default function Binder({ accountId, agentName, catalog = DEFAULT_CATALOG }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [store, setStore] = useState({})
  const [q, setQ] = useState('')
  const [stanceF, setStanceF] = useState(() => new Set())
  const [familyF, setFamilyF] = useState(() => new Set())
  const [channelF, setChannelF] = useState(() => new Set())
  const [catF, setCatF] = useState(() => new Set())
  const [elementF, setElementF] = useState(() => new Set())
  const [holoOnly, setHoloOnly] = useState(false)
  const [agentRes, setAgentRes] = useState(null)
  const [agentBusy, setAgentBusy] = useState(false)
  const [selected, setSelected] = useState(null)
  const storeKey = accountId ? `cairn-cards:${catalog.id}:${accountId}` : `cairn-cards:${catalog.id}`

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- catalog switches intentionally reset local UI filters before fetching. */
    setData(null); setErr(''); setAgentRes(null); setQ(''); setStanceF(new Set()); setFamilyF(new Set()); setChannelF(new Set()); setCatF(new Set()); setElementF(new Set()); setHoloOnly(false)
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

  const setById = useMemo(() => Object.fromEntries((data?.sets || []).map((s) => [s.id, s])), [data])
  const SETS = useMemo(() => (data?.sets || []).slice().sort((a, b) => a.order - b.order), [data])

  const setStance = useCallback((uid, st) => {
    setStore((prev) => {
      const cur = effStance(byUid(data, uid), prev).stance
      const u = { ...(prev[uid] || {}) }
      u.stance = cur === st ? 'none' : st
      if (u.stance !== 'have') { u.extra = false; u.trade = false }
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

  const askAgent = useCallback(async (call) => {
    setAgentBusy(true)
    try {
      const r = await fetch(API_BASE + '/api/browse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ call, catalog: catalog.id }) })
      setAgentRes({ ok: r.ok, data: await r.json() })
    } catch { setAgentRes({ ok: false, data: { error: 'network' } }) }
    finally { setAgentBusy(false) }
  }, [catalog.id])
  const clearAgent = () => setAgentRes(null)

  const agentActive = !!(agentRes?.ok && agentRes.data?.filter)
  const pickSet = useMemo(() => new Set(agentActive ? agentRes.data.result?.picks || [] : []), [agentRes, agentActive])

  const countStance = useCallback((v) => {
    if (!data) return 0
    return data.cards.filter((c) => effStance(c, store).stance === v).length
  }, [data, store])

  const rows = useMemo(() => {
    if (!data) return []
    const passed = (c) => effStance(c, store).stance === 'pass' ? 1 : 0
    const cmp = (a, b) => (setById[a.set_id].order - setById[b.set_id].order) || (passed(a) - passed(b)) || ('' + a.num).localeCompare('' + b.num, undefined, { numeric: true })
    let base = data.cards
    if (agentActive) base = applyAgentFilter(base, agentRes.data.filter || {}, setById)
    const qq = q.trim().toLowerCase()
    base = base.filter((c) => {
      if (stanceF.size) {
        const e = effStance(c, store)
        if (!((stanceF.has('have') && e.stance === 'have') || (stanceF.has('want') && e.stance === 'want'))) return false
      }
      if (familyF.size && !familyF.has(c.release_family)) return false
      if (channelF.size) {
        const isStarter = String(c.product_channel || '').startsWith('starter_deck_')
        if (!((channelF.has('starter') && isStarter) || channelF.has(c.product_channel))) return false
      }
      if (catF.size && !catF.has(c.category)) return false
      if (elementF.size && !elementF.has(c.element)) return false
      if (holoOnly && !c.holo) return false
      if (qq) {
        const hay = (c.num + ' ' + (c.name_en || '') + ' ' + (c.romaji || '') + ' ' + (c.name_ja || '') + ' ' + (c.element || '') + ' ' + (c.rarity || '') + ' ' + (c.illustrator || '') + ' ' + (c.source_entry_id || '') + ' ' + (c.release_family_label || '') + ' ' + (c.product_channel_label || '') + ' ' + (setById[c.set_id]?.label || '')).toLowerCase()
        if (hay.indexOf(qq) < 0) return false
      }
      return true
    })
    if (agentActive) return base.slice().sort((a, b) => (pickSet.has(b.uid) - pickSet.has(a.uid)) || cmp(a, b))
    return base.slice().sort(cmp)
  }, [data, q, stanceF, familyF, channelF, catF, elementF, holoOnly, store, setById, agentRes, agentActive, pickSet])

  const grouped = !q.trim() && !agentActive
  const CHIPS = useMemo(() => chipsFor(data), [data])
  const toggleChip = (ch) => {
    if (ch.g === 'all') { setStanceF(new Set()); setFamilyF(new Set()); setChannelF(new Set()); setCatF(new Set()); setElementF(new Set()); setHoloOnly(false) }
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

  const cardEl = (c, showSet) => <Card key={c.uid} c={c} store={store} setStance={setStance} showSet={showSet} setLabel={setById[c.set_id]?.label} pick={pickSet.has(c.uid)} onOpen={setSelected} />
  const groups = {}
  if (grouped) rows.forEach((c) => (groups[c.set_id] = groups[c.set_id] || []).push(c))

  return (
    <>
      <div className="tallies mono">
        <span><b className="t-have">{countStance('have')}</b> have</span>
        <span><b className="t-want">{countStance('want')}</b> want</span>
        <span><b>{data.summary.cards}</b> in catalog</span>
      </div>
      <AgentBar agentName={agentName} busy={agentBusy} res={agentRes} onAsk={askAgent} placeholder={data.ui?.agent_placeholder} />
      <div className="controls">
        <div className="search"><input value={q} placeholder="search name or number…" onChange={(e) => setQ(e.target.value)} /></div>
        <div className="chips">
          {CHIPS.map((ch, i) => ch.sep ? <span key={i} className="sep" /> : (
            <button key={i} className={'chip' + (chipOn(ch) ? ' on' : '') + (chipOn(ch) && ch.acc ? ' acc' : '')} onClick={() => toggleChip(ch)}>
              {ch.l}{ch.g === 'stance' ? <span className="ct"> {countStance(ch.v)}</span> : null}
            </button>
          ))}
        </div>
      </div>
      {agentActive && (
        <div className="agentband">
          <span><b>{agentName}</b> narrowed {data.summary.cards} → <b>{agentRes.data.n_survivors}</b>{pickSet.size ? ` · ${pickSet.size} surfaced first ★` : ''}{rows.length !== agentRes.data.n_survivors ? ` · ${rows.length} after your filters` : ''}</span>
          <button className="ghost sm" onClick={clearAgent}>clear</button>
        </div>
      )}
      <section>
        {!rows.length ? <div className="empty">no cards match.</div> : grouped ? (
          SETS.filter((s) => groups[s.id]).map((s) => (
            <div className="setblock" key={s.id}>
              <div className="sethead"><h2>{s.label}</h2><span className="scode">{s.code} · {s.date}</span><span className="smeta">{groups[s.id].length} / {s.count}</span></div>
              <div className="grid">{groups[s.id].map((c) => cardEl(c, false))}</div>
            </div>
          ))
        ) : (
          <div className="grid">{rows.map((c) => cardEl(c, true))}</div>
        )}
      </section>
      {selected && <CardModal uid={selected} data={data} setById={setById} store={store} setStance={setStance} setField={setField} agentName={agentName} onClose={() => setSelected(null)} />}
    </>
  )
}

function toggle(set, v) { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); return n }
function byUid(data, uid) { return (data?.cards || []).find((c) => c.uid === uid) || { uid } }
