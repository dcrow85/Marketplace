import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { handleFor, avatarSVG, shortId, randomAgentName } from './identity.js'
import Binder from './binder/Binder.jsx'
import './binder/binder.css'

// Dev-only: open /?preview to see the signed-in app with a mock account (no Privy login).
const DEV_PREVIEW = import.meta.env.DEV && new URLSearchParams(window.location.search).has('preview')
const MOCK_ID = '0xpreview0000000000000000000000000000dev1'

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

function AuthedApp({ accountId, agent, onSignOut }) {
  return (
    <div className="app">
      <nav className="nav">
        <Wordmark />
        <div className="navr mono">
          <span className="chip"><Avatar seed={accountId} size={18} /> {handleFor(accountId)}</span>
          <button className="ghost sm" onClick={onSignOut}>sign out</button>
        </div>
      </nav>
      <main className="main">
        <div className="ek">Your collection</div>
        <h1>Japanese pre-English catalog</h1>
        <div className="agentline"><Avatar seed={agent} size={20} /> <b>{agent}</b> is signed in and ready.</div>
        <Binder accountId={accountId} agentName={agent} />
      </main>
    </div>
  )
}

export default function App() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const accountId = DEV_PREVIEW ? MOCK_ID : (user?.wallet?.address || user?.id || '').toLowerCase()
  const agentStoreKey = accountId ? `cairn-agent:${accountId}` : ''
  const [agent, setAgent] = useState('')

  useEffect(() => {
    if (!agentStoreKey) { setAgent(''); return }
    try { setAgent(localStorage.getItem(agentStoreKey) || (DEV_PREVIEW ? 'Ledger' : '')) } catch { setAgent('') }
  }, [agentStoreKey])

  const nameAgent = (n) => {
    try { localStorage.setItem(agentStoreKey, n) } catch { /* ignore */ }
    setAgent(n)
  }
  const signOut = () => { if (DEV_PREVIEW) { setAgent(''); return } logout() }

  if (DEV_PREVIEW) {
    if (!agent) return <MeetAgent accountId={accountId} onNamed={nameAgent} />
    return <AuthedApp accountId={accountId} agent={agent} onSignOut={signOut} />
  }
  if (!ready) return <Splash />
  if (!authenticated) return <SignIn onLogin={login} />
  if (!agent) return <MeetAgent accountId={accountId} onNamed={nameAgent} />
  return <AuthedApp accountId={accountId} agent={agent} onSignOut={signOut} />
}
