import { useState, useEffect } from 'react'
import { entryFor as effStance } from './collection.js'
import { nm, retryImg } from './helpers.jsx'

const releaseLabel = (card) => card.release_family_label || card.set_label || card.product_channel_label || ''

// The binder's paged layout: the SAME filtered rows as the grid, nine cards at a
// time. Desktop keeps the 3×3 pocket sheet; phones use the Market's card rhythm.
// Every card opens the full modal, so search, Anko, filters, and scanning stay here.
export default function PocketPages({
  rows, store, userPhotos, onOpen, onMarket, setStance, setField, askIndex, onQuickSell,
  onboarding = false, haveLessonUid = null, haveActionsGuide = null, onUseHaveAction,
  wantLessonUid = null, wantActionsGuide = null, pickSet = null, focusKey = '',
}) {
  const [page, setPage] = useState(0)
  useEffect(() => { setPage(0) }, [rows.length, focusKey]) // eslint-disable-line react-hooks/set-state-in-effect -- filters or Anko's curation changed; back to page 1
  const pages = []
  for (let i = 0; i < rows.length; i += 9) pages.push(rows.slice(i, i + 9))
  const pg = pages[Math.min(page, pages.length - 1)] || []
  const filled = pg.filter((c) => effStance(c, store).stance === 'have').length
  const showIntent = onboarding && rows.length === 1
  return (
    <div className="bv">
      <div className="bv-head">
        <div className="bv-title">Page {Math.min(page, pages.length - 1) + 1} of {pages.length}
          <span className="dim"> · {filled} of {pg.length} pockets filled</span></div>
        <div className="bv-comp mono">{rows.filter((c) => effStance(c, store).stance === 'have').length} owned · {rows.length} shown</div>
      </div>
      <div className="bv-page">
        {haveActionsGuide && pg.some((card) => card.uid === haveLessonUid) && (
          <div className="bv-have-guide">{haveActionsGuide}</div>
        )}
        {wantActionsGuide && pg.some((card) => card.uid === wantLessonUid) && (
          <div className="bv-have-guide">{wantActionsGuide}</div>
        )}
        {pg.map((c) => {
          const e = effStance(c, store)
          const img = userPhotos[c.uid] || c.image
          const fromAsk = askIndex ? askIndex.get(c.uid) : null
          const isPick = !!pickSet?.has(c.uid)
          if (e.stance === 'have') {
            return (
              <div key={c.uid} className={'bv-pocket filled' + (isPick ? ' is-pick' : '')} role="button" tabIndex={0} onClick={() => onOpen(c.uid)}
                onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') onOpen(c.uid) }}>
                {img ? <img src={img} alt={nm(c)} loading="lazy" decoding="async" onError={userPhotos[c.uid] ? undefined : (ev) => retryImg(ev, c.image)} /> : <span className="bv-noimg">{nm(c)}</span>}
                {isPick && <span className="bv-pickflag mono" title="Anko placed this card first">★ Anko</span>}
                {(e.copies || (store[c.uid] || {}).copies || 1) > 1 && <span className="bv-count mono">×{(store[c.uid] || {}).copies}</span>}
                {e.grail && <span className="bv-grail">★</span>}
                <span className="bv-mobile-cardinfo">
                  {releaseLabel(c) && <span className="mono bv-mobile-kicker">{releaseLabel(c)}</span>}
                  <span className="bv-mobile-name">{nm(c)}</span>
                  <span className="mono bv-mobile-sub">{c.num} · Have{(e.copies || 1) > 1 ? ` · ×${e.copies}` : ''}</span>
                </span>
                {fromAsk != null && <button type="button" className="bv-from onart mono"
                  onClick={(ev) => { ev.stopPropagation(); onMarket?.(c.uid) }}>
                  available · from <span className="money">{fromAsk} USDC</span> →
                </button>}
                <span className="bv-q">
                  <button className={'bv-qb' + (e.sell ? ' on' : '')} title={e.sell ? 'listed for sale — tap to unlist' : 'list for sale'}
                    onClick={(ev) => { ev.stopPropagation(); onUseHaveAction?.(); const on = !e.sell; setField(c.uid, 'sell', on); if (!on) setField(c.uid, 'display', false); if (on && onQuickSell) onQuickSell(c.uid) }}><span className="bv-qicon">$</span><span className="bv-qlabel">{e.sell ? '✓ For sale' : 'Sell'}</span></button>
                  <button className={'bv-qb' + (e.trade ? ' on' : '')} title={e.trade ? 'open to trade — tap to close' : 'open to trade'}
                    onClick={(ev) => { ev.stopPropagation(); onUseHaveAction?.(); setField(c.uid, 'trade', !e.trade) }}><span className="bv-qicon">⇄</span><span className="bv-qlabel">{e.trade ? '✓ Trade' : 'Trade'}</span></button>
                </span>
              </div>
            )
          }
          return (
            <div key={c.uid} className={'bv-pocket ghost' + (e.stance === 'want' ? ' wanted' : '') + (isPick ? ' is-pick' : '')}
              role="button" tabIndex={0} onClick={() => onOpen(c.uid)}
              onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') onOpen(c.uid) }}>
              {img && <img className="bv-ghostart" src={img} alt="" loading="lazy" decoding="async" onError={(ev) => retryImg(ev, c.image)} />}
              {isPick && <span className="bv-pickflag mono" title="Anko placed this card first">★ Anko</span>}
              <span className="mono bv-gnum">{c.num}</span>
              <span className="bv-gtxt">{e.stance === 'want' ? 'wanted ✓' : nm(c)}</span>
              <span className="bv-mobile-cardinfo">
                {releaseLabel(c) && <span className="mono bv-mobile-kicker">{releaseLabel(c)}</span>}
                <span className="bv-mobile-name">{nm(c)}</span>
                <span className="mono bv-mobile-sub">{c.num} · {e.stance === 'want' ? 'Want' : 'Not marked'}</span>
              </span>
              {fromAsk != null && <button type="button" className="bv-from mono"
                onClick={(ev) => { ev.stopPropagation(); onMarket?.(c.uid) }}>
                available · from <span className="money">{fromAsk} USDC</span> →
              </button>}
              <span className="bv-mobile-intent" aria-label={`Mark ${nm(c)}`}>
                <button type="button" className={e.stance === 'have' ? 'on' : ''}
                  onClick={(ev) => { ev.stopPropagation(); setStance(c.uid, 'have') }}>Have</button>
                <button type="button" className={e.stance === 'want' ? 'on' : ''}
                  onClick={(ev) => { ev.stopPropagation(); setStance(c.uid, 'want') }}>Want</button>
              </span>
              {showIntent && <span className="bv-intent" aria-label={`Mark ${nm(c)}`}>
                <button type="button" onKeyDown={(ev) => ev.stopPropagation()}
                  onClick={(ev) => { ev.stopPropagation(); setStance(c.uid, 'have') }}>Have</button>
                <button type="button" onKeyDown={(ev) => ev.stopPropagation()}
                  onClick={(ev) => { ev.stopPropagation(); setStance(c.uid, 'want') }}>Want</button>
              </span>}
            </div>
          )
        })}
      </div>
      <div className="bv-nav">
        <button className="ghost sm" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>← page {page}</button>
        <span className="dim bv-hint">every pocket opens the card — gaps included</span>
        <button className="ghost sm" disabled={page >= pages.length - 1} onClick={() => setPage((p) => p + 1)}>page {page + 2} →</button>
      </div>
    </div>
  )
}
