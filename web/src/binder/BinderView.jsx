import { useEffect, useMemo, useState } from 'react'
import { storeKeyFor, loadStore, saveStore, catalogUrl, entryFor } from './collection.js'
import { getPhoto } from '../scan/photoStore.js'

// The binder: a pride object, not a database. Only pocket pages — your cards fill them
// (your scans preferred), and the set's gaps are drawn as empty pockets. An empty pocket
// is the most natural want-gesture in the hobby: tap it and the hunt begins.
export default function BinderView({ accountId, catalog }) {
  const [data, setData] = useState(null)
  const [store, setStore] = useState({})
  const [family, setFamily] = useState(null)
  const [page, setPage] = useState(0)
  const [photos, setPhotos] = useState({})
  const storeKey = storeKeyFor(catalog.id, accountId)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset on catalog switch, then fetch */
    setData(null); setPage(0); setFamily(null)
    setStore(loadStore(storeKey))
    fetch(catalogUrl(catalog)).then((r) => r.json()).then(setData).catch(() => {})
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [catalog, storeKey])

  const families = useMemo(() => (data?.ui?.family_chips || []).map((f) => f.value || f.v || f), [data])
  const fam = family || (families.find((f) => String(f).includes('gates')) || families[0])

  const setCards = useMemo(() => {
    if (!data) return []
    const inFam = data.cards.filter((c) => !fam || c.release_family === fam)
    return [...inFam].sort((a, b) => String(a.num).localeCompare(String(b.num)))
  }, [data, fam])

  const pages = useMemo(() => {
    const out = []
    for (let i = 0; i < setCards.length; i += 9) out.push(setCards.slice(i, i + 9))
    return out
  }, [setCards])

  const owned = useMemo(() => setCards.filter((c) => entryFor(c, store).stance === 'have'), [setCards, store])

  useEffect(() => {
    let live = true
    const scanned = setCards.filter((c) => (store[c.uid] || {}).scanned)
    Promise.all(scanned.map((c) => getPhoto(`${storeKey}:${c.uid}`).then((p) => [c.uid, p]).catch(() => null)))
      .then((pairs) => { if (live) setPhotos(Object.fromEntries((pairs || []).filter((p) => p && p[1]))) })
    return () => { live = false }
  }, [setCards, store, storeKey])

  const markWant = (uid) => {
    setStore((prev) => {
      const next = { ...prev, [uid]: { ...(prev[uid] || {}), stance: 'want' } }
      saveStore(storeKey, next)
      return next
    })
  }

  if (!data) return <div className="empty">Opening your binder…</div>
  const pg = pages[Math.min(page, pages.length - 1)] || []
  const filled = pg.filter((c) => entryFor(c, store).stance === 'have').length

  return (
    <div className="bv">
      <div className="bv-head">
        <div>
          <div className="ek">Your binder</div>
          <div className="bv-title">
            Page {Math.min(page, pages.length - 1) + 1} of {pages.length}
            <span className="dim"> · {filled} of {pg.length} pockets filled</span>
          </div>
        </div>
        <div className="bv-comp mono">{owned.length} / {setCards.length} set</div>
      </div>
      {families.length > 1 && (
        <div className="bv-fams">
          {families.map((f) => (
            <button key={String(f)} className={'cpill' + (f === fam ? ' on' : '')} onClick={() => { setFamily(f); setPage(0) }}>
              {String(f).replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      )}
      <div className="bv-page">
        {pg.map((c) => {
          const e = entryFor(c, store)
          const img = photos[c.uid] || c.image
          if (e.stance === 'have') {
            return (
              <div key={c.uid} className="bv-pocket filled">
                {img ? <img src={img} alt={c.name_en || c.uid} loading="lazy" /> : <span className="bv-noimg">{c.name_en}</span>}
                {(e.copies || 1) > 1 && <span className="bv-count mono">×{e.copies}</span>}
                {e.grail && <span className="bv-grail">★</span>}
                {(e.sell || e.trade) && <span className="bv-sell mono">selling</span>}
              </div>
            )
          }
          if (e.stance === 'want') {
            return (
              <div key={c.uid} className="bv-pocket ghost wanted">
                <span className="mono bv-gnum">{c.num}</span>
                <span className="bv-gtxt">wanted ✓</span>
              </div>
            )
          }
          return (
            <button key={c.uid} className="bv-pocket ghost" onClick={() => markWant(c.uid)}>
              <span className="mono bv-gnum">{c.num}</span>
              <span className="bv-gtxt">tap to want</span>
            </button>
          )
        })}
      </div>
      <div className="bv-nav">
        <button className="ghost sm" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>← page {page}</button>
        <span className="dim bv-hint">empty pockets are your wants, one tap away</span>
        <button className="ghost sm" disabled={page >= pages.length - 1} onClick={() => setPage((p) => p + 1)}>page {page + 2} →</button>
      </div>
    </div>
  )
}
