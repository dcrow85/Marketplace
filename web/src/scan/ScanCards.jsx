import { useRef, useState, useMemo, useEffect } from 'react'
import { recognizePhoto, ensureLocateWorker } from './recognize.js'
import { preparePhoto } from './preparePhoto.js'
import { useScrollLock } from '../useScrollLock.js'

const cardName = (c) => c?.name_en || c?.name_ja || c?.uid || '—'
const EXTRA_VIEWS = [
  { id: 'back', label: 'Back', hint: 'wear and alignment' },
  { id: 'corners', label: 'Corners', hint: 'edges and wear' },
  { id: 'holo', label: 'Holo tilt', hint: 'foil and surface' },
]

// Module-level (not created during render) — used to pick/correct a card for an item.
function CardPicker({ cards, onPick }) {
  const [q, setQ] = useState('')
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    return cards.filter((c) => (cardName(c).toLowerCase().includes(s) || (c.num || '').toLowerCase().includes(s))).slice(0, 6)
  }, [q, cards])
  return (
    <div className="sc-pick">
      <input autoFocus placeholder="name or number…" value={q} onChange={(e) => setQ(e.target.value)} />
      {hits.map((c) => (
        <button key={c.uid} className="sc-hit" onClick={() => onPick(c)}>
          <span>{cardName(c)}</span><small className="mono">{c.num}</small>
        </button>
      ))}
    </div>
  )
}

