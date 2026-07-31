import { useState, useEffect, useRef } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { handleFor, avatarSVG } from './identity.js'
import MeetAnko from './agent/MeetAnko.jsx'
import Binder from './binder/Binder.jsx'
import './binder/binder.css'
import TradePanel from './trade/TradePanel.jsx'
import Ambient from './ambient/Ambient.jsx'
import MyPage from './profile/MyPage.jsx'
import Market from './market/Market.jsx'
import Offers from './trade/Offers.jsx'
import OfferComposer from './market/OfferComposer.jsx'
import { offersKeyFor, loadOffers, OFFER_OPEN, OFFER_SETTLING } from './trade/offers.js'
import { startMockMarket } from './market/mockAgents.js'
import { startChainRail } from './chain/localRehearsal.js'
import { fetchInbox, isLiveAddr } from './live/pilotStore.js'
import { mergeInbox } from './live/inbox.js'
import { fetchJson } from './lib/data.js'
import { useBus } from './lib/store.js'
import { loadProfile } from './profile/profileStore.js'
import { useMilestoneProgress } from './profile/progress.js'
import GettingStarted from './profile/GettingStarted.jsx'
import { artistPath, artistSlugFromPath, cardPath, cardSlugFromPath } from './cards/cardRoute.js'
import { CATALOGS } from './catalogs.js'
import './trade/trade.css'

// Dev-only: open /?preview to see the signed-in app with a mock account (no Privy login).
// The mock id is a VALID address shape so the live-room plumbing (publish, inbox) can be
// exercised from dev — recognizable as the coffee address, never a real wallet.
const PREVIEW_PARAMS = new URLSearchParams(window.location.search)
const DEV_PREVIEW = import.meta.env.DEV && PREVIEW_PARAMS.has('preview')
const PREVIEW_ID = PREVIEW_PARAMS.get('preview')
const MOCK_ID = DEV_PREVIEW && /^0x[0-9a-fA-F]{40}$/.test(PREVIEW_ID || '')
  ? PREVIEW_ID.toLowerCase()
  : '0x0000000000000000000000000000000000c0ffee'
function catalogFromUrl() {
  const wanted = new URLSearchParams(window.location.search).get('catalog')
  const explicit = CATALOGS.find((c) => c.id === wanted)
  if (explicit) return explicit
  const slug = cardSlugFromPath()
  if (slug) {
    const routed = CATALOGS.find((catalog) => (
      (catalog.routePrefixes || []).some((prefix) => slug.startsWith(prefix))
    ))
    if (routed) return routed
  }
  return CATALOGS[0]
}

function cardRouteFromUrl() {
  const slug = cardSlugFromPath()
  if (!slug) return null
  return { slug, sellerId: new URLSearchParams(window.location.search).get('seller') || null }
}

function artistRouteFromUrl() {
  const slug = artistSlugFromPath()
  return slug ? { slug } : null
}

function appRootPath() {
  return (import.meta.env.BASE_URL || '/app/').replace(/\/?$/, '/')
}

function toggleTheme() {
  const h = document.documentElement
  const next = h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
  h.setAttribute('data-theme', next)
  try { localStorage.setItem('cairn-theme', next) } catch { /* ignore */ }
}

function ThemeToggle() {
  return (
    <button className="themebtn" onClick={toggleTheme} aria-label="Toggle dark mode" title="Toggle theme">
      <svg className="moon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M6.3 1.7a6.4 6.4 0 1 0 8 8.1A5 5 0 0 1 6.3 1.7Z" /></svg>
      <svg className="sun" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="3" /><path d="M8 1v1.7M8 13.3V15M1 8h1.7M13.3 8H15M3.1 3.1l1.2 1.2M11.7 11.7l1.2 1.2M12.9 3.1l-1.2 1.2M4.3 11.7l-1.2 1.2" /></svg>
    </button>
  )
}

