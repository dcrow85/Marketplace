import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import ScanCards from '../scan/ScanCards.jsx'
import { hashText } from '../chain/escrow.js'
import { useScrollLock } from '../useScrollLock.js'
import { putPhoto, getPhoto } from '../scan/photoStore.js'
import { entryFor as effStance, saveStore } from './collection.js'
import Card from './Card.jsx'
import CardModal from './CardModal.jsx'
import QuickSell from './QuickSell.jsx'
import PocketPages from './PocketPages.jsx'
import { AgentPanel, ActionBar } from './agentPanels.jsx'
import { nm, rarityOrder } from './helpers.jsx'
import { applyAgentFilter } from './agentFilter.js'
import { pileKeyFor, addToPile } from '../market/pile.js'
import MarketFinds from '../market/MarketFinds.jsx'
import { loadMockSales, mockSalesKeyFor, loadHidden, hiddenKeyFor } from '../market/mockAgents.js'
import { HaveActionsLesson, WantActionsLesson } from '../agent/MeetAnko.jsx'
import '../scan/scan.css'

// Prod: the agent API lives on a separate origin (api.cairn.cards, via VITE_API_BASE);
// the catalog ships with the app build. Both resolve in dev (Vite proxy, BASE_URL='/')
// and under a '/app/' base path on the deployed site.
const API_BASE = import.meta.env.VITE_API_BASE || ''
const DEFAULT_CATALOG = { id: 'azuki-tcg', path: 'catalogs/azuki-tcg.json', title: 'Azuki TCG catalog' }
const catalogUrl = (catalog) => import.meta.env.BASE_URL + (catalog?.path || DEFAULT_CATALOG.path)


function chipsFor() {
  return [
    { l: 'All', g: 'all' },
    { l: 'Have', g: 'stance', v: 'have' },
    { l: 'Want', g: 'stance', v: 'want', acc: 1 },
    { l: 'Selling', g: 'stance', v: 'selling' },
  ]
}


function byUid(data, uid) { return (data?.cards || []).find((c) => c.uid === uid) || { uid } }

function cardMatchesChannel(card, channel) {
  return channel === 'starter'
    ? String(card.product_channel || '').startsWith('starter_deck_')
    : card.product_channel === channel
}

function cardMatchesText(card, needle, setById) {
  const q = String(needle || '').trim().toLowerCase()
  if (!q) return true
  const hay = [
    card.num,
    card.name_en,
    card.romaji,
    card.name_ja,
    card.element,
    card.rarity,
    card.illustrator,
    card.source_entry_id,
    card.release_family_label,
    card.product_channel_label,
    setById[card.set_id]?.label,
  ].filter(Boolean).join(' ').toLowerCase()
  return hay.includes(q)
}