export default function ScanCards({ cards, targetCard = null, onCommit, onClose }) {
  const [items, setItems] = useState([]) // {id, status:'reading'|'matched'|'unmatched', photo, read, match}
  const [picking, setPicking] = useState(null) // item id currently being picked
  const [viewBusy, setViewBusy] = useState('')
  const [viewError, setViewError] = useState('')
  const [committing, setCommitting] = useState(false)
  const [commitError, setCommitError] = useState(false)
  const idRef = useRef(0)
  useScrollLock() // overlay is mounted only while open
  useEffect(() => { if (!targetCard) ensureLocateWorker() }, [targetCard]) // warm CV only for a pile scan

  // Each photo → one card. While the read is in flight we show a "reading" placeholder,
  // then replace it with the recognized card.
  const addPhotos = async (fileList) => {
    const files = [...(fileList || [])].slice(0, targetCard ? 1 : undefined)
    if (!files.length) return
    if (targetCard) {
      const file = files[0]
      const pid = ++idRef.current
      setItems([{ id: pid, status: 'reading', photo: null, read: null, match: targetCard }])
      try {
        const prepared = await preparePhoto(file)
        setItems([{ id: pid, status: 'matched', photo: prepared.full, read: null, match: targetCard }])
      } catch {
        setItems([{ id: pid, status: 'unmatched', photo: null, read: null, match: targetCard }])
      }
      return
    }
    let cursor = 0
    const worker = async () => {
      while (cursor < files.length) {
        const file = files[cursor++]
        const pid = ++idRef.current
        setItems((prev) => [...prev, { id: pid, status: 'reading', photo: null, read: null, match: null }])
        let frame = null
        let results
        try { const out = await recognizePhoto(file, cards); frame = out.frame; results = out.items } catch { results = [] }
        const fresh = results.map((r) => ({
          id: ++idRef.current, status: r.match ? 'matched' : 'unmatched', photo: r.photo, read: r.read, match: r.match, frame, quad: r.quad,
        }))
        setItems((prev) => {
          const i = prev.findIndex((x) => x.id === pid)
          if (i < 0) return prev
          if (!fresh.length) { const copy = prev.slice(); copy[i] = { ...copy[i], status: 'unmatched' }; return copy }
          return [...prev.slice(0, i), ...fresh, ...prev.slice(i + 1)]
        })
      }
    }
    await Promise.all([worker(), worker()]) // up to 2 photos reading at once
  }

  const setMatch = (id, card) => setItems((prev) => prev.map((x) => x.id === id ? { ...x, match: card, status: 'matched' } : x))
  const remove = (id) => setItems((prev) => prev.filter((x) => x.id !== id))
  const addView = async (itemId, view, file) => {
    if (!file) return
    const busyKey = `${itemId}:${view}`
    setViewBusy(busyKey); setViewError('')
    try {
      const { full } = await preparePhoto(file)
      setItems((prev) => prev.map((item) => item.id === itemId
        ? { ...item, views: { ...(item.views || {}), [view]: full } }
        : item))
    } catch {
      setViewError(busyKey)
    } finally {
      setViewBusy('')
    }
  }

  const matched = items.filter((x) => x.status === 'matched' && x.match)
  const reading = items.filter((x) => x.status === 'reading').length
  const needPick = items.filter((x) => x.status === 'unmatched').length
  const uniq = new Set(matched.map((x) => x.match.uid)).size
  const dupes = matched.length - uniq
  const commit = async () => {
    if (!matched.length || committing) return
    // Copies are counted per card and RECORDED (the count you see is the count that's kept).
    const byUid = new Map()
    for (const x of matched) {
      const cur = byUid.get(x.match.uid)
      if (cur) {
        cur.copies += 1
        cur.views = { ...(cur.views || {}), ...(x.views || {}) }
        if (x.frame && x.quad) cur.pile.push({ frame: x.frame, quad: x.quad })
      } else {
        byUid.set(x.match.uid, {
          uid: x.match.uid, photo: x.photo, read: x.read, views: x.views || {}, copies: 1,
          pile: (x.frame && x.quad) ? [{ frame: x.frame, quad: x.quad }] : [],
        })
      }
    }
    setCommitting(true); setCommitError(false)
    try {
      await onCommit([...byUid.values()])
      onClose()
    } catch {
      setCommitError(true)
    } finally {
      setCommitting(false)
    }
  }

  const status = items.length === 0
    ? (targetCard ? 'start with a clear photo of the front' : 'point at one card, a page, or a spread')
    : (reading && !matched.length ? 'reading your photo…'
      : `${uniq} recognized${dupes ? ` · ${dupes + uniq} copies` : ''}${reading ? ' · reading…' : ''}${needPick ? ` · ${needPick} need a pick` : ''}`)

  return (
    <div className="sc-overlay" role="dialog" aria-label="Scan cards">
      <div className="sc-sheet">
        <div className="sc-head">
          <div>
            <div className="ek">{targetCard ? `Add photos for ${cardName(targetCard)}` : 'Scan into your collection'}</div>
            <div className="sc-count mono">{status}</div>
          </div>
          <button className="sc-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="sc-grid">
          {items.map((it) => (
            <div key={it.id} className={'sc-item s-' + it.status}>
              <div className="sc-thumb">
                {it.photo ? <img src={it.photo} alt="" /> : <span className="sc-spin" />}
                <button className="sc-rm" onClick={() => remove(it.id)} aria-label="Remove">✕</button>
              </div>
              {it.status === 'reading' && <div className="sc-cap mono dim">reading…</div>}
              {it.status === 'matched' && (
                <>
                  <div className="sc-cap">
                    <b>{cardName(it.match)}</b>
                    <small className="mono">{it.match.num} ✓</small>
                    <button className="sc-change" onClick={() => setPicking(it.id)}>change</button>
                  </div>
                  <div className="sc-more">
                    <div className="sc-moretitle"><b>Other angles?</b><span>optional</span></div>
                    <div className="sc-anglelist">
                      {EXTRA_VIEWS.map((view) => {
                        const src = it.views?.[view.id]
                        const busy = viewBusy === `${it.id}:${view.id}`
                        return <label className={'sc-angle' + (src ? ' filled' : '')} key={view.id}>
                          {src ? <img src={src} alt="" /> : <span className="sc-angleplus" aria-hidden="true">＋</span>}
                          <span><b>{src ? `✓ ${view.label}` : view.label}</b><small>{busy ? 'saving…' : src ? 'saved · tap to replace' : view.hint}</small></span>
                          <input type="file" accept="image/*" capture="environment"
                            aria-label={`Add ${view.label} photo for ${cardName(it.match)}`}
                            onChange={(e) => { addView(it.id, view.id, e.target.files?.[0]); e.target.value = '' }} />
                        </label>
                      })}
                    </div>
                    {viewError.startsWith(`${it.id}:`) && <div className="sc-viewerror">Couldn&rsquo;t save that view. Try another photo.</div>}
                  </div>
                </>
              )}
              {it.status === 'unmatched' && (
                <div className="sc-cap">
                  <span className="sc-no">couldn’t read it</span>
                  <button className="sc-change" onClick={() => setPicking(it.id)}>pick</button>
                </div>
              )}
              {(it.read?.red_flags || []).length > 0 && (
                <div className="sc-flags">{it.read.red_flags.map((f, i) => <div key={i}>⚑ {f}</div>)}</div>
              )}
              {picking === it.id && (
                <CardPicker cards={cards} onPick={(c) => { setMatch(it.id, c); setPicking(null) }} />
              )}
            </div>
          ))}
        </div>

        <div className="sc-actions">
          <label className="sc-cap-btn">＋ {targetCard ? 'Take front photo' : 'Scan'}<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} /></label>
          <label className="sc-choose">{targetCard ? 'Choose front photo' : 'Choose photos'}<input type="file" accept="image/*" multiple={!targetCard} hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} /></label>
          <button className="sc-commit" disabled={!matched.length || committing} onClick={commit}>
            {committing ? 'Saving photos…' : targetCard
              ? (matched.length ? 'Save listing photos' : 'Add a front photo')
              : matched.length ? `Add ${uniq} to collection${dupes ? ` (${dupes + uniq} copies)` : ''}` : 'Add to collection'}
          </button>
        </div>
        {commitError && <div className="sc-commiterror" role="alert">Couldn&rsquo;t save those photos. Your review is still here—try again.</div>}
        <p className="sc-note dim">{targetCard ? <>
          This photo is going straight to <b>{cardName(targetCard)}</b>. Add the back, corners, or holo tilt after the front so buyers and Anko can inspect your copy.
        </> : <>
          One card or many: every card in frame is read and cut out in one shot. Recognized cards are tagged <b>have</b>,
          each crop kept as the front. Other angles help Anko and buyers inspect your copy, but do not prove authenticity or condition. Fix any miss with “pick”.
        </>}</p>
      </div>
    </div>
  )
}
