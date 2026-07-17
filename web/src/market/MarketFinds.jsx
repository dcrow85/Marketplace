import { useState } from 'react'
import { handleFor } from '../identity.js'
import MiniCard from '../components/MiniCard.jsx'

// Anko went shopping: the find_market step resolved against the live tables. Cards
// lead (this is a TCG), facts ride along (ask · witness), and every tile is one tap
// from a seeded offer. He surfaces; you decide.
export default function MarketFinds({ agentName, reading, finds, mode, onAddPile, onDismiss }) {
  const [added, setAdded] = useState(() => new Set())
  return (
    <div className="aprop">
      <span className="atag jud"><img className="anko-face" src={(import.meta.env.BASE_URL || '/') + 'agent/anko-avatar-v3.png'} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />{agentName} · found {finds.length ? `${finds.length} on the market` : 'nothing'}</span>
      {reading && <div className="aprop-read dim">{reading}</div>}
      {finds.length
        ? <div className="mkf-grid">
            {finds.map(({ c, sellerId, tableName, l }) => {
              const listingKey = `${sellerId}|${c.uid}`
              return <MiniCard key={listingKey} c={c}
                sub={<>{tableName || handleFor(sellerId)} · <span className="money mono">{l.ask} USDC</span> · {l.witness ? `✓ ${l.witness} scan${l.witness === 1 ? '' : 's'}` : 'no scans'}</>}
                actions={<button className={'mkf-offer mono' + (added.has(listingKey) ? ' done' : '')}
                  onClick={() => { onAddPile({ seller: sellerId, uid: c.uid, mode }); setAdded((p) => new Set(p).add(listingKey)) }}>
                  {added.has(listingKey) ? '✓ in your pile' : mode === 'buy' ? <>pile · buy <span className="money">{l.ask}</span> →</> : '⇄ pile · trade →'}
                </button>} />
            })}
          </div>
        : <div className="aprop-read">Nobody&rsquo;s selling that right now. Mark it as a Want and I&rsquo;ll keep the lamp on.</div>}
      <div className="aprop-acts"><button className="ghost sm" onClick={onDismiss}>✕ done</button></div>
    </div>
  )
}
