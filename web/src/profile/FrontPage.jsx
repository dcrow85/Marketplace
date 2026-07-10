// The front page: a binder pocket page (the bench, 3×3) holding the nine cards this
// collector leads with. Owner mode offers the empty pockets as invitations; public
// mode shows only what's pinned. Reuses the pocket-page styles — it IS a binder page.
import { useState } from 'react'
import MiniCard from '../components/MiniCard.jsx'

export default function FrontPage({ uids, byUid, own, myHaves, onTogglePin, grailFallback }) {
  const [picking, setPicking] = useState(false)
  const shown = uids.length ? uids : (grailFallback || [])
  const cards = shown.map((u) => byUid.get(u)).filter(Boolean).slice(0, 9)
  if (!own && !cards.length) return null

  return (
    <div className="pf-front">
      <div className="pf-fronthead">
        <span className="ek">The front page</span>
        {own && (
          <button className="ghost sm" onClick={() => setPicking(true)}>
            {uids.length ? 'edit' : cards.length ? 'grails are standing in — curate' : 'pin your nine'}
          </button>
        )}
      </div>
      {cards.length > 0 && (
        <div className="bv-page pf-page">
          {Array.from({ length: 9 }).map((_, i) => {
            const c = cards[i]
            if (!c) return own
              ? <button key={i} className="bv-pocket ghost" onClick={() => setPicking(true)}><span className="bv-gtxt">pin a card</span></button>
              : <div key={i} className="bv-pocket ghost pf-quiet" />
            return (
              <div key={c.uid} className="bv-pocket filled">
                {c.image ? <img src={c.image} alt={c.name_en} loading="lazy" /> : <span className="bv-noimg">{c.name_en}</span>}
              </div>
            )
          })}
        </div>
      )}
      {own && !cards.length && (
        <div className="empty">Nothing pinned yet — your front page is the nine cards you lead with.</div>
      )}
      {picking && (
        <div className="sc-overlay" role="dialog" aria-label="Curate your front page" onClick={(e) => { if (e.target === e.currentTarget) setPicking(false) }}>
          <div className="sc-sheet pf-picker">
            <div className="pf-pickhead">
              <div>
                <div className="ek">Your front page</div>
                <div className="pf-picktitle">{uids.length} of 9 pinned — tap to pin, in the order you tap</div>
              </div>
              <button className="primary qs-done" onClick={() => setPicking(false)}>done</button>
            </div>
            <div className="ofr-grid pf-pickgrid">
              {myHaves.map((c) => (
                <MiniCard key={c.uid} c={c} sel={uids.includes(c.uid)}
                  sub={uids.includes(c.uid) ? `pinned · #${uids.indexOf(c.uid) + 1}` : null}
                  onTap={() => onTogglePin(c.uid)} />
              ))}
              {!myHaves.length && <div className="empty">Mark cards as Have first — the front page draws from your binder.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
