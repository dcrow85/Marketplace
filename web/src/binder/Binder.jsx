import { useState, useEffect, useMemo, useCallback } from 'react'

const nm = (c) => c.name_ja || c.name_en || c.uid

function effStance(c, store) {
  const u = store[c.uid] || {}
  let st = u.stance != null ? u.stance : c.stance != null ? c.stance : c.owned ? 'have' : 'none'
  let extra = u.extra !== undefined ? !!u.extra : c.stance === 'extra'
  if (st === 'extra') { st = 'have'; extra = true }
  if (st === 'wish') st = 'want'
  if (!st) st = 'none'
  return { stance: st, extra }
}
function wantActive(c, store) {
  const u = store[c.uid] || {}
  const cond = u.want_cond !== undefined ? u.want_cond : c.want_cond || 'any'
  const max = u.want_max !== undefined ? u.want_max : c.want_max || ''
  return (max !== '' && max != null) || (cond && cond !== 'any')
}
function capMeta(c, e, store) {
  if (e.stance === 'have') return { t: c.cond || 'add details ›', cls: 'm-have' }
  if (e.stance === 'want') return wantActive(c, store) ? { t: 'want', cls: 'm-want' } : { t: 'wishlist', cls: 'm-wish' }
  return { t: c.rarity || '', cls: 'm-none' }
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
  if (f.holo != null) out = out.filter((c) => !!c.holo === !!f.holo)
  if (f.owned != null) out = out.filter((c) => !!c.owned === !!f.owned)
  if (f.exclude_grails) out = out.filter((c) => (c.band_rank || 0) < 3)
  if (f.category) out = out.filter((c) => (c.category || '').toLowerCase() === String(f.category).toLowerCase())
  if (f.set) { const s = String(f.set).toLowerCase(); out = out.filter((c) => (setById[c.set_id]?.label || '').toLowerCase().includes(s)) }
  if (f.character) { const ch = String(f.character).toLowerCase(); out = out.filter((c) => (c.name_en || '').toLowerCase().includes(ch) || (c.name_ja || '').toLowerCase().includes(ch)) }
  return out
}