const TILE_SCALES = { s: 0.78, m: 1, l: 1.3 }
function applyTileScale(k) {
  document.documentElement.style.setProperty('--tilescale', String(TILE_SCALES[k] || 1))
  document.documentElement.setAttribute('data-tile-size', k in TILE_SCALES ? k : 'm')
}
function SizePicker() {
  const [sz, setSz] = useState(() => { try { return localStorage.getItem('cairn-tilescale') || 'm' } catch { return 'm' } })
  useEffect(() => { applyTileScale(sz) }, [sz])
  return (
    <div className="sizepick mono" title="card size" role="radiogroup" aria-label="card size">
      {Object.keys(TILE_SCALES).map((k) => (
        <button key={k} role="radio" aria-checked={sz === k} className={sz === k ? 'on' : ''} onClick={() => { setSz(k); try { localStorage.setItem('cairn-tilescale', k) } catch { /* ignore */ } }}>{k.toUpperCase()}</button>
      ))}
    </div>
  )
}

function Wordmark({ big }) {
  return (
    <span className={'wm' + (big ? ' big' : '')}>
      c<span className="pq">(</span><span className="ai">ai</span><span className="pq">)</span>rn
    </span>
  )
}
function Avatar({ seed, size = 22, photo = '' }) {
  if (photo) return <span className="av"><img src={photo} width={size} height={size} alt="" /></span>
  return <span className="av" dangerouslySetInnerHTML={{ __html: avatarSVG(seed, size) }} />
}
function Splash() {
  return <div className="splash"><Wordmark big /><div className="dim mono">starting…</div></div>
}
function SignIn({ onLogin }) {
  return (
    <div className="gate">
      <div className="gatecard">
        <Wordmark big />
        <div className="ek gate-eyebrow">Your table starts here</div>
        <p className="lead">Create your collector profile, add a first card, and bring your binder to the show.</p>
        <button className="primary" onClick={onLogin}>Create profile or sign in</button>
        <div className="fine mono">email · google · apple · passkey — no crypto required</div>
      </div>
    </div>
  )
}