export default function Binder({ accountId, agentName, catalog = DEFAULT_CATALOG, onBrowseCard, onboardingStep = null, onboardingGuide = null }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [store, setStore] = useState({})
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('') // the unified search/ask input text
  const askInput = useRef(null)
  const [stanceF, setStanceF] = useState(() => new Set())
  const [familyF, setFamilyF] = useState(() => new Set())
  const [channelF, setChannelF] = useState(() => new Set())
  const [catF, setCatF] = useState(() => new Set())
  const [elementF, setElementF] = useState(() => new Set())
  const [rarityF, setRarityF] = useState(() => new Set())
  const [holoOnly, setHoloOnly] = useState(false)
  const [agentRes, setAgentRes] = useState(null)
  const [agentBusy, setAgentBusy] = useState(false)
  const [agentClearedFilters, setAgentClearedFilters] = useState(0)
  const [selected, setSelected] = useState(null)
  const [sellPop, setSellPop] = useState(null) // uid being quick-listed via the $ mark
  const [actionDone, setActionDone] = useState(null) // last applied agent proposal
  const undoStore = useRef(null) // store snapshot from before the proposal applied
  const [userPhotos, setUserPhotos] = useState({}) // uid -> your scanned photo (from IndexedDB)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [haveLessonUid, setHaveLessonUid] = useState(null)
  const [wantLessonUid, setWantLessonUid] = useState(null)
  useScrollLock(filtersOpen)
  const clearBrowseFilters = useCallback(() => {
    setStanceF(new Set())
    setFamilyF(new Set())
    setChannelF(new Set())
    setCatF(new Set())
    setElementF(new Set())
    setRarityF(new Set())
    setHoloOnly(false)
  }, [])
  const [view, setView] = useState(() => { try { return localStorage.getItem('cairn-view') || 'pages' } catch { return 'pages' } })
  const chooseView = (v) => { setView(v); try { localStorage.setItem('cairn-view', v) } catch { /* ignore */ } }
  const storeKey = accountId ? `cairn-cards:${catalog.id}:${accountId}` : `cairn-cards:${catalog.id}`
  const haveLessonKey = `cairn-anko-have-actions:${accountId || 'anon'}`
  const wantLessonKey = `cairn-anko-want-actions:${accountId || 'anon'}`
  const [mkt, setMkt] = useState(null) // the market payload: sellers' asks + recorded settlements
  const [mockRev, setMockRev] = useState(0)
  useEffect(() => {
    // Account changes reset transient coaching; the persistent seen flags remain account-scoped.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHaveLessonUid(null)
    setWantLessonUid(null)
  }, [haveLessonKey, wantLessonKey])
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
  useEffect(() => {
    const useExample = (event) => {
      const text = String(event.detail?.text || '').trim()
      if (!text) return
      setQuery(text)
      setQ(text)
      setAgentRes(null)
      setActionDone(null)
      window.requestAnimationFrame(() => askInput.current?.focus())
    }
    window.addEventListener('cairn-anko-prompt', useExample)
    return () => window.removeEventListener('cairn-anko-prompt', useExample)
  }, [])
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
    if (onboardingStep === 'mark' && (st === 'have' || st === 'want')) {
      const card = byUid(data, uid)
      window.dispatchEvent(new CustomEvent('cairn-anko-marked', { detail: { name: nm(card), stance: st } }))
    }
    setStore((prev) => {
      const cur = effStance(byUid(data, uid), prev).stance
      const u = { ...(prev[uid] || {}) }
      u.stance = cur === st ? 'none' : st
      if (u.stance !== 'have') { u.extra = false; u.trade = false; u.sell = false; u.display = false }
      if (u.stance === 'none' || u.stance === 'pass') u.grail = false
      const next = { ...prev, [uid]: u }
      saveStore(storeKey, next)
      if (u.stance === 'have') {
        let seen = false
        try { seen = !!localStorage.getItem(haveLessonKey) } catch { /* ignore */ }
        if (!seen) {
          try { localStorage.setItem(haveLessonKey, '1') } catch { /* ignore */ }
          // During first run, let Anko finish his permanent-bar handoff before he
          // reappears beside this card's real Sell and Trade controls.
          window.setTimeout(() => setHaveLessonUid(uid), onboardingStep === 'mark' ? 1250 : 0)
        }
      } else if (u.stance === 'want') {
        let seen = false
        try { seen = !!localStorage.getItem(wantLessonKey) } catch { /* ignore */ }
        if (!seen) {
          try { localStorage.setItem(wantLessonKey, '1') } catch { /* ignore */ }
          window.setTimeout(() => setWantLessonUid(uid), onboardingStep === 'mark' ? 1250 : 0)
        }
      } else if (uid === haveLessonUid) {
        window.setTimeout(() => setHaveLessonUid(null), 0)
      }
      if (u.stance !== 'want' && uid === wantLessonUid) window.setTimeout(() => setWantLessonUid(null), 0)
      return next
    })
  }, [data, storeKey, haveLessonKey, wantLessonKey, haveLessonUid, wantLessonUid, onboardingStep])

  const setField = useCallback((uid, key, value) => {
    setStore((prev) => {
      const next = { ...prev, [uid]: { ...(prev[uid] || {}), [key]: value } }
      saveStore(storeKey, next)
      return next
    })
  }, [storeKey])

  const [scanning, setScanning] = useState(false)
  useEffect(() => {
    const open = () => setScanning(true)
    window.addEventListener('cairn-open-scan', open)
    return () => window.removeEventListener('cairn-open-scan', open)
  }, [])
  // Scan-to-collection: tag each recognized card `have`, keep its photo locally as evidence.
  const commitScans = useCallback(async (scans) => {
    const writes = []
    for (const s of scans) {
      if (s.photo) writes.push(putPhoto(`${storeKey}:${s.uid}`, s.photo))
      for (const view of ['back', 'corners', 'holo']) {
        if (s.views?.[view]) writes.push(putPhoto(`${storeKey}:${s.uid}:${view}`, s.views[view]))
      }
      for (const frame of (s.pile || []).slice(0, 8)) writes.push(putPhoto(`frame:${hashText(frame.frame)}`, frame.frame))
    }
    await Promise.all(writes)
    setStore((prev) => {
      const next = { ...prev }
      for (const s of scans) {
        const copies = Math.max(next[s.uid]?.copies || 0, s.copies || 1)
        // frame anchor: the pile photo is the witness; each copy records where it sits.
        // Frames are content-addressed (keccak) and stored once in IndexedDB.
        const pile = (s.pile || []).slice(0, 8).map((p) => {
          const f = hashText(p.frame)
          return { f, q: p.quad }
        })
        next[s.uid] = {
          ...(next[s.uid] || {}), stance: 'have', scanned: true, copies,
          ...(copies > 1 ? { extra: true } : {}),
          ...(s.photo ? { photo_hash: hashText(s.photo) } : {}), // anchors the local photo; verifiable when sync lands
          ...(pile.length ? { pile } : {}),
        }
      }
      saveStore(storeKey, next)
      return next
    })
    setUserPhotos((prev) => ({ ...prev, ...Object.fromEntries(scans.filter((s) => s.photo).map((s) => [s.uid, s.photo])) }))
  }, [storeKey])

  const askAgent = useCallback(async (call, browseFilterCount = 0) => {
    setAgentBusy(true)
    setActionDone(null)
    undoStore.current = null
    try {
      const r = await fetch(API_BASE + '/api/browse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ call, catalog: catalog.id }) })
      const response = { ok: r.ok, data: await r.json() }
      if (r.ok && browseFilterCount) clearBrowseFilters()
      setAgentClearedFilters(r.ok ? browseFilterCount : 0)
      setAgentRes(response)
    } catch { setAgentClearedFilters(0); setAgentRes({ ok: false, data: { error: 'network' } }) }
    finally { setAgentBusy(false) }
  }, [catalog.id, clearBrowseFilters])
  const clearAgent = () => { setAgentRes(null); setAgentClearedFilters(0); setActionDone(null); undoStore.current = null }

  const agentAction = agentRes?.ok && agentRes.data?.action ? agentRes.data : null
  const agentHasFilter = !agentAction && !!(agentRes?.ok && agentRes.data?.filter)
  const agentNoMatch = agentHasFilter && Number(agentRes.data.n_survivors || 0) === 0
  const agentActive = agentHasFilter && !agentNoMatch
  const pickList = useMemo(() => {
    if (!agentRes?.ok) return []
    const raw = Array.isArray(agentRes.data?.result?.picks) ? agentRes.data.result.picks : []
    const seen = new Set()
    return raw.filter((uid) => {
      if (typeof uid !== 'string' || seen.has(uid)) return false
      seen.add(uid)
      return true
    })
  }, [agentRes])
  const pickSet = useMemo(() => new Set(pickList), [pickList])
  const pickRank = useMemo(() => new Map(pickList.map((uid, index) => [uid, index])), [pickList])
  const agentCurating = pickList.length > 0
  // A plan resolves step by step against a DRAFT of your store, so step 2 sees what
  // step 1 changed ("mark commons have; list alpha commons at $2" works in one call).
  const findStep = useMemo(() => {
    if (!agentAction) return null
    const steps = Array.isArray(agentAction.action) ? agentAction.action : [agentAction.action]
    return steps.find((st) => st.op === 'find_market') || null
  }, [agentAction])
  const finds = useMemo(() => {
    if (!findStep || !data || !mktEff) return []
    const scope = { ...(findStep.scope || {}) }
    delete scope.owned
    const uids = new Set(applyAgentFilter(data.cards, scope, setById).map((c) => c.uid))
    const out = []
    for (const sl of mktEff.sellers) for (const l of sl.listings) {
      if (!uids.has(l.uid)) continue
      if (findStep.ask != null && l.ask > findStep.ask) continue
      const c = data.cards.find((x) => x.uid === l.uid)
      if (c) out.push({ c, sellerId: sl.id, l })
    }
    return out.sort((a, b) => a.l.ask - b.l.ask).slice(0, 24)
  }, [findStep, data, mktEff, setById])
  const plan = useMemo(() => {
    if (!agentAction || !data) return null
    const steps = (Array.isArray(agentAction.action) ? agentAction.action : [agentAction.action]).filter((st) => st.op !== 'find_market')
    if (!steps.length) return null
    const draft = {}
    const eff = (c) => effStance(c, draft[c.uid] ? { [c.uid]: { ...(store[c.uid] || {}), ...draft[c.uid] } } : store)
    const resolved = steps.map((st) => {
      const scope = { ...(st.scope || {}) }
      delete scope.owned // 'my cards' means YOUR store, not the demo catalog flag
      let base = applyAgentFilter(data.cards, scope, setById)
      const op = st.op
      if (op === 'mark_have') base = base.filter((c) => eff(c).stance !== 'have')
      else if (op === 'mark_want') base = base.filter((c) => { const e = eff(c); return e.stance !== 'want' && e.stance !== 'have' })
      else if (op === 'unmark_have') base = base.filter((c) => eff(c).stance === 'have')
      else if (op === 'unmark_want') base = base.filter((c) => eff(c).stance === 'want')
      else {
        base = base.filter((c) => eff(c).stance === 'have')
        if (op === 'unlist') base = base.filter((c) => eff(c).sell)
        if (op === 'close_trade') base = base.filter((c) => eff(c).trade)
      }
      for (const c of base) {
        const d = draft[c.uid] = draft[c.uid] || {}
        if (op === 'mark_have') d.stance = 'have'
        else if (op === 'mark_want') d.stance = 'want'
        else if (op === 'unmark_have' || op === 'unmark_want') { d.stance = 'none'; d.sell = false; d.trade = false; d.grail = false; d.display = false }
        else if (op === 'list_for_sale') { d.sell = true; if (st.ask != null) d.ask = String(st.ask) }
        else if (op === 'open_to_trade') d.trade = true
        else if (op === 'unlist') { d.sell = false; d.display = false }
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
      saveStore(storeKey, next)
      return next
    })
    setActionDone({ n: Object.keys(plan.draft).length, steps: plan.steps.length })
  }
  const undoProposal = () => {
    if (!undoStore.current) return
    const prev = undoStore.current
    undoStore.current = null
    setStore(prev)
    saveStore(storeKey, prev)
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
    base = base.filter((c) => {
      if (stanceF.size) {
        const e = effStance(c, store)
        if (!((stanceF.has('have') && e.stance === 'have') || (stanceF.has('want') && e.stance === 'want') || (stanceF.has('selling') && e.stance === 'have' && (e.sell || e.trade)))) return false
      }
      if (familyF.size && !familyF.has(c.release_family)) return false
      if (channelF.size) {
        if (![...channelF].some((channel) => cardMatchesChannel(c, channel))) return false
      }
      if (catF.size && !catF.has(c.category)) return false
      if (elementF.size && !elementF.has(c.element)) return false
      if (rarityF.size && !rarityF.has(c.rarity)) return false
      if (holoOnly && !c.holo) return false
      return true
    })
    if (q.trim() && !agentActive && !agentCurating) {
      const directMatches = base.filter((c) => cardMatchesText(c, q, setById))
      if (directMatches.length) base = directMatches
    }
    if (agentCurating) return base.slice().sort((a, b) => {
      const aRank = pickRank.get(a.uid)
      const bRank = pickRank.get(b.uid)
      if (aRank != null || bRank != null) return (aRank ?? Number.MAX_SAFE_INTEGER) - (bRank ?? Number.MAX_SAFE_INTEGER)
      return cmp(a, b)
    })
    return base.slice().sort(cmp)
  }, [data, q, stanceF, familyF, channelF, catF, elementF, rarityF, holoOnly, store, setById, agentRes, agentActive, agentCurating, pickRank, agentAction, plan])

  const directSearchMiss = !!q.trim() && !!rows.length && !rows.some((card) => cardMatchesText(card, q, setById))
  const grouped = (!q.trim() || directSearchMiss) && !agentActive && !agentCurating
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
    if (ch.g === 'all') clearBrowseFilters()
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

  const refineCount = familyF.size + channelF.size + catF.size + elementF.size + rarityF.size + (holoOnly ? 1 : 0)
  const dockSetup = onboardingStep === 'profile'
  const chooseFamily = (family) => {
    setFamilyF(family ? new Set([family]) : new Set())
    if (family && channelF.size && !data.cards.some((c) => c.release_family === family && [...channelF].some((channel) => cardMatchesChannel(c, channel)))) {
      setChannelF(new Set())
    }
  }
  const chooseChannel = (channel) => {
    const next = channelF.has(channel) ? '' : channel
    setChannelF(next ? new Set([next]) : new Set())
    if (next && familyF.size && !data.cards.some((c) => familyF.has(c.release_family) && cardMatchesChannel(c, next))) {
      setFamilyF(new Set())
    }
  }
  // typing filters live (q); "Ask" sends the text to the agent and drops the substring filter
  const ask = () => {
    const c = query.trim()
    if (!c || agentBusy) return
    const browseFilterCount = stanceF.size + familyF.size + channelF.size + catF.size + elementF.size + rarityF.size + (holoOnly ? 1 : 0)
    askAgent(c, browseFilterCount)
    setQ('')
    setQuery('')
  }
  const dismissHaveLesson = () => setHaveLessonUid(null)
  const dismissWantLesson = () => setWantLessonUid(null)
  const wantLessonCard = wantLessonUid ? byUid(data, wantLessonUid) : null
  const cardEl = (c, showSet) => <Card key={c.uid} c={c} store={store} setStance={setStance} setField={setField} showSet={showSet} setLabel={setById[c.set_id]?.label} pick={pickSet.has(c.uid)} onOpen={setSelected} onMarket={onBrowseCard} userPhoto={userPhotos[c.uid]} fromAsk={askIndex ? askIndex.get(c.uid) : null} onQuickSell={setSellPop}
    haveActionsGuide={haveLessonUid === c.uid ? <HaveActionsLesson compact onDone={dismissHaveLesson} /> : null} onUseHaveAction={dismissHaveLesson} />
  const groups = {}
  if (grouped) rows.forEach((c) => (groups[c.set_id] = groups[c.set_id] || []).push(c))

  return (
    <>
      <div className="tallies mono">
        <span><b className="t-have">{countStance('have')}</b> have</span>
        <span><b className="t-want">{countStance('want')}</b> want</span>
        {rows.length !== data.summary.cards && <span><b>{rows.length}</b> shown</span>}
        <span><b>{data.summary.cards}</b> in catalog</span>
        <button className={'scanbtn' + (dockSetup ? ' anko-setup-hidden' : '')} data-tour-target={onboardingStep === 'scan' ? 'scan' : undefined}
          data-tour-focus={onboardingStep === 'scan' ? true : undefined}
          onClick={() => setScanning(true)} aria-label="Scan cards to add">
          <svg className="scanico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8.5V6.5A2.5 2.5 0 0 1 6.5 4H8.5" /><path d="M15.5 4H17.5A2.5 2.5 0 0 1 20 6.5V8.5" />
            <path d="M20 15.5V17.5A2.5 2.5 0 0 1 17.5 20H15.5" /><path d="M8.5 20H6.5A2.5 2.5 0 0 1 4 17.5V15.5" />
            <circle cx="12" cy="12" r="2.3" />
          </svg>
          <span className="scanbtn-label">Scan cards</span>
        </button>
      </div>
      <div className={'controls' + (onboardingStep ? ' anko-onboarding-controls' : '')}>
        <div className={'askbar' + (dockSetup ? ' anko-dock-setup' : '')} data-tour-target={onboardingStep === 'mark' ? 'mark' : undefined}>
          <img className={'anko-search' + (agentBusy ? ' busy' : '')} src={(import.meta.env.BASE_URL || '/') + 'agent/anko-avatar-v1.png'}
            alt="" title={`${agentName} — your Cairn collecting guide`} onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <input ref={askInput} data-tour-focus={onboardingStep === 'mark' ? true : undefined}
            value={query} maxLength={280} disabled={dockSetup}
            placeholder={onboardingStep === 'profile' ? `${agentName} is meeting you here…` : `Search or ask ${agentName}…`}
            onChange={(e) => { const v = e.target.value; setQuery(v); if (agentRes) clearAgent(); setQ(v) }}
            onKeyDown={(e) => { if (e.key === 'Enter') ask() }} />
          <button className="askbtn" onClick={ask} disabled={dockSetup || agentBusy || !query.trim()}>{agentBusy ? 'onibi reading…' : `Ask ${agentName}`}</button>
        </div>
        {directSearchMiss && <div className="searchhint mono" role="status">
          No direct card match. Keeping all cards in this view visible — ask {agentName} to understand the request.
        </div>}
        {onboardingGuide && !haveLessonUid && onboardingGuide}
        <div className="chips">
          {CHIPS.map((ch, i) => (
            <button key={i} className={'chip' + (chipOn(ch) ? ' on' : '') + (chipOn(ch) && ch.acc ? ' acc' : '')} onClick={() => toggleChip(ch)}>
              {ch.l}{ch.g === 'stance' ? <span className="ct"> {countStance(ch.v)}</span> : null}
            </button>
          ))}
          {[...familyF].map((value) => {
            const family = FAMILIES.find((item) => item.value === value)
            return <button key={value} className="chip on scopechip" onClick={() => setFamilyF(new Set())}
              title="remove release filter">{family?.label || value} ×</button>
          })}
          {(FAMILIES.length || CHANNELS.length || CATS.length || ELEMENTS.length) > 0 && (
            <button className={'chip filterbtn' + (refineCount ? ' on' : '')} onClick={() => setFiltersOpen(true)} aria-label="Filters">
              ⚑ Filters{refineCount ? ` · ${refineCount}` : ''}
            </button>
          )}
        </div>
      </div>
      {agentAction && findStep && <MarketFinds agentName={agentName} reading={agentAction.filter?.reading}
        finds={finds} mode={findStep.mode || 'buy'}
        onAddPile={({ seller, uid, mode }) => addToPile(pileKeyFor(catalog.id, accountId), seller, uid, mode)} onDismiss={clearAgent} />}
      {agentAction && !findStep && plan && <ActionBar agentName={agentName} plan={plan} reading={agentAction.filter?.reading}
        done={actionDone} onApply={applyProposal} onUndo={undoProposal} onDismiss={clearAgent} />}
      {agentRes && !agentAction && <AgentPanel res={agentRes} agentName={agentName} />}
      {filtersOpen && (
        <div className="fsheet-ov" onClick={() => setFiltersOpen(false)}>
          <div className="fsheet" onClick={(e) => e.stopPropagation()}>
            <div className="fsheet-head"><div className="ek">Filters</div><button className="sc-x" onClick={() => setFiltersOpen(false)} aria-label="Close">✕</button></div>
            <div className="fsheet-body">
              {FAMILIES.length > 0 && (
                <div className="fs-group"><label>Release</label><div className="fs-opts">
                  <button className={'fo' + (!familyF.size ? ' on' : '')} onClick={() => chooseFamily('')}>All</button>
                  {FAMILIES.map((f) => <button key={f.value} className={'fo' + (familyF.has(f.value) ? ' on' : '')} onClick={() => chooseFamily(f.value)}>{f.label}</button>)}
                </div></div>
              )}
              {CHANNELS.length > 0 && (
                <div className="fs-group"><label>Product</label><div className="fs-opts">
                  <button className={'fo' + (!channelF.size ? ' on' : '')} onClick={() => setChannelF(new Set())}>Any</button>
                  {CHANNELS.map((ch) => <button key={ch.value} className={'fo' + (channelF.has(ch.value) ? ' on' : '')} onClick={() => chooseChannel(ch.value)}>{ch.label}</button>)}
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
              <div className="fs-group"><label>Layout</label><div className="fs-opts">
                <button className={'fo' + (view === 'pages' ? ' on' : '')} onClick={() => chooseView('pages')}>Pages</button>
                <button className={'fo' + (view === 'standard' ? ' on' : '')} onClick={() => chooseView('standard')}>Standard</button>
                <button className={'fo' + (view === 'gallery' ? ' on' : '')} onClick={() => chooseView('gallery')}>Gallery</button>
              </div></div>
            </div>
            <div className="fsheet-actions">
              <button className="ghost sm" onClick={clearBrowseFilters}>Clear all</button>
              <button className="fs-done" onClick={() => setFiltersOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
      {(agentActive || agentCurating) && !agentNoMatch && (
        <div className="agentband">
          <span>{agentActive ? <><b>{agentName}</b> narrowed {data.summary.cards} → <b>{agentRes.data.n_survivors}</b></> : <><b>{agentName}</b> kept the Binder open</>}{agentCurating ? ` · placed ${pickList.length} highlighted card${pickList.length === 1 ? '' : 's'} first, in his order ★` : ''}{agentClearedFilters ? ` · opened the whole Binder (cleared ${agentClearedFilters} filter${agentClearedFilters === 1 ? '' : 's'})` : ''}{agentActive && rows.length !== agentRes.data.n_survivors ? ` · ${rows.length} after your filters` : ''}</span>
          <button className="ghost sm" onClick={clearAgent}>clear</button>
        </div>
      )}
      {agentNoMatch && (
        <div className="agentband">
          <span><b>{agentName}</b> didn&rsquo;t find a clean match, so the whole Binder is still open{agentClearedFilters ? ` · cleared ${agentClearedFilters} old filter${agentClearedFilters === 1 ? '' : 's'}` : ''}.</span>
          <button className="ghost sm" onClick={clearAgent}>clear his read</button>
        </div>
      )}
      <section>
        {!rows.length ? (
          agentActive && agentRes.data.n_survivors > 0
            ? <div className="empty">{agentName} found {agentRes.data.n_survivors}, but your section filters hide them.{' '}
                <button className="ghost sm" onClick={clearBrowseFilters}>show them</button></div>
            : <div className="empty">no cards match.</div>
        ) : view === 'pages' ? (
          <PocketPages rows={rows} store={store} userPhotos={userPhotos} onOpen={setSelected} onMarket={onBrowseCard} setStance={setStance}
            setField={setField} askIndex={askIndex} onQuickSell={setSellPop} onboarding={onboardingStep === 'mark'}
            pickSet={pickSet} focusKey={agentCurating ? agentRes : null}
            haveLessonUid={haveLessonUid}
            haveActionsGuide={haveLessonUid ? <HaveActionsLesson compact onDone={dismissHaveLesson} /> : null}
            onUseHaveAction={dismissHaveLesson}
            wantLessonUid={wantLessonUid}
            wantActionsGuide={wantLessonCard ? <WantActionsLesson compact cardName={nm(wantLessonCard)}
              onMarket={() => { dismissWantLesson(); onBrowseCard?.(wantLessonUid) }} onDone={dismissWantLesson} /> : null} />
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
      {selected && <CardModal key={selected} uid={selected} data={data} setById={setById} store={store} setStance={setStance} setField={setField} agentName={agentName} userPhoto={userPhotos[selected]}
        photoKey={`${storeKey}:${selected}`}
        onPhotoSaved={(uid, src) => setUserPhotos((prev) => ({ ...prev, [uid]: src }))}
        haveActionsGuide={haveLessonUid === selected ? <HaveActionsLesson onDone={dismissHaveLesson} /> : null} onUseHaveAction={dismissHaveLesson}
        onClose={() => { if (haveLessonUid === selected) dismissHaveLesson(); setSelected(null) }} market={mktEff} mockSales={mockSales} onBrowseCard={onBrowseCard} />}
      {scanning && <ScanCards cards={data.cards} onCommit={commitScans} onClose={() => setScanning(false)} />}
    </>
  )
}

function toggle(set, v) { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); return n }
