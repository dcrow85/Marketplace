// The front page: a binder pocket page (the bench, 3×3) holding the nine cards this
// collector leads with. Owner mode offers the empty pockets as invitations; public
// mode shows only what's pinned. Reuses the pocket-page styles — it IS a binder page.
import { useMemo, useState } from 'react'
import MiniCard from '../components/MiniCard.jsx'
import { RARITY_LADDER } from '../binder/helpers.jsx'

const PICK_SORTS = [
  ['binder', 'binder order'],
  ['rarity', 'chase first'],
  ['name', 'name A–Z'],
  ['num', 'by number'],
  ['pinned', 'pinned first'],
]

export default function FrontPage({ uids, byUid, own, myHaves, onTogglePin, grailFallback, onOpen }) {
  const [picking, setPicking] = useState(false)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('binder')
  const shown = uids.length ? uids : (grailFallback || [])
  const cards = shown.map((u) => byUid.get(u)).filter(Boolean).slice(0, 9)

  const pickRows = useMemo(() => {
    let rows = myHaves || []
    const s = q.trim().toLowerCase()
    if (s) rows = rows.filter((c) => ((c.name_en || '') + ' ' + (c.num || '')).toLowerCase().includes(s))
    const rIdx = (c) => { const i = RARITY_LADDER.indexOf(c.rarity); return i === -1 ? -1 : i }
    if (sort === 'rarity') rows = [...rows].sort((a, b) => rIdx(b) - rIdx(a))
    else if (sort === 'name') rows = [...rows].sort((a, b) => (a.name_en || '').localeCompare(b.name_en || ''))
    else if (sort === 'num') rows = [...rows].sort((a, b) => String(a.num || '').localeCompare(String(b.num || ''), undefined, { numeric: true }))
    else if (sort === 'pinned') rows = [...rows].sort((a, b) => {
      const ia = uids.indexOf(a.uid), ib = uids.indexOf(b.uid)
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    })
    return rows
  }, [myHaves, q, sort, uids])

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
            const face = c.image
              ? <img src={c.image} alt={c.name_en} loading="lazy" />
              : <span className="bv-noimg">{c.name_en}</span>
            // your own front page stays a binder page: tap a card, mark it like anywhere else
            return own && onOpen
              ? <button key={c.uid} className="bv-pocket filled" onClick={() => onOpen(c.uid)} title="open — mark it like in the binder">{face}</button>
              : <div key={c.uid} className="bv-pocket filled">{face}</div>
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
            <div className="pf-pickbar">
              <input placeholder="search your haves — name or number…" value={q} onChange={(e) => setQ(e.target.value)} />
              {PICK_SORTS.map(([k, label]) => (
                <button key={k} className={'chip' + (sort === k ? ' on' : '')} onClick={() => setSort(k)}>{label}</button>
              ))}
            </div>
            <div className="ofr-grid pf-pickgrid">
              {pickRows.map((c) => (
                <MiniCard key={c.uid} c={c} sel={uids.includes(c.uid)}
                  sub={uids.includes(c.uid) ? `pinned · #${uids.indexOf(c.uid) + 1}` : (c.rarity || null)}
                  onTap={() => onTogglePin(c.uid)} />
              ))}
              {!pickRows.length && (myHaves || []).length > 0 && <div className="empty">Nothing matches — clear the search.</div>}
              {!(myHaves || []).length && <div className="empty">Mark cards as Have first — the front page draws from your binder.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