function AuthedApp({ accountId, agent, catalog, setCatalog, onSignOut, showMeet, onMeet }) {
  const [bseg, setBseg] = useState('binder') // 'binder' | 'sale' | 'market'
  const [tradesOpen, setTradesOpen] = useState(false)
  const [openTrade, setOpenTrade] = useState(null) // trade id the ambient line asked to open
  const [cardRoute, setCardRoute] = useState(cardRouteFromUrl) // one durable page for the card and every public copy
  const [artistRoute, setArtistRoute] = useState(artistRouteFromUrl)
  const artistReturnRef = useRef(null)
  const [offerSeed, setOfferSeed] = useState(null) // composer seed: a counter, or Anko's market find
  const tradesCloseRef = useRef(null)
  const profile = useBus(() => loadProfile(accountId), [accountId])
  const progress = useMilestoneProgress(accountId, catalog.id, profile)
  const guidedStep = showMeet
    ? (progress.milestones.find((item) => item.id === 'profile')?.done ? 'mark' : 'profile')
    : null
  const publicName = profile.name.trim() || handleFor(accountId)
  const openScanner = (uid = null) => {
    setBseg('binder')
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('cairn-open-scan', { detail: { uid } })), 0)
  }
  const openCard = (uid, { sellerId = null } = {}) => {
    const url = new URL(window.location.href)
    url.pathname = cardPath(uid)
    url.searchParams.set('catalog', catalog.id)
    if (sellerId) url.searchParams.set('seller', sellerId)
    else url.searchParams.delete('seller')
    const next = { slug: cardSlugFromPath(url.pathname), sellerId }
    window.history.pushState({ cairnCard: true }, '', url)
    setCardRoute(next)
    setArtistRoute(null)
    setBseg('market')
    setTradesOpen(false)
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }))
  }
  const openArtist = (artist) => {
    artistReturnRef.current = cardRoute ? { ...cardRoute } : null
    const url = new URL(window.location.href)
    url.pathname = artistPath(artist)
    url.searchParams.set('catalog', catalog.id)
    url.searchParams.delete('seller')
    window.history.pushState({ cairnArtist: true }, '', url)
    setArtistRoute({ slug: artistSlugFromPath(url.pathname) })
    setCardRoute(null)
    setBseg('market')
    setTradesOpen(false)
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }))
  }
  const closeCard = () => {
    const url = new URL(window.location.href)
    url.pathname = appRootPath()
    url.searchParams.delete('seller')
    url.searchParams.set('catalog', catalog.id)
    window.history.pushState({ cairnRoom: 'market' }, '', url)
    setCardRoute(null)
    setBseg('market')
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }))
  }
  const closeArtist = () => {
    if (artistReturnRef.current) {
      artistReturnRef.current = null
      window.history.back()
      return
    }
    const url = new URL(window.location.href)
    url.pathname = appRootPath()
    url.searchParams.set('catalog', catalog.id)
    window.history.pushState({ cairnRoom: 'market' }, '', url)
    setArtistRoute(null)
    setBseg('market')
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }))
  }
  const visit = (next) => {
    if (cardRoute || artistRoute) {
      const url = new URL(window.location.href)
      url.pathname = appRootPath()
      url.searchParams.delete('seller')
      url.searchParams.set('catalog', catalog.id)
      window.history.pushState({ cairnRoom: next }, '', url)
      setCardRoute(null)
      setArtistRoute(null)
    }
    setBseg(next)
    setTradesOpen(false)
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }))
  }
  useEffect(() => {
    const onPopState = () => {
      const nextCard = cardRouteFromUrl()
      const nextArtist = artistRouteFromUrl()
      setCardRoute(nextCard)
      setArtistRoute(nextArtist)
      if (nextCard || nextArtist) setBseg('market')
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  useEffect(() => {
    if (!tradesOpen) return undefined
    const previous = document.activeElement
    tradesCloseRef.current?.focus()
    const onKeyDown = (event) => { if (event.key === 'Escape') setTradesOpen(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown); previous?.focus?.() }
  }, [tradesOpen])
  useEffect(() => {
    let stop = () => {}
    let live = true
    const marketRequest = catalog.marketPath ? fetchJson(catalog.marketPath) : Promise.resolve(null)
    Promise.all([
      fetchJson(catalog.path),
      marketRequest,
    ]).then(([d, m]) => {
      if (!d) return
      if (!live) return
      const byUid = new Map((d.cards || []).map((c) => [c.uid, c]))
      const asks = new Map()
      if (m && m.catalog_id === catalog.id) for (const sl of m.sellers) for (const l of sl.listings) asks.set(sl.id + '|' + l.uid, l.ask)
      const stopMock = m
        ? startMockMarket({ catalogId: catalog.id, accountId, byUid, askOf: (seller, uid) => asks.get(seller + '|' + uid) })
        : () => {}
      const stopChain = startChainRail({ catalogId: catalog.id, accountId, byUid })
      stop = () => { stopMock(); stopChain() }
    }).catch(() => {})
    return () => { live = false; stop() }
  }, [catalog, accountId])
  // the live loop: poll your inbox on the room's KV and merge what arrived — offers
  // from real people land in the same ledger the personas use
  useEffect(() => {
    if (!isLiveAddr(accountId)) return undefined
    let stop = false
    const tick = () => fetchInbox(accountId).then((box) => { if (box && !stop) mergeInbox(catalog.id, accountId, box) })
    tick()
    const iv = setInterval(tick, 45000)
    const wake = () => tick()
    window.addEventListener('focus', wake)
    return () => { stop = true; clearInterval(iv); window.removeEventListener('focus', wake) }
  }, [catalog, accountId])
  const { swapN, needsYou } = useBus(() => {
    const offers = loadOffers(offersKeyFor(catalog.id, accountId))
    const active = offers.filter((o) => OFFER_OPEN.includes(o.state) || OFFER_SETTLING.includes(o.state)).length
    const needsDecision = offers.some((o) => o.dir === 'in' && OFFER_OPEN.includes(o.state))
    const needsEvidence = offers.some((o) => {
      const thread = Array.isArray(o.evidenceThread) ? o.evidenceThread : []
      const last = thread[thread.length - 1]
      return OFFER_OPEN.includes(o.state) && last?.dir === 'in' && ['request', 'response'].includes(last.kind)
    })
    return { swapN: active, needsYou: needsDecision || needsEvidence }
  }, [catalog, accountId])
  return (
    <div className="app">
      <nav className="nav">
        <button className="wmhome" onClick={() => visit('binder')} aria-label="Cairn home"><Wordmark /></button>
        <div className="appnav" aria-label="Primary">
          <button type="button" aria-current={bseg === 'binder' ? 'page' : undefined} className={bseg === 'binder' ? 'on' : ''} onClick={() => visit('binder')}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4.25h5.25c.97 0 1.75.78 1.75 1.75v9.75c0-.97-.78-1.75-1.75-1.75H3V4.25Z" /><path d="M17 4.25h-5.25c-.97 0-1.75.78-1.75 1.75v9.75c0-.97.78-1.75 1.75-1.75H17V4.25Z" /></svg>
            <span>Binder</span>
          </button>
          <button type="button" aria-current={bseg === 'market' || cardRoute || artistRoute ? 'page' : undefined} className={bseg === 'market' || cardRoute || artistRoute ? 'on' : ''} onClick={() => visit('market')}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8h14M4.25 8v7.75h11.5V8M3.25 4.25h13.5L17.75 8H2.25l1-3.75Z" /><path d="M7.5 15.75v-4h5v4" /></svg>
            <span>Market</span>
          </button>
          <button type="button" aria-current={bseg === 'sale' ? 'page' : undefined} className={bseg === 'sale' ? 'on' : ''} onClick={() => visit('sale')}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.25 5.25h11.5v10.5H4.25z" /><path d="m7 5.25.65-2h4.7l.65 2M7 5.25h6M7 9h6M7 12h4" /></svg>
            <span>My table</span>
          </button>
        </div>
        <div className="navr mono">
          <button className={'tradesbtn nav-trades' + (needsYou ? ' needs-you' : '')} onClick={() => { setOpenTrade(null); setTradesOpen(true) }}
            aria-label={swapN ? `Trades, ${swapN} active` : 'Trades'} title={needsYou ? 'an offer is waiting on you' : 'your trades'}>
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 5h9M8.5 2l3 3-3 3" /><path d="M14 11H5M7.5 14l-3-3 3-3" /></svg>
            <span className="nav-trades-label">Trades{swapN ? ` ·${swapN}` : ''}</span>
            {needsYou && <i className="nav-dot" aria-hidden="true" />}
          </button>
          <button className="chip profilechip" onClick={() => visit('sale')}
            aria-label={`Profile: ${publicName}, ${progress.points} point${progress.points === 1 ? '' : 's'}`}
            title="open your profile and table">
            <Avatar seed={accountId} size={18} photo={profile.photo} /> <span className="handle">{publicName}</span>
            <span key={progress.points} className="profile-points points-bump" aria-label={`${progress.points} point${progress.points === 1 ? '' : 's'}`}>✦ {progress.points}</span>
          </button>
          <ThemeToggle />
          <button className="ghost sm signoutbtn" onClick={onSignOut} aria-label="Sign out">
            <span className="signout-full">sign out</span><span className="signout-short" aria-hidden="true">out</span>
          </button>
        </div>
      </nav>
      <Ambient onOpenTrade={(id) => { setOpenTrade(id); setTradesOpen(true) }} />
      <main className="main">
        {!cardRoute && !artistRoute && <GettingStarted key={accountId} accountId={accountId}
          catalog={catalog} profile={profile} progress={progress} onScan={openScanner}
          concealed={showMeet} />}
        <div className="binder-surface">
          {CATALOGS.length > 1 && <div className="bindertop">
          {CATALOGS.length > 1 && (
            <div className="catalogpick" aria-label="catalog">
              {CATALOGS.map((c) => (
                <button key={c.id} className={'cpill' + (c.id === catalog.id ? ' on' : '')} onClick={() => setCatalog(c)} title={c.note}>{c.label}</button>
              ))}
              {catalog.id === 'japanese-pre-english' && (
                <span className="catalog-note mono">reference art · seller photos stay separate</span>
              )}
            </div>
          )}
          </div>}
          {!cardRoute && !artistRoute && bseg === 'binder' && <Binder accountId={accountId} agentName={agent} catalog={catalog}
            onBrowseCard={openCard}
            onboardingStep={guidedStep}
            onboardingGuide={showMeet ? <MeetAnko accountId={accountId} profile={profile} progress={progress} onDone={onMeet} /> : null}
            toolbar={<SizePicker />} />}
          {!cardRoute && !artistRoute && bseg === 'sale' && <MyPage accountId={accountId} catalog={catalog} agentName={agent} onScan={openScanner} onBrowseCard={openCard} />}
          {(cardRoute || artistRoute || bseg === 'market') && <Market accountId={accountId} catalog={catalog}
            focusSlug={cardRoute?.slug || null} focusSellerId={cardRoute?.sellerId || null}
            focusArtistSlug={artistRoute?.slug || null} onOpenArtist={openArtist}
            onOpenCard={openCard} onClearFocus={closeCard} onClearArtistFocus={closeArtist} />}
        </div>
      </main>
      {offerSeed && (
        <OfferComposer accountId={accountId} catalog={catalog} seller={offerSeed.seller}
          initialWant={offerSeed.want} initialGive={offerSeed.give}
          initialCash={offerSeed.cash} initialSettlement={offerSeed.settlement}
          counterOf={offerSeed.counterOf} live={offerSeed.live}
          onClose={() => setOfferSeed(null)} />
      )}
      {tradesOpen && (
        <div className="sc-overlay" role="dialog" aria-modal="true" aria-labelledby="trades-title" onClick={(e) => { if (e.target === e.currentTarget) setTradesOpen(false) }}>
          <div className="sc-sheet trades-sheet">
            <div className="trades-head">
              <span className="ek" id="trades-title">Trades</span>
              <button ref={tradesCloseRef} className="ghost sm" onClick={() => setTradesOpen(false)}>✕ close</button>
            </div>
            <div className="trades-body">
              <Offers accountId={accountId} catalog={catalog} onBrowseMarket={() => visit('market')} onScan={(uid) => { setTradesOpen(false); openScanner(uid) }} onCounter={(o) => setOfferSeed({
                seller: o.from, want: o.give.map((x) => x.uid), give: o.want.map((x) => x.uid),
                cash: o.cash ? { side: o.cash.side === 'to' ? 'from' : 'to', amount: o.cash.amount } : null,
                settlement: o.settlement || null,
                counterOf: o.id, live: o.live,
              })} />
              <TradePanel openTradeId={openTrade} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const accountId = DEV_PREVIEW ? MOCK_ID : (user?.wallet?.address || user?.id || '').toLowerCase()
  // The house agent: one character, one voice, everyone's agent. Meeting him once
  // replaces the old name-your-agent ritual (previously named agents migrate).
  const metKey = accountId ? `cairn-met-anko:${accountId}` : ''
  const [met, setMet] = useState(false)
  const [catalog, setCatalogState] = useState(catalogFromUrl)
  const agent = 'Anko'

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate the met-Anko flag for this account. */
    if (!metKey) { setMet(false); return }
    try { setMet(!!localStorage.getItem(metKey)) } catch { setMet(false) }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [metKey])

  const meetDone = () => {
    try { localStorage.setItem(metKey, '1') } catch { /* ignore */ }
    setMet(true)
  }
  const setCatalog = (c) => {
    setCatalogState(c)
    try { localStorage.setItem('cairn-catalog', c.id) } catch { /* ignore */ }
    const u = new URL(window.location.href)
    u.searchParams.set('catalog', c.id)
    window.history.replaceState(null, '', u)
  }
  const signOut = () => { if (DEV_PREVIEW) { try { localStorage.removeItem(metKey) } catch { /* ignore */ } setMet(false); return } logout() }

  if (DEV_PREVIEW) {
    return <AuthedApp accountId={accountId} agent={agent} catalog={catalog} setCatalog={setCatalog}
      onSignOut={signOut} showMeet={!met} onMeet={meetDone} />
  }
  if (!ready) return <Splash />
  if (!authenticated) return <SignIn onLogin={login} />
  return <AuthedApp accountId={accountId} agent={agent} catalog={catalog} setCatalog={setCatalog}
    onSignOut={signOut} showMeet={!met} onMeet={meetDone} />
}