function Card({ c, store, setStance, showSet, setLabel, pick }) {
  const e = effStance(c, store)
  const have = e.stance === 'have'
  const ring = have ? (e.extra ? 's-extra' : 's-have') : e.stance === 'want' ? (wantActive(c, store) ? 's-want' : 's-wish') : ''
  const meta = capMeta(c, e, store)
  return (
    <div className={'cell ' + (have ? 'own' : 'ghost') + (pick ? ' is-pick' : '')}>
      <div className="stancebar">
        <button className={'seg sg-have' + (e.stance === 'have' ? ' on' : '')} onClick={() => setStance(c.uid, 'have')}>Have</button>
        <button className={'seg sg-want' + (e.stance === 'want' ? ' on' : '')} onClick={() => setStance(c.uid, 'want')}>Want</button>
      </div>
      <div className={'card ' + (have ? 'own' : 'ghost') + (ring ? ' ' + ring : '')}>
        {pick && <span className="pickflag" title="your agent surfaced this">★</span>}
        <div className="face"><div className="ja">{nm(c)}</div><div className="nn">{c.romaji || (c.name_is_en ? 'EN' : '')}</div></div>
        {c.image && <img src={c.image} alt={nm(c)} loading="lazy" decoding="async" />}
        {c.holo ? <span className="holodot" title="holo" /> : null}
        {provBadge(c)}
      </div>
      <div className="caption">
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

function AgentPanel({ res, agentName }) {
  if (!res.ok) {
    const off = res.data?.error === 'agent_offline'
    return <div className="apanel"><div className="aoff">{off ? 'Your agent is offline right now (the model isn’t running).' : 'Could not reach your agent.'}</div></div>
  }
  const o = res.data, f = o.filter || {}, r = o.result || {}
  const dims = ['holo', 'owned', 'exclude_grails', 'set', 'character', 'category']
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

function AgentBar({ agentName, busy, res, onAsk }) {
  const [call, setCall] = useState('')
  const ask = () => { const c = call.trim(); if (c && !busy) onAsk(c) }
  return (
    <div className="agentbar">
      <div className="acall">
        <span className="ek2 agent">Ask {agentName}</span>
        <div className="ainput">
          <input value={call} maxLength={280} placeholder={'holos I’m missing that won’t break the bank…'}
            onChange={(e) => setCall(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ask() }} />
          <button onClick={ask} disabled={busy}>{busy ? '…' : 'browse'}</button>
        </div>
      </div>
      {res && <AgentPanel res={res} agentName={agentName} />}
    </div>
  )
}

const CHIPS = [
  { l: 'All', g: 'all' },
  { l: 'Have', g: 'stance', v: 'have' }, { l: 'Want', g: 'stance', v: 'want', acc: 1 },
  { sep: 1 },
  { l: 'Pokémon', g: 'cat', v: 'Pokemon' }, { l: 'Trainer', g: 'cat', v: 'Trainer' }, { l: 'Energy', g: 'cat', v: 'Energy' },
  { sep: 1 }, { l: 'Holo', g: 'holo' },
]

export default function Binder({ accountId, agentName }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [store, setStore] = useState({})
  const [q, setQ] = useState('')
  const [stanceF, setStanceF] = useState(() => new Set())
  const [catF, setCatF] = useState(() => new Set())
  const [holoOnly, setHoloOnly] = useState(false)
  const [agentRes, setAgentRes] = useState(null)
  const [agentBusy, setAgentBusy] = useState(false)
  const storeKey = accountId ? `cairn-cards:${accountId}` : 'cairn-cards'

  useEffect(() => { fetch('/catalog-sample.json').then((r) => r.json()).then(setData).catch((e) => setErr(String(e))) }, [])
  useEffect(() => { try { setStore(JSON.parse(localStorage.getItem(storeKey) || 'null') || {}) } catch { setStore({}) } }, [storeKey])

  const setById = useMemo(() => Object.fromEntries((data?.sets || []).map((s) => [s.id, s])), [data])
  const SETS = useMemo(() => (data?.sets || []).slice().sort((a, b) => a.order - b.order), [data])

  const setStance = useCallback((uid, st) => {
    setStore((prev) => {
      const cur = effStance(byUid(data, uid), prev).stance
      const u = { ...(prev[uid] || {}) }
      u.stance = cur === st ? 'none' : st
      if (u.stance !== 'have') u.extra = false
      const next = { ...prev, [uid]: u }
      try { localStorage.setItem(storeKey, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [data, storeKey])

  const askAgent = useCallback(async (call) => {
    setAgentBusy(true)
    try {
      const r = await fetch('/api/browse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ call }) })
      setAgentRes({ ok: r.ok, data: await r.json() })
    } catch { setAgentRes({ ok: false, data: { error: 'network' } }) }
    finally { setAgentBusy(false) }
  }, [])
  const clearAgent = () => setAgentRes(null)

  const agentActive = !!(agentRes?.ok && agentRes.data?.filter)
  const pickSet = useMemo(() => new Set(agentActive ? agentRes.data.result?.picks || [] : []), [agentRes, agentActive])

  const countStance = useCallback((v) => {
    if (!data) return 0
    return data.cards.filter((c) => effStance(c, store).stance === v).length
  }, [data, store])

  const rows = useMemo(() => {
    if (!data) return []
    const cmp = (a, b) => (setById[a.set_id].order - setById[b.set_id].order) || ('' + a.num).localeCompare('' + b.num, undefined, { numeric: true })
    let base = data.cards
    if (agentActive) base = applyAgentFilter(base, agentRes.data.filter || {}, setById)
    const qq = q.trim().toLowerCase()
    base = base.filter((c) => {
      if (stanceF.size) {
        const e = effStance(c, store)
        if (!((stanceF.has('have') && e.stance === 'have') || (stanceF.has('want') && e.stance === 'want'))) return false
      }
      if (catF.size && !catF.has(c.category)) return false
      if (holoOnly && !c.holo) return false
      if (qq) {
        const hay = (c.num + ' ' + (c.name_en || '') + ' ' + (c.romaji || '') + ' ' + (c.name_ja || '') + ' ' + (setById[c.set_id]?.label || '')).toLowerCase()
        if (hay.indexOf(qq) < 0) return false
      }
      return true
    })
    if (agentActive) return base.slice().sort((a, b) => (pickSet.has(b.uid) - pickSet.has(a.uid)) || cmp(a, b))
    return base.slice().sort(cmp)
  }, [data, q, stanceF, catF, holoOnly, store, setById, agentRes, agentActive, pickSet])

  const grouped = !q.trim() && !agentActive
  const toggleChip = (ch) => {
    if (ch.g === 'all') { setStanceF(new Set()); setCatF(new Set()); setHoloOnly(false) }
    else if (ch.g === 'stance') setStanceF((p) => toggle(p, ch.v))
    else if (ch.g === 'cat') setCatF((p) => toggle(p, ch.v))
    else if (ch.g === 'holo') setHoloOnly((v) => !v)
  }
  const chipOn = (ch) => ch.g === 'all' ? (!stanceF.size && !catF.size && !holoOnly) : ch.g === 'stance' ? stanceF.has(ch.v) : ch.g === 'cat' ? catF.has(ch.v) : holoOnly

  if (err) return <div className="empty">could not load catalog ({err})</div>
  if (!data) return <div className="empty">loading catalog…</div>

  const cardEl = (c, showSet) => <Card key={c.uid} c={c} store={store} setStance={setStance} showSet={showSet} setLabel={setById[c.set_id]?.label} pick={pickSet.has(c.uid)} />
  const groups = {}
  if (grouped) rows.forEach((c) => (groups[c.set_id] = groups[c.set_id] || []).push(c))

  return (
    <>
      <div className="tallies mono">
        <span><b className="t-have">{countStance('have')}</b> have</span>
        <span><b className="t-want">{countStance('want')}</b> want</span>
        <span><b>{data.summary.cards}</b> in catalog</span>
      </div>
      <AgentBar agentName={agentName} busy={agentBusy} res={agentRes} onAsk={askAgent} />
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
    </>
  )
}

function toggle(set, v) { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); return n }
function byUid(data, uid) { return (data?.cards || []).find((c) => c.uid === uid) || { uid } }
