import { useEffect, useMemo, useState } from 'react'
import { handleFor } from '../identity.js'
import { tradesKeyFor, loadTrades, dismissTrade } from '../market/mockAgents.js'

// The rehearsal ledger: mock purchases playing out against seller agents. Each row is
// the whole rail in miniature — offer, their answer, escrow, shipping, settlement —
// clearly tagged mock. Real escrow (money, wallets, an arbiter) stays below.
const STEPS = ['offered', 'accepted', 'escrow_funded', 'shipped', 'delivered', 'settled']
const STEP_LABEL = { offered: 'offer', accepted: 'accepted', escrow_funded: 'escrow', shipped: 'shipped', delivered: 'delivered', settled: 'settled' }

export default function MockTrades({ accountId, catalog }) {
  const [rev, setRev] = useState(0)
  const k = tradesKeyFor(catalog.id, accountId)

  useEffect(() => {
    const bump = () => setRev((r) => r + 1)
    window.addEventListener('cairn-mock', bump)
    return () => window.removeEventListener('cairn-mock', bump)
  }, [])

  const trades = useMemo(() => loadTrades(k), [k, rev]) // eslint-disable-line react-hooks/exhaustive-deps -- rev is the invalidation signal
  if (!trades.length) return null

  return (
    <div className="mt">
      <div className="sw-head">
        <span className="ek">Mock trades</span>
        <span className="mono dim">{trades.length} · rehearsal, not money</span>
      </div>
      {trades.map((t) => {
        const done = t.state === 'settled'
        const dead = t.state === 'declined'
        const idx = STEPS.indexOf(t.state)
        return (
          <div key={t.id} className={'mt-row' + (done ? ' done' : '')}>
            <div className="mt-top">
              <span className="sw-card">{t.name}<span className="mono mk-num">{t.num}</span></span>
              <span className="mono sw-who">{handleFor(t.seller)} · {t.ask} USDC</span>
              <button className="sheetbtn mk-sm mono" onClick={() => dismissTrade(k, t.id)}>✕</button>
            </div>
            <div className="mt-steps mono">
              {STEPS.map((s, i) => (
                <span key={s} className={'mt-step' + (i <= idx && !dead ? ' on' : '') + (s === 'settled' && done ? ' ok' : '')}>
                  {i <= idx && !dead ? '✓ ' : ''}{STEP_LABEL[s]}
                </span>
              ))}
              {dead && <span className="mt-step dead">✕ declined</span>}
            </div>
            <div className="mt-log">
              {t.log.slice(-3).map((l, i) => (
                <div key={i} className="mt-line"><span className="mono dim">{l.who}</span> {l.line}</div>
              ))}
            </div>
          </div>
        )
      })}
      <p className="sc-note dim">Seller agents here are personas in your browser — no funds move, nothing leaves your
        device. When it&rsquo;s real, this exact rail runs on escrow: same steps, money locked, an arbiter named.</p>
    </div>
  )
}
