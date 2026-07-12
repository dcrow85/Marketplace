import { useState, useEffect } from 'react'
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
import './trade/trade.css'

// Dev-only: open /?preview to see the signed-in app with a mock account (no Privy login).
// The mock id is a VALID address shape so the live-room plumbing (publish, inbox) can be
// exercised from dev — recognizable as the coffee address, never a real wallet.
const DEV_PREVIEW = import.meta.env.DEV && new URLSearchParams(window.location.search).has('preview')
const MOCK_ID = '0x0000000000000000000000000000000000c0ffee'
const CATALOGS = [
  {
    id: 'azuki-tcg',
    label: 'Azuki TCG',
    title: 'Azuki TCG catalog',
    path: 'catalogs/azuki-tcg.json',
    note: 'Alpha, Gates Awakened, observations, and source scars.',
  },
  // Japanese pre-English (Pokemon) parked while the pilot focuses on Azuki — data and
  // stores stay intact; restore by re-adding the entry:
  // { id: 'japanese-pre-english', label: 'Japanese pre-English', title: 'Japanese pre-English catalog', path: 'catalog-sample.json', note: 'Pokemon launch-era and pre-English references.' },
]

function catalogFromUrl() {
  const wanted = new URLSearchParams(window.location.search).get('catalog')
  return CATALOGS.find((c) => c.id === wanted) || CATALOGS[0]
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
}
function SizePicker() {
  const [sz, setSz] = useState(() => { try { return localStorage.getItem('cairn-tilescale') || 'm' } catch { return 'm' } })
  useEffect(() => { applyTileScale(sz) }, [sz])
  return (
    <div className="sizepick mono" title="card size" role="radiogroup" aria-label="card size">
      {Object.keys(TILE_SCALES).map((k) => (
        <button key={k} className={sz === k ? 'on' : ''} onClick={() => { setSz(k); try { localStorage.setItem('cairn-tilescale', k) } catch { /* ignore */ } }}>{k.toUpperCase()}</button>
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
function Avatar({ seed, size = 22 }) {
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
        <p className="lead">Your collection, your terms, your agent.</p>
        <button className="primary" onClick={onLogin}>Sign in</button>
        <div className="fine mono">email · google · apple · passkey · wallet — no crypto required</div>
      </div>
    </div>
  )
}

function AuthedApp({ accountId, agent, catalog, setCatalog, onSignOut }) {
  const [bseg, setBseg] = useState('binder') // 'binder' | 'sale' | 'market'
  const [tradesOpen, setTradesOpen] = useState(false)
  const [openTrade, setOpenTrade] = useState(null) // trade id the ambient line asked to open
  const [marketFocus, setMarketFocus] = useState(null) // card uid the binder asked the market about
  const [offerSeed, setOfferSeed] = useState(null) // composer seed: a counter, or Anko's market find
  useEffect(() => {
    let stop = () => {}
    let live = true
    Promise.all([
      fetchJson(catalog.path || 'catalog-sample.json'),
      fetchJson('market-sample.json'),
    ]).then(([d, m]) => {
      if (!d) return
      if (!live) return
      const byUid = new Map((d.cards || []).map((c) => [c.uid, c]))
      const asks = new Map()
      if (m && m.catalog_id === catalog.id) for (const sl of m.sellers) for (const l of sl.listings) asks.set(sl.id + '|' + l.uid, l.ask)
      const stopMock = startMockMarket({ catalogId: catalog.id, accountId, byUid, askOf: (seller, uid) => asks.get(seller + '|' + uid) })
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
    const inOpen = offers.filter((o) => o.dir === 'in' && OFFER_OPEN.includes(o.state)).length
    const settling = offers.filter((o) => OFFER_SETTLING.includes(o.state)).length
    return { swapN: inOpen + settling, needsYou: inOpen > 0 }
  }, [catalog, accountId])
  return (
    <div className="app">
      <nav className="nav">
        <button className="wmhome" onClick={() => { setBseg('binder'); setMarketFocus(null); setTradesOpen(false) }} title="back to your binder"><Wordmark /></button>
        <div className="navr mono">
          <button className={'tradesbtn nav-trades' + (needsYou ? ' needs-you' : '')} onClick={() => { setOpenTrade(null); setTradesOpen(true) }} title={needsYou ? 'an offer is waiting on you' : 'your trades'}>
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 5h9M8.5 2l3 3-3 3" /><path d="M14 11H5M7.5 14l-3-3 3-3" /></svg>
            <span>Trades{swapN ? ` ·${swapN}` : ''}</span>
            {needsYou && <i className="nav-dot" aria-hidden="true" />}
          </button>
          <span className="chip"><Avatar seed={accountId} size={18} /> <span className="handle">{handleFor(accountId)}</span></span>
          <ThemeToggle />
          <button className="ghost sm" onClick={onSignOut}>sign out</button>
        </div>
      </nav>
      <Ambient onOpenTrade={(id) => { setOpenTrade(id); setTradesOpen(true) }} />
      <main className="main">
        <div className="bindertop">
          {CATALOGS.length > 1 && (
            <div className="catalogpick" aria-label="catalog">
              {CATALOGS.map((c) => (
                <button key={c.id} className={'cpill' + (c.id === catalog.id ? ' on' : '')} onClick={() => setCatalog(c)} title={c.note}>{c.label}</button>
              ))}
            </div>
          )}
          <div className="bt-right">
            <SizePicker />
            <div className="bsegs mono" role="tablist" aria-label="binder section">
              <button role="tab" aria-selected={bseg === 'binder'} className={bseg === 'binder' ? 'on' : ''} onClick={() => setBseg('binder')}>Binder</button>
              <button role="tab" aria-selected={bseg === 'sale'} className={bseg === 'sale' ? 'on' : ''} onClick={() => setBseg('sale')}>My page</button>
              <button role="tab" aria-selected={bseg === 'market'} className={bseg === 'market' ? 'on' : ''} onClick={() => { setMarketFocus(null); setBseg('market') }}>Market</button>
            </div>
          </div>
        </div>
        {bseg === 'binder' && <Binder accountId={accountId} agentName={agent} catalog={catalog}
          onBrowseCard={(uid) => { setMarketFocus(uid); setBseg('market') }} />}
        {bseg === 'sale' && <MyPage accountId={accountId} catalog={catalog} />}
        {bseg === 'market' && <Market accountId={accountId} catalog={catalog}
          focusUid={marketFocus} onClearFocus={() => setMarketFocus(null)} />}
      </main>
      {offerSeed && (
        <OfferComposer accountId={accountId} catalog={catalog} seller={offerSeed.seller}
          initialWant={offerSeed.want} initialGive={offerSeed.give}
          initialCash={offerSeed.cash} counterOf={offerSeed.counterOf} live={offerSeed.live}
          onClose={() => setOfferSeed(null)} />
      )}
      {tradesOpen && (
        <div className="sc-overlay" role="dialog" aria-label="Trades" onClick={(e) => { if (e.target === e.currentTarget) setTradesOpen(false) }}>
          <div className="sc-sheet trades-sheet">
            <div className="trades-head">
              <span className="ek">Trades</span>
              <button className="ghost sm" onClick={() => setTradesOpen(false)}>✕ close</button>
            </div>
            <div className="trades-body">
              <Offers accountId={accountId} catalog={catalog} onCounter={(o) => setOfferSeed({
                seller: o.from, want: o.give.map((x) => x.uid), give: o.want.map((x) => x.uid),
                cash: o.cash ? { side: o.cash.side === 'to' ? 'from' : 'to', amount: o.cash.amount } : null,
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
    if (!met) return <MeetAnko onDone={meetDone} />
    return <AuthedApp accountId={accountId} agent={agent} catalog={catalog} setCatalog={setCatalog} onSignOut={signOut} />
  }
  if (!ready) return <Splash />
  if (!authenticated) return <SignIn onLogin={login} />
  if (!met) return <MeetAnko onDone={meetDone} />
  return <AuthedApp accountId={accountId} agent={agent} catalog={catalog} setCatalog={setCatalog} onSignOut={signOut} />
}
