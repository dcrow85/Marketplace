import { useState } from 'react'
import { handleFor } from '../identity.js'

// Anko went shopping: the find_market step resolved against the live tables. Cards
// lead (this is a TCG), facts ride along (ask · witness), and every tile is one tap
// from a seeded offer. He surfaces; you decide.
export default function MarketFinds({ agentName, reading, finds, mode, onAddPile, onDismiss }) {
  const [added, setAdded] = useState(() => new Set())
  return (
    <div className="aprop">
      <span className="atag jud"><img className="anko-face" src={(import.meta.env.BASE_URL || '/') + 'agent/house.png'} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />{agentName} · found {finds.length ? `${finds.length} on the market` : 'nothing'}</span>
      {reading && <div className="aprop-read dim">{reading}</div>}
      {finds.length
        ? <div className="mkf-grid">
            {finds.map(({ c, sellerId, l }, i) => (
              <div key={i} className="mkf-tile">
                {c.image ? <img src={c.image} alt={c.name_en} loading="lazy" /> : <span className="ofr-noimg">{c.name_en}</span>}
                <span className="mkf-name">{c.name_en}</span>
                <span className="mono mkf-sub">{handleFor(sellerId)}</span>
                <span className="mono mkf-sub">{l.ask} USDC · {l.witness ? `✓ ${l.witness} scan${l.witness === 1 ? '' : 's'}` : 'no scans'}</span>
                <button className={'mkf-offer mono' + (added.has(c.uid) ? ' done' : '')}
                  onClick={() => { onAddPile({ seller: sellerId, uid: c.uid, mode }); setAdded((p) => new Set(p).add(c.uid)) }}>
                  {added.has(c.uid) ? '✓ in your pile' : mode === 'buy' ? `pile · buy ${l.ask} →` : '⇄ pile · trade →'}
                </button>
              </div>
            ))}
          </div>
        : <div className="aprop-read">Nobody&rsquo;s selling that right now. Mark it as a Want and I&rsquo;ll keep the lamp on.</div>}
      <div className="aprop-acts"><button className="ghost sm" onClick={onDismiss}>✕ done</button></div>
    </div>
  )
}
