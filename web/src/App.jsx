import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { handleFor, avatarSVG, randomAgentName } from './identity.js'
import Binder from './binder/Binder.jsx'
import './binder/binder.css'

// Dev-only: open /?preview to see the signed-in app with a mock account (no Privy login).
const DEV_PREVIEW = import.meta.env.DEV && new URLSearchParams(window.location.search).has('preview')
const MOCK_ID = '0xpreview0000000000000000000000000000dev1'
const CATALOGS = [
  {
    id: 'azuki-tcg',
    label: 'Azuki TCG',
    title: 'Azuki TCG catalog',
    path: 'catalogs/azuki-tcg.json',
    note: 'Alpha, Gates Awakened, observations, and source scars.',
  },
  {
    id: 'japanese-pre-english',
    label: 'Japanese pre-English',
    title: 'Japanese pre-English catalog',
    path: 'catalog-sample.json',
    note: 'Pokemon launch-era and pre-English references.',
  },
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
function MeetAgent({ accountId, onNamed }) {
  const [name, setName] = useState('')
  const seed = name.trim() || accountId || 'agent'
  const go = () => onNamed(name.trim() || 'Cairn')
  return (
    <div className="gate">
      <div className="meetcard">
        <div className="meetav"><Avatar seed={seed} size={56} /></div>
        <div className="ek agent">Your agent</div>
        <p className="intro">
          I read the catalog — not the cards. I&rsquo;ll show you what&rsquo;s recorded, flag what&rsquo;s
          only claimed, and say plainly when something&rsquo;s just my judgment. I won&rsquo;t call a card
          mint when I can&rsquo;t see it, and I&rsquo;ll never sell you anything. Give me a name and we&rsquo;ll
          get to work.
        </p>
        <label className="ek2">Name your agent</label>
        <div className="row">
          <input value={name} maxLength={24} placeholder="…" autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) go() }} />
          <button className="ghost" onClick={() => setName(randomAgentName())}>surprise me</button>
        </div>
        <button className="primary" onClick={go}>{name.trim() ? `meet ${name.trim()}` : 'meet your agent'}</button>
      </div>
    </div>
  )
}

function AuthedApp({ accountId, agent, catalog, setCatalog, onSignOut }) {
  return (
    <div className="app">
      <nav className="nav">
        <Wordmark />
        <div className="navr mono">
          <span className="chip"><Avatar seed={accountId} size={18} /> {handleFor(accountId)}</span>
          <ThemeToggle />
          <button className="ghost sm" onClick={onSignOut}>sign out</button>
        </div>
      </nav>
      <main className="main">
        <div className="ek">Your collection</div>
        <h1>{catalog.title}</h1>
        <div className="catalogswitch" aria-label="catalog selection">
          {CATALOGS.map((c) => (
            <button
              key={c.id}
              className={'catalogtab' + (c.id === catalog.id ? ' on' : '')}
              onClick={() => setCatalog(c)}
            >
              <span>{c.label}</span>
              <small>{c.note}</small>
            </button>
          ))}
        </div>
        <div className="agentline"><Avatar seed={agent} size={20} /> <b>{agent}</b> is signed in and ready.</div>
        <Binder accountId={accountId} agentName={agent} catalog={catalog} />
      </main>
    </div>
  )
}

export default function App() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const accountId = DEV_PREVIEW ? MOCK_ID : (user?.wallet?.address || user?.id || '').toLowerCase()
  const agentStoreKey = accountId ? `cairn-agent:${accountId}` : ''
  const [agent, setAgent] = useState('')
  const [catalog, setCatalogState] = useState(catalogFromUrl)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate the persisted agent name for this account. */
    if (!agentStoreKey) { setAgent(''); return }
    try { setAgent(localStorage.getItem(agentStoreKey) || (DEV_PREVIEW ? 'Ledger' : '')) } catch { setAgent('') }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [agentStoreKey])

  const nameAgent = (n) => {
    try { localStorage.setItem(agentStoreKey, n) } catch { /* ignore */ }
    setAgent(n)
  }
  const setCatalog = (c) => {
    setCatalogState(c)
    try { localStorage.setItem('cairn-catalog', c.id) } catch { /* ignore */ }
    const u = new URL(window.location.href)
    u.searchParams.set('catalog', c.id)
    window.history.replaceState(null, '', u)
  }
  const signOut = () => { if (DEV_PREVIEW) { setAgent(''); return } logout() }

  if (DEV_PREVIEW) {
    if (!agent) return <MeetAgent accountId={accountId} onNamed={nameAgent} />
    return <AuthedApp accountId={accountId} agent={agent} catalog={catalog} setCatalog={setCatalog} onSignOut={signOut} />
  }
  if (!ready) return <Splash />
  if (!authenticated) return <SignIn onLogin={login} />
  if (!agent) return <MeetAgent accountId={accountId} onNamed={nameAgent} />
  return <AuthedApp accountId={accountId} agent={agent} catalog={catalog} setCatalog={setCatalog} onSignOut={signOut} />
}
