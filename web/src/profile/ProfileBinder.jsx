// A collector profile's binder. Grails are ordered first by MyPage, making this
// first page the old "front page" without creating a second curation system.
import { useState } from 'react'

export default function ProfileBinder({ uids, byUid, own, onOpen }) {
  const [page, setPage] = useState(0)
  const cards = uids.map((uid) => byUid.get(uid)).filter(Boolean)
  const pages = []
  for (let i = 0; i < cards.length; i += 9) pages.push(cards.slice(i, i + 9))
  const maxPage = Math.max(0, pages.length - 1)
  const current = Math.min(page, maxPage)
  const pg = pages[current] || []

  if (!own && !cards.length) return null

  return (
    <section className="pf-binder" aria-label={own ? 'Your binder' : 'Collector binder'}>
      <div className="bv-head">
        <div className="bv-title">Binder · Page {current + 1} of {Math.max(1, pages.length)}
          {current === 0 && <span className="dim"> · grails lead</span>}
        </div>
        <div className="bv-comp mono">{cards.length} held</div>
      </div>
      <div className="bv-page pf-page">
        {Array.from({ length: own ? 9 : pg.length }).map((_, i) => {
          const c = pg[i]
          if (!c) return <div key={`empty-${i}`} className="bv-pocket ghost pf-quiet"><span className="bv-gtxt">empty pocket</span></div>
          const face = c.image
            ? <img src={c.image} alt={c.name_en} loading="lazy" />
            : <span className="bv-noimg">{c.name_en}</span>
          return own && onOpen
            ? <button key={c.uid} className="bv-pocket filled" onClick={() => onOpen(c.uid)} title="open — mark it like in the binder">{face}</button>
            : <div key={c.uid} className="bv-pocket filled">{face}</div>
        })}
      </div>
      {own && !cards.length && <div className="empty pf-binderempty">Mark cards as Have and they&rsquo;ll fill your binder. Mark a grail and it moves to page one.</div>}
      {pages.length > 1 && (
        <div className="bv-nav">
          <button className="ghost sm" disabled={current <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← page {current}</button>
          <span className="dim bv-hint">grails rise to page one automatically</span>
          <button className="ghost sm" disabled={current >= maxPage} onClick={() => setPage((p) => Math.min(maxPage, p + 1))}>page {current + 2} →</button>
        </div>
      )}
    </section>
  )
}
